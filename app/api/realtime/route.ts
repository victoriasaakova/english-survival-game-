import { authorize } from "@/lib/server";
import { handleRealtime } from "@/lib/tutor/realtime";
export async function POST(req: Request) {
  const denied = await authorize(req);
  return denied || handleRealtime(req, process.env);
}
