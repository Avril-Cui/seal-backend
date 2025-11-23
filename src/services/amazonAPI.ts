import { ID } from "@utils/types.ts";

/**
 * Interface for the Amazon API client.
 * This defines the contract for fetching item details.
 */
export interface AmazonAPIClient {
  fetchItemDetails(
    url: string,
  ): Promise<
    | {
      itemName: string;
      description: string;
      photo: string;
      price: number;
    }
    | { error: string }
  >;
}

/**
 * Mock implementation of AmazonAPIClient for development/testing.
 * In a real application, this would make actual HTTP requests to Amazon's API.
 */
export class MockAmazonAPIClient implements AmazonAPIClient {
  async fetchItemDetails(
    url: string,
  ): Promise<
    | {
      itemName: string;
      description: string;
      photo: string;
      price: number;
    }
    | { error: string }
  > {
    console.log(`MockAmazonAPIClient: Fetching details for URL: ${url}`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (url.includes("error")) {
      return { error: "Failed to fetch item details from Amazon." };
    }
    if (url.includes("example.com/book/123")) {
      return {
        itemName: "The Great Gatsby",
        description: "A classic American novel.",
        photo: "https://example.com/gatsby.jpg",
        price: 9.99,
      };
    }
    if (url.includes("example.com/electronics/xyz")) {
      return {
        itemName: "Wireless Headphones",
        description: "Noise-cancelling headphones with long battery life.",
        photo: "https://example.com/headphones.jpg",
        price: 199.99,
      };
    }
    return {
      itemName: "Sample Item",
      description: "Placeholder description from mock Amazon API.",
      photo: "https://example.com/sample.jpg",
      price: 42,
    };
  }
}

