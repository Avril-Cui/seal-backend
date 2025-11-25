// src/services/geminiLLM.ts (Refined from the provided class)
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiLLMClientConfig {
  apiKey: string;
  maxRetries?: number;
  timeoutMs?: number;
  initialBackoffMs?: number;
}

export interface GeminiLLMClient {
  executeLLM(prompt: string): Promise<string | { error: string }>; // Modified to return error object
  clearCache(): void;
}

export class GeminiLLM implements GeminiLLMClient {
  private apiKey: string;
  private maxRetries: number;
  private timeoutMs: number;
  private initialBackoffMs: number;
  private requestCache: Map<string, string> = new Map();

  constructor(config: GeminiLLMClientConfig) {
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.initialBackoffMs = config.initialBackoffMs ?? 1000;
  }

  async executeLLM(prompt: string): Promise<string | { error: string }> {
    const cachedResponse = this.requestCache.get(prompt);
    if (cachedResponse) {
      // console.log('✅ Using cached LLM response (idempotent request)');
      return cachedResponse;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffMs = this.initialBackoffMs * Math.pow(2, attempt - 1);
          // console.log(`⏳ Retrying LLM request (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${backoffMs}ms backoff...`);
          await this.sleep(backoffMs); // THIS IS NOW DEFINED
        }

        const result = await this.executeWithTimeout(prompt);
        this.requestCache.set(prompt, result);
        return result;
      } catch (error) {
        lastError = error as Error;

        if (this.isRetryableError(error)) {
          // console.warn(`⚠️ Retryable error on attempt ${attempt + 1}: ${(error as Error).message}`);
          continue;
        } else {
          return { error: this.enhanceErrorMessage(error).message };
        }
      }
    }
    return {
      error: `❌ LLM request failed after ${
        this.maxRetries + 1
      } attempts. Last error: ${lastError?.message || "Unknown error"}`,
    };
  }

  // ADDED: Private sleep helper method
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeWithTimeout(prompt: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.1,
          },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        clearTimeout(timeoutId);
        resolve(text);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private isRetryableError(error: unknown): boolean {
    const errorMessage = (error as Error).message?.toLowerCase() || "";
    const retryablePatterns = [
      "timeout",
      "network",
      "econnreset",
      "enotfound",
      "rate limit",
      "quota exceeded",
      "429",
      "500",
      "502",
      "503",
      "504",
    ];
    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  private enhanceErrorMessage(error: unknown): Error {
    const originalError = error as Error;
    const errorMessage = originalError.message || "Unknown error";
    if (errorMessage.includes("API key")) {
      return new Error("API Authentication Error: Invalid or missing API key.");
    }
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      return new Error("API Quota Error: Rate limit or quota exceeded.");
    }
    if (errorMessage.includes("timeout")) {
      return new Error(
        `Timeout Error: Request exceeded ${this.timeoutMs}ms timeout.`,
      );
    }
    if (
      errorMessage.includes("network") || errorMessage.includes("ECONNRESET")
    ) {
      return new Error("Network Error: Failed to connect to Gemini API.");
    }
    return new Error(`LLM Error: ${errorMessage}`);
  }

  clearCache(): void {
    this.requestCache.clear();
  }
}
