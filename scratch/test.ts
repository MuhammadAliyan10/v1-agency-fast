import "dotenv/config";
import { sendWhatsAppItemCard } from '../lib/whatsapp/client';

async function run() {
  try {
    const res = await sendWhatsAppItemCard(
      "923026767428", 
      "Chessy Creamy", 
      699, 
      "https://agency-fast.vercel.app/Menu/Items.jpeg", 
      "1a737a90-3802-4a47-9ac9-059ab217f9a1", 
      "Order Now"
    );
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
