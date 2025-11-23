/**
 * Interface for the Gemini LLM client.
 * This defines the contract for requesting AI insights.
 */
export interface GeminiLLMClient {
  getInsight(itemDetails: {
    itemName: string;
    description: string;
    price: number;
    reason: string;
    isNeed: string;
    isFutureApprove: string;
  }): Promise<{ llm_response: string } | { error: string }>;
}

/**
 * Mock implementation of GeminiLLMClient for development/testing.
 * In a real application, this would interact with a large language model.
 */
export class MockGeminiLLMClient implements GeminiLLMClient {
  async getInsight(itemDetails: {
    itemName: string;
    description: string;
    price: number;
    reason: string;
    isNeed: string;
    isFutureApprove: string;
  }): Promise<{ llm_response: string } | { error: string }> {
    console.log(
      `MockGeminiLLMClient: Getting insight for item: ${itemDetails.itemName}`,
    );
    // Simulate network delay and processing time
    await new Promise((resolve) => setTimeout(resolve, 50));

    const { itemName, price, reason, isNeed, isFutureApprove } = itemDetails;

    if (reason.toLowerCase().includes("impulse") || isNeed.toLowerCase() === "no") {
      return {
        llm_response:
          `Based on your reason "${reason}" and that it's a "${isNeed}" (need), this purchase of "${itemName}" at $${price.toFixed(2)} seems potentially impulsive.`,
      };
    }

    if (isFutureApprove.toLowerCase() === "no") {
      return {
        llm_response:
          `You indicate you might not approve buying "${itemName}" later. Re-evaluate before spending $${price.toFixed(2)}.`,
      };
    }

    return {
      llm_response:
        `The item "${itemName}" at $${price.toFixed(2)} seems reasonable given your reason "${reason}".`,
    };
  }
}

