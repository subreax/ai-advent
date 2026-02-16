import OpenAI from "openai";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ResponsesModel } from 'openai/resources';
import { ProxyAgent, setGlobalDispatcher } from 'undici';


const httpProxyUrl = process.env.HTTP_PROXY;
if (httpProxyUrl) {
  const proxyAgent = new ProxyAgent("http://127.0.0.1:10808");
  setGlobalDispatcher(proxyAgent);
}


// Инициализация клиента
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const model: ResponsesModel = 'gpt-4.1-mini';

    // Ожидание ввода пользователя
    const prompt = await rl.question("Введите ваш промпт: ");
    if (!prompt.trim()) {
      console.log("Промпт пустой. Завершение.");
      rl.close();
      return;
    }

    // Запрос к OpenAI
    const response = await client.responses.create({
      model: model,
      input: prompt,
    });

    // Вывод ответа
    console.log(`(${model}) > ${response.output_text}`);

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    rl.close();
  }
}

main();
