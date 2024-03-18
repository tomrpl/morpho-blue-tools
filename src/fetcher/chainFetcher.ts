import { Provider, ZeroAddress, ethers } from "ethers";

import {
  MORPHO_ADDRESS,
  IRM_ADDRESS,
  SECONDS_PER_YEAR,
  MAX_UINT256,
} from "./constantsBlockchain";

import {
  MorphoBlue__factory,
  BlueIrm__factory,
  BlueOracle__factory,
} from "ethers-types";

import * as maths from "../utils-blockchain/maths";
import * as shares from "../utils-blockchain/shares";

import {
  Contracts,
  MarketState,
  PositionUser,
} from "../utils-blockchain/types";

import { MarketParamsStruct } from "ethers-types/dist/protocols/morpho/blue/MorphoBlue";
import { MulticallWrapper } from "ethers-multicall-provider";

const accrueInterests = (
  lastBlockTimestamp: bigint,
  marketState: MarketState,
  borrowRate: bigint
) => {
  const elapsed = lastBlockTimestamp - marketState.lastUpdate;
  if (elapsed === 0n) return marketState;
  if (marketState.totalBorrowAssets !== 0n) {
    const interest = maths.wMulDown(
      marketState.totalBorrowAssets,
      maths.wTaylorCompounded(borrowRate, elapsed)
    );
    const marketWithNewTotal = {
      ...marketState,
      totalBorrowAssets: marketState.totalBorrowAssets + interest,
      totalSupplyAssets: marketState.totalSupplyAssets + interest,
    };

    if (marketWithNewTotal.fee !== 0n) {
      const feeAmount = maths.wMulDown(interest, marketWithNewTotal.fee);
      // The fee amount is subtracted from the total supply in this calculation to compensate for the fact
      // that total supply is already increased by the full interest (including the fee amount).
      const feeShares = shares.toSharesDown(
        feeAmount,
        marketWithNewTotal.totalSupplyAssets - feeAmount,
        marketWithNewTotal.totalSupplyShares
      );
      //  Useless to keep the feeRecipient. Still keeping it there to keep the original Solidity function.
      // position[id][feeRecipient].supplyShares += feeShares;
      return {
        ...marketWithNewTotal,
        totalSupplyShares: marketWithNewTotal.totalSupplyShares + feeShares,
      };
    }
    return marketWithNewTotal;
  }
  return marketState;
};

export const getProvider = () => {
  const endpoint = process.env.RPC_URL;
  if (!endpoint) {
    console.log("RPC_URL not set. Exiting…");
    process.exit(1);
  }
  return MulticallWrapper.wrap(new ethers.JsonRpcProvider(endpoint));
};

export const getChainId = async (provider?: Provider) => {
  const { chainId } = await (provider ?? getProvider()).getNetwork();
  return chainId;
};

export const morphoContracts = async (provider?: Provider) => {
  if (typeof MORPHO_ADDRESS !== "string" || !MORPHO_ADDRESS)
    throw new Error("MORPHO_ADDRESS unset");
  const morphoBlue = MorphoBlue__factory.connect(
    MORPHO_ADDRESS,
    provider ?? getProvider()
  );
  return { morphoBlue };
};

