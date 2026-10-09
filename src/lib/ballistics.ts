/**
 * Geometry matcher for rifle cartridges.
 * Expansion ratio, a Powley-style burn band, barrel window, Miller twist.
 * There is deliberately no charge, pressure, or velocity solver here.
 */

export const WATER_GR_PER_CU_IN = 252.8;

/** IMR 4350 sits at 100 on this scale. Higher is faster. IMR 4227 is about 180. */
const BURN_A = 20.5;
const BURN_B = 0.15625;

const BAND_SLOW = 14;
const BAND_CORE = 8;
const BAND_FAST = 16;

export type Goal = "general" | "subsonic";

export type Fit = "too-slow" | "slow-edge" | "matched" | "fast-edge" | "too-fast";

export type WarningCode =
  | "short-travel"
  | "over-magazine"
  | "do-not-reduce"
  | "unstable"
  | "marginal-stability"
  | "over-subsonic-cap"
  | "subsonic-large-case"
  | "seating-odd";

export type SubsonicKind = "fast-case" | "published-only" | null;

export type LoadInput = {
  diameterIn: number;
  caseLengthIn: number;
  grossCapacityGr: number;
  maxCoalIn: number | null;
  coalIn: number;
  bulletWeightGr: number;
  bulletLengthIn: number;
  barrelIn: number;
  /** Inches per turn. Null when the barrel's twist is unknown. */
  twistIn: number | null;
  /** Water capacity to the base of the seated bullet, if the user measured it. */
  measuredNetGr: number | null;
  powderIndex: number | null;
  powderDoNotReduce: boolean;
  goal: Goal;
  coldTempF: number;
  velocityFps: number | null;
};

export type LoadResult = {
  netCapacityGr: number;
  capacityEstimated: boolean;
  intrusionIn: number;
  travelIn: number;
  expansionRatio: number;
  sectionalDensity: number;
  relativeCapacityIn: number;
  powleyIndex: number;
  recommendedIndex: number;
  bandLow: number;
  bandHigh: number;
  judgedIndex: number;
  burnTravelIn: number;
  barrelLowIn: number;
  barrelIdealIn: number;
  barrelHighIn: number;
  speedOfSoundCold: number;
  speedOfSoundWarm: number;
  subsonicCap: number | null;
  subsonicKind: SubsonicKind;
  stability: number | null;
  stabilityVelocity: number;
  stabilityBasis: "entered" | "subsonic-cap" | "reference";
  twistForSg15: number;
  warnings: WarningCode[];
};

export function boreArea(diameterIn: number): number {
  const r = diameterIn / 2;
  return Math.PI * r * r;
}

export function sectionalDensity(weightGr: number, diameterIn: number): number {
  return weightGr / (7000 * diameterIn * diameterIn);
}

/** Case capacity expressed as inches of bore, the Powley "RC". */
export function relativeCapacity(netCapacityGr: number, diameterIn: number): number {
  return netCapacityGr / WATER_GR_PER_CU_IN / boreArea(diameterIn);
}

/**
 * Homer Powley's quickness index.
 * 100 ≈ IMR 4350, 180 ≈ IMR 4227, higher = faster.
 * Used only to name a burn-rate neighborhood. Not a charge.
 */
export function powleyIndex(rcIn: number, sd: number): number {
  return 20 + 77.5 / Math.sqrt(rcIn * sd);
}

/** Inches of bullet travel for a powder of this index to finish its useful burn. */
export function burnTravelForIndex(index: number): number {
  return Math.max(3.5, BURN_A + BURN_B * (100 - index));
}

export function indexForBurnTravel(travelIn: number): number {
  return 100 - (travelIn - BURN_A) / BURN_B;
}

export function speedOfSoundFps(tempF: number): number {
  return 49.022 * Math.sqrt(tempF + 459.67);
}

export function fitIndex(index: number, center: number): Fit {
  const delta = index - center;
  if (delta < -BAND_SLOW) return "too-slow";
  if (delta < -BAND_CORE) return "slow-edge";
  if (delta <= BAND_CORE) return "matched";
  if (delta <= BAND_FAST) return "fast-edge";
  return "too-fast";
}

