import { authorize } from "@/lib/server";
import { handleLesson } from "@/lib/tutor/lesson";
export async function POST(req: Request) {
  const denied = await authorize(req);
  return denied || handleLesson(req, process.env);
}
