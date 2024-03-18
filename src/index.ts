// index.ts
import { OPTIONS } from "./utils-tool/constants";

import { CacheManager } from "./utils-tool/CacheManager";
import {
  displayAccounts,
  displayMarketData,
  displayUserPositions,
  displayUsersPositions,
} from "./utils-tool/DisplayTable";
import { Logger } from "./utils-tool/Logger";

const main = async (): Promise<void> => {
  Logger.info("\n============ OPTIONS ============", false);
  OPTIONS.forEach((option, index) => {
    Logger.info(` ${index + 1}. ${option}`, false);
  });
  Logger.info("=================================\n", false);

  const userInput = await Logger.question("Select an option: ");
  const userChoice = parseInt(userInput);
  if (isNaN(userChoice) || userChoice < 1 || userChoice > OPTIONS.length) {
    Logger.error("Invalid option selected. Please try again.");
    return main(); // Recursive call to handle the error
  }
  switch (userChoice) {
    case 1:
      // Logic for "Morpho Position"
      Logger.info("Starting Morpho Position...", false);
      const accounts = CacheManager.getAccounts("accounts");
      if (accounts.length === 0) {
        Logger.warning("No accounts found. Create one?");
        const userInputAccount = await Logger.question("Yes/No: ");
        if (userInputAccount === "Yes") {
          const nickname = await Logger.question(
            " => Enter a nickname for this account: "
          );
          const address = await Logger.question(
            " => Enter the address of the wallet you want to check on: (starting with 0x...) "
          );
          CacheManager.addAccount("accounts", {
            nickname: nickname,
            address: address,
          });
        }
      } else {
        displayAccounts(accounts);
        const accountInput = await Logger.question("Select an account by ID: ");
        const accountId = parseInt(accountInput);
        if (isNaN(accountId) || accountId < 1 || accountId > accounts.length) {
          Logger.error("Invalid account ID selected. Please try again.");
          return main(); // Recursive call to restart the process
        }

        const selectedAccount = accounts[accountId - 1]; // Array is 0-indexed
        Logger.info(`You've selected account: ${selectedAccount.nickname}`);
        await displayUserPositions(selectedAccount.address);
      }
      break;
    case 2:
      // Logic for "Morpho Users"
      Logger.info("Starting Morpho Liquidatable Users...");
      displayUsersPositions();
      break;
    case 3:
      // Logic for "Quit"
      Logger.info("Starting Morpho Markets Data...", false);
      await displayMarketData();

      break;
    case 4:
      // Logic for "Quit"
      Logger.info("Quitting...");
      process.exit(0);
      break;
    default:
      Logger.error("Invalid option selected. Please try again.");
      return main(); // Recursive call to handle the error
  }
};

main().catch((err: Error) => {
  console.error("An unexpected error occurred:", err);
  process.exit(1);
});
