import { db } from "./database/db";
import { categories } from "./database/schema";
import { eq } from "drizzle-orm";

async function run() {
  const all = await db.select().from(categories);
  const orderedNames = [
    "burger", 
    "pizza", 
    "unique flavour", 
    "special pizza", 
    "roll", 
    "pasta"
  ];
  
  for (const cat of all) {
    let sortOrder = 999;
    const lowerName = cat.name.toLowerCase();
    
    // Explicit exact or partial matches
    if (lowerName.includes("burger")) sortOrder = 0;
    else if (lowerName.includes("special pizza")) sortOrder = 3;
    else if (lowerName.includes("unique flav")) sortOrder = 2;
    else if (lowerName.includes("pizza")) sortOrder = 1;
    else if (lowerName.includes("roll")) sortOrder = 4;
    else if (lowerName.includes("pasta")) sortOrder = 5;

    await db.update(categories).set({ sortOrder }).where(eq(categories.id, cat.id));
    console.log(`Updated ${cat.name} to sortOrder ${sortOrder}`);
  }
}
run();
