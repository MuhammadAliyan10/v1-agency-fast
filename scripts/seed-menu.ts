import { db } from "../database/db";
import {
  categories,
  menuItems,
  itemVariants,
  itemAddOns,
  deals,
  dealSlots,
  orders,
  orderItems,
  whatsappSessions,
  whatsappMessages
} from "../database/schema";
import crypto from "crypto";

async function seedMenu() {
  console.log("🌱 Wiping current database...");
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(dealSlots);
  await db.delete(deals);
  await db.delete(itemAddOns);
  await db.delete(itemVariants);
  await db.delete(menuItems);
  await db.delete(categories);
  await db.delete(whatsappSessions);
  await db.delete(whatsappMessages);
  
  console.log("✅ Wiped current data.");

  const uuids = {
    cat_pizza: crypto.randomUUID(), cat_burgers: crypto.randomUUID(), cat_chicken: crypto.randomUUID(), cat_wraps: crypto.randomUUID(), cat_appetizers: crypto.randomUUID(), cat_icecream: crypto.randomUUID(), cat_drinks: crypto.randomUUID(),
    item_pizza_fajita: crypto.randomUUID(), item_pizza_tikka: crypto.randomUUID(), item_pizza_supreme: crypto.randomUUID(), item_pizza_cheese: crypto.randomUUID(), item_pizza_lava: crypto.randomUUID(),
    item_burger_zinger: crypto.randomUUID(), item_burger_fire: crypto.randomUUID(), item_burger_fish: crypto.randomUUID(), item_burger_beef: crypto.randomUUID(),
    item_chicken_pc: crypto.randomUUID(), item_chicken_strips: crypto.randomUUID(), item_chicken_nuggets: crypto.randomUUID(),
    item_shawarma: crypto.randomUUID(), item_wrap_crispy: crypto.randomUUID(), item_wrap_tacos: crypto.randomUUID(), item_spring_roll: crypto.randomUUID(),
    item_fries: crypto.randomUUID(), item_wings_crispy: crypto.randomUUID(), item_wings_baked: crypto.randomUUID(), item_hot_shots: crypto.randomUUID(),
    item_ice_chocolate: crypto.randomUUID(), item_ice_vanilla: crypto.randomUUID(), item_ice_fruit: crypto.randomUUID(), item_lava_cake: crypto.randomUUID(),
    item_drink_reg: crypto.randomUUID(), item_drink_1ltr: crypto.randomUUID(), item_drink_15ltr: crypto.randomUUID(),
    deal_2pc: crypto.randomUUID(), deal_4pc: crypto.randomUUID(), deal_wow: crypto.randomUUID(), deal_snack: crypto.randomUUID(), deal_xtreme: crypto.randomUUID(), deal_crispy_duo: crypto.randomUUID(), deal_festival: crypto.randomUUID(), deal_strips: crypto.randomUUID(), deal_slice_sip: crypto.randomUUID(), deal_roll_slice: crypto.randomUUID(), deal_twin_slice: crypto.randomUUID(), deal_student: crypto.randomUUID(), deal_heat_cheese: crypto.randomUUID(), deal_taco_twist: crypto.randomUUID(), deal_party_time: crypto.randomUUID(), deal_family_supreme: crypto.randomUUID(), deal_fishy: crypto.randomUUID(),
  };

  const catData = [
    { id: uuids.cat_pizza, name: "Pizzas", description: "Freshly baked artisan pizzas", sortOrder: 1, isActive: true },
    { id: uuids.cat_burgers, name: "Burgers", description: "Juicy, flame-grilled burgers", sortOrder: 2, isActive: true },
    { id: uuids.cat_chicken, name: "Fried Chicken", description: "Crispy, golden fried chicken", sortOrder: 3, isActive: true },
    { id: uuids.cat_wraps, name: "Rolls & Wraps", description: "Deliciously toasted wraps", sortOrder: 4, isActive: true },
    { id: uuids.cat_appetizers, name: "Appetizers & Wings", description: "Perfect starters and crispy wings", sortOrder: 5, isActive: true },
    { id: uuids.cat_icecream, name: "Ice Cream Rolls", description: "Handcrafted Thai ice cream rolls", sortOrder: 6, isActive: true },
    { id: uuids.cat_drinks, name: "Drinks", description: "Refreshing beverages", sortOrder: 7, isActive: true },
  ];
  const genSlug = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  await db.insert(categories).values(catData.map(c => ({...c, slug: genSlug(c.name)})));

  const itemsData = [
    { id: uuids.item_pizza_fajita, categoryId: uuids.cat_pizza, name: "Chicken Fajita Pizza", description: "Marinated fajita chicken, onions, green peppers, and premium mozzarella.", basePrice: 600 },
    { id: uuids.item_pizza_tikka, categoryId: uuids.cat_pizza, name: "Chicken Tikka Pizza", description: "Spicy BBQ tikka chunks with onions and extra cheese.", basePrice: 600 },
    { id: uuids.item_pizza_supreme, categoryId: uuids.cat_pizza, name: "Supreme Pizza", description: "Loaded with pepperoni, sausages, mushrooms, olives, and bell peppers.", basePrice: 700 },
    { id: uuids.item_pizza_cheese, categoryId: uuids.cat_pizza, name: "Margherita Cheese Lover", description: "A classic blend of rich tomato sauce and double mozzarella cheese.", basePrice: 500 },
    { id: uuids.item_pizza_lava, categoryId: uuids.cat_pizza, name: "Molten Lava Pizza", description: "A unique deep-dish pizza with a molten cheese and spicy chicken center.", basePrice: 1200 },
    { id: uuids.item_burger_zinger, categoryId: uuids.cat_burgers, name: "Zinger Burger", description: "Crispy chicken breast fillet with fresh lettuce and mayo in a toasted bun.", basePrice: 450 },
    { id: uuids.item_burger_fire, categoryId: uuids.cat_burgers, name: "Fire Works Burger", description: "Spicy grilled chicken topped with jalapenos and our signature hot sauce.", basePrice: 550 },
    { id: uuids.item_burger_fish, categoryId: uuids.cat_burgers, name: "Fish Burger", description: "Crispy battered fish fillet with tartar sauce and fresh greens.", basePrice: 600 },
    { id: uuids.item_burger_beef, categoryId: uuids.cat_burgers, name: "Classic Beef Burger", description: "Juicy beef patty with caramelized onions, cheddar cheese, and pickles.", basePrice: 650 },
    { id: uuids.item_chicken_pc, categoryId: uuids.cat_chicken, name: "Hot & Crispy Chicken", description: "Our signature original recipe crispy fried chicken piece.", basePrice: 230 },
    { id: uuids.item_chicken_strips, categoryId: uuids.cat_chicken, name: "Boneless Strips", description: "Crispy, tender, 100% chicken breast strips.", basePrice: 400 },
    { id: uuids.item_chicken_nuggets, categoryId: uuids.cat_chicken, name: "Chicken Nuggets (6pcs)", description: "Bite-sized golden chicken nuggets perfect for dipping.", basePrice: 350 },
    { id: uuids.item_shawarma, categoryId: uuids.cat_wraps, name: "Chicken Shawarma", description: "Authentic middle-eastern chicken shawarma with garlic sauce.", basePrice: 250 },
    { id: uuids.item_wrap_crispy, categoryId: uuids.cat_wraps, name: "Fried Crispy Wrap", description: "Crispy chicken strips wrapped with lettuce, cheese, and spicy mayo.", basePrice: 400 },
    { id: uuids.item_wrap_tacos, categoryId: uuids.cat_wraps, name: "Dynamite Tacos", description: "Crispy taco shells filled with dynamite chicken, salsa, and cheese.", basePrice: 550 },
    { id: uuids.item_spring_roll, categoryId: uuids.cat_wraps, name: "Spring Roll", description: "Crispy rolls stuffed with seasoned vegetables and chicken.", basePrice: 200 },
    { id: uuids.item_fries, categoryId: uuids.cat_appetizers, name: "Crispy Fries", description: "Golden, crispy shoestring potato fries.", basePrice: 200 },
    { id: uuids.item_wings_crispy, categoryId: uuids.cat_appetizers, name: "Crispy Wings (6pcs)", description: "Deep fried chicken wings with a crunchy coating.", basePrice: 450 },
    { id: uuids.item_wings_baked, categoryId: uuids.cat_appetizers, name: "Oven Baked Wings (6pcs)", description: "Healthy oven-baked wings glazed with BBQ sauce.", basePrice: 500 },
    { id: uuids.item_hot_shots, categoryId: uuids.cat_appetizers, name: "Hot Shots", description: "Spicy, crispy bite-sized chicken pops.", basePrice: 350 },
    { id: uuids.item_ice_chocolate, categoryId: uuids.cat_icecream, name: "Chocolate Ice Rolls", description: "Rich chocolate ice cream rolls topped with chocolate chips and syrup.", basePrice: 300 },
    { id: uuids.item_ice_vanilla, categoryId: uuids.cat_icecream, name: "Vanilla Bean Ice Rolls", description: "Classic Madagascar vanilla ice cream rolls.", basePrice: 250 },
    { id: uuids.item_ice_fruit, categoryId: uuids.cat_icecream, name: "Strawberry Fruit Ice Rolls", description: "Fresh strawberry blended ice cream rolls.", basePrice: 350 },
    { id: uuids.item_lava_cake, categoryId: uuids.cat_icecream, name: "Molten Lava Cake", description: "Warm chocolate lava cake with a gooey center.", basePrice: 450 },
    { id: uuids.item_drink_reg, categoryId: uuids.cat_drinks, name: "Regular Drink", description: "Chilled soft drink in a regular cup.", basePrice: 100 },
    { id: uuids.item_drink_1ltr, categoryId: uuids.cat_drinks, name: "1 Liter Drink", description: "Family sized 1 Liter soft drink.", basePrice: 200 },
    { id: uuids.item_drink_15ltr, categoryId: uuids.cat_drinks, name: "1.5 Liter Drink", description: "Jumbo sized 1.5 Liter soft drink.", basePrice: 250 },
  ];
  await db.insert(menuItems).values(itemsData.map(i => ({...i, isAvailable: true, slug: genSlug(i.name)})));

  const variantData: any[] = [];
  const pizzaIds = [uuids.item_pizza_fajita, uuids.item_pizza_tikka, uuids.item_pizza_supreme, uuids.item_pizza_cheese];
  
  for (const p of pizzaIds) {
    variantData.push({ id: crypto.randomUUID(), menuItemId: p, name: "Small", price: 600 });
    variantData.push({ id: crypto.randomUUID(), menuItemId: p, name: "Medium", price: 1100 });
    variantData.push({ id: crypto.randomUUID(), menuItemId: p, name: "Large", price: 1600 });
    variantData.push({ id: crypto.randomUUID(), menuItemId: p, name: "Family", price: 2100 });
  }
  await db.insert(itemVariants).values(variantData);

  const addOnData = [
    { id: crypto.randomUUID(), menuItemId: uuids.item_burger_zinger, name: "Extra Cheese", price: 60 },
    { id: crypto.randomUUID(), menuItemId: uuids.item_burger_fire, name: "Extra Cheese", price: 60 },
    { id: crypto.randomUUID(), menuItemId: uuids.item_burger_beef, name: "Double Patty", price: 250 },
    { id: crypto.randomUUID(), menuItemId: uuids.item_fries, name: "Garlic Mayo Dip", price: 50 },
    { id: crypto.randomUUID(), menuItemId: uuids.item_fries, name: "Spicy Dip", price: 50 },
  ];
  await db.insert(itemAddOns).values(addOnData);

  const dealsConfig = [
    { id: uuids.deal_2pc, name: "2 Pieces Chicken", dealPrice: 460 },
    { id: uuids.deal_4pc, name: "4 Pieces Chicken", dealPrice: 899 },
    { id: uuids.deal_wow, name: "Wow Box", dealPrice: 630 },
    { id: uuids.deal_snack, name: "Snack Bucket", dealPrice: 640 },
    { id: uuids.deal_xtreme, name: "Xtreme Duo Box", dealPrice: 1499 },
    { id: uuids.deal_crispy_duo, name: "Crispy Duo Box", dealPrice: 1350 },
    { id: uuids.deal_festival, name: "Family Festival", dealPrice: 2290 },
    { id: uuids.deal_strips, name: "Strips chips N' Dips", dealPrice: 1299 },
    { id: uuids.deal_slice_sip, name: "Slice & Sip", dealPrice: 520 },
    { id: uuids.deal_roll_slice, name: "Roll 'N' Slice Combo", dealPrice: 1599 },
    { id: uuids.deal_twin_slice, name: "Twin Slice", dealPrice: 1499 },
    { id: uuids.deal_student, name: "Student Saver", dealPrice: 2299 },
    { id: uuids.deal_heat_cheese, name: "Heat & Cheese", dealPrice: 2049 },
    { id: uuids.deal_taco_twist, name: "Taco Twist", dealPrice: 2599 },
    { id: uuids.deal_party_time, name: "Party Time Combo", dealPrice: 3799 },
    { id: uuids.deal_family_supreme, name: "Family Supreme", dealPrice: 4799 },
    { id: uuids.deal_fishy, name: "FISHy Bite (Seasonal)", dealPrice: 1050 },
  ];
  await db.insert(deals).values(dealsConfig.map(d => ({ ...d, originalPrice: d.dealPrice + 100, description: "Exclusive Special Deal", isActive: true })));

  const slots: any[] = [];
  const addSlot = (dealId: string, slotName: string, qty: number, catId?: string, variant?: string, itemId?: string) => {
    slots.push({ id: crypto.randomUUID(), dealId, slotName, quantity: qty, categoryId: catId || null, requiredVariantName: variant || null, menuItemId: itemId || null });
  };

  addSlot(uuids.deal_2pc, "Hot & Crispy Chicken", 2, undefined, undefined, uuids.item_chicken_pc);
  addSlot(uuids.deal_4pc, "Hot & Crispy Chicken", 4, undefined, undefined, uuids.item_chicken_pc);
  
  addSlot(uuids.deal_wow, "Zinger Burger", 1, undefined, undefined, uuids.item_burger_zinger);
  addSlot(uuids.deal_wow, "Hot & Crispy Chicken", 1, undefined, undefined, uuids.item_chicken_pc);
  addSlot(uuids.deal_wow, "Portion Fries", 1, undefined, undefined, uuids.item_fries);
  addSlot(uuids.deal_wow, "Regular Drink", 1, undefined, undefined, uuids.item_drink_reg);

  addSlot(uuids.deal_snack, "Crispy Wings", 4, undefined, undefined, uuids.item_wings_crispy);
  addSlot(uuids.deal_snack, "Hot Shots", 4, undefined, undefined, uuids.item_hot_shots);
  addSlot(uuids.deal_snack, "Strips", 2, undefined, undefined, uuids.item_chicken_strips);

  addSlot(uuids.deal_xtreme, "Zinger Burger", 2, undefined, undefined, uuids.item_burger_zinger);
  addSlot(uuids.deal_xtreme, "Hot & Crispy Chicken", 2, undefined, undefined, uuids.item_chicken_pc);
  addSlot(uuids.deal_xtreme, "Portion Fries", 1, undefined, undefined, uuids.item_fries);
  addSlot(uuids.deal_xtreme, "Regular Drink", 2, undefined, undefined, uuids.item_drink_reg);

  addSlot(uuids.deal_crispy_duo, "Hot & Crispy Chicken", 5, undefined, undefined, uuids.item_chicken_pc);
  addSlot(uuids.deal_crispy_duo, "Portion Fries", 1, undefined, undefined, uuids.item_fries);
  addSlot(uuids.deal_crispy_duo, "Regular Drink", 2, undefined, undefined, uuids.item_drink_reg);

  addSlot(uuids.deal_festival, "Zinger Burger", 4, undefined, undefined, uuids.item_burger_zinger);
  addSlot(uuids.deal_festival, "Hot & Crispy Chicken", 4, undefined, undefined, uuids.item_chicken_pc);
  addSlot(uuids.deal_festival, "1.5Ltr Drink", 1, undefined, undefined, uuids.item_drink_15ltr);

  addSlot(uuids.deal_strips, "Boneless Strips", 8, undefined, undefined, uuids.item_chicken_strips);
  addSlot(uuids.deal_strips, "Portion Fries", 1, undefined, undefined, uuids.item_fries);
  addSlot(uuids.deal_strips, "Regular Drink", 1, undefined, undefined, uuids.item_drink_reg);

  addSlot(uuids.deal_slice_sip, "Any Small Pizza", 1, uuids.cat_pizza, "Small", undefined);
  addSlot(uuids.deal_slice_sip, "Regular Drink", 1, undefined, undefined, uuids.item_drink_reg);

  addSlot(uuids.deal_roll_slice, "Any Medium Pizza", 1, uuids.cat_pizza, "Medium", undefined);
  addSlot(uuids.deal_roll_slice, "Spring Roll", 1, undefined, undefined, uuids.item_spring_roll);
  addSlot(uuids.deal_roll_slice, "1 Ltr Drink", 1, undefined, undefined, uuids.item_drink_1ltr);

  addSlot(uuids.deal_twin_slice, "Any Small Pizza", 2, uuids.cat_pizza, "Small", undefined);
  addSlot(uuids.deal_twin_slice, "Hot & Crispy Chicken", 2, undefined, undefined, uuids.item_chicken_pc);
  addSlot(uuids.deal_twin_slice, "Regular Drink", 2, undefined, undefined, uuids.item_drink_reg);

  addSlot(uuids.deal_student, "Any Medium Pizza", 1, uuids.cat_pizza, "Medium", undefined);
  addSlot(uuids.deal_student, "Zinger Burger", 2, undefined, undefined, uuids.item_burger_zinger);
  addSlot(uuids.deal_student, "Chicken Shawarma", 2, undefined, undefined, uuids.item_shawarma);
  addSlot(uuids.deal_student, "1.5Ltr Drink", 1, undefined, undefined, uuids.item_drink_15ltr);

  addSlot(uuids.deal_heat_cheese, "Any Large Pizza", 1, uuids.cat_pizza, "Large", undefined);
  addSlot(uuids.deal_heat_cheese, "Oven Baked Wings", 6, undefined, undefined, uuids.item_wings_baked);
  addSlot(uuids.deal_heat_cheese, "1 Ltr Drink", 1, undefined, undefined, uuids.item_drink_1ltr);

  addSlot(uuids.deal_taco_twist, "Any Large Pizza", 1, uuids.cat_pizza, "Large", undefined);
  addSlot(uuids.deal_taco_twist, "Any Small Pizza", 1, uuids.cat_pizza, "Small", undefined);
  addSlot(uuids.deal_taco_twist, "Dynamite Tacos", 1, undefined, undefined, uuids.item_wrap_tacos);
  addSlot(uuids.deal_taco_twist, "1.5Ltr Drink", 1, undefined, undefined, uuids.item_drink_15ltr);

  addSlot(uuids.deal_party_time, "Any Large Pizza", 2, uuids.cat_pizza, "Large", undefined);
  addSlot(uuids.deal_party_time, "Chicken Shawarma", 2, undefined, undefined, uuids.item_shawarma);
  addSlot(uuids.deal_party_time, "Portion Fries", 1, undefined, undefined, uuids.item_fries);
  addSlot(uuids.deal_party_time, "1.5Ltr Drink", 1, undefined, undefined, uuids.item_drink_15ltr);

  addSlot(uuids.deal_family_supreme, "Any Family Pizza", 1, uuids.cat_pizza, "Family", undefined);
  addSlot(uuids.deal_family_supreme, "Any Medium Pizza", 1, uuids.cat_pizza, "Medium", undefined);
  addSlot(uuids.deal_family_supreme, "Crispy Wings", 6, undefined, undefined, uuids.item_wings_crispy);
  addSlot(uuids.deal_family_supreme, "Nuggets", 6, undefined, undefined, uuids.item_chicken_nuggets);
  addSlot(uuids.deal_family_supreme, "Fried Crispy Wrap", 1, undefined, undefined, uuids.item_wrap_crispy);
  addSlot(uuids.deal_family_supreme, "Molten Lava Cake", 1, undefined, undefined, uuids.item_lava_cake);
  addSlot(uuids.deal_family_supreme, "1.5Ltr Drink", 1, undefined, undefined, uuids.item_drink_15ltr);

  addSlot(uuids.deal_fishy, "Fish Burger", 1, undefined, undefined, uuids.item_burger_fish);
  addSlot(uuids.deal_fishy, "Portion Fries", 1, undefined, undefined, uuids.item_fries);
  addSlot(uuids.deal_fishy, "Regular Drink", 1, undefined, undefined, uuids.item_drink_reg);

  await db.insert(dealSlots).values(slots);
  
  console.log("🌟 Seeding Complete!");
  process.exit(0);
}

seedMenu().catch(err => {
  console.error("Error Seeding:", err);
  process.exit(1);
});
