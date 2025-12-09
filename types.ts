export enum AppLanguage {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  SPANISH = 'Spanish',
  FRENCH = 'French',
  GERMAN = 'German',
  CHINESE = 'Chinese',
  JAPANESE = 'Japanese',
  ARABIC = 'Arabic',
  PORTUGUESE = 'Portuguese',
  RUSSIAN = 'Russian'
}

export interface LearningContent {
  topic: string;
  short_reading: string;
  simple_explanation: string;
  key_points: string[];
  example: string;
  quiz: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}