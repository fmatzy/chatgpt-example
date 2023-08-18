import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai";

type CallableFunction = (args: any) => Promise<any>;

const getCurrentWeather: CallableFunction = async ({
  location,
  unit = "celsius",
}: {
  location: string;
  unit: "fahrenheit" | "celsius";
}) => {
  return {
    location,
    temperature: 20,
    unit,
    forecast: ["sunny", "cloudy"],
  };
};

interface Config {
  temperature: number;
  maxTokens: number;
  debug: boolean;
}

export async function functionCallApp({
  temperature,
  maxTokens,
  debug,
}: Config) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  });
  const openai = new OpenAIApi(configuration);

  const messages: ChatCompletionRequestMessage[] = [
    { role: "user", content: "What's the weather like in Boston?" },
  ];
  const functions: ChatCompletionFunctions[] = [
    {
      name: "getCurrentWeather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA",
          },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
        },
        required: ["location"],
      },
    },
  ];
  const functionsMap: Record<string, CallableFunction> = {
    getCurrentWeather,
  };

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages,
    functions,
    function_call: "auto",
    temperature: temperature,
    max_tokens: maxTokens,
  });

  console.dir(completion.data, { depth: null });

  const response = completion.data.choices[0].message;

  if (response) {
    const { function_call: functionCall } = response;
    if (!functionCall) {
      throw new Error("No function call found.");
    }
    const { name: funcName = "", arguments: funcArgs = "{}" } = functionCall;
    const f = functionsMap[funcName];
    if (!f) {
      throw new Error(`Function ${funcName} not found.`);
    }

    const funcResult = f(JSON.parse(funcArgs));

    messages.push(response);
    messages.push({
      role: "function",
      name: funcName,
      content: JSON.stringify(funcResult),
    });

    const nextCompletion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
      functions,
      function_call: "auto",
      temperature: temperature,
      max_tokens: maxTokens,
    });
    console.dir(nextCompletion.data, { depth: null });
  }
}
