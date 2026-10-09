import { barrelFitsSpan, barrelSpanForIndex } from "./ballistics.ts";

export type Cartridge = {
  id: string;
  name: string;
  diameterIn: number;
  caseLengthIn: number;
  /** SAAMI max overall length. Also the usual magazine limit. */
  maxCoalIn: number;
  /** Approximate water capacity to the case mouth, grains. */
  grossCapacityGr: number;
  typicalTwist: number;
  typicalBarrel: number;
};

export type Powder = {
  id: string;
  name: string;
  /** Relative quickness. 100 ≈ IMR 4350. Higher is faster. */
  index: number;
  /** Unsafe to load below a published minimum. */
  doNotReduce: boolean;
};

export const cartridges: Cartridge[] = [
  {
    id: "223rem",
    name: ".223 Remington",
    diameterIn: 0.224,
    caseLengthIn: 1.76,
    maxCoalIn: 2.26,
    grossCapacityGr: 28.8,
    typicalTwist: 8,
    typicalBarrel: 16,
  },
  {
    id: "300blk",
    name: ".300 AAC Blackout",
    diameterIn: 0.308,
    caseLengthIn: 1.368,
    maxCoalIn: 2.26,
    grossCapacityGr: 25.1,
    typicalTwist: 8,
    typicalBarrel: 9,
  },
  {
    id: "308win",
    name: ".308 Winchester",
    diameterIn: 0.308,
    caseLengthIn: 2.015,
    maxCoalIn: 2.81,
    grossCapacityGr: 56,
    typicalTwist: 10,
    typicalBarrel: 20,
  },
  {
    id: "3006",
    name: ".30-06 Springfield",
    diameterIn: 0.308,
    caseLengthIn: 2.494,
    maxCoalIn: 3.34,
    grossCapacityGr: 68,
    typicalTwist: 10,
    typicalBarrel: 22,
  },
  {
    id: "270win",
    name: ".270 Winchester",
    diameterIn: 0.277,
    caseLengthIn: 2.54,
    maxCoalIn: 3.34,
    grossCapacityGr: 67,
    typicalTwist: 10,
    typicalBarrel: 22,
  },
  {
    id: "243win",
    name: ".243 Winchester",
    diameterIn: 0.243,
    caseLengthIn: 2.045,
    maxCoalIn: 2.71,
    grossCapacityGr: 54,
    typicalTwist: 10,
    typicalBarrel: 22,
  },
  {
    id: "65cm",
    name: "6.5 Creedmoor",
    diameterIn: 0.264,
    caseLengthIn: 1.92,
    maxCoalIn: 2.825,
    grossCapacityGr: 52.5,
    typicalTwist: 8,
    typicalBarrel: 24,
  },
  {
    id: "65prc",
    name: "6.5 PRC",
    diameterIn: 0.264,
    caseLengthIn: 2.03,
    maxCoalIn: 2.955,
    grossCapacityGr: 66,
    typicalTwist: 8,
    typicalBarrel: 24,
  },
  {
    id: "7mm08",
    name: "7mm-08 Remington",
    diameterIn: 0.284,
    caseLengthIn: 2.035,
    maxCoalIn: 2.8,
    grossCapacityGr: 54,
    typicalTwist: 9,
    typicalBarrel: 22,
  },
  {
    id: "300wm",
    name: ".300 Winchester Magnum",
    diameterIn: 0.308,
    caseLengthIn: 2.62,
    maxCoalIn: 3.34,
    grossCapacityGr: 90,
    typicalTwist: 10,
    typicalBarrel: 24,
  },
  {
    id: "7rm",
    name: "7mm Remington Magnum",
    diameterIn: 0.284,
    caseLengthIn: 2.5,
    maxCoalIn: 3.29,
    grossCapacityGr: 84,
    typicalTwist: 9.5,
    typicalBarrel: 24,
  },
];

