"use server";

import { db } from "@/database/db";
import { inventoryItems, inventoryTransactions } from "@/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// ─── NVIDIA NIM model ──────────────────────────────────────────────────────────
// meta/llama-4-maverick-17b-128e-instruct: best NVIDIA-hosted vision model for
// structured document understanding — 128-expert MoE, 1M context, multimodal.
const NVIDIA_MODEL = "meta/llama-4-maverick-17b-128e-instruct";
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// ─── Zod schemas ───────────────────────────────────────────────────────────────
const VALID_UNITS = ["kg", "g", "L", "ml", "pcs", "packs", "boxes", "dozen", "bag"] as const;

const ocrItemSchema = z.object({
  name: z
    .string()
    .min(2, "Item name too short")
    .max(100, "Item name too long")
    .regex(/^[a-zA-Z0-9 \-\/().]+$/, "Name must be English (translate from Urdu if needed)"),
  quantity: z.number().positive("Quantity must be positive").max(100_000),
  totalCost: z
    .number()
    .int("Cost must be integer (in paisa/cents)")
    .min(0)
    .max(100_000_000, "Cost seems unrealistically high"),
  unit: z.enum(VALID_UNITS).default("pcs"),
});

const ocrResponseSchema = z.object({
  vendorName: z.string().max(100).optional(),
  invoiceNumber: z.string().max(50).optional(),
  receiptDate: z.string().optional(),
  currency: z.string().length(3).optional(), // e.g. "PKR"
  items: z.array(ocrItemSchema).min(1, "At least one item must be extracted"),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string()).optional(),
});

export type OCRReceiptData = z.infer<typeof ocrResponseSchema>;

// ─── System prompt ─────────────────────────────────────────────────────────────
// Strict zero-hallucination instructions. The model must refuse to invent data.
const SYSTEM_PROMPT = `You are an enterprise-grade OCR receipt parser for an inventory management system.

ABSOLUTE RULES — violating any of these makes you useless:
1. NEVER invent, guess, or estimate any item name, quantity, price, or field that is not clearly visible in the image.
2. If a field is unreadable or absent, omit it entirely — do NOT fill it with placeholder text.
3. If the receipt text is in Urdu (or any other language), translate item names to accurate English equivalents. Vendor names stay as-is.
4. Quantities and costs must be numeric values exactly as printed. Do NOT convert units.
5. totalCost is in PAISA (1 PKR = 100 paisa) or CENTS. Multiply the printed price by 100. E.g. Rs. 250 → 25000.
6. Reject the entire receipt if the image is not a receipt, invoice, or purchase document.
7. Set confidence to "low" if ANY value was difficult to read. Set "medium" if most values are clear. Set "high" only if all values are perfectly legible.
8. Populate the warnings array with any specific fields you were uncertain about.

UNIT MAPPING:
- Weight: use "kg" or "g"
- Volume: use "L" or "ml"
- Individual items: use "pcs"
- Shrink-wrapped packs: use "packs"
- Cartons/cases: use "boxes"
- 12-unit groups: use "dozen"
- Flour/rice sacks: use "bag"
- Unknown: use "pcs" and add a warning

OUTPUT FORMAT:
Respond with ONLY a single valid JSON object. No markdown, no explanation, no preamble.
The JSON must exactly match this schema:
{
  "vendorName": "string or omit",
  "invoiceNumber": "string or omit",
  "receiptDate": "YYYY-MM-DD or omit",
  "currency": "PKR",
  "confidence": "high" | "medium" | "low",
  "warnings": ["list any uncertain fields here"],
  "items": [
    {
      "name": "English product name (max 100 chars)",
      "quantity": 10,
      "totalCost": 25000,
      "unit": "kg"
    }
  ]
}`;

