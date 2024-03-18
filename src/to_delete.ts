export const pow10 = (exponant: bigint | number) => 10n ** BigInt(exponant);
const thousand = 1000n;

// by querying the URD at the market: 0xa921ef34e2fc7a27ccc50ae7e4b154e16c9799d3387076c421423ef52ac4df99
const morphoRewards = 2838888888888888760729600n;

// by querying the Morpho Blue contract: https://etherscan.io/address/0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb#readContract,
// we retrieve the totalSupplyAssets
const totalAssets = 8487139999397n;

// decimal token: USDT = 6
const assetDecimals = 6n;

// in market WBTC/USDT, we are querying for the supply-side, so we need the USDT price
const price = 1n;

// wrong
const morphoRewards1000_wrong =
  ((thousand * (morphoRewards / pow10(18))) /
    (totalAssets / pow10(assetDecimals))) *
  price;

// right
const morphoRewards1000_right =
  (thousand * pow10(assetDecimals) * morphoRewards) /
  (totalAssets * price * pow10(18));

console.log(morphoRewards1000_right);
