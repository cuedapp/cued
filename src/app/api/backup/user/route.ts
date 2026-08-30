import { getCurrentUser } from "@/server/auth/session";
import { backupService } from "@/server/application/services";

const maxArchiveSize = 10 * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const archive = await backupService.exportUser(user.id);
  return Response.json(archive, { headers: { "Content-Disposition": `attachment; filename="cued-user-export-${new Date().toISOString().slice(0, 10)}.json"` } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "forbidden" }, { status: 403 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxArchiveSize) return Response.json({ error: "too_large" }, { status: 413 });
  try {
    const formData = await request.formData();
    const file = formData.get("archive");
    if (!(file instanceof File) || file.size === 0 || file.size > maxArchiveSize) throw new Error("Invalid archive");
    const result = await backupService.importUser(user.id, JSON.parse(await file.text()) as unknown);
    return Response.json({ result: { feedback: result.importedFeedback, follows: result.importedFollows, skipped: result.skippedFeedback } });
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
}
