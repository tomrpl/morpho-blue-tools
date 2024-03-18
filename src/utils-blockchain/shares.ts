import * as maths from "./maths";

/// @dev The number of virtual shares has been chosen low enough to prevent overflows, and high enough to ensure
/// high precision computations.
const VIRTUAL_SHARES = 10n ** 6n;

/// @dev A number of virtual assets of 1 enforces a conversion rate between shares and assets when a market is
/// empty.
const VIRTUAL_ASSETS = 1n;

/// @dev Calculates the value of `assets` quoted in shares, rounding down.
export const toSharesDown = (
  assets: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint => {
  return maths.mulDivDown(
    assets,
    totalShares + VIRTUAL_SHARES,
    totalAssets + VIRTUAL_ASSETS
  );
};

/// @dev Calculates the value of `shares` quoted in assets, rounding down.
export const toAssetsDown = (
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint => {
  return maths.mulDivDown(
    shares,
    totalAssets + VIRTUAL_ASSETS,
    totalShares + VIRTUAL_SHARES
  );
};

/// @dev Calculates the value of `assets` quoted in shares, rounding up.
export const toSharesUp = (
  assets: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint => {
  return maths.mulDivUp(
    assets,
    totalShares + VIRTUAL_SHARES,
    totalAssets + VIRTUAL_ASSETS
  );
};

/// @dev Calculates the value of `shares` quoted in assets, rounding up.
export const toAssetsUp = (
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint => {
  return maths.mulDivUp(
    shares,
    totalAssets + VIRTUAL_ASSETS,
    totalShares + VIRTUAL_SHARES
  );
};
