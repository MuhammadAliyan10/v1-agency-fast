import { RiderBoard } from "@/components/features/rider/rider-board";
import { requireRider } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function RiderPage() {
  const session = await requireRider();
  
  return (
    <div className="flex flex-col h-[100dvh] bg-black">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Deliveries</h1>
          <p className="text-xs text-zinc-500">Rider: {session.name}</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-zinc-950">
        <RiderBoard />
      </div>
    </div>
  );
}
