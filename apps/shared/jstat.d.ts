// Ambient typings for jstat (the package ships no TypeScript declarations and
// @types/jstat does not exist on npm). Covers only the surface the platform
// uses: distribution pdf/cdf/inv. The variadic `params` captures each
// distribution's own argument list (e.g. normal: mean, std; gamma: shape, scale).
declare module "jstat" {
  interface ContinuousDistribution {
    pdf(x: number, ...params: number[]): number;
    cdf(x: number, ...params: number[]): number;
    inv(p: number, ...params: number[]): number;
    mean(...params: number[]): number;
    variance(...params: number[]): number;
  }

  interface DiscreteDistribution {
    pdf(k: number, ...params: number[]): number;
    cdf(k: number, ...params: number[]): number;
    mean(...params: number[]): number;
    variance(...params: number[]): number;
  }

  const jStat: {
    normal: ContinuousDistribution;
    studentt: ContinuousDistribution;
    beta: ContinuousDistribution;
    gamma: ContinuousDistribution;
    chisquare: ContinuousDistribution;
    exponential: ContinuousDistribution;
    uniform: ContinuousDistribution;
    centralF: ContinuousDistribution;
    poisson: DiscreteDistribution;
    binomial: DiscreteDistribution;
  };

  export default jStat;
}
