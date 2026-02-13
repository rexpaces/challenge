/**
 * Ollama API client wrapper
 * Handles communication with local Ollama instance
 */

/**
 * Response from Ollama generate endpoint
 */
interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export class OllamaClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://localhost:11434', timeout: number = 60000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Generate text using Ollama model
   * @param model Model name (e.g., 'gemma3:12b')
   * @param prompt Text prompt to generate from
   * @returns Generated text
   */
  async generateText(model: string, prompt: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error (${response.status}): ${errorText}`);
      }

      const data: OllamaGenerateResponse = <OllamaGenerateResponse>await response.json();
      return data.response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Failed to connect to Ollama at ${this.baseUrl}. Is it running? ` +
          `Start with: ollama serve`
        );
      }
      throw error;
    }
  }

  /**
   * Check if Ollama is available and model is loaded
   */
  async checkModel(model: string): Promise<boolean> {
    try {
      // Simple check: try to generate a single word
      const response = await this.generateText(model, 'test');
      return response.length > 0;
    } catch {
      return false;
    }
  }
}
