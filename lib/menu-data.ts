// lib/menu-data.ts

export interface MenuItem {
  name: string;
  price: string;
  note?: string;
}

export interface MenuCategory {
  id: string;
  label: string;
  emoji: string;
  items: MenuItem[];
}

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    id: "appetizers",
    label: "Appetizers",
    emoji: "🍟",
    items: [
      { name: "Nuggets Crisp", price: "Rs. 450" },
      { name: "French Fries", price: "Rs. 299" },
      { name: "Nachos Crunch", price: "Rs. 499" },
      { name: "Sesame Chicken", price: "Rs. 599" },
      { name: "Fries on Fire (with cheese)", price: "Rs. 599" },
    ],
  },
  {
    id: "sandwiches",
    label: "Sandwiches",
    emoji: "🥪",
    items: [
      { name: "Classic Chicken Sandwich", price: "Rs. 750" },
      { name: "Mughlai Chicken Sandwich", price: "Rs. 750" },
      { name: "Chicken Teriyaki Sandwich", price: "Rs. 695" },
      { name: "Italian Panini Sandwich", price: "Rs. 695" },
      { name: "Chicken Club Sandwich", price: "Rs. 650" },
    ],
  },
  {
    id: "burgers",
    label: "Burgers",
    emoji: "🍔",
    items: [
      { name: "Zinger Burger", price: "Rs. 350" },
      { name: "Fire Works Burger", price: "Rs. 650" },
      { name: "Texas Hot Burger", price: "Rs. 750" },
      { name: "Spicy Chicken Burger", price: "Rs. 650" },
      { name: "Sognature Beef Burger", price: "Rs. 750" },
    ],
  },
  {
    id: "wings",
    label: "Wings",
    emoji: "🍗",
    items: [
      { name: "Oven Baked Wings (Sweet Chili + B.B.Q)", price: "450 / 750", note: "Half / Full" },
      { name: "Chipotle Wings", price: "450 / 750", note: "Half / Full" },
      { name: "Mexican Wings", price: "450 / 750", note: "Half / Full" },
      { name: "Crispy Wings", price: "450 / 700", note: "Half / Full" },
    ],
  },
  {
    id: "pastas",
    label: "Pastas",
    emoji: "🍝",
    items: [
      { name: "Penne Arrabbiata Pasta", price: "Rs. 830" },
      { name: "Fettuccine Alfredo Pasta", price: "Rs. 795" },
      { name: "Crave Special Pasta", price: "Rs. 899" },
    ],
  },
  {
    id: "rolls",
    label: "Rolls & Wraps",
    emoji: "🌯",
    items: [
      { name: "Creamy Mughlai Roll", price: "Rs. 550" },
      { name: "Stuffed Chicken Spring Roll", price: "Rs. 550" },
      { name: "Fried Crispy Wrap", price: "Rs. 599" },
      { name: "Fried Chicken Taco", price: "Rs. 699" },
      { name: "Dynamite Chicken Tacos", price: "Rs. 650" },
      { name: "Italian Parmesan Chicken", price: "Rs. 699" },
      { name: "Quesadilla", price: "Rs. 650" },
    ],
  },
];

export interface PizzaItem {
  name: string;
  s?: string;
  m: string;
  l: string;
  f: string;
}

export const REGULAR_PIZZA: PizzaItem[] = [
  { name: "Fire House Pizza", s: "500", m: "1099", l: "1600", f: "2100" },
  { name: "Chicken Euro Pizza", s: "500", m: "1099", l: "1600", f: "2100" },
  { name: "Chicken Tikka Pizza", s: "500", m: "1099", l: "1600", f: "2100" },
  { name: "Chicken Fajita Pizza", s: "500", m: "1099", l: "1600", f: "2100" },
  { name: "Chicken Supreme Pizza", s: "500", m: "1099", l: "1600", f: "2100" },
  { name: "Chicken Super Max Pizza", s: "500", m: "1099", l: "1800", f: "2100" },
  { name: "Kabab Delight Pizza", s: "500", m: "1099", l: "1600", f: "2100" },
  { name: "Home Town Pizza", s: "500", m: "1099", l: "1600", f: "2100" },
];

