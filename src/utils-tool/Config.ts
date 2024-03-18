// Config.ts
import * as fs from "fs";
import * as path from "path";

export const ROOT_DIR = path.resolve(__dirname, ".."); // Adjust as necessary to point to your project root

export function getConfig() {
  const configPath = path.join(ROOT_DIR, "config.json");
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(configFile);
  } else {
    throw new Error("config.json not found");
  }
}