/** Canister powders on the quickness scale. 100 ≈ IMR 4350. Higher is faster. Order follows Hodgdon's Feb 2024 relative-burn chart, snapped to the original anchors. Approximate, and not a load table. */
export const powders: Powder[] = [
  { id: "a2400", name: "Alliant 2400", index: 198, doNotReduce: true },
  { id: "enforcer", name: "Ramshot Enforcer", index: 196, doNotReduce: true },
  { id: "aa9", name: "Accurate No. 9", index: 194, doNotReduce: true },
  { id: "h110", name: "H110", index: 188, doNotReduce: true },
  { id: "w296", name: "Winchester 296", index: 188, doNotReduce: true },
  { id: "lilgun", name: "Lil'Gun", index: 184, doNotReduce: true },
  { id: "imr4227", name: "IMR 4227", index: 180, doNotReduce: false },
  { id: "aa5744", name: "Accurate 5744", index: 176, doNotReduce: false },
  { id: "n110", name: "Vihtavuori N110", index: 174, doNotReduce: false },
  { id: "aa1680", name: "Accurate 1680", index: 170, doNotReduce: false },
  { id: "cfeblk", name: "CFE BLK", index: 168, doNotReduce: false },
  { id: "n120", name: "Vihtavuori N120", index: 164, doNotReduce: false },
  { id: "imr4198", name: "IMR 4198", index: 160, doNotReduce: false },
  { id: "h4198", name: "H4198", index: 158, doNotReduce: false },
  { id: "rl7", name: "Reloder 7", index: 148, doNotReduce: false },
  { id: "n130", name: "Vihtavuori N130", index: 146, doNotReduce: false },
  { id: "h322", name: "H322", index: 144, doNotReduce: false },
  { id: "rl10x", name: "Reloder 10X", index: 142, doNotReduce: false },
  { id: "imr3031", name: "IMR 3031", index: 140, doNotReduce: false },
  { id: "n133", name: "Vihtavuori N133", index: 136, doNotReduce: false },
  { id: "benchmark", name: "Benchmark", index: 134, doNotReduce: false },
  { id: "xterm", name: "Ramshot X-Terminator", index: 132, doNotReduce: false },
  { id: "aa2230", name: "Accurate 2230", index: 130, doNotReduce: false },
  { id: "aa2460", name: "Accurate 2460", index: 129, doNotReduce: false },
  { id: "h335", name: "H335", index: 128, doNotReduce: false },
  { id: "imr8208", name: "IMR 8208 XBR", index: 127, doNotReduce: false },
  { id: "arcomp", name: "AR-Comp", index: 126, doNotReduce: false },
  { id: "tac", name: "Ramshot TAC", index: 125, doNotReduce: false },
  { id: "h4895", name: "H4895", index: 124, doNotReduce: false },
  { id: "imr4895", name: "IMR 4895", index: 122, doNotReduce: false },
  { id: "n135", name: "Vihtavuori N135", index: 121, doNotReduce: false },
  { id: "imr4064", name: "IMR 4064", index: 120, doNotReduce: false },
  { id: "aa2520", name: "Accurate 2520", index: 118, doNotReduce: false },
  { id: "varget", name: "Varget", index: 116, doNotReduce: false },
  { id: "w748", name: "Winchester 748", index: 115, doNotReduce: false },
  { id: "rl15", name: "Reloder 15", index: 114, doNotReduce: false },
  { id: "staballmatch", name: "StaBALL Match", index: 113, doNotReduce: false },
  { id: "n140", name: "Vihtavuori N140", index: 112, doNotReduce: false },
  { id: "n540", name: "Vihtavuori N540", index: 111, doNotReduce: false },
  { id: "imr4320", name: "IMR 4320", index: 110, doNotReduce: false },
  { id: "blc2", name: "BL-C(2)", index: 109, doNotReduce: false },
  { id: "cfe223", name: "CFE 223", index: 106, doNotReduce: false },
  { id: "pp2000", name: "Power Pro 2000-MR", index: 105, doNotReduce: false },
  { id: "leverevo", name: "Leverevolution", index: 104, doNotReduce: false },
  { id: "h380", name: "H380", index: 104, doNotReduce: false },
  { id: "biggame", name: "Ramshot Big Game", index: 103, doNotReduce: false },
  { id: "n150", name: "Vihtavuori N150", index: 103, doNotReduce: false },
  { id: "w760", name: "Winchester 760", index: 101, doNotReduce: false },
  { id: "h414", name: "H414", index: 101, doNotReduce: false },
  { id: "imr4350", name: "IMR 4350", index: 100, doNotReduce: false },
  { id: "rl16", name: "Reloder 16", index: 99, doNotReduce: false },
  { id: "imr4451", name: "IMR 4451", index: 99, doNotReduce: false },
  { id: "h4350", name: "H4350", index: 98, doNotReduce: false },
  { id: "aa4350", name: "Accurate 4350", index: 97, doNotReduce: false },
  { id: "n550", name: "Vihtavuori N550", index: 96, doNotReduce: false },
  { id: "rl17", name: "Reloder 17", index: 94, doNotReduce: false },
  { id: "hybrid100v", name: "Hybrid 100V", index: 93, doNotReduce: false },
  { id: "imr4831", name: "IMR 4831", index: 92, doNotReduce: false },
  { id: "n160", name: "Vihtavuori N160", index: 91, doNotReduce: false },
  { id: "hunter", name: "Ramshot Hunter", index: 91, doNotReduce: false },
  { id: "staball65", name: "StaBALL 6.5", index: 91, doNotReduce: false },
  { id: "h4831sc", name: "H4831sc", index: 90, doNotReduce: false },
  { id: "superformance", name: "Superformance", index: 89, doNotReduce: false },
  { id: "rl19", name: "Reloder 19", index: 88, doNotReduce: false },
  { id: "n560", name: "Vihtavuori N560", index: 87, doNotReduce: false },
  { id: "imr4955", name: "IMR 4955", index: 86, doNotReduce: false },
  { id: "mrp", name: "Norma MRP", index: 85, doNotReduce: false },
  { id: "rl22", name: "Reloder 22", index: 84, doNotReduce: false },
  { id: "rl23", name: "Reloder 23", index: 83, doNotReduce: false },
  { id: "imr7828", name: "IMR 7828", index: 82, doNotReduce: false },
  { id: "n165", name: "Vihtavuori N165", index: 81, doNotReduce: false },
  { id: "mrp2", name: "Norma MRP-2", index: 80, doNotReduce: false },
  { id: "rl26", name: "Reloder 26", index: 78, doNotReduce: false },
  { id: "imr7977", name: "IMR 7977", index: 77, doNotReduce: false },
  { id: "h1000", name: "H1000", index: 76, doNotReduce: false },
  { id: "magpro", name: "Accurate Magpro", index: 75, doNotReduce: false },
  { id: "n170", name: "Vihtavuori N170", index: 74, doNotReduce: false },
  { id: "retumbo", name: "Retumbo", index: 72, doNotReduce: false },
  { id: "staballhd", name: "StaBALL HD", index: 71, doNotReduce: false },
  { id: "ramshotmag", name: "Ramshot Magnum", index: 71, doNotReduce: false },
  { id: "rl25", name: "Reloder 25", index: 70, doNotReduce: false },
  { id: "imr8133", name: "IMR 8133", index: 68, doNotReduce: false },
  { id: "n570", name: "Vihtavuori N570", index: 66, doNotReduce: false },
  { id: "rl33", name: "Reloder 33", index: 64, doNotReduce: false },
  { id: "h50bmg", name: "H50BMG", index: 60, doNotReduce: false },
  { id: "us869", name: "US869", index: 58, doNotReduce: false },
  { id: "rl50", name: "Reloder 50", index: 56, doNotReduce: false },
];

export function cartridgeById(id: string): Cartridge | undefined {
  return cartridges.find((cartridge) => cartridge.id === id);
}

export function burnRank(powder: Powder): number {
  return powders.findIndex((item) => item.id === powder.id) + 1;
}

export function powdersForBarrel(offsetIn: number, barrelIn: number): Powder[] {
  return powders
    .filter((powder) => barrelFitsSpan(barrelIn, barrelSpanForIndex(powder.index, offsetIn)))
    .sort((a, b) => burnRank(a) - burnRank(b));
}

export function powderById(id: string): Powder | undefined {
  return powders.find((powder) => powder.id === id);
}

export function powdersInRange(low: number, high: number): Powder[] {
  const center = (low + high) / 2;
  return powders
    .filter((powder) => powder.index >= low && powder.index <= high)
    .sort(
      (a, b) => Math.abs(a.index - center) - Math.abs(b.index - center) || b.index - a.index,
    );
}

export function nearestPowders(index: number, count: number): Powder[] {
  return [...powders]
    .sort((a, b) => Math.abs(a.index - index) - Math.abs(b.index - index))
    .slice(0, count);
}
