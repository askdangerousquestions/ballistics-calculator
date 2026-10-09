import assert from "node:assert/strict";
import test from "node:test";
import { bulletBrands, bulletProducts, bulletTypes, bulletsForDiameter } from "./bullets.ts";

test(".224 bullets filter by maker and type together", () => {
  const pool = bulletsForDiameter(0.224);
  const brands = bulletBrands(pool, "");
  assert.ok(brands.includes("Sierra"));
  assert.ok(brands.includes("Hornady"));
  assert.ok(brands.includes("Berger"));
  assert.ok(brands.includes("Nosler"));

  const polymerMakers = bulletBrands(pool, "Polymer tip");
  assert.ok(polymerMakers.includes("Sierra"));
  assert.equal(polymerMakers.includes("Armscor"), false);

  const sierraTypes = bulletTypes(pool, "Sierra");
  assert.ok(sierraTypes.includes("Open tip match"));
  assert.ok(sierraTypes.includes("Polymer tip"));
  assert.ok(sierraTypes.includes("Hollow point"));
  assert.ok(sierraTypes.includes("Full metal jacket"));
  assert.equal(sierraTypes.includes("Bonded"), false);

  const match = bulletProducts(pool, "Sierra", "Open tip match");
  const allSierra = bulletProducts(pool, "Sierra", "");
  assert.ok(allSierra.length > match.length);
  assert.ok(allSierra.some((bullet) => bullet.weightGr === 77 && bullet.name.includes("HPBT MatchKing")));
  const smk = match.find((bullet) => bullet.weightGr === 77 && bullet.name.includes("HPBT MatchKing"));
  assert.ok(smk);
  assert.ok(Math.abs((smk?.lengthIn ?? 0) - 0.994) < 0.02);

  assert.deepEqual(bulletTypes(pool, "Armscor"), ["Full metal jacket"]);
});

test("a .308 groove does not list .224 bullets", () => {
  const pool = bulletsForDiameter(0.308);
  assert.equal(
    pool.some((bullet) => bullet.diameterIn < 0.3),
    false,
  );
  assert.ok(bulletBrands(pool, "Polymer tip").includes("Hornady"));
});
