import OpenAI from "openai";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ResponsesModel } from "openai/resources";
import { ProxyAgent, setGlobalDispatcher } from "undici";

const httpProxyUrl = process.env.HTTP_PROXY;
if (httpProxyUrl) {
  const proxyAgent = new ProxyAgent(httpProxyUrl);
  setGlobalDispatcher(proxyAgent);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function runSimplePrompt(model: ResponsesModel, prompt: string) {
  return client.responses.create({
    model,
    input: prompt
  });
}

async function runAdvancedPrompt(model: ResponsesModel, prompt: string) {
  return client.responses.create({
    model,
    tools: [{ type: "web_search" }],
    tool_choice: "auto",

    input: [
      {
        role: "developer",
        content:
          "Подбери 4 лучших русскоязычных ресурса по теме. " +
          "Ссылки должны быть реальными; если не уверен — не добавляй. " +
          "Верни данные в виде списка такого формата: `- {title} - {url}`. ",
      },
      { role: "user", content: prompt },
    ],

    max_output_tokens: 200,
  });
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const model: ResponsesModel = "gpt-5.2";

    const prompt = await rl.question("Введите ваш промпт: ");
    if (!prompt.trim()) {
      console.log("Промпт пустой. Завершение.");
      rl.close();
      return;
    }

    const mode = await rl.question(
      "Выберите вариант промпта (1 - простой, 2 - с параметрами): "
    );

    const response =
      mode.trim() === "1"
        ? await runSimplePrompt(model, prompt)
        : await runAdvancedPrompt(model, prompt);

    console.log(`Ответ от ${model}\n${response.output_text}`);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    rl.close();
  }
}

main();
