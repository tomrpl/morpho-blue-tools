// CacheManager.ts
import { FileUtil } from "./FileUtil";
import * as path from "path";

// Assuming ROOT_DIR is defined in your `config.ts` and points to your project root
import { ROOT_DIR } from "./Config";

class CacheManager {
  private static getCachePath(): string {
    return path.join(ROOT_DIR, ".mp");
  }

  private static getCacheFilePath(fileName: string): string {
    return path.join(CacheManager.getCachePath(), `${fileName}.json`);
  }

  static getAccounts(provider: string): any[] {
    const fileName = `${provider}_accounts`;
    const filePath = CacheManager.getCacheFilePath(fileName);
    const data = FileUtil.readJSON(filePath);
    return data?.accounts || [];
  }

  static addAccount(provider: string, account: any): void {
    const accounts = CacheManager.getAccounts(provider);
    accounts.push(account);
    const fileName = `${provider}_accounts`;
    FileUtil.writeJSON(CacheManager.getCacheFilePath(fileName), { accounts });
  }
}

export { CacheManager };
