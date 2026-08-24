import "dotenv/config";
import { db } from "../db";
import { categories, menuItems, itemVariants } from "../schema";

async function main() {
  console.log("Seeding Database for Classy Crave...");

  // 1. Clear existing data (in correct order to satisfy foreign keys)
  console.log("Clearing existing data...");
  await db.delete(itemVariants);
  await db.delete(menuItems);
  await db.delete(categories);

  // 2. Insert Categories
  console.log("Inserting Categories...");
  const insertedCategories = await db
    .insert(categories)
    .values([
      { name: "Burgers", slug: "burgers", sortOrder: 1 },
      { name: "Pizza", slug: "pizza", sortOrder: 2 },
      { name: "Sandwiches", slug: "sandwiches", sortOrder: 3 },
      { name: "Rolls & Wraps", slug: "rolls-wraps", sortOrder: 4 },
      { name: "Desserts", slug: "desserts", sortOrder: 5 },
      { name: "Tropical Edition", slug: "tropical-edition", sortOrder: 6 },
    ])
    .returning();

  const getCategoryId = (slug: string) => {
    const cat = insertedCategories.find((c) => c.slug === slug);
    if (!cat) throw new Error(`Category ${slug} not found`);
    return cat.id;
  };

  const burgersId = getCategoryId("burgers");
  const pizzaId = getCategoryId("pizza");
  const sandwichesId = getCategoryId("sandwiches");
  const rollsId = getCategoryId("rolls-wraps");
  const dessertsId = getCategoryId("desserts");
  const tropicalId = getCategoryId("tropical-edition");

  // 3. Insert Menu Items
  console.log("Inserting Menu Items...");
  const insertedMenuItems = await db
    .insert(menuItems)
    .values([
      // Burgers
      { categoryId: burgersId, name: "Zinger Burger", slug: "zinger-burger", basePrice: 350 },
      { categoryId: burgersId, name: "Fire Works Burger", slug: "fire-works-burger", basePrice: 650 },
      { categoryId: burgersId, name: "Texas Hot Burger", slug: "texas-hot-burger", basePrice: 750 },

      // Sandwiches
      { categoryId: sandwichesId, name: "Classic Chicken Sandwich", slug: "classic-chicken-sandwich", basePrice: 750 },
      { categoryId: sandwichesId, name: "Chicken Club Sandwich", slug: "chicken-club-sandwich", basePrice: 650 },

      // Rolls & Wraps
      { categoryId: rollsId, name: "Creamy Mughlai Roll", slug: "creamy-mughlai-roll", basePrice: 550 },
      { categoryId: rollsId, name: "Fried Crispy Wrap", slug: "fried-crispy-wrap", basePrice: 599 },

      // Pizza
      { categoryId: pizzaId, name: "Chicken Tikka Pizza", slug: "chicken-tikka-pizza", basePrice: 500 },
      { categoryId: pizzaId, name: "Fire House Pizza", slug: "fire-house-pizza", basePrice: 500 },
      { categoryId: pizzaId, name: "Crown Crust Pizza", slug: "crown-crust-pizza", basePrice: 1199 },

      // Desserts
      { categoryId: dessertsId, name: "Three Milk Cake", slug: "three-milk-cake", basePrice: 1600 },
      { categoryId: dessertsId, name: "Walnut Tart", slug: "walnut-tart", basePrice: 350 },
      { categoryId: dessertsId, name: "Molten Lava With Ice Cream", slug: "molten-lava-with-ice-cream", basePrice: 450 },

      // Tropical Edition
      { categoryId: tropicalId, name: "Mint Margarita", slug: "mint-margarita", basePrice: 220 },
      { categoryId: tropicalId, name: "Pina Colada", slug: "pina-colada", basePrice: 350 },
    ])
    .returning();

  const getMenuItemId = (name: string) => {
    const item = insertedMenuItems.find((i) => i.name === name);
    if (!item) throw new Error(`Menu item ${name} not found`);
    return item.id;
  };

  const chickenTikkaId = getMenuItemId("Chicken Tikka Pizza");
  const fireHouseId = getMenuItemId("Fire House Pizza");
  const crownCrustId = getMenuItemId("Crown Crust Pizza");

  // 4. Insert Pizza Variants
  console.log("Inserting Item Variants...");
  await db.insert(itemVariants).values([
    // Chicken Tikka Pizza Variants
    { menuItemId: chickenTikkaId, name: "Small", price: 500 },
    { menuItemId: chickenTikkaId, name: "Medium", price: 1099 },
    { menuItemId: chickenTikkaId, name: "Large", price: 1600 },
    { menuItemId: chickenTikkaId, name: "Family", price: 2100 },

    // Fire House Pizza Variants
    { menuItemId: fireHouseId, name: "Small", price: 500 },
    { menuItemId: fireHouseId, name: "Medium", price: 1099 },
    { menuItemId: fireHouseId, name: "Large", price: 1600 },
    { menuItemId: fireHouseId, name: "Family", price: 2100 },

    // Crown Crust Pizza Variants (Starts at Medium)
    { menuItemId: crownCrustId, name: "Medium", price: 1199 },
    { menuItemId: crownCrustId, name: "Large", price: 1750 },
    { menuItemId: crownCrustId, name: "Family", price: 2300 },
  ]);

  console.log("✅ Seeding complete!");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
