export type TranslateRequest = {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
};

export type TranslateResult = {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
};
