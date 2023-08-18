#!/usr/bin/env node
import { Command } from "commander";
import "dotenv/config";
import { functionCallApp } from "./functionCall";
import { commentDiffApp } from "./commentDiff";
import { commentDiffApp2 } from "./commentDiff2";

function main() {
  const program = new Command();
  program.description("Chat GPT Toolkit");

  program
    .command("comment-diff-v1")
    .description("Diff parser example")
    .option("-m, --max-tokens <maxTokens>", "max tokens", undefined)
    .option("-l, --limit <limit>", "limit", "10")
    .option("-f, --file <file>", "file to parse")
    .option("-d, --debug", "debug mode", false)
    .action(async (options) => {
      await commentDiffApp({
        maxTokens: parseInt(options.maxTokens),
        limit: parseInt(options.limit),
        file: options.file,
        debug: options.debug,
      });
    });

  program
    .command("comment-diff-v2", { isDefault: true })
    .description("Diff parser example")
    .option("-m, --max-tokens <maxTokens>", "max tokens", undefined)
    .option("-l, --limit <limit>", "limit", "10")
    .option("-f, --file <file>", "file to parse")
    .option("-d, --debug", "debug mode", false)
    .action(async (options) => {
      await commentDiffApp2({
        maxTokens: parseInt(options.maxTokens),
        limit: parseInt(options.limit),
        debug: options.debug,
        file: options.file,
      });
    });

  program
    .command("function-call")
    .description("Function call example")
    .option("-t, --temperature <temperature>", "temperature", "0.9")
    .option("-m, --max-tokens <maxTokens>", "max tokens", undefined)
    .option("-d, --debug", "debug mode", false)
    .action(async (options) => {
      await functionCallApp({
        temperature: parseFloat(options.temperature),
        maxTokens: parseInt(options.maxTokens),
        debug: options.debug,
      });
    });

  program.parse(process.argv);
}

main();
