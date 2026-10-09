import { useEffect, useState, type ReactNode } from "react";
import {
  type Fit,
  type Goal,
  type LoadInput,
  type LoadResult,
  type WarningCode,
  evaluate,
  expansionLabel,
  expansionSentence,
  fitIndex,
  pushFraction,
} from "@/lib/ballistics";
import {
  type Cartridge,
  type Powder,
  cartridgeById,
  cartridges,
  burnRank,
  nearestPowders,
  powderById,
  powders,
  powdersForBarrel,
} from "@/lib/data";
import { BarrelChart, type BarrelPoint } from "@/components/barrel-chart";
import {
  bulletBrands,
  bulletById,
  bulletProducts,
  bulletTypes,
  bulletsForDiameter,
  reconcileBulletChoice,
} from "@/lib/bullets";

const STORAGE_KEY = "bore-match-v2";

type FormState = {
  cartridgeId: string;
  diameter: string;
  caseLength: string;
  grossCapacity: string;
  coal: string;
  bulletBrand: string;
  bulletType: string;
  bulletId: string;
  bulletWeight: string;
  bulletLength: string;
  barrel: string;
  twist: string;
  measuredNet: string;
  powderId: string;
  goal: Goal;
  coldTemp: string;
  velocity: string;
};

const fieldClass =
  "h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none focus-visible:border-primary";
const labelClass = "mb-1 block text-sm font-medium text-fg";
const hintClass = "mt-1 text-sm leading-snug text-muted";

const warningCopy: Record<WarningCode, string> = {
  "short-travel": "Bullet travel is under 4 inches. Lengthen the barrel or check overall length.",
  "over-magazine": "Overall length is past this cartridge's usual magazine limit.",
  "do-not-reduce":
    "Powders marked min are not safe below the minimum in a current manual.",
  unstable: "Twist is too slow for this bullet at this speed. It may not fly point-forward.",
  "marginal-stability": "Stability is under 1.5. A faster twist is safer, especially below the speed of sound.",
  "over-subsonic-cap": "That muzzle velocity is over the cold-weather cap. Expect a supersonic crack.",
  "subsonic-large-case":
    "Filled, this case wants a medium or slow powder. A subsonic load has to come from data published for that use, not from downloading H110.",
  "seating-odd": "That bullet length and overall length don't seat inside the case. Check both.",
};

function emptyForm(): FormState {
  return {
    cartridgeId: "",
    diameter: "",
    caseLength: "",
    grossCapacity: "",
    coal: "",
    bulletBrand: "",
    bulletType: "",
    bulletId: "",
    bulletWeight: "",
    bulletLength: "",
    barrel: "",
    twist: "",
    measuredNet: "",
    powderId: "",
    goal: "general",
    coldTemp: "70",
    velocity: "",
  };
}

function applyCartridge(id: string, prev: FormState): FormState {
  if (!id) return { ...prev, cartridgeId: "" };
  const cartridge = cartridgeById(id);
  if (!cartridge) return prev;
  const next: FormState = {
    ...prev,
    cartridgeId: id,
    diameter: String(cartridge.diameterIn),
    caseLength: String(cartridge.caseLengthIn),
    grossCapacity: String(cartridge.grossCapacityGr),
    coal: String(cartridge.maxCoalIn),
  };
  return {
    ...next,
    ...reconcileBulletChoice(cartridge.diameterIn, next.bulletBrand, next.bulletType, next.bulletId),
  };
}

