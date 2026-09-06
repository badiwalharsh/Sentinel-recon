import { NextRequest, NextResponse } from "next/server";
import { requireProgramAccess, AuthError } from "@/lib/auth/guard";
import { dbStore } from "@/lib/db-store";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string; filename: string }> }
) {
  try {
    const { programId, filename } = await params;
    const { program } = await requireProgramAccess(programId, "VIEWER");

    const sanitizedFilename = path.basename(filename);

    // Verify file belongs to an evidence item in this program
    const matchingEvidence = dbStore.evidence.find(
      (ev) =>
        ev.programId === program.id &&
        (ev.storagePath?.includes(sanitizedFilename) ||
          (ev.metadata && ev.metadata.savedFilename === sanitizedFilename))
    );

    if (!matchingEvidence) {
      return NextResponse.json({ error: "Evidence file not found in this program" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "storage", "evidence", sanitizedFilename);

    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const fileBuffer = await fs.readFile(filePath);

      const ext = path.extname(sanitizedFilename).toLowerCase();
      let contentType = "application/octet-stream";

      switch (ext) {
        case ".png":
          contentType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          contentType = "image/jpeg";
          break;
        case ".webp":
          contentType = "image/webp";
          break;
        case ".gif":
          contentType = "image/gif";
          break;
        case ".pdf":
          contentType = "application/pdf";
          break;
        case ".json":
          contentType = "application/json";
          break;
        case ".csv":
          contentType = "text/csv";
          break;
        case ".txt":
        case ".log":
          contentType = "text/plain";
          break;
      }

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": stat.size.toString(),
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      return NextResponse.json({ error: "Evidence file not found on disk" }, { status: 404 });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET evidence file error:", error);
    return NextResponse.json({ error: "Failed to read evidence file" }, { status: 500 });
  }
}
