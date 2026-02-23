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

type ModelSelection = "1" | "2" | "3";

type ModelConfig = {
  model: ResponsesModel;
  pricingPer1M: {
    input: number;
    cachedInput?: number;
    output: number;
  };
};

// Official OpenAI sources (checked on 2026-02-23):
// https://platform.openai.com/pricing
// https://platform.openai.com/docs/models/gpt-5.2/
const MODEL_CONFIG: Record<ModelSelection, ModelConfig> = {
  "1": {
    model: "gpt-3.5-turbo",
    pricingPer1M: { input: 0.5, output: 1.5 },
  },
  "2": {
    model: "gpt-4o-mini",
    pricingPer1M: { input: 0.15, output: 0.6 },
  },
  "3": {
    model: "gpt-5.2",
    pricingPer1M: { input: 1.75, cachedInput: 0.175, output: 14.0 },
  },
};

async function runPrompt(model: ResponsesModel, prompt: string) {
  return client.responses.create({
    model,
    input: prompt,
  });
}

function calculateCostUSD(
  inputTokens: number,
  cachedInputTokens: number,
  outputTokens: number,
  pricingPer1M: ModelConfig["pricingPer1M"]
) {
  const safeCachedInputTokens = Math.min(cachedInputTokens, inputTokens);
  const regularInputTokens = Math.max(inputTokens - safeCachedInputTokens, 0);
  const cachedInputRate = pricingPer1M.cachedInput ?? pricingPer1M.input;

  const inputCost = (regularInputTokens / 1_000_000) * pricingPer1M.input;
  const cachedInputCost =
    (safeCachedInputTokens / 1_000_000) * cachedInputRate;
  const outputCost = (outputTokens / 1_000_000) * pricingPer1M.output;

  return inputCost + cachedInputCost + outputCost;
}

function formatUSD(amount: number) {
  return `$${amount.toFixed(6)}`;
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const modelChoiceInput = await rl.question(
      "Выберите модель: \n1. gpt 3.5 turbo\n2. gpt 4o mini\n3. gpt 5.2\nВыбор: "
    );
    const modelChoice = modelChoiceInput.trim() as ModelSelection;
    const selectedModel = MODEL_CONFIG[modelChoice];
    if (!selectedModel) {
      console.log("Некорректный выбор модели. Завершение.");
      rl.close();
      return;
    }

    const prompt = await rl.question("Введите ваш промпт: ");
    if (!prompt.trim()) {
      console.log("Промпт пустой. Завершение.");
      rl.close();
      return;
    }

    const startedAt = Date.now();
    const response = await runPrompt(selectedModel.model, prompt);
    const elapsedMs = Date.now() - startedAt;

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const totalTokens = response.usage?.total_tokens ?? inputTokens + outputTokens;
    const cachedInputTokens = response.usage?.input_tokens_details?.cached_tokens ?? 0;

    const costUSD = calculateCostUSD(
      inputTokens,
      cachedInputTokens,
      outputTokens,
      selectedModel.pricingPer1M
    );

    console.log(`\nОтвет:\n${response.output_text}`);
    console.log(`\nВыбранная модель: ${selectedModel.model}`);
    console.log(`Время генерации: ${elapsedMs} мс`);
    console.log(
      `Количество использованных токенов: ${totalTokens} (input: ${inputTokens}, cached input: ${cachedInputTokens}, output: ${outputTokens})`
    );
    console.log(`Стоимость в долларах: ${formatUSD(costUSD)}`);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    rl.close();
  }
}

main();