/**
 * Don Miller stability factor.
 * Twist and length are in inches; SG ≥ 1.5 is the usual minimum.
 */
export function millerStability(input: {
  weightGr: number;
  diameterIn: number;
  lengthIn: number;
  twistIn: number;
  velocityFps: number;
}): number {
  const d = input.diameterIn;
  const lengthCal = input.lengthIn / d;
  const twistCal = input.twistIn / d;
  const velocityFactor = Math.pow(input.velocityFps / 2800, 1 / 3);
  const base =
    (30 * input.weightGr) /
    (twistCal * twistCal * d * d * d * lengthCal * (1 + lengthCal * lengthCal));
  return base * velocityFactor;
}

export function twistForStability(input: {
  weightGr: number;
  diameterIn: number;
  lengthIn: number;
  velocityFps: number;
  sg: number;
}): number {
  const d = input.diameterIn;
  const lengthCal = input.lengthIn / d;
  const velocityFactor = Math.pow(input.velocityFps / 2800, 1 / 3);
  const twistCalSq =
    (30 * input.weightGr * velocityFactor) /
    (input.sg * d * d * d * lengthCal * (1 + lengthCal * lengthCal));
  return Math.sqrt(twistCalSq) * d;
}

/** Share of the powder's push captured by this much bullet travel. Qualitative, not a velocity. */
export function pushFraction(travelIn: number, burnTravelIn: number): number {
  if (travelIn <= 0 || burnTravelIn <= 0) return 0;
  const ratio = travelIn / burnTravelIn;
  return 1 / (1 + Math.exp(-6 * (ratio - 0.72)));
}

function barrelWindow(offsetIn: number, burnTravelIn: number) {
  return {
    barrelLowIn: offsetIn + burnTravelIn,
    barrelIdealIn: offsetIn + burnTravelIn * 1.15,
    barrelHighIn: offsetIn + burnTravelIn * 1.25,
  };
}

/** Useful barrel length for a powder, same window the chart shades. */
export function barrelSpanForIndex(index: number, offsetIn: number) {
  return barrelWindow(offsetIn, burnTravelForIndex(index));
}

/** True when this barrel sits inside that powder's useful length. */
export function barrelFitsSpan(
  barrelIn: number,
  span: { barrelLowIn: number; barrelHighIn: number },
): boolean {
  return barrelIn >= span.barrelLowIn - 0.4 && barrelIn <= span.barrelHighIn + 0.4;
}