function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseForm(form: FormState): { input: LoadInput } | { message: string } {
  const cartridge = cartridgeById(form.cartridgeId);
  const powder = powderById(form.powderId);
  const required: [string, number | null, number, number][] = [
    ["Groove diameter", num(form.diameter), 0.17, 0.6],
    ["Case length", num(form.caseLength), 0.7, 3.6],
    ["Empty capacity", num(form.grossCapacity), 8, 160],
    ["Overall length", num(form.coal), 1, 4.2],
    ["Bullet weight", num(form.bulletWeight), 15, 800],
    ["Bullet length", num(form.bulletLength), 0.4, 2.4],
    ["Barrel length", num(form.barrel), 4, 36],
    ["Cold temperature", num(form.coldTemp), -40, 130],
  ];
  for (const [name, value, low, high] of required) {
    if (value == null) return { message: `${name} needs a number.` };
    if (value < low || value > high) {
      return { message: `${name} is outside the range this can use.` };
    }
  }
  const measured = num(form.measuredNet);
  if (form.measuredNet.trim() && (measured == null || measured < 3 || measured > 150)) {
    return { message: "Measured capacity looks wrong." };
  }
  const velocity = num(form.velocity);
  if (form.velocity.trim() && (velocity == null || velocity < 400 || velocity > 4500)) {
    return { message: "Muzzle velocity is outside the range this can use." };
  }
  const twist = num(form.twist);
  if (form.twist.trim() && (twist == null || twist < 3 || twist > 20)) {
    return { message: "Twist is outside the range this can use." };
  }
  const diameter = num(form.diameter)!;
  const caseLength = num(form.caseLength)!;
  const gross = num(form.grossCapacity)!;
  const coal = num(form.coal)!;
  const weight = num(form.bulletWeight)!;
  const length = num(form.bulletLength)!;
  const barrel = num(form.barrel)!;
  const cold = num(form.coldTemp)!;
  return {
    input: {
      diameterIn: diameter,
      caseLengthIn: caseLength,
      grossCapacityGr: gross,
      maxCoalIn: cartridge?.maxCoalIn ?? null,
      coalIn: coal,
      bulletWeightGr: weight,
      bulletLengthIn: length,
      barrelIn: barrel,
      twistIn: twist,
      measuredNetGr: measured,
      powderIndex: powder?.index ?? null,
      powderDoNotReduce: powder?.doNotReduce ?? false,
      goal: form.goal,
      coldTempF: cold,
      velocityFps: velocity,
    },
  };
}

function round(value: number, digits: number): string {
  return value.toFixed(digits);
}

function whole(value: number): string {
  return Math.round(value).toString();
}

function fitSentence(name: string, fit: Fit): string {
  if (fit === "matched") return `${name} sits in the middle of the band for this case and barrel.`;
  if (fit === "slow-edge") {
    return `${name} is on the slow edge. It can work. A little more barrel suits it better.`;
  }
  if (fit === "too-slow") {
    return `${name} is too slow for this barrel. It is still burning after the bullet is gone, so the extra energy leaves as flash instead of speed.`;
  }
  if (fit === "fast-edge") {
    return `${name} finishes early. It will burn clean. A slightly slower powder can use the rest of the bore.`;
  }
  return `${name} is faster than this case needs. It peaks early and leaves barrel unused.`;
}

function barrelSentence(result: LoadResult, powderName: string | null, barrel: number): string {
  const who = powderName ?? "A powder in the middle of the band";
  const low = whole(result.barrelLowIn);
  const high = whole(result.barrelHighIn);
  const ideal = whole(result.barrelIdealIn);
  let place = `This ${round(barrel, 1)}-inch barrel is inside that window.`;
  if (barrel < result.barrelLowIn - 0.4) {
    place = `This ${round(barrel, 1)}-inch barrel is short of that.`;
  } else if (barrel > result.barrelHighIn + 0.4) {
    place = `This ${round(barrel, 1)}-inch barrel is past where more length buys speed.`;
  }
  if (result.subsonicKind === "fast-case") {
    return `${who} is mostly burned by ${low}–${high} inches. ${place} Past that, speed barely rises, and a longer bore can push a quiet load through the sound barrier.`;
  }
  return `${who} lines up with about ${low}–${high} inches, centered near ${ideal}. ${place}`;
}

function stabilitySentence(result: LoadResult, twist: number | null): string {
  const need = round(result.twistForSg15, 1);
  let basis = `Shown at 2,800 fps, the speed Miller's formula is built on. Enter a chronograph reading to correct it.`;
  if (result.stabilityBasis === "entered") {
    basis = `At your ${whole(result.stabilityVelocity)} fps.`;
  } else if (result.stabilityBasis === "subsonic-cap") {
    basis = `At ${whole(result.stabilityVelocity)} fps, the cold subsonic cap. Slower is less stable.`;
  }
  if (twist == null || result.stability == null) {
    return `1:${need} or faster holds a Miller SG of 1.5. ${basis} Powder and barrel length do not use twist.`;
  }
  const sg = round(result.stability, 2);
  const verdict =
    result.stability >= 1.5
      ? `1:${round(twist, 1)} is enough.`
      : `1:${round(twist, 1)} is marginal or short.`;
  return `Miller stability ${sg}. ${verdict} 1:${need} or faster holds 1.5. ${basis}`;
}

