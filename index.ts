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
    input: prompt,
  });
}

async function runStepByStepPrompt(model: ResponsesModel, prompt: string) {
  return client.responses.create({
    model,
    input: [
      {
        role: 'developer',
        content: 'Решай задачу пошагово.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  });
}

async function generateBetterPrompt(model: ResponsesModel, prompt: string) {
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "developer",
        content:
          "Преобразуй пользовательский запрос в более совершенный промпт для LLM. " +
          "Ответ должен содержать только новый промпт и ничего больше.",
      },
      { role: "user", content: prompt },
    ],
  });

  return response.output_text.trim();
}

async function suggestExperts(model: ResponsesModel, prompt: string) {
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "developer",
        content:
          "Подбери около 3 экспертов из разных направлений под задачу пользователя. " +
          "Ответ должен быть только в формате: роль1, роль2, роль3. " +
          "Без пояснений, без нумерации, без дополнительных фраз.",
      },
      { role: "user", content: prompt },
    ],
  });

  return response.output_text.trim();
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const model: ResponsesModel = "gpt-5.2";

    const mode = await rl.question(
      "Выберите режим (1 - обычный, 2 - пошаговый, 3 - с предварительной генерацией промпта, 4 - подбор экспертов): "
    );
    const normalizedMode = mode.trim();
    if (!["1", "2", "3", "4"].includes(normalizedMode)) {
      console.log("Некорректный режим. Завершение.");
      rl.close();
      return;
    }

    const prompt = await rl.question("Введите ваш промпт: ");
    if (!prompt.trim()) {
      console.log("Промпт пустой. Завершение.");
      rl.close();
      return;
    }

    let outputText = "";
    if (normalizedMode === "1") {
      const response = await runSimplePrompt(model, prompt);
      outputText = response.output_text;
    } else if (normalizedMode === "2") {
      const response = await runStepByStepPrompt(model, prompt);
      outputText = response.output_text;
    } else if (normalizedMode === "3") {
      const improvedPrompt = await generateBetterPrompt(model, prompt);
      console.log(`Сгенерированный промпт:\n${improvedPrompt}\n\n`);
      const response = await runSimplePrompt(model, improvedPrompt);
      outputText = response.output_text;
    } else {
      outputText = await suggestExperts(model, prompt);
    }

    console.log(`\nОтвет от ${model}\n${outputText}`);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    rl.close();
  }
}

main();
