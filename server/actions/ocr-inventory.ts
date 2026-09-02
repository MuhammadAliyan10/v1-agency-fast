"use server";

import { db } from "@/database/db";
import { inventoryItems, inventoryTransactions } from "@/database/schema";
import { eq, ilike } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";

const nvidiaOpenAI = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || "dummy",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

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

    const response = await nvidiaOpenAI.chat.completions.create({
      model: "meta/llama-3.2-90b-vision-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt. Extract the vendor name, invoice number, and all purchased items. 
Return ONLY a valid JSON string (no markdown formatting, no comments) in this exact schema:
{
  "vendorName": "string",
  "invoiceNumber": "string",
  "items": [
    {
      "name": "string (the product name)",
      "quantity": 10,
      "totalCost": 1000,
      "unit": "kg" // or "pcs", "ltr", etc.
    }
  ]
}
Note: totalCost should be in cents/pennies (e.g., $10.00 -> 1000).`
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
      temperature: 0.1,
      max_tokens: 1024,
    });

    const rawContent = response.choices[0]?.message?.content || "";
    const jsonString = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (err) {
      return { success: false, error: "Failed to parse OCR response as JSON" };
    }

    const validatedData = ocrResponseSchema.safeParse(parsedData);

    if (!validatedData.success) {
      return { success: false, error: "Invalid OCR format returned from AI" };
    }

    return { success: true, data: validatedData.data };
  } catch (error: any) {
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
