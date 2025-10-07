import { GoogleGenAI, Type } from "@google/genai";
import { ProductDetails } from "../types";

// IMPORTANT: Exposing an API key on the client-side is a security risk.
// This approach is for development/demonstration purposes only.
// For production, you must proxy API calls through a secure backend server
// where the key can be stored safely.
// FIX: Use `process.env.API_KEY` as per coding guidelines.
export const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (API_KEY) {
  // FIX: Initialize with API_KEY as per coding guidelines.
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  // A user-friendly error will be displayed in the UI.
  // This log is for the developer.
  // FIX: Updated error message to reflect the correct environment variable name.
  console.error("CRITICAL: Gemini API key is missing. Please create a .env file with API_KEY='your_key'. The application's core functionality will be disabled.");
}

const model = 'gemini-2.5-flash';

const prompt = `You are an AI that extracts structured product details from images of food packets, labels, or consumer goods.
Look at the provided image and carefully identify the following fields:

- Product Name
- Batch No
- Manufacturing Date
- Expiry Date / Use By Date
- MRP (Maximum Retail Price)
- Net Weight (in grams)

⚠️ Rules:
- If "Product Name" is not found on the label, the value for "Product Name" must be an empty string ("").
- For all other fields, if the information is missing or unclear, output the string "Not found".
- Dates should always be in DD.MM.YY format.
- MRP should be a whole number only, without any currency symbols or decimals (e.g., 15).
- Weight should be a number followed by "g".

🎯 Output must be in strict JSON format.`;

const schema = {
  type: Type.OBJECT,
  properties: {
    "Product Name": { type: Type.STRING, description: "The name of the product. Should be an empty string if not found." },
    "Batch No": { type: Type.STRING, description: "The batch number of the product." },
    "Manufacturing Date": { type: Type.STRING, description: "The manufacturing date in DD.MM.YY format." },
    "Expiry Date": { type: Type.STRING, description: "The expiry or use by date in DD.MM.YY format." },
    "MRP": { type: Type.STRING, description: "Maximum Retail Price, as a whole number without currency symbols or decimals." },
    "Weight": { type: Type.STRING, description: "Net weight in grams (e.g., '100g')." },
  },
  required: ["Product Name", "Batch No", "Manufacturing Date", "Expiry Date", "MRP", "Weight"]
};

export async function extractProductDetailsFromImage(
  base64ImageData: string,
  mimeType: string
): Promise<Omit<ProductDetails, 'Quantity' | 'Bag No'>> {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. Make sure the API key is configured correctly in a .env file.");
  }

  try {
    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: prompt,
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonString = response.text.trim();
    const parsedJson = JSON.parse(jsonString);

    return parsedJson as Omit<ProductDetails, 'Quantity' | 'Bag No'>;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to extract details from image.");
  }
}
