import chalk from "chalk";
import { readFile } from "node:fs/promises";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { splitGitDiffChunks } from "./splitGitDiffChunks";

interface Config {
  file: string;
  maxTokens: number;
  limit: number;
  debug: boolean;
}

export async function commentDiffApp2(config: Config) {
  const { file, limit } = config;
  if (limit < 1) throw new Error("limit must be greater than 0");

  const diffData = await readFile(file, "utf-8");
  const chunks = splitGitDiffChunks(diffData);
  if (chunks.length > limit) {
    console.log(chalk.red(`This diff file includes ${chunks.length} chunks (limit: ${limit}).`));
  }

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  });
  const openai = new OpenAIApi(configuration);

  const responses: string[] = [];
  for (const diff of chunks.slice(0, limit)) {
    const response = await commentOnDiff(openai, diff, config);
    responses.push(response);
  }

  const summary = await summarizeAllResponses(openai, responses, config);
  console.log(summary);
}

async function commentOnDiff(openai: OpenAIApi, diff: string, config: Config) {
  const { debug } = config;

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: "system",
      content: `I want you to act as a senior software engineer and review the following diff.
A portion of the difference for a Pull Request is given.
You should write a brief summary on the diff to explain the changes.
This summary will be used as part of the data set to later create PR description.
Do not include the diff itself in the summary. Do not write explanations that does not follow the format below.
Do not include empty lines in your responses.
Use the following format for your responses:
{Filename of the diff. If you do not know, print UNKNOWN_FILE}: {Brief summary of changes, maximum of 200 characters}
`,
    },
    {
      role: "user",
      content: JSON.stringify(diff),
    },
  ];

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages,
  });
  if (debug) {
    console.dir(completion.data, { depth: null });
  }

  const response = completion.data.choices[0].message?.content;

  if (!response) throw new Error("Failed to get response from OpenAI API");

  return response.replaceAll("\n\n", "\n");
}

async function summarizeAllResponses(
  openai: OpenAIApi,
  responses: string[],
  config: Config
) {
  const { debug } = config;

  const instruction = `I want you to act as a senior software engineer.
I want you to summarize the following changes.

### Input

"""
${responses.join("\n")}
"""

### Instructions

Write a Pull Request description for the changes above.
From the changes given, identify what the main goal of this PR is and emphasize that in your description.
The focus should be on summarizing the intent and primary objective, not the detailed changes.
Use the following format for your responses:

"""FORMAT
## Changes

{summarize the main goal of this PR in one sentence, emphasizing what you most want to achieve, without listing all the specific changes.}
"""
`;
  const messages: ChatCompletionRequestMessage[] = [
    {
      role: "user",
      content: instruction,
    },
  ];

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages,
  });
  if (debug) {
    console.dir(completion.data, { depth: null });
  }

  const response = completion.data.choices[0].message?.content;

  if (!response) throw new Error("Failed to get response from OpenAI API");

  return response;
}
