import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentFile } from './github';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /503|429|high demand|unavailable|overloaded|rate limit|try again/i.test(message);
}

async function generateWithGemini(
  modelId: string,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY არ არის მითითებული .env.local-ში');
  }

  const errors: string[] = [];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const result = await model.generateContent(prompt);
      console.log(`Gemini წარმატებით უპასუხა მოდელით: ${modelId}`);
      return result.response.text();
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message.split('\n')[0] : 'უცნობი შეცდომა';
      errors.push(`${modelId} (მცდელობა ${attempt}): ${detail}`);

      if (isRetryableGeminiError(error) && attempt < MAX_RETRIES) {
        const delayMs = attempt * 2000;
        console.warn(
          `Gemini ${modelId} დაკავებულია, ხელახალი მცდელობა ${attempt + 1}/${MAX_RETRIES} ${delayMs}ms-ში...`
        );
        await sleep(delayMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Gemini API დროებით მიუწვდომელია. სცადეთ რამდენიმე წუთში ან აირჩიეთ სხვა მოდელი.\n${errors.join('\n')}`
  );
}

function formatProviderError(provider: string, error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (/credit balance is too low|insufficient.*credit|billing/i.test(raw)) {
    return 'Anthropic-ის ანგარიშზე კრედიტი ამოწურულია. გადადი console.anthropic.com → Plans & Billing, შეავსე ბალანსი, ან აირჩიე Gemini მოდელი.';
  }

  if (/invalid.*api.*key|authentication|401/i.test(raw)) {
    return `${provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'} არასწორია ან არ მუშაობს. შეამოწმე .env.local.`;
  }

  const detail = raw.split('\n')[0];
  return `ვერ მოხერხდა ${provider}-დან კოდის მიღება: ${detail}`;
}

export async function generateAgentCode(
  provider: 'claude' | 'gemini',
  modelId: string,
  systemPrompt: string,
  userTask: string,
  codeContext: string
): Promise<{ files: AgentFile[]; commitMessage: string }> {
  const prompt = `
  დავალება: ${userTask}
  
  მიმდინარე კოდი:
  ${codeContext}
  
  ინსტრუქცია: დააბრუნე პასუხი მხოლოდ ვალიდური JSON ობიექტის სახით. 
  სტრუქტურა უნდა იყოს ზუსტად ასეთი:
  {
    "files": [{ "path": "ფაილის/ზუსტი/მისამართი.tsx", "content": "სრული განახლებული კოდი" }],
    "commitMessage": "ცვლილებების მოკლე ტექნიკური აღწერა"
  }
  `;

  let jsonString = '';

  try {
    if (provider === 'claude') {
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: '{' },
        ],
      });
      jsonString = '{' + (response.content[0] as { text: string }).text;
    } else if (provider === 'gemini') {
      jsonString = await generateWithGemini(modelId, prompt, systemPrompt);
    }

    jsonString = jsonString.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(jsonString);
  } catch (error: unknown) {
    console.error('AI Generation Error Detaluri:', error);
    throw new Error(formatProviderError(provider, error));
  }
}
