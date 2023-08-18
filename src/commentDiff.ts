import chalk from "chalk";
import { readFile } from "node:fs/promises";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { GitDiffFile, parseGitDiff } from "./parseGitDiff";

interface Config {
  file: string;
  maxTokens: number;
  limit: number;
  debug: boolean;
}

export async function commentDiffApp(config: Config) {
  const { file, limit } = config;
  if (limit < 1) throw new Error("limit must be greater than 0");

  const diffData = await readFile(file, "utf-8");
  const diffFiles = parseGitDiff(diffData);

  const filteredDiffFiles = diffFiles.filter((f) => f.changes.length < 2000);

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  });
  const openai = new OpenAIApi(configuration);

  const responses: string[] = [];
  for (const diff of filteredDiffFiles.slice(0, limit)) {
    const response = await commentOnDiff(openai, diff, config);
    responses.push(response);
  }

  const summary = await summarizeAllResponses(openai, responses, config);
  console.log(summary);
}

async function commentOnDiff(
  openai: OpenAIApi,
  diff: GitDiffFile,
  config: Config
) {
  const { debug } = config;

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: "system",
      content: `あなたは日本人のシニアエンジニアです。
1 ファイル分の差分が unified 形式パッチで与えられます。この差分について解説を作成してください。
この解説は、後に複数のファイルについての解説を作成するためのデータセットの一部として使用されるため、必要な情報を含めてください。

解説文は、以下のフォーマットに従った 300 文字以内の文章にしてください。

"""フォーマット
このファイルは、<ファイルの目的>をするファイルです。このファイルの変更は、<変更の目的>をするために行われました。

- LINE <変更行1>: <変更内容についての説明1>
- LINE <変更行2>: <変更内容についての説明2>
- <以下、説明が必要な変更の数だけ続く>
"""

### 条件
- 解説は日本語で記述してください。
- 解説するのは、差分が存在する箇所のみにしてください。
- 必ずしも全ての差分に対して解説を追加する必要はありません。
- 解説文には、元のコードを含めないでください。
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

  return `${diff.rightFilename}:\n${response}`;
}

async function summarizeAllResponses(
  openai: OpenAIApi,
  responses: string[],
  config: Config
) {
  const { debug } = config;

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: "user",
      content: `あなたは日本人のシニアエンジニアです。
各ファイルについて、OpenAI API によって生成された修正内容の解説文を元に、指示に従ってください。

### 入力

"""
${responses.join("\n")}
"""

### 指示

これらの解説文を元に、この PR に含まれる変更の概要を記述してください。

解説文は、以下のフォーマットに従った 300 文字以内の文章にしてください。

"""フォーマット
## 変更内容

この PR では、<PR の目的>のため、<PR の変更内容の概要>という変更を行いました。
これによって、<PR のメリット>ができるようになります。
"""

### 条件
- 各ファイルについての変更点は出力せず、PR 全体の変更意図についてのみ出力してください。
`,
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
