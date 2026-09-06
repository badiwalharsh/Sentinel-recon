import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbStore } from "@/lib/db-store";
import { createAuditLog } from "@/lib/audit";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string; evidenceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { programId, evidenceId } = await params;
    const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

    const isMember = program.memberships.some((m) => m.userId === user.userId);
    if (user.systemRole !== "ADMIN" && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const evidence = dbStore.evidence.find(
      (ev) => ev.id === evidenceId && ev.programId === program.id
    );

    if (!evidence) {
      return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
    }

    return NextResponse.json({ data: evidence });
  } catch (error) {
    console.error("GET evidence error:", error);
    return NextResponse.json({ error: "Failed to retrieve evidence" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string; evidenceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { programId, evidenceId } = await params;
    const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

    const isMember = program.memberships.some((m) => m.userId === user.userId);
    if (user.systemRole !== "ADMIN" && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const index = dbStore.evidence.findIndex(
      (ev) => ev.id === evidenceId && ev.programId === program.id
    );

    if (index === -1) {
      return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
    }

    const [deleted] = dbStore.evidence.splice(index, 1);

    const savedFilename = (deleted.metadata as any)?.savedFilename;
    if (savedFilename) {
      try {
        const filePath = path.join(process.cwd(), "storage", "evidence", savedFilename);
        await fs.unlink(filePath);
      } catch (err) {
        console.warn("Could not delete physical evidence file:", err);
      }
    }

    dbStore.findings.forEach((f) => {
      if (f.evidenceIds && f.evidenceIds.includes(evidenceId)) {
        f.evidenceIds = f.evidenceIds.filter((id) => id !== evidenceId);
      }
    });

    await createAuditLog({
      action: "EVIDENCE_DELETE",
      entityType: "Evidence",
      entityId: evidenceId,
      programId: program.id,
      userId: user.userId,
      details: {
        fileName: (deleted.metadata as any)?.originalName || savedFilename,
      },
      req: request,
    });

    return NextResponse.json({ success: true, message: "Evidence deleted" });
  } catch (error) {
    console.error("DELETE evidence error:", error);
    return NextResponse.json({ error: "Failed to delete evidence" }, { status: 500 });
  }
}