export function evaluate(input: LoadInput): LoadResult {
  const area = boreArea(input.diameterIn);
  const protrusion = input.coalIn - input.caseLengthIn;
  const intrusion = input.bulletLengthIn - protrusion;
  const seatingOdd = intrusion < -0.05 || intrusion > input.caseLengthIn * 0.92;

  const intrusionUsed = Math.max(0, intrusion);
  const displacedGr = area * intrusionUsed * WATER_GR_PER_CU_IN;
  const estimatedNet = Math.max(1, input.grossCapacityGr - displacedGr);
  const netCapacityGr = input.measuredNetGr ?? estimatedNet;
  const capacityEstimated = input.measuredNetGr == null;

  const travelIn = input.barrelIn - input.coalIn + input.bulletLengthIn;
  const caseVolume = netCapacityGr / WATER_GR_PER_CU_IN;
  const boreVolume = Math.max(0, area * travelIn);
  const expansionRatio = caseVolume > 0 ? (caseVolume + boreVolume) / caseVolume : 0;

  const sd = sectionalDensity(input.bulletWeightGr, input.diameterIn);
  const rc = relativeCapacity(netCapacityGr, input.diameterIn);
  const powley = powleyIndex(rc, sd);

  let recommendedIndex = powley;
  let subsonicKind: SubsonicKind = null;
  if (input.goal === "subsonic") {
    if (powley >= 155) {
      recommendedIndex = Math.min(188, Math.max(168, powley));
      subsonicKind = "fast-case";
    } else {
      recommendedIndex = powley;
      subsonicKind = "published-only";
    }
  } else {
    const barrelIndex = indexForBurnTravel(Math.max(4, travelIn) * 0.95);
    recommendedIndex = 0.65 * powley + 0.35 * barrelIndex;
  }

  const judgedIndex = input.powderIndex ?? recommendedIndex;
  const burnTravelIn = burnTravelForIndex(judgedIndex);
  const offsetIn = input.coalIn - input.bulletLengthIn;
  const window = barrelWindow(offsetIn, burnTravelIn);

  const speedOfSoundCold = speedOfSoundFps(input.coldTempF);
  const speedOfSoundWarm = speedOfSoundFps(70);
  const subsonicCap =
    input.goal === "subsonic" ? Math.round(speedOfSoundCold - 40) : null;

  let stabilityVelocity = 2800;
  let stabilityBasis: LoadResult["stabilityBasis"] = "reference";
  if (input.velocityFps != null && input.velocityFps > 0) {
    stabilityVelocity = input.velocityFps;
    stabilityBasis = "entered";
  } else if (subsonicCap != null) {
    stabilityVelocity = subsonicCap;
    stabilityBasis = "subsonic-cap";
  }

  const stability =
    input.twistIn == null
      ? null
      : millerStability({
          weightGr: input.bulletWeightGr,
          diameterIn: input.diameterIn,
          lengthIn: input.bulletLengthIn,
          twistIn: input.twistIn,
          velocityFps: stabilityVelocity,
        });

  const twistForSg15 = twistForStability({
    weightGr: input.bulletWeightGr,
    diameterIn: input.diameterIn,
    lengthIn: input.bulletLengthIn,
    velocityFps: stabilityVelocity,
    sg: 1.5,
  });

  const warnings: WarningCode[] = [];
  if (travelIn < 4) warnings.push("short-travel");
  if (seatingOdd) warnings.push("seating-odd");
  if (input.maxCoalIn != null && input.coalIn > input.maxCoalIn + 0.005) {
    warnings.push("over-magazine");
  }
  if (input.powderDoNotReduce) warnings.push("do-not-reduce");
  if (stability != null && stability < 1.3) warnings.push("unstable");
  else if (stability != null && stability < 1.5) warnings.push("marginal-stability");
  if (
    subsonicCap != null &&
    input.velocityFps != null &&
    input.velocityFps > subsonicCap
  ) {
    warnings.push("over-subsonic-cap");
  }
  if (subsonicKind === "published-only") warnings.push("subsonic-large-case");

  return {
    netCapacityGr,
    capacityEstimated,
    intrusionIn: intrusionUsed,
    travelIn,
    expansionRatio,
    sectionalDensity: sd,
    relativeCapacityIn: rc,
    powleyIndex: powley,
    recommendedIndex,
    bandLow: recommendedIndex - BAND_SLOW,
    bandHigh: recommendedIndex + BAND_FAST,
    judgedIndex,
    burnTravelIn,
    ...window,
    speedOfSoundCold,
    speedOfSoundWarm,
    subsonicCap,
    subsonicKind,
    stability,
    stabilityVelocity,
    stabilityBasis,
    twistForSg15,
    warnings,
  };
}

export function expansionLabel(expansionRatio: number): string {
  if (expansionRatio >= 11) return "High";
  if (expansionRatio >= 8) return "Medium";
  if (expansionRatio >= 6.2) return "Low-medium";
  return "Low";
}

export function expansionSentence(expansionRatio: number): string {
  if (expansionRatio >= 11) {
    return "The bore is large relative to the case, so pressure falls quickly. Faster powders fit. Slow ones are still burning at the muzzle.";
  }
  if (expansionRatio >= 8) {
    return "A normal rifle ratio. Medium powders finish in a typical barrel. A slow magnum powder needs more bore than this gives it.";
  }
  if (expansionRatio >= 6.2) {
    return "Pressure stays up longer. Slower powders start to earn a place, especially with a long barrel.";
  }
  return "Overbore. This is the geometry where slow magnum powders actually add speed instead of muzzle flash.";
}
