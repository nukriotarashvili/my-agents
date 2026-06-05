import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentFile } from './github';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateAgentCode(
  provider: 'claude' | 'gemini',
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
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: "{" }
        ]
      });
      jsonString = '{' + (response.content[0] as any).text;

    } else if (provider === 'gemini') {
      if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY არ არის მითითებული .env.local-ში");
      
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        systemInstruction: systemPrompt,
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1 
        }
      });

      const result = await model.generateContent(prompt);
      jsonString = result.response.text();
    }

    // უსაფრთხოების ფილტრი: ვაშორებთ Markdown-ის ბლოკებს (```json და ```)
    jsonString = jsonString.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    return JSON.parse(jsonString);

  } catch (error: unknown) {
    console.error("AI Generation Error Detaluri:", error);
    const detail = error instanceof Error ? error.message.split('\n')[0] : 'უცნობი შეცდომა';
    throw new Error(`ვერ მოხერხდა ${provider}-დან კოდის მიღება: ${detail}`);
  }
}