// ─── processOCRReceipt ─────────────────────────────────────────────────────────
export async function processOCRReceipt(imageBase64: string, mimeType: string = "image/jpeg") {
  try {
    if (!process.env.NVIDIA_API_KEY) {
      return { success: false, error: "NVIDIA_API_KEY is not configured. Please add it to your environment variables." };
    }

    // Validate image size — NVIDIA NIM has a base64 payload limit (~4MB decoded)
    const imageSizeBytes = Math.ceil(imageBase64.length * 0.75);
    if (imageSizeBytes > 4 * 1024 * 1024) {
      return { success: false, error: "Image is too large. Please use an image under 4MB." };
    }

    const payload = {
      model: NVIDIA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: "text",
              text: "Parse this receipt. Extract every line item. Translate any Urdu text to English. Return ONLY the JSON object — no other text.",
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.0,   // deterministic — no creativity, pure extraction
      top_p: 1.0,
      stream: false,
    };

    const response = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
      // Vercel serverless timeout — the model is fast but image encoding takes time
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      console.error("[OCR] NVIDIA API error:", response.status, errText);
      if (response.status === 401) {
        return { success: false, error: "Invalid NVIDIA API key. Check your NVIDIA_API_KEY environment variable." };
      }
      if (response.status === 429) {
        return { success: false, error: "NVIDIA API rate limit reached. Please wait a moment and try again." };
      }
      return { success: false, error: `AI service error (${response.status}). Please try again.` };
    }

    const data = await response.json();
    const rawContent: string = data.choices?.[0]?.message?.content ?? "";

    if (!rawContent.trim()) {
      return { success: false, error: "AI returned an empty response. The image may be unreadable." };
    }

    // ── JSON extraction ────────────────────────────────────────────────────────
    // Strip markdown code fences if the model added them despite instructions
    const cleaned = rawContent
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Find the outermost { ... } block
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error("[OCR] No JSON object in response:", cleaned.substring(0, 200));
      return { success: false, error: "Could not extract structured data from the receipt. Please ensure the image is clear and shows a valid receipt." };
    }

    const jsonString = cleaned.substring(firstBrace, lastBrace + 1);

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("[OCR] JSON parse error:", parseErr, "| Raw:", jsonString.substring(0, 300));
      return { success: false, error: "Failed to parse the AI response. The image may be too blurry or not a valid receipt." };
    }

    // ── Zod validation ─────────────────────────────────────────────────────────
    const validated = ocrResponseSchema.safeParse(parsedData);
    if (!validated.success) {
      const issues = validated.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
      console.error("[OCR] Validation failed:", issues);
      return {
        success: false,
        error: `Receipt data is incomplete or contains invalid values. Details: ${issues}`,
      };
    }

    const result = validated.data;

    // ── Sanity checks ──────────────────────────────────────────────────────────
    // Reject obviously hallucinated data
    for (const item of result.items) {
      if (item.quantity > 10_000) {
        return {
          success: false,
          error: `Unrealistic quantity detected for "${item.name}" (${item.quantity}). Please verify the image and try again.`,
        };
      }
      if (item.totalCost > 10_000_000) { // Rs. 100,000 max
        return {
          success: false,
          error: `Unrealistic cost detected for "${item.name}" (Rs. ${item.totalCost / 100}). Please verify the image and try again.`,
        };
      }
    }

    // Warn the admin if confidence is low
    if (result.confidence === "low") {
      result.warnings = [
        ...(result.warnings ?? []),
        "Low confidence: some values may be incorrect. Please review carefully before committing.",
      ];
    }

    return { success: true, data: result };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { success: false, error: "Request timed out. The image may be too large or the service is busy." };
    }
    console.error("[OCR] Unexpected error:", msg);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────
export type InvoiceCommitItem = {
  dbItemId: string | "NEW";
  ocrName: string;
  quantity: number;
  totalCost: number; // in paisa
  unit: string;
};

// ─── commitInventoryInvoice ────────────────────────────────────────────────────
// All DB mutations in a single transaction. Uses weighted average cost (WAC) to
// update per-unit cost when restocking existing items.
export async function commitInventoryInvoice(
  vendorName: string,
  invoiceNumber: string,
  items: InvoiceCommitItem[]
) {
  if (!items.length) {
    return { success: false, error: "No items to commit." };
  }

  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        // totalCost is in paisa; costPerUnit stored in paisa per unit
        const unitCost = item.quantity > 0 ? Math.round(item.totalCost / item.quantity) : 0;
        let finalItemId = item.dbItemId;

        if (finalItemId === "NEW") {
          const [newItem] = await tx
            .insert(inventoryItems)
            .values({
              itemName: item.ocrName,
              stockQuantity: item.quantity,
              unit: item.unit || "pcs",
              costPerUnit: unitCost,
              supplierName: vendorName || null,
              lastRestockedAt: new Date(),
            })
            .returning({ id: inventoryItems.id });
          finalItemId = newItem.id;
        } else {
          const existing = await tx.query.inventoryItems.findFirst({
            where: (t, { eq }) => eq(t.id, finalItemId as string),
          });

          if (!existing) throw new Error(`Inventory item ID ${finalItemId} not found.`);

          // Weighted average cost
          const existingValue = existing.stockQuantity * existing.costPerUnit;
          const newStock = existing.stockQuantity + item.quantity;
          const newCostPerUnit = newStock > 0
            ? Math.round((existingValue + item.totalCost) / newStock)
            : unitCost;

          await tx
            .update(inventoryItems)
            .set({
              stockQuantity: newStock,
              costPerUnit: newCostPerUnit,
              supplierName: vendorName || existing.supplierName,
              lastRestockedAt: new Date(),
            })
            .where(eq(inventoryItems.id, finalItemId as string));
        }

        await tx.insert(inventoryTransactions).values({
          inventoryItemId: finalItemId as string,
          type: "restock",
          quantityDelta: item.quantity,
          unitCost: unitCost,
          referenceId: invoiceNumber || "OCR-UPLOAD",
        });
      }
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transaction failed";
    console.error("[commitInventoryInvoice] Error:", msg);
    return { success: false, error: msg };
  }
}


