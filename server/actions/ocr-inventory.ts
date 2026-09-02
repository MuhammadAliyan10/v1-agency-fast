"use server";

import { db } from "@/database/db";
import { inventoryItems, inventoryTransactions } from "@/database/schema";
import { eq, ilike } from "drizzle-orm";
import { z } from "zod";

const ocrItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  totalCost: z.number(),
  unit: z.string().optional(),
});

const ocrResponseSchema = z.object({
  vendorName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  items: z.array(ocrItemSchema),
});

export type OCRReceiptData = z.infer<typeof ocrResponseSchema>;

export async function processOCRReceipt(imageBase64: string) {
  try {
    if (!process.env.NVIDIA_API_KEY) {
      return { success: false, error: "NVIDIA_API_KEY is not configured" };
    }

    const payload = {
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      messages: [
        {
          role: "system",
          content: "You are a highly precise OCR extraction system. You must extract data from the provided image exactly as it appears. DO NOT hallucinate, guess, or add fake data. If a value is missing, leave it empty or null. Output your response strictly as a JSON object, without any conversational text or markdown blocks."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt. Extract the vendor name, invoice number, and all purchased items. 
You must wrap your final JSON output strictly in <json> and </json> tags.
Return ONLY a valid JSON string inside those tags (no markdown formatting, no comments) in this exact schema:
{
  "vendorName": "string",
  "invoiceNumber": "string",
  "items": [
    {
      "name": "string (the product name exactly as on receipt)",
      "quantity": 10,
      "totalCost": 1000,
      "unit": "kg" // Must be one of: kg, g, L, ml, pcs, packs, boxes. If unknown, use "pcs".
    }
  ]
}
Note: totalCost should be in cents/pennies (e.g., $10.00 -> 1000). Do NOT add fake items.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 65536,
      reasoning_budget: 16384,
      stream: false,
      temperature: 0.6,
      top_p: 0.95
    };

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.statusText}`);
    }

    const data = await response.json();
    let rawContent = data.choices?.[0]?.message?.content || "";
    
    // Clean up potential markdown formatting before extracting JSON
    rawContent = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();

    let jsonString = "";
    // Try to extract from <json> tags first
    const tagMatch = rawContent.match(/<json>([\s\S]*?)<\/json>/i);
    if (tagMatch) {
      jsonString = tagMatch[1].trim();
    } else {
      // Fallback: extract from first { to last }
      const startIndex = rawContent.indexOf("{");
      const endIndex = rawContent.lastIndexOf("}");
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonString = rawContent.substring(startIndex, endIndex + 1).trim();
      } else {
        console.error("No JSON object found in response.");
        return { success: false, error: "Failed to extract JSON from AI response" };
      }
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (err: any) {
      console.error("JSON Parse Error:", err.message, "Extracted String:", jsonString.substring(0, 100));
      return { success: false, error: "Failed to parse OCR response as JSON" };
    }

    const validatedData = ocrResponseSchema.safeParse(parsedData);

    if (!validatedData.success) {
      console.error("Zod Validation Error:", validatedData.error);
      return { success: false, error: "Invalid OCR format returned from AI" };
    }

    return { success: true, data: validatedData.data };
  } catch (error: any) {
    console.error("OCR Processing Exception:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

export type InvoiceCommitItem = {
  dbItemId: string | "NEW";
  ocrName: string;
  quantity: number;
  totalCost: number;
  unit: string;
};

export async function commitInventoryInvoice(vendorName: string, invoiceNumber: string, items: InvoiceCommitItem[]) {
  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        let finalItemId = item.dbItemId;
        const unitCost = item.quantity > 0 ? Math.round(item.totalCost / item.quantity) : 0;

        if (finalItemId === "NEW") {
          const [newItem] = await tx.insert(inventoryItems)
            .values({
              itemName: item.ocrName,
              stockQuantity: item.quantity,
              unit: item.unit || "pcs",
              costPerUnit: unitCost,
              supplierName: vendorName,
              lastRestockedAt: new Date(),
            })
            .returning({ id: inventoryItems.id });
          finalItemId = newItem.id;
        } else {
          // Find existing
          const existing = await tx.query.inventoryItems.findFirst({
            where: (t, { eq }) => eq(t.id, finalItemId)
          });

          if (!existing) {
            throw new Error(`Item ID ${finalItemId} not found`);
          }

          const totalExistingValue = existing.stockQuantity * existing.costPerUnit;
          const newStock = existing.stockQuantity + item.quantity;
          const newCostPerUnit = newStock > 0 ? Math.round((totalExistingValue + item.totalCost) / newStock) : unitCost;

          await tx.update(inventoryItems)
            .set({
              stockQuantity: newStock,
              costPerUnit: newCostPerUnit,
              supplierName: vendorName || existing.supplierName,
              lastRestockedAt: new Date(),
            })
            .where(eq(inventoryItems.id, finalItemId));
        }

        await tx.insert(inventoryTransactions).values({
          inventoryItemId: finalItemId,
          type: "restock",
          quantityDelta: item.quantity,
          unitCost: unitCost,
          referenceId: invoiceNumber || "OCR-UPLOAD",
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Transaction failed" };
  }
}
