import { gunzipSync, gzipSync } from "node:zlib";
import { getCurrentUser } from "@/server/auth/session";
import { backupService } from "@/server/application/services";

const maxArchiveSize = 100 * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Forbidden", { status: 403 });
  const archive = await backupService.exportFull();
  const payload = gzipSync(JSON.stringify(archive));
  return new Response(payload, { headers: { "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename="cued-full-backup-${new Date().toISOString().slice(0, 10)}.json.gz"` } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return Response.json({ error: "forbidden" }, { status: 403 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxArchiveSize) return Response.json({ error: "too_large" }, { status: 413 });
  try {
    const formData = await request.formData();
    const file = formData.get("archive");
    if (!(file instanceof File) || file.size === 0 || file.size > maxArchiveSize) throw new Error("Invalid archive");
    const compressed = new Uint8Array(await file.arrayBuffer());
    const isGzip = file.name.endsWith(".gz") || (compressed[0] === 0x1f && compressed[1] === 0x8b);
    const payload = isGzip ? gunzipSync(compressed, { maxOutputLength: maxArchiveSize }) : compressed;
    await backupService.restoreFull(JSON.parse(new TextDecoder().decode(payload)) as unknown);
    return Response.json({ result: "restored" });
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
}
