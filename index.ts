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

async function runPromptWithTemperature(
  model: ResponsesModel,
  prompt: string,
  temperature: number
) {
  return client.responses.create({
    model,
    temperature,
    input: prompt,
  });
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const model: ResponsesModel = "gpt-5.2";

    const temperatureInput = await rl.question(
      "Введите температуру (число от 0.0 до 2.0): "
    );
    const temperature = Number(temperatureInput.trim());
    if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
      console.log("Некорректная температура. Завершение.");
      rl.close();
      return;
    }

    const prompt = await rl.question("Введите ваш промпт: ");
    if (!prompt.trim()) {
      console.log("Промпт пустой. Завершение.");
      rl.close();
      return;
    }

    const response = await runPromptWithTemperature(model, prompt, temperature);

    console.log(`\nОтвет от ${model} (temperature=${temperature})\n${response.output_text}`);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    rl.close();
  }
}

main();
