import { authorize } from "@/lib/server";
import { handleTranscription } from "@/lib/tutor/transcribe";
export async function POST(req: Request) {
  const denied = await authorize(req);
  return denied || handleTranscription(req, process.env);
}
