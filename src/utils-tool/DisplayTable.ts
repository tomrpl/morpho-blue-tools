// DisplayTables.ts
import Table from "cli-table3";
import {
  fetchAllMarketData,
  fetchAndDisplayLiquidatablePositions,
  fetchAndDisplayUserPosition,
} from "../fetcher/mainDataFetcher";

export function displayAccounts(accounts: any[]) {
  const table = new Table({
    head: ["Id", "Nickname", "Address"],
    colWidths: [5, 30, 60],
  });

  accounts.forEach((account, index) => {
    table.push([index + 1, account.nickname, account.address]);
  });

  console.log(table.toString());
}

// Assuming all previous function and type definitions are correct
export const displayUserPositions = async (userAddress: string) => {
  const positions = await fetchAndDisplayUserPosition(userAddress); // Fetch user position data

  const table = new Table({
    head: [
      "Market Id",
      "Collateral Token",
      "Loan Token",
      "LTV",
      "Collateral",
      "Supply Asset User",
      "Borrow Asset User",
      "Health Factor",
    ],
    colWidths: [45, 15, 15, 10, 20, 20, 20, 17],
  });

  positions.forEach((position) => {
    if (position) {
      // Ensure the position is not null
      table.push([
        position.marketId,
        position.collateralToken,
        position.loanToken,
        position.lltv,
        truncateToDecimals(position.collateral, 3),
        truncateToDecimals(position.supplyAssetsUser, 3),
        truncateToDecimals(position.borrowAssetsUser, 3),
        truncateToDecimals(position.healthFactor, 3),
      ]);
    }
  });

  if (table.length > 0) {
    console.log(table.toString()); // Display the table if there are entries
  } else {
    console.log("No active positions found for this user.");
  }
};

// Assuming all previous function and type definitions are correct
export const displayUsersPositions = async () => {
  const positions = await fetchAndDisplayLiquidatablePositions(); // Fetch user position data

  const table = new Table({
    head: [
      "Market Id",
      "userAddress",
      "Collateral",
      "Loan",
      "LTV",
      "Collateral",
      "Supply",
      "Borrow",
      "HF",
    ],
    colWidths: [68, 45, 10, 10, 10, 10, 10, 10, 8],
  });

  positions.forEach((position) => {
    if (position) {
      // Ensure the position is not null
      table.push([
        position.marketId,
        position.userAddress,
        position.collateralToken,
        position.loanToken,
        position.lltv,
        truncateToDecimals(position.collateral, 3),
        truncateToDecimals(position.supplyAssetsUser, 3),
        truncateToDecimals(position.borrowAssetsUser, 3),
        truncateToDecimals(position.healthFactor, 4),
      ]);
    }
  });

  if (table.length > 0) {
    console.log(table.toString()); // Display the table if there are entries
  } else {
    console.log("No active positions found for this user.");
  }
};

function truncateToDecimals(numStr: string, numDecimals: number): string {
  // Find the index of the decimal point
  const decimalIndex = numStr.indexOf(".");
  if (decimalIndex === -1) {
    // No decimal point, return as is
    return numStr;
  }

  // Determine the maximum index based on the number of decimals
  const maxIndex = decimalIndex + 1 + numDecimals;

  // Check if the string needs to be truncated
  if (numStr.length > maxIndex) {
    // More decimals than expected, truncate
    return numStr.substring(0, maxIndex);
  } else {
    // Fewer or equal decimals than expected, return as is
    return numStr;
  }
}

export const displayMarketData = async () => {
  const data = await fetchAllMarketData(); // Fetch market data
  const table = new Table({
    head: [
      "Market Id",
      "Supply APY (%)",
      "Borrow APY (%)",
      "Total Supply (Units)",
      "Total Borrow (Units)",
    ],
    colWidths: [66, 18, 18, 23, 23],
  });

  // Populate the table with data
  for (const market of data) {
    table.push([
      market.id,
      truncateToDecimals(market.supplyAPY, 3),
      truncateToDecimals(market.borrowAPY, 3),
      truncateToDecimals(market.totalSupply, 3),
      truncateToDecimals(market.totalBorrow, 3),
    ]);
  }

  console.log(table.toString()); // Display the table
};