export const fetchMarketData = async (
  { morphoBlue }: Contracts,
  id: string,
  provider?: Provider
): Promise<[bigint, bigint, bigint, bigint]> => {
  try {
    provider ??= getProvider();
    const block = await provider.getBlock("latest");

    const [marketParams_, marketState_] = await Promise.all([
      morphoBlue.idToMarketParams(id),
      morphoBlue.market(id),
    ]);

    const marketParams: MarketParamsStruct = {
      loanToken: marketParams_.loanToken,
      collateralToken: marketParams_.collateralToken,
      oracle: marketParams_.oracle,
      irm: marketParams_.irm,
      lltv: marketParams_.lltv,
    };

    let marketState: MarketState = {
      totalSupplyAssets: marketState_.totalSupplyAssets,
      totalSupplyShares: marketState_.totalSupplyShares,
      totalBorrowAssets: marketState_.totalBorrowAssets,
      totalBorrowShares: marketState_.totalBorrowShares,
      lastUpdate: marketState_.lastUpdate,
      fee: marketState_.fee,
    };

    const irm = BlueIrm__factory.connect(IRM_ADDRESS, provider);

    const borrowRate =
      IRM_ADDRESS !== ZeroAddress
        ? await irm.borrowRateView(marketParams, marketState)
        : 0n;
    marketState = accrueInterests(
      BigInt(block!.timestamp),
      marketState,
      borrowRate
    );

    const borrowAPY = maths.wTaylorCompounded(
      borrowRate,
      BigInt(SECONDS_PER_YEAR)
    );

    let supplyAPY = 0n;

    if (marketState.totalSupplyAssets !== 0n) {
      const utilization = maths.wDivUp(
        marketState.totalBorrowAssets,
        marketState.totalSupplyAssets
      );
      supplyAPY = maths.wMulDown(
        maths.wMulDown(borrowAPY, maths.WAD - marketState.fee),
        utilization
      );
    }

    const marketTotalBorrow = marketState.totalBorrowAssets;
    const marketTotalSupply = marketState.totalSupplyAssets;

    return [supplyAPY, borrowAPY, marketTotalSupply, marketTotalBorrow];
  } catch (error) {
    throw error;
  }
};

export const fetchUserData = async (
  { morphoBlue }: Contracts,
  id: string,
  usr: string,
  provider?: Provider
): Promise<[boolean, bigint, bigint, bigint, bigint] | null> => {
  try {
    provider ??= getProvider();
    const block = await provider.getBlock("latest");

    const [marketParams_, marketState_, position_] = await Promise.all([
      morphoBlue.idToMarketParams(id),
      morphoBlue.market(id),
      morphoBlue.position(id, usr),
    ]);
    if (
      position_.supplyShares === 0n &&
      position_.borrowShares === 0n &&
      position_.collateral === 0n
    ) {
      // Return null or another appropriate value to indicate this market should be skipped
      return null;
    }

    const marketParams: MarketParamsStruct = {
      loanToken: marketParams_.loanToken,
      collateralToken: marketParams_.collateralToken,
      oracle: marketParams_.oracle,
      irm: marketParams_.irm,
      lltv: marketParams_.lltv,
    };

    if (marketParams_.oracle === ZeroAddress) {
      return null;
    }

    let marketState: MarketState = {
      totalSupplyAssets: marketState_.totalSupplyAssets,
      totalSupplyShares: marketState_.totalSupplyShares,
      totalBorrowAssets: marketState_.totalBorrowAssets,
      totalBorrowShares: marketState_.totalBorrowShares,
      lastUpdate: marketState_.lastUpdate,
      fee: marketState_.fee,
    };

    const position: PositionUser = {
      supplyShares: position_.supplyShares,
      borrowShares: position_.borrowShares,
      collateral: position_.collateral,
    };

    const irm = BlueIrm__factory.connect(IRM_ADDRESS, provider);
    const borrowRate =
      IRM_ADDRESS !== ZeroAddress
        ? await irm.borrowRateView(marketParams, marketState)
        : 0n;

    marketState = accrueInterests(
      BigInt(block!.timestamp),
      marketState,
      borrowRate
    );

    const borrowAssetsUser = shares.toAssetsUp(
      position.borrowShares,
      marketState.totalBorrowAssets,
      marketState.totalBorrowShares
    );

    const supplyAssetsUser = shares.toAssetsUp(
      position.supplyShares,
      marketState.totalSupplyAssets,
      marketState.totalSupplyShares
    );
    const oracle = BlueOracle__factory.connect(marketParams_.oracle, provider);
    const collateralPrice = await oracle.price();
    const maxBorrow = maths.wMulDown(
      maths.mulDivDown(
        position.collateral,
        collateralPrice,
        maths.ORACLE_PRICE_SCALE
      ),
      marketParams_.lltv
    );
    const isHealthy = maxBorrow >= borrowAssetsUser;
    let healthFactor;
    if (borrowAssetsUser === 0n) {
      healthFactor = MAX_UINT256;
    }
    healthFactor =
      borrowAssetsUser === 0n
        ? MAX_UINT256
        : maths.wDivDown(maxBorrow, borrowAssetsUser);

    return [
      isHealthy,
      healthFactor,
      position.collateral,
      borrowAssetsUser,
      supplyAssetsUser,
    ];
  } catch (error) {
    throw error;
  }
};

