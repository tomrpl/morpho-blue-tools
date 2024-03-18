import dotenv from "dotenv";
import {
  fetchAllUserData,
  fetchMarketData,
  fetchUserData,
  getProvider,
  morphoContracts,
} from "./chainFetcher";
import { formatEther, formatUnits } from "ethers";
import { markets } from "./marketsId";
import { MarketData } from "../utils-blockchain/types";
import fs from "fs";
import path from "path";

dotenv.config();

export const fetchAndDisplayUserPosition = async (userAddress: string) => {
  const provider = getProvider();
  const contracts = await morphoContracts(provider);

  // Correct type declaration for userPositions
  let userPositions: ({
    marketId: string;
    collateralToken: string;
    loanToken: string;
    lltv: string;
    collateral: string;
    borrowAssetsUser: string;
    supplyAssetsUser: string;
    loanTokenDecimals: number;
    collateralTokenDecimals: number;
    isHealthy: boolean;
    healthFactor: string;
  } | null)[] = []; // This expects an array of objects or nulls, not promises.

  const userDataPromises = markets.map(async (market) => {
    try {
      const userData = await fetchUserData(
        contracts,
        market.id,
        userAddress,
        provider
      );
      if (userData !== null) {
        const [
          isHealthy,
          healthFactor,
          collateral,
          borrowAssetsUser,
          supplyAssetsUser,
        ] = userData;

        return {
          marketId: market.id,
          collateralToken: market.collateralToken,
          loanToken: market.loanToken,
          lltv: market.lltv,
          collateral: formatUnits(
            collateral,
            market.collateralTokenDecimals
          ).toString(),
          borrowAssetsUser: formatUnits(
            borrowAssetsUser,
            market.loanTokenDecimals
          ).toString(),
          supplyAssetsUser: formatUnits(
            supplyAssetsUser,
            market.loanTokenDecimals
          ).toString(),
          loanTokenDecimals: market.loanTokenDecimals,
          collateralTokenDecimals: market.collateralTokenDecimals,
          isHealthy,
          healthFactor: formatEther(healthFactor).toString(),
        };
      }
    } catch (error) {
      console.error(`Error fetching data for marketId: ${market.id}`, error);
    }
    return null;
  });

  const results = await Promise.allSettled(userDataPromises);
  userPositions = results.map((result) => {
    if (result.status === "fulfilled" && result.value !== null) {
      return result.value;
    } else {
      return null;
    }
  });

  return userPositions;
};

export const fetchAllMarketData = async (): Promise<MarketData[]> => {
  const provider = getProvider();
  const contracts = await morphoContracts(provider);

  // Use Promise.allSettled to allow all promises to complete, regardless of rejection
  const results = await Promise.allSettled(
    markets.map(async (market) => {
      try {
        const [supplyAPY, borrowAPY, marketTotalSupply, marketTotalBorrow] =
          await fetchMarketData(contracts, market.id, provider);
        return {
          id: market.id,
          supplyAPY: formatEther(supplyAPY * 100n),
          borrowAPY: formatEther(borrowAPY * 100n),
          totalSupply: formatUnits(marketTotalSupply, market.loanTokenDecimals),
          totalBorrow: formatUnits(marketTotalBorrow, market.loanTokenDecimals),
        };
      } catch (error) {
        console.error(`Error fetching data for marketId: ${market.id}`, error);
        // Return null to handle errors, but these will be filtered out.
        return null;
      }
    })
  );

  // Filter out any rejected promises or null results, ensuring all returned items match the MarketData type
  const marketData: MarketData[] = results
    .filter(
      (result): result is PromiseFulfilledResult<MarketData> =>
        result.status === "fulfilled" && result.value !== null
    )
    .map((result) => result.value);

  return marketData;
};

export const fetchAndDisplayLiquidatablePositions = async () => {
  const provider = getProvider();
  const contracts = await morphoContracts(provider);
  type UserPosition = {
    marketId: string;
    userAddress: string;
    collateralToken: string;
    loanToken: string;
    lltv: string;
    collateral: string;
    borrowAssetsUser: string;
    supplyAssetsUser: string;
    loanTokenDecimals: number;
    collateralTokenDecimals: number;
    isHealthy: boolean;
    healthFactor: string;
  };
  const borrowersDataPath = path.resolve(
    __dirname,
    "borrowersPerMarket",
    "borrowers.json"
  );
  const borrowersData = JSON.parse(fs.readFileSync(borrowersDataPath, "utf8"));

  const marketPromises = markets.map(async (market) => {
    const userAddresses = borrowersData[market.id] || [];
    if (userAddresses.length === 0) return [];

    try {
      const usersData = await fetchAllUserData(
        contracts,
        market.id,
        userAddresses,
        provider
      );

      // Filter and map to liquidatable positions
      return usersData
        .filter(
          (userData) => userData && parseFloat(userData.healthFactor) < 1.1e18
        )
        .map((userData) => {
          if (!userData) return null; // This check might be redundant given the filter above
          return {
            marketId: market.id,
            userAddress: userData.userAddress,
            collateralToken: market.collateralToken,
            loanToken: market.loanToken,
            lltv: market.lltv,
            collateral: formatUnits(
              userData.collateral,
              market.collateralTokenDecimals
            ),
            borrowAssetsUser: formatUnits(
              userData.borrowAssetsUser,
              market.loanTokenDecimals
            ),
            supplyAssetsUser: formatUnits(
              userData.supplyAssetsUser,
              market.loanTokenDecimals
            ),
            loanTokenDecimals: market.loanTokenDecimals,
            collateralTokenDecimals: market.collateralTokenDecimals,
            isHealthy: userData.isHealthy,
            healthFactor: formatEther(userData.healthFactor),
          };
        })
        .filter((position): position is UserPosition => position !== null);
    } catch (error) {
      console.error(`Error processing market ${market.id}:`, error);
      return []; // Return an empty array on error to keep the structure consistent
    }
  });

  const results = await Promise.allSettled(marketPromises);
  let allUserPositions = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  // Sort if needed, similar to the original function
  return allUserPositions.sort(
    (a, b) => parseFloat(a.healthFactor) - parseFloat(b.healthFactor)
  );
};
