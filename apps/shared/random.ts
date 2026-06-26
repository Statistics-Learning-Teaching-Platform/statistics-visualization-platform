// Seeded RNG + distribution samplers shared across the WALS simulation apps.
// Source: consolidated from the byte-identical apps/*/src/utils/random.ts copies.

export function createRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalRandom(rng: () => number, mean = 0, sd = 1): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sd * z;
}

export function exponentialRandom(rng: () => number, lambda = 1): number {
  return -Math.log(Math.max(1 - rng(), Number.EPSILON)) / lambda;
}

export function gammaRandom(rng: () => number, shape: number, rate: number): number {
  if (shape < 1) {
    return gammaRandom(rng, shape + 1, rate) * Math.pow(rng(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    const x = normalRandom(rng);
    const v = Math.pow(1 + c * x, 3);
    if (v <= 0) continue;
    const u = rng();
    if (u < 1 - 0.0331 * Math.pow(x, 4)) return (d * v) / rate;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return (d * v) / rate;
  }
}

export function sampleWithReplacement<T>(rng: () => number, values: T[], size: number): T[] {
  return Array.from({ length: size }, () => values[Math.floor(rng() * values.length)]);
}