export const SPECIAL_PIZZA: PizzaItem[] = [
  { name: "Crown Crust Pizza", m: "1199", l: "1750", f: "2300" },
  { name: "Kabab Crust Pizza", m: "1199", l: "1750", f: "2300" },
  { name: "Crunch Delight Pizza", m: "1199", l: "1750", f: "2300" },
  { name: "Crave Special Pizza", m: "1199", l: "1750", f: "2300" },
  { name: "Malai Botti Pizza", m: "1199", l: "1750", f: "2300" },
];

export const DESSERTS: MenuItem[] = [
  { name: "Three Milk Cake", price: "Rs. 1600", note: "Per slice Rs. 295" },
  { name: "Lotus Cake", price: "Rs. 1600", note: "Per slice Rs. 295" },
  { name: "Dairy Milk Chocolate", price: "Rs. 1600", note: "Per slice Rs. 295" },
  { name: "Double Chocolate Fudge Cake", price: "Rs. 1500", note: "Per slice Rs. 295" },
  { name: "Chocolate Dome", price: "Rs. 399" },
  { name: "Caramel Dome", price: "Rs. 399" },
  { name: "Snickers Pastry", price: "Rs. 350" },
  { name: "Biscoff Pastry", price: "Rs. 350" },
  { name: "Brownie (Chocolate + Crave Special + Walnut)", price: "Rs. 395" },
  { name: "Mini Donuts", price: "Rs. 295" },
  { name: "Stuff Mini Donut", price: "Rs. 350" },
  { name: "Walnut Tart", price: "Rs. 300" },
  { name: "Lemon Tart", price: "Rs. 200" },
  { name: "Banana Slice", price: "Rs. 350" },
  { name: "Oreo Delight", price: "Rs. 240" },
  { name: "Cup Cake (Plain / Nutella Chocolate / Lotus Cake)", price: "Rs. 220" },
  { name: "Cookies (Plain)", price: "Rs. 265" },
];

export const FINE_DESSERTS: MenuItem[] = [
  { name: "Brownie Point", price: "Rs. 395" },
  { name: "Cake Alaska", price: "Rs. 650" },
  { name: "Bread Pudding", price: "Rs. 415" },
  { name: "Peekaboo Chocolate", price: "Rs. 420" },
  { name: "Cake Crumble", price: "Rs. 450" },
  { name: "Molten Lava With Ice Cream", price: "Rs. 450" },
];

export const TROPICAL_DRINKS: MenuItem[] = [
  { name: "Mint Margarita", price: "Rs. 220" },
  { name: "Ginger Margarita", price: "Rs. 250" },
  { name: "Fresh Lemonade", price: "Rs. 220" },
  { name: "Strawberry Lemonade", price: "Rs. 270" },
  { name: "Cloudy Lemonade", price: "Rs. 250" },
  { name: "Pink Lady", price: "Rs. 350" },
  { name: "Pina Colada", price: "Rs. 350" },
  { name: "Ginger Mint Mojito", price: "Rs. 330" },
  { name: "Citrus Mojito", price: "Rs. 330" },
  { name: "Mango Mojito (Seasonal)", price: "Rs. 330" },
  { name: "Blue Ocean Mojito", price: "Rs. 330" },
];

export const ADD_ON_DRINKS: MenuItem[] = [
  { name: "Mineral Water", price: "Rs. 80" },
  { name: "Soft Drink", price: "Rs. 130" },
  { name: "Fresh Lime", price: "Rs. 150" },
];

export const SHAKES: MenuItem[] = [
  { name: "Vanilla Ice Rocher Shake", price: "Rs. 430" },
  { name: "Brownie Shake", price: "Rs. 430" },
  { name: "Banana Dates Protein Shake", price: "Rs. 475" },
  { name: "Ever Famed Oreo Shake", price: "Rs. 430" },
  { name: "Pineapple Smoothie", price: "Rs. 495" },
  { name: "Lotus Shake", price: "Rs. 495" },
  { name: "Healthy Banana Smoothie", price: "Rs. 495" },
  { name: "Peanut Butter Smoothie", price: "Rs. 495" },
  { name: "Strawberry Smoothie", price: "Rs. 495" },
];

export const FRAPPES: MenuItem[] = [
  { name: "Vanilla Frappe", price: "Rs. 495" },
  { name: "Lotus Frappe", price: "Rs. 495" },
  { name: "Chocolate Frappe", price: "Rs. 495" },
  { name: "Irish Frappe", price: "Rs. 495" },
];