export const fetchAllUserData = async (
  contracts: Contracts,
  marketId: string,
  userAddresses: string[],
  provider?: Provider
): Promise<
  Array<{
    userAddress: string;
    isHealthy: boolean;
    healthFactor: string;
    collateral: string;
    borrowAssetsUser: string;
    supplyAssetsUser: string;
  } | null>
> => {
  try {
    provider ??= getProvider();
    const block = await provider.getBlock("latest");

    // Fetch market parameters and state once for all users
    const [marketParams_, marketState_] = await Promise.all([
      contracts.morphoBlue.idToMarketParams(marketId),
      contracts.morphoBlue.market(marketId),
    ]);
    let marketState: MarketState = {
      totalSupplyAssets: marketState_.totalSupplyAssets,
      totalSupplyShares: marketState_.totalSupplyShares,
      totalBorrowAssets: marketState_.totalBorrowAssets,
      totalBorrowShares: marketState_.totalBorrowShares,
      lastUpdate: marketState_.lastUpdate,
      fee: marketState_.fee,
    };
    const marketParams: MarketParamsStruct = {
      loanToken: marketParams_.loanToken,
      collateralToken: marketParams_.collateralToken,
      oracle: marketParams_.oracle,
      irm: marketParams_.irm,
      lltv: marketParams_.lltv,
    };
    const irm = BlueIrm__factory.connect(IRM_ADDRESS, provider);
    const borrowRate =
      IRM_ADDRESS !== ZeroAddress
        ? await irm.borrowRateView(marketParams, marketState)
        : 0n;

    marketState = accrueInterests(
      BigInt(block!.timestamp),
      marketState,
      borrowRate
    );

    const oracle = BlueOracle__factory.connect(marketParams_.oracle, provider);
    const collateralPrice = await oracle.price();
    // Process each user's position in parallel
    const userPositionsPromises = userAddresses.map(async (userAddress) => {
      const position_ = await contracts.morphoBlue.position(
        marketId,
        userAddress
      );

      if (
        position_.supplyShares === 0n &&
        position_.borrowShares === 0n &&
        position_.collateral === 0n
      ) {
        return null; // Skip users with no position
      }

      // Calculate user-specific data
      const borrowAssetsUser = shares.toAssetsUp(
        position_.borrowShares,
        marketState.totalBorrowAssets,
        marketState.totalBorrowShares
      );

      const supplyAssetsUser = shares.toAssetsUp(
        position_.supplyShares,
        marketState.totalSupplyAssets,
        marketState.totalSupplyShares
      );

      const maxBorrow = maths.wMulDown(
        maths.mulDivDown(
          position_.collateral,
          collateralPrice,
          maths.ORACLE_PRICE_SCALE
        ),
        marketParams_.lltv
      );
      const isHealthy = maxBorrow >= borrowAssetsUser;
      let healthFactor =
        borrowAssetsUser === 0n
          ? MAX_UINT256
          : maths.wDivDown(maxBorrow, borrowAssetsUser);

      return {
        userAddress,
        isHealthy,
        healthFactor: healthFactor.toString(),
        collateral: position_.collateral.toString(),
        borrowAssetsUser: borrowAssetsUser.toString(),
        supplyAssetsUser: supplyAssetsUser.toString(),
      };
    });

    // Await all user position promises
    const userPositions = await Promise.all(userPositionsPromises);
    return userPositions.filter((position) => position !== null); // Filter out null positions
  } catch (error) {
    console.error(`Error fetching user data for market ${marketId}:`, error);
    throw error; // Or handle it more gracefully
  }
};