function chartPoints(input: LoadInput, burnTravel: number): BarrelPoint[] {
  const points: BarrelPoint[] = [];
  for (let barrel = 6; barrel <= 32; barrel += 1) {
    const travel = barrel - input.coalIn + input.bulletLengthIn;
    points.push({
      barrel,
      push: Math.round(pushFraction(travel, burnTravel) * 100),
    });
  }
  return points;
}

function isFormState(value: unknown): value is FormState {
  if (!value || typeof value !== "object") return false;
  const form = value as Partial<FormState>;
  return typeof form.barrel === "string" && typeof form.goal === "string" && typeof form.diameter === "string";
}

export function Calculator() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isFormState(parsed)) setForm({ ...emptyForm(), ...parsed });
      }
    } catch {
      /* keep the empty form */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form, hydrated]);

  function edit(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const roundFieldsBlank = [
    form.diameter,
    form.caseLength,
    form.grossCapacity,
    form.coal,
    form.bulletWeight,
    form.bulletLength,
    form.barrel,
    form.twist,
  ].every((value) => value.trim() === "");

  const parsed = parseForm(form);
  const result = "input" in parsed ? evaluate(parsed.input) : null;
  const powder = powderById(form.powderId);
  const offset = (num(form.coal) ?? 0) - (num(form.bulletLength) ?? 0);
  const band = result ? powdersForBarrel(offset, num(form.barrel) ?? 0) : [];
  const shown = band;
  const centerNames = result ? nearestPowders(result.recommendedIndex, 2).map((item) => item.name) : [];
  const doNotReduce = Boolean(powder?.doNotReduce) || band.some((item) => item.doNotReduce);
  const warnings = result
    ? result.warnings.filter((code) => code !== "do-not-reduce" || powder?.doNotReduce)
    : [];

  const fast = powders.filter((item) => item.index >= 145);
  const medium = powders.filter((item) => item.index < 145 && item.index >= 105);
  const slow = powders.filter((item) => item.index < 105);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 pb-24 sm:px-6 sm:py-10 lg:pb-10">
      <header className="max-w-2xl">
        <p className="text-sm font-medium tracking-wide text-primary">Internal ballistics</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Bore Match</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Powder band, barrel length, and twist from the case and the bore. Type the numbers
          yourself. A cartridge pick only fills the case. It does not give a charge weight.
        </p>
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
        <form
          className="grid gap-6 lg:col-span-5"
          onSubmit={(event) => event.preventDefault()}
        >
          <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={form.goal === "general"}
                className={toggleClass(form.goal === "general")}
                onClick={() => edit({ goal: "general" })}
              >
                General
              </button>
              <button
                type="button"
                aria-pressed={form.goal === "subsonic"}
                className={toggleClass(form.goal === "subsonic")}
                onClick={() => edit({ goal: "subsonic" })}
              >
                Subsonic
              </button>
            </div>

            <label>
              <span className={labelClass}>Cartridge, optional</span>
              <select
                className={fieldClass}
                value={form.cartridgeId}
                onChange={(event) => setForm((prev) => applyCartridge(event.target.value, prev))}
              >
                <option value="">None — type the numbers</option>
                {cartridges.map((cartridge: Cartridge) => (
                  <option key={cartridge.id} value={cartridge.id}>
                    {cartridge.name}
                  </option>
                ))}
              </select>
              <span className={hintClass}>
                Picking one fills groove, case length, empty capacity, and the standard overall
                length. Barrel, bullet, twist, and powder are left alone.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Groove (in)"
                value={form.diameter}
                onChange={(diameter) =>
                  setForm((prev) => {
                    const next = { ...prev, diameter, cartridgeId: "" };
                    return {
                      ...next,
                      ...reconcileBulletChoice(
                        num(diameter),
                        next.bulletBrand,
                        next.bulletType,
                        next.bulletId,
                      ),
                    };
                  })
                }
              />
              <Field
                label="Case length (in)"
                value={form.caseLength}
                onChange={(caseLength) => edit({ caseLength, cartridgeId: "" })}
              />
              <Field
                label="Capacity, empty (gr)"
                value={form.grossCapacity}
                onChange={(grossCapacity) => edit({ grossCapacity })}
              />
              <Field label="Overall length (in)" value={form.coal} onChange={(coal) => edit({ coal })} />
            </div>

            <BulletPickers form={form} setForm={setForm} />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Bullet weight (gr)"
                value={form.bulletWeight}
                onChange={(bulletWeight) => edit({ bulletWeight, bulletId: "" })}
              />
              <Field
                label="Bullet length (in)"
                value={form.bulletLength}
                onChange={(bulletLength) => edit({ bulletLength, bulletId: "" })}
              />
              <Field label="Barrel (in)" value={form.barrel} onChange={(barrel) => edit({ barrel })} />
              <Field
                label="Twist (in/turn)"
                value={form.twist}
                onChange={(twist) => edit({ twist })}
                hint="Optional. 8 means 1:8. Blank shows the twist this bullet wants."
              />
            </div>

            <label>
              <span className={labelClass}>Measured net capacity (gr water)</span>
              <input
                className={`${fieldClass} font-mono`}
                inputMode="decimal"
                value={form.measuredNet}
                placeholder="Blank to estimate from seating"
                onChange={(event) => edit({ measuredNet: event.target.value })}
                suppressHydrationWarning
              />
              <span className={hintClass}>
                Fill a fired case to the base of the seated bullet. That replaces the estimate.
                {result ? ` Estimate right now is ${round(result.capacityEstimated ? result.netCapacityGr : estimatedOnly(form), 1)} gr.` : ""}
              </span>
            </label>

            <label>
              <span className={labelClass}>Powder on hand</span>
              <select
                className={fieldClass}
                value={form.powderId}
                onChange={(event) => edit({ powderId: event.target.value })}
              >
                <option value="">None yet — recommend a band</option>
                <PowderGroup label="Fast" items={fast} />
                <PowderGroup label="Medium" items={medium} />
                <PowderGroup label="Slow" items={slow} />
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Coldest air (°F)"
                value={form.coldTemp}
                onChange={(coldTemp) => edit({ coldTemp })}
                hint="Speed of sound drops when it's cold"
              />
              <Field
                label="Muzzle velocity (fps)"
                value={form.velocity}
                onChange={(velocity) => edit({ velocity })}
                hint="Optional. From a chronograph"
              />
            </div>
          </section>
        </form>

        <section className="grid gap-4 lg:col-span-7" aria-live="polite">
          {roundFieldsBlank ? (
            <p className="rounded-md border border-border bg-surface p-4 text-sm leading-relaxed text-fg">
              Type groove, case, bullet, and barrel. Or pick a cartridge to fill only the case
              numbers, then enter the rest yourself.
            </p>
          ) : "message" in parsed || !result ? (
            <p className="rounded-md border border-border bg-surface p-4 text-sm text-fg">
              {"message" in parsed ? parsed.message : "Enter the cartridge and the barrel."}
            </p>
          ) : (
            <>
              {warnings.length > 0 || doNotReduce ? (
                <ul className="grid gap-2">
                  {doNotReduce ? (
                    <li className="rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-fg">
                      {warningCopy["do-not-reduce"]}
                    </li>
                  ) : null}
                  {warnings
                    .filter((code) => code !== "do-not-reduce")
                    .map((code) => (
                      <li
                        key={code}
                        className="rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-fg"
                      >
                        {warningCopy[code]}
                      </li>
                    ))}
                </ul>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Card title="Expansion ratio" value={round(result.expansionRatio, 1)} kicker={expansionLabel(result.expansionRatio)} numeric>
                  {expansionSentence(result.expansionRatio)} Bullet travel {round(result.travelIn, 1)} in.
                  Net capacity {round(result.netCapacityGr, 1)} gr
                  {result.capacityEstimated ? ", estimated." : ", measured."}
                </Card>
                <Card
                  title="Powder band"
                  value={centerNames[0] ?? "—"}
                  kicker={centerNames[1] ? `also ${centerNames[1]}` : "relative burn"}
                >
                  {result.subsonicKind === "published-only"
                    ? "This is the full-case match, not a subsonic recipe. "
                    : result.subsonicKind === "fast-case"
                      ? "Small case, heavy bullet: the band stays fast so the powder finishes in a short bore. "
                      : "Blended from case capacity, sectional density, and whether the powder finishes in this barrel. "}
                  {powder ? fitSentence(powder.name, fitIndex(powder.index, result.recommendedIndex)) : "Pick a powder you already have to see if it belongs here."}
                </Card>
                <Card title="Barrel window" value={`${whole(result.barrelIdealIn)} in`} kicker="where the burn finishes" numeric>
                  {barrelSentence(result, powder?.name ?? null, num(form.barrel) ?? 0)}
                </Card>
                <Card
                  title="Twist"
                  value={
                    result.stability == null
                      ? `1:${round(result.twistForSg15, 1)}`
                      : round(result.stability, 2)
                  }
                  kicker={result.stability == null ? "or faster" : "Miller SG"}
                  numeric
                >
                  {stabilitySentence(result, num(form.twist))}
                </Card>
              </div>

              {result.subsonicCap != null ? (
                <article className="rounded-md border border-border bg-surface p-4">
                  <h2 className="text-sm font-medium text-muted">Subsonic cap</h2>
                  <p className="mt-2 font-mono text-3xl text-fg">{whole(result.subsonicCap)} fps</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Speed of sound is {whole(result.speedOfSoundCold)} fps at {round(num(form.coldTemp) ?? 0, 0)}°F
                    and {whole(result.speedOfSoundWarm)} fps at 70°F. Stay about 40 fps under the cold number so
                    a cold day and a normal extreme spread stay quiet.
                  </p>
                </article>
              ) : null}

              <article className="rounded-md border border-border bg-surface p-4">
                <h2 className="text-sm font-medium text-muted">Push left in the barrel</h2>
                <p className="mt-1 text-sm text-muted">
                  Shaded band is the useful length. The dashed line is the barrel you entered. The curve is not a
                  velocity.
                </p>
                <div className="mt-3">
                  <BarrelChart
                    points={chartPoints(parsed.input, result.burnTravelIn)}
                    current={parsed.input.barrelIn}
                    low={result.barrelLowIn}
                    high={result.barrelHighIn}
                  />
                </div>
              </article>

              <article className="rounded-md border border-border bg-surface p-4">
                <h2 className="text-sm font-medium text-fg">Powders in the band</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {shown.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-fg"
                    >
                      {item.name}
                      <span className="text-muted"> {burnRank(item)}</span>
                      {item.doNotReduce ? <span className="text-primary"> · min</span> : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {shown.length === 0
                    ? "No catalog powder has its useful length on this barrel. A faster powder finishes sooner. A slower one is still burning at the muzzle."
                    : "Every powder whose useful length includes this barrel, fastest first. 1 is the fastest powder on the list. A bigger number is slower. The number is a chart place, not a charge."}
                </p>
              </article>
            </>
          )}

          <details className="rounded-md border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
            <summary className="cursor-pointer font-medium text-fg">How this is figured</summary>
            <div className="mt-3 grid gap-2">
              <p>
                Expansion ratio is the volume behind the bullet at the muzzle divided by the volume at ignition.
                Bore volume treats the groove diameter as a round hole, so it runs a little high.
              </p>
              <p>
                The match uses Homer Powley's quickness, with IMR 4350 set at 100 inside the math. The number
                on each powder is the chart rank: 1 is the fastest on this list, and a bigger number is slower. On
                a normal load, a shorter barrel shifts the band toward the faster powders, because a slow powder
                is still burning when the bullet leaves.
              </p>
              <p>
                The barrel window is where that burn lines up with bullet travel. The curve is the share of the
                push captured so far. Neither one is a velocity or a pressure.
              </p>
              <p>
                Twist is Don Miller's stability factor. 1.5 is the usual minimum. Subsonic speed lowers it, which
                is why a 220-grain .30 wants a faster twist than the same bullet at rifle speed.
              </p>
              <p>
                Nothing here is a charge. Catalog capacities are approximate. A measured water fill to the bullet
                base is the number that matters.
              </p>
            </div>
          </details>
        </section>
      </div>
      {result ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-3 py-2 lg:hidden">
          <div className="grid grid-cols-4 gap-2">
            <Readout label="Ratio" value={round(result.expansionRatio, 1)} />
            <Readout label="Powder" value={centerNames[0] ?? "—"} />
            <Readout label="Barrel" value={`${whole(result.barrelIdealIn)} in`} />
            <Readout
              label={result.stability == null ? "Twist" : "SG"}
              value={
                result.stability == null
                  ? `1:${round(result.twistForSg15, 1)}`
                  : round(result.stability, 2)
              }
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function BulletPickers({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (update: (prev: FormState) => FormState) => void;
}) {
  const groove = num(form.diameter);
  const pool = groove == null ? [] : bulletsForDiameter(groove);
  const brands = bulletBrands(pool, form.bulletType);
  const types = bulletTypes(pool, form.bulletBrand);
  const ready = form.bulletBrand !== "";
  const products = ready ? bulletProducts(pool, form.bulletBrand, form.bulletType) : [];
  const blocked = groove == null || pool.length === 0;

  function choose(patch: Partial<FormState>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      return {
        ...next,
        ...reconcileBulletChoice(num(next.diameter), next.bulletBrand, next.bulletType, next.bulletId),
      };
    });
  }

  let hint = "Type is optional. It only narrows the list. The bullet fills weight and length, and you can type over either one.";
  if (groove == null) hint = "Enter a groove diameter to list bullets for that bore.";
  else if (pool.length === 0) hint = "No catalog bullets within 0.002 in of that groove. Type the weight and length.";

  return (
    <div className="grid gap-3">
      <label>
        <span className={labelClass}>Bullet maker</span>
        <select
          className={fieldClass}
          value={brands.includes(form.bulletBrand) ? form.bulletBrand : ""}
          disabled={blocked}
          onChange={(event) => choose({ bulletBrand: event.target.value })}
        >
          <option value="">Any maker</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>Bullet type</span>
        <select
          className={fieldClass}
          value={types.includes(form.bulletType) ? form.bulletType : ""}
          disabled={blocked}
          onChange={(event) => choose({ bulletType: event.target.value })}
        >
          <option value="">Any type</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>Bullet</span>
        <select
          className={fieldClass}
          value={form.bulletId}
          disabled={blocked || !ready}
          onChange={(event) => {
            const bullet = bulletById(event.target.value);
            if (!bullet) {
              choose({ bulletId: "" });
              return;
            }
            setForm((prev) => ({
              ...prev,
              bulletId: bullet.id,
              bulletBrand: bullet.brand,
              bulletType: bullet.type,
              bulletWeight: String(bullet.weightGr),
              bulletLength: String(bullet.lengthIn),
            }));
          }}
        >
          <option value="">{ready ? "Pick a bullet" : "Choose a maker"}</option>
          {products.map((bullet) => (
            <option key={bullet.id} value={bullet.id}>
              {Number.isInteger(bullet.weightGr) ? bullet.weightGr : bullet.weightGr} gr {bullet.name}
            </option>
          ))}
        </select>
        <span className={hintClass}>{hint}</span>
      </label>
    </div>
  );
}

function estimatedOnly(form: FormState): number {
  const parsed = parseForm({ ...form, measuredNet: "" });
  if (!("input" in parsed)) return 0;
  return evaluate(parsed.input).netCapacityGr;
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="truncate font-mono text-sm text-fg">{value}</p>
    </div>
  );
}

function toggleClass(active: boolean): string {
  return active
    ? "min-h-11 rounded-md border border-primary bg-primary text-sm font-medium text-primary-fg"
    : "min-h-11 rounded-md border border-border bg-bg text-sm font-medium text-fg";
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        className={`${fieldClass} font-mono`}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        suppressHydrationWarning
      />
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </label>
  );
}

function Card({
  title,
  value,
  kicker,
  children,
  numeric = false,
}: {
  title: string;
  value: string;
  kicker: string;
  children: ReactNode;
  numeric?: boolean;
}) {
  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      <p className={numeric ? "mt-2 font-mono text-3xl leading-none text-fg" : "mt-2 text-2xl leading-tight font-medium text-fg"}>
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-primary">{kicker}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </article>
  );
}

function PowderGroup({
  label,
  items,
}: {
  label: string;
  items: Powder[];
}) {
  return (
    <optgroup label={label}>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {burnRank(item)} {item.name}
        </option>
      ))}
    </optgroup>
  );
}
