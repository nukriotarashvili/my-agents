export type AiProvider = 'claude' | 'gemini';

export type AiModel = {
  id: string;
  name: string;
  provider: AiProvider;
};

export const AVAILABLE_MODELS: AiModel[] = [
  { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'claude' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Oct 2024)', provider: 'claude' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'claude' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'claude' },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'claude' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash (Latest)', provider: 'gemini' },
];

export function getModelById(id: string): AiModel | undefined {
  return AVAILABLE_MODELS.find((model) => model.id === id);
}

export function resolveModelId(modelId: string | undefined, provider: AiProvider): string {
  if (modelId) {
    const model = getModelById(modelId);
    if (!model) throw new Error(`უცნობი modelId: ${modelId}`);
    if (model.provider !== provider) {
      throw new Error(`modelId "${modelId}" არ ემთხვევა provider-ს "${provider}"`);
    }
    return model.id;
  }

  const fallback = AVAILABLE_MODELS.find((model) => model.provider === provider);
  if (!fallback) throw new Error(`provider "${provider}"-ისთვის მოდელი ვერ მოიძებნა`);
  return fallback.id;
}
