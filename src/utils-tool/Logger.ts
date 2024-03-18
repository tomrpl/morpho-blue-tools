import * as readline from "readline";
import chalk, { ChalkFunction } from "chalk";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export class Logger {
  static error(message: string, showEmoji: boolean = true): void {
    this.logMessage(message, chalk.red, showEmoji);
  }

  static success(message: string, showEmoji: boolean = true): void {
    this.logMessage(message, chalk.green, showEmoji);
  }

  static info(message: string, showEmoji: boolean = true): void {
    this.logMessage(message, chalk.magenta, showEmoji);
  }

  static warning(message: string, showEmoji: boolean = true): void {
    this.logMessage(message, chalk.yellow, showEmoji);
  }

  static question(message: string, showEmoji: boolean = true): Promise<string> {
    const emoji = showEmoji ? "❓ " : "";
    return new Promise((resolve) => {
      rl.question(chalk.magenta(`${emoji}${message}`), (input: string) => {
        resolve(input);
      });
    });
  }

  static close(): void {
    rl.close();
  }

  private static logMessage(
    message: string,
    colorFn: ChalkFunction,
    showEmoji: boolean
  ): void {
    const emoji = showEmoji ? this.getEmoji(colorFn) + " " : "";
    const [beforeColon, afterColon] = message.split(/:(.+)/);
    const formattedMessage =
      beforeColon + (afterColon ? ":" + chalk.cyan(afterColon) : "");

    console.log(`${emoji}${colorFn(formattedMessage)}`);
  }

  private static getEmoji(colorFn: ChalkFunction): string {
    if (colorFn === chalk.red) return "❌";
    if (colorFn === chalk.green) return "✅";
    if (colorFn === chalk.magenta) return "ℹ️";
    if (colorFn === chalk.yellow) return "⚠️";
    return "";
  }
}
