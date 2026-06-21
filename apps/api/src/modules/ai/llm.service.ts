import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmService {
  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return !!this.config.get<string>('LLM_API_KEY');
  }

  async complete(prompt: string, system?: string): Promise<string | null> {
    const apiKey = this.config.get<string>('LLM_API_KEY');
    if (!apiKey) return null;

    const baseUrl = this.config.get<string>('LLM_API_URL') ?? 'https://api.openai.com/v1';
    const model = this.config.get<string>('LLM_MODEL') ?? 'gpt-4o-mini';

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: 800,
          temperature: 0.4,
        }),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {
      return null;
    }
  }
}