import * as fs from "fs";
import * as path from "path";

export class FileUtil {
  static readJSON(filePath: string): any {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      return null; // or handle error as needed
    }
  }

  static writeJSON(filePath: string, data: any): void {
    try {
      // Ensure the directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true }); // Use recursive: true to create parent directories if needed
      }

      const jsonData = JSON.stringify(data, null, 4);
      fs.writeFileSync(filePath, jsonData, "utf8");
    } catch (error) {
      console.error(`Error writing to ${filePath}:`, error);
    }
  }
}
