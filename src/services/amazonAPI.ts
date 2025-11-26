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
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Basic validation
    if (!url || url.trim() === "") {
      return { error: "Invalid URL: URL cannot be empty." };
    }

    if (url.includes("error")) {
      return { error: "Failed to fetch item details from Amazon." };
    }

    // Try to extract product info from URL
    let itemName = "Amazon Product";
    let description = "This is a product from Amazon.";
    let price = 29.99;

    // Check for specific product types in URL
    if (url.includes("book")) {
      itemName = "The Great Gatsby";
      description = "A classic American novel by F. Scott Fitzgerald.";
      price = 12.99;
    } else if (url.includes("electronics") || url.includes("headphone")) {
      itemName = "Wireless Headphones";
      description = "Noise-cancelling headphones with long battery life.";
      price = 199.99;
    } else if (url.includes("tablet") || url.includes("fire")) {
      itemName = "Amazon Fire Kids Tablet";
      description = "Kids tablet with parental controls and educational content. Includes a protective case.";
      price = 119.99;
    } else if (url.includes("kindle")) {
      itemName = "Kindle E-Reader";
      description = "E-reader with built-in front light and long battery life.";
      price = 89.99;
    } else if (url.includes("echo") || url.includes("alexa")) {
      itemName = "Echo Dot Smart Speaker";
      description = "Smart speaker with Alexa voice assistant.";
      price = 49.99;
    } else {
      // Generic Amazon product
      itemName = "Amazon Product";
      description = "A great product available on Amazon with fast shipping.";
      price = 24.99 + Math.floor(Math.random() * 100);
    }

    // Return mock data with a placeholder image
    return {
      itemName,
      description,
      photo: "https://via.placeholder.com/400x400.png?text=" + encodeURIComponent(itemName),
      price,
    };
  }
}

