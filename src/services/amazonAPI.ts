import { ID } from "@utils/types.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
 * Real Amazon scraper that fetches product pages and extracts data.
 * Uses similar selectors to the Chrome extension for consistency.
 */
export class RealAmazonAPIClient implements AmazonAPIClient {
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
    console.log(`RealAmazonAPIClient: Fetching details for URL: ${url}`);

    // Basic validation
    if (!url || url.trim() === "") {
      return { error: "Invalid URL: URL cannot be empty." };
    }

    if (!url.includes("amazon.com")) {
      return { error: "Please provide a valid Amazon URL." };
    }

    // Ensure URL has https:// prefix
    let fullUrl = url.trim();
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = "https://" + fullUrl;
    }

    try {
      console.log(`Fetching URL: ${fullUrl}`);
      // Fetch the Amazon page with browser-like headers
      const response = await fetch(fullUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch Amazon page: ${response.status}`);
        return { error: `Failed to fetch Amazon page: ${response.status}` };
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      if (!doc) {
        return { error: "Failed to parse Amazon page." };
      }

      // Extract product title - try multiple selectors
      let itemName = "";
      const titleSelectors = [
        "#productTitle",
        "#title",
        "#btAsinTitle",
        "#ebooksProductTitle",
        "h1.a-size-large",
        "h1[data-automation-id='title']",
        ".product-title-word-break",
        "span.a-size-large.product-title-word-break",
      ];
      
      for (const selector of titleSelectors) {
        const titleElement = doc.querySelector(selector);
        if (titleElement) {
          const text = titleElement.textContent?.trim();
          if (text && text.length > 0) {
            itemName = text;
            break;
          }
        }
      }
      
      // If still no title, try to extract from page title
      if (!itemName) {
        const pageTitle = doc.querySelector("title");
        if (pageTitle) {
          const text = pageTitle.textContent?.trim() || "";
          // Remove " - Amazon.com" suffix
          itemName = text.replace(/\s*[-:]\s*Amazon\.com.*$/i, "").trim();
        }
      }
      
      if (!itemName) {
        itemName = "Amazon Product";
      }

      // Extract price
      let price = 0;
      const priceWhole = doc.querySelector(".a-price-whole");
      const priceFraction = doc.querySelector(".a-price-fraction");
      if (priceWhole) {
        const wholeText = priceWhole.textContent?.trim().replace(/[,\.]/g, "") || "0";
        const fractionText = priceFraction?.textContent?.trim() || "00";
        price = parseFloat(`${wholeText}.${fractionText}`);
      }
      
      // Fallback price extraction
      if (price === 0) {
        const priceSpan = doc.querySelector(".a-price .a-offscreen");
        if (priceSpan) {
          const priceText = priceSpan.textContent?.trim().replace(/[^0-9.]/g, "") || "0";
          price = parseFloat(priceText);
        }
      }

      // Extract description from feature bullets
      let description = "";
      const featureBullets = doc.querySelector("#feature-bullets ul");
      if (featureBullets) {
        const bullets = featureBullets.querySelectorAll("li");
        const bulletTexts: string[] = [];
        bullets.forEach((li: any) => {
          const text = li.textContent?.trim();
          if (text && text.length > 0) {
            bulletTexts.push(text);
          }
        });
        description = bulletTexts.slice(0, 5).join(" • ");
      }

      // Fallback description
      if (!description) {
        const productDesc = doc.querySelector("#productDescription");
        if (productDesc) {
          description = productDesc.textContent?.trim().slice(0, 500) || "";
        }
      }

      if (!description) {
        description = itemName;
      }

      // Extract main image
      let photo = "";
      const landingImage = doc.querySelector("#landingImage");
      if (landingImage) {
        photo = landingImage.getAttribute("src") || "";
        // Try to get higher quality image
        const dynamicImage = landingImage.getAttribute("data-a-dynamic-image");
        if (dynamicImage) {
          try {
            const imageUrls = JSON.parse(dynamicImage);
            const urls = Object.keys(imageUrls);
            if (urls.length > 0) {
              // Get the largest image
              photo = urls[urls.length - 1];
            }
          } catch (e) {
            // Keep the src if parsing fails
          }
        }
      }

      // Fallback image selectors
      if (!photo) {
        const imgElement = doc.querySelector("#imgBlkFront") || 
                          doc.querySelector("#main-image") ||
                          doc.querySelector(".a-dynamic-image");
        if (imgElement) {
          photo = imgElement.getAttribute("src") || "";
        }
      }

      // Use placeholder if no image found
      if (!photo) {
        photo = "https://via.placeholder.com/400x400.png?text=" + encodeURIComponent(itemName.slice(0, 20));
      }

      console.log(`Scraped: ${itemName} - $${price}`);

      return {
        itemName: itemName.slice(0, 200), // Limit length
        description: description.slice(0, 1000),
        photo,
        price: isNaN(price) ? 0 : price,
      };

    } catch (error) {
      console.error("Error scraping Amazon:", error);
      return { error: `Failed to scrape Amazon page: ${error}` };
    }
  }
}

/**
 * Mock implementation of AmazonAPIClient for development/testing.
 * Falls back to this if real scraping fails.
 */
export class MockAmazonAPIClient implements AmazonAPIClient {
  private realClient = new RealAmazonAPIClient();

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
    // Try real scraping first
    const result = await this.realClient.fetchItemDetails(url);
    
    // If real scraping succeeded and got meaningful data, return it
    // Consider it successful if we got a non-generic title OR a valid price > 0
    if (!("error" in result)) {
      const hasValidTitle = result.itemName && result.itemName !== "Amazon Product";
      const hasValidPrice = result.price > 0;
      const hasValidImage = result.photo && !result.photo.includes("placeholder");
      
      // If we got at least 2 meaningful pieces of data, use the scraped result
      if ((hasValidTitle && hasValidPrice) || (hasValidTitle && hasValidImage) || (hasValidPrice && hasValidImage)) {
        console.log(`Using scraped data: ${result.itemName} - $${result.price}`);
        return result;
      }
      
      // Even if just price, that's valuable - keep it
      if (hasValidPrice) {
        console.log(`Using scraped data (price only): $${result.price}`);
        return result;
      }
    }

    console.log(`MockAmazonAPIClient: Falling back to mock data for URL: ${url}`);

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
    if (url.includes("book") || url.includes("Babs") || url.includes("Holiday") || url.includes("Recipes")) {
      itemName = "Celebrate with Babs: Holiday Recipes & Traditions";
      description = "A heartwarming cookbook filled with cherished holiday recipes, family traditions, and festive celebrations from beloved TikTok grandmother Babs.";
      price = 19.99;
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

