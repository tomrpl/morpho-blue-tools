import dotenv from "dotenv";
import { ethers } from "ethers";
import { getProvider, morphoContracts } from "./chainFetcher";
import { markets } from "./marketsId";
import fs from "fs";
import path from "path";
import { MorphoBlue } from "ethers-types";

dotenv.config();

export interface Contracts {
  morphoBlue: MorphoBlue;
}

async function fetchBorrowersForMarket(
  marketId: string,
  morphoBlue: MorphoBlue,
  startBlock: number,
  endBlock: string | number
): Promise<{ marketId: string; borrowers: string[] }> {
  // Ensure marketId is normalized with '0x' prefix and lowercase for comparison
  const normalizedMarketId = marketId.toLowerCase().startsWith("0x")
    ? marketId.toLowerCase()
    : `0x${marketId.toLowerCase()}`;

  const borrowEventFilter = morphoBlue.filters.Borrow();
  const events = await morphoBlue.queryFilter(
    borrowEventFilter,
    startBlock,
    endBlock
  );

  // Manually filter events by normalized marketId
  const filteredEvents = events.filter(
    (event) => event.args.id.toLowerCase() === normalizedMarketId // Adjust to match the event argument structure
  );

  const borrowers = new Set(filteredEvents.map((event) => event.args.onBehalf));

  return { marketId: normalizedMarketId, borrowers: Array.from(borrowers) };
}

interface BorrowersPerMarket {
  [marketId: string]: string[];
}

export const compileBorrowersPerMarket = async (
  startBlock = 18883124,
  endBlock = "latest"
): Promise<void> => {
  const provider = getProvider();
  const contracts = await morphoContracts(provider);

  const promises = markets.map(({ id }) =>
    fetchBorrowersForMarket(id, contracts.morphoBlue, startBlock, endBlock)
  );

  const results = await Promise.all(promises);

  const borrowersPerMarket = results.reduce<BorrowersPerMarket>(
    (acc, { marketId, borrowers }) => {
      acc[marketId] = borrowers;
      return acc;
    },
    {}
  );

  const filePath = path.resolve(
    __dirname,
    "borrowersPerMarket",
    "borrowers.json"
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify(borrowersPerMarket, null, 2),
    "utf8"
  );

  console.log("Borrowers per market data has been compiled and saved.");
};

compileBorrowersPerMarket().catch(console.error);
