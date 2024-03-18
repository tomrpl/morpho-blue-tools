export const pow10 = (exponant: bigint | number) => 10n ** BigInt(exponant);

export const WAD = pow10(18);
export const ORACLE_PRICE_SCALE = pow10(36);
export const wMulDown = (x: bigint, y: bigint): bigint => mulDivDown(x, y, WAD);
export const wDivDown = (x: bigint, y: bigint): bigint => mulDivDown(x, WAD, y);
export const wDivUp = (x: bigint, y: bigint): bigint => mulDivUp(x, WAD, y);
export const mulDivDown = (x: bigint, y: bigint, d: bigint): bigint =>
  (x * y) / d;
export const mulDivUp = (x: bigint, y: bigint, d: bigint): bigint =>
  (x * y + (d - 1n)) / d;
export const min = (a: bigint, b: bigint) => (a < b ? a : b);
export const max = (a: bigint, b: bigint) => (a < b ? b : a);

export const wTaylorCompounded = (x: bigint, n: bigint): bigint => {
  const firstTerm = x * n;
  const secondTerm = mulDivDown(firstTerm, firstTerm, 2n * WAD);
  const thirdTerm = mulDivDown(secondTerm, firstTerm, 3n * WAD);
  return firstTerm + secondTerm + thirdTerm;
};
