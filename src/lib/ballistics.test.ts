import assert from "node:assert/strict";
import test from "node:test";
import {
  burnTravelForIndex,
  evaluate,
  fitIndex,
  indexForBurnTravel,
  millerStability,
  speedOfSoundFps,
} from "./ballistics.ts";
import { burnRank, powderById, powdersForBarrel } from "./data.ts";

const rl17 = powderById("rl17");
const varget = powderById("varget");
assert.ok(rl17 && varget);

const base308 = {
  diameterIn: 0.308,
  caseLengthIn: 2.015,
  grossCapacityGr: 56,
  maxCoalIn: 2.81,
  coalIn: 2.8,
  bulletWeightGr: 168,
  bulletLengthIn: 1.21,
  barrelIn: 20,
  twistIn: 10,
  measuredNetGr: null,
  powderIndex: null,
  powderDoNotReduce: false,
  goal: "general" as const,
  coldTempF: 20,
  velocityFps: null,
};

test("added powders keep their place around the original anchors", () => {
  const tac = powderById("tac");
  const h335 = powderById("h335");
  const h4895 = powderById("h4895");
  const rl16 = powderById("rl16");
  const h4350 = powderById("h4350");
  const a2400 = powderById("a2400");
  assert.ok(tac && h335 && h4895 && rl16 && h4350 && a2400);
  assert.ok(powderById("h322") && powderById("n133") && powderById("w748") && powderById("rl23"));
  assert.ok(tac.index < h335.index && tac.index > h4895.index);
  assert.ok(rl16.index > h4350.index && rl16.index < 102);
  assert.equal(a2400.doNotReduce, true);
  assert.ok(a2400.index > powderById("h110")!.index);
});

test("20 inch .308 wants a Varget-class powder, not Reloder 17", () => {
  const result = evaluate(base308);
  assert.ok(result.recommendedIndex > 108 && result.recommendedIndex < 128);
  assert.equal(fitIndex(varget.index, result.recommendedIndex), "matched");
  assert.equal(fitIndex(rl17.index, result.recommendedIndex), "too-slow");
  assert.ok(result.expansionRatio > 7 && result.expansionRatio < 11);
});

test("a longer .308 barrel lets Reloder 17 into the band", () => {
  const short = evaluate({ ...base308, powderIndex: rl17.index });
  const long = evaluate({ ...base308, barrelIn: 26, powderIndex: rl17.index });
  assert.equal(fitIndex(rl17.index, short.recommendedIndex), "too-slow");
  assert.notEqual(fitIndex(rl17.index, long.recommendedIndex), "too-slow");
  assert.ok(short.barrelIdealIn > 23 && short.barrelIdealIn < 29);
});

test("220 gr .300 BLK subsonic wants a fast powder and a short barrel", () => {
  const result = evaluate({
    diameterIn: 0.308,
    caseLengthIn: 1.368,
    grossCapacityGr: 25.1,
    maxCoalIn: 2.26,
    coalIn: 2.26,
    bulletWeightGr: 220,
    bulletLengthIn: 1.55,
    barrelIn: 9,
    twistIn: 8,
    measuredNetGr: null,
    powderIndex: null,
    powderDoNotReduce: false,
    goal: "subsonic",
    coldTempF: 20,
    velocityFps: null,
  });
  assert.equal(result.subsonicKind, "fast-case");
  assert.ok(result.recommendedIndex >= 168);
  assert.equal(fitIndex(rl17.index, result.recommendedIndex), "too-slow");
  assert.ok(result.barrelIdealIn > 7 && result.barrelIdealIn < 11);
  assert.ok(result.expansionRatio > 10);
  assert.ok(result.subsonicCap != null && result.subsonicCap < 1080);
  assert.ok(result.stability != null && result.stability > 1.5);
  assert.ok(!("chargeGr" in result));
});

test("1:12 is not enough twist for a long 220 gr subsonic", () => {
  const sg = millerStability({
    weightGr: 220,
    diameterIn: 0.308,
    lengthIn: 1.55,
    twistIn: 12,
    velocityFps: 1020,
  });
  assert.ok(sg < 1.4);
});

test("an unknown twist still returns the powder and the twist that bullet needs", () => {
  const result = evaluate({ ...base308, twistIn: null });
  assert.equal(result.stability, null);
  assert.ok(result.recommendedIndex > 108 && result.recommendedIndex < 128);
  assert.ok(result.twistForSg15 > 7 && result.twistForSg15 < 14);
  assert.equal(result.warnings.includes("unstable"), false);
});

test("the band is every powder whose useful length covers this barrel", () => {
  const offset = base308.coalIn - base308.bulletLengthIn;
  const fitting = powdersForBarrel(offset, base308.barrelIn);
  const names = fitting.map((powder) => powder.name);
  assert.ok(names.includes("Varget"));
  assert.equal(names.includes("Reloder 17"), false);
  assert.ok(fitting.length > 8);
  for (let i = 1; i < fitting.length; i++) {
    assert.ok(burnRank(fitting[i]) > burnRank(fitting[i - 1]));
  }
  assert.equal(burnRank(powderById("a2400")!), 1);
  assert.ok(burnRank(powderById("tac")!) > burnRank(powderById("imr8208")!));
  const blk = powdersForBarrel(2.26 - 1.55, 9);
  assert.ok(blk.some((powder) => powder.name === "H110"));
  assert.equal(blk.some((powder) => powder.name === "Reloder 17"), false);
});

test("burn length and index are inverses, and sound speed drops in the cold", () => {
  const back = indexForBurnTravel(burnTravelForIndex(116));
  assert.ok(Math.abs(back - 116) < 0.05);
  assert.ok(speedOfSoundFps(0) < speedOfSoundFps(70) - 60);
});
