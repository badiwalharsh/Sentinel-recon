import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbStore, MockEvidence } from "@/lib/db-store";
import { createAuditLog } from "@/lib/audit";
import { createEvidenceSchema, ALLOWED_EVIDENCE_MIME_TYPES, MAX_EVIDENCE_SIZE_BYTES } from "@/lib/validations/workflow";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "evidence");

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create evidence upload dir:", err);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { programId } = await params;
    const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

    const isMember = program.memberships.some((m) => m.userId === user.userId);
    if (user.systemRole !== "ADMIN" && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("targetId");
    const assetId = searchParams.get("assetId");
    const findingId = searchParams.get("findingId");

    let evidenceList = dbStore.evidence.filter((ev) => ev.programId === program.id);

    if (targetId) {
      evidenceList = evidenceList.filter((ev) => ev.targetId === targetId);
    }
    if (assetId) {
      evidenceList = evidenceList.filter((ev) => ev.assetId === assetId);
    }
    if (findingId) {
      evidenceList = evidenceList.filter((ev) => ev.findingId === findingId);
    }

    evidenceList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      data: evidenceList,
      total: evidenceList.length,
    });
  } catch (error) {
    console.error("GET evidence error:", error);
    return NextResponse.json({ error: "Failed to fetch evidence" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { programId } = await params;
    const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

    const isMember = program.memberships.some((m) => m.userId === user.userId);
    if (user.systemRole !== "ADMIN" && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`evidence:upload:${user.userId || ip}`, 10, 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: "Upload rate limit exceeded. Please wait before uploading more evidence items.",
          retryAfter: rateCheck.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.resetSeconds.toString(),
          },
        }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    await ensureUploadDir();

    let evidenceData: any = {};
    let savedFilename = "";
    let mimeType = "application/octet-stream";
    let fileSize = 0;
    let originalName = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const targetId = formData.get("targetId") as string | null;
      const assetId = formData.get("assetId") as string | null;
      const findingId = formData.get("findingId") as string | null;
      const type = (formData.get("type") as string) || "RAW_DATA";
      const notes = (formData.get("notes") as string) || "";
      const metadataStr = formData.get("metadata") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
      }

      if (file.size > MAX_EVIDENCE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size exceeds maximum allowed limit of ${MAX_EVIDENCE_SIZE_BYTES / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }

      mimeType = file.type || "application/octet-stream";
      const ext = path.extname(file.name).toLowerCase();
      const validExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".txt", ".json", ".csv", ".log"];
      
      const isAllowedMime = (ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(mimeType);
      const isAllowedExt = validExtensions.includes(ext);

      if (!isAllowedMime && !isAllowedExt) {
        return NextResponse.json(
          { error: `Unsupported file type: ${mimeType || ext}. Allowed types: Images (PNG, JPG, WEBP), PDF, JSON, CSV, TXT/LOG` },
          { status: 400 }
        );
      }

      originalName = file.name;
      fileSize = file.size;

      const randomHex = crypto.randomBytes(16).toString("hex");
      savedFilename = `${randomHex}${ext || ".bin"}`;
      const filePath = path.join(UPLOAD_DIR, savedFilename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      let parsedMeta = {};
      if (metadataStr) {
        try {
          parsedMeta = JSON.parse(metadataStr);
        } catch {
          parsedMeta = { raw: metadataStr };
        }
      }

      evidenceData = {
        title: originalName,
        targetId: targetId || undefined,
        assetId: assetId || undefined,
        findingId: findingId || undefined,
        type,
        storagePath: `/api/v1/programs/${program.slug}/evidence/files/${savedFilename}`,
        metadata: {
          originalName,
          mimeType,
          sizeBytes: fileSize,
          savedFilename,
          notes,
          ...parsedMeta,
        },
      };
    } else {
      const body = await request.json();
      const validated = createEvidenceSchema.safeParse(body);
      if (!validated.success) {
        return NextResponse.json(
          { error: "Validation failed", details: validated.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { targetId, assetId, findingId, type, content, metadata, title } = validated.data;

      if (content) {
        const randomHex = crypto.randomBytes(16).toString("hex");
        savedFilename = `snippet_${randomHex}.txt`;
        const filePath = path.join(UPLOAD_DIR, savedFilename);
        await fs.writeFile(filePath, content, "utf-8");

        originalName = `snippet_${new Date().toISOString().slice(0, 10)}.txt`;
        fileSize = Buffer.byteLength(content, "utf-8");

        evidenceData = {
          title: title || originalName,
          targetId,
          assetId,
          findingId,
          type: type || "RAW_DATA",
          content,
          storagePath: `/api/v1/programs/${program.slug}/evidence/files/${savedFilename}`,
          metadata: {
            originalName,
            mimeType: "text/plain",
            sizeBytes: fileSize,
            savedFilename,
            contentPreview: content.slice(0, 300),
            ...(metadata || {}),
          },
        };
      } else {
        evidenceData = {
          title: title || "Evidence Item",
          targetId,
          assetId,
          findingId,
          type: type || "RAW_DATA",
          storagePath: body.storagePath || "",
          metadata: metadata || {},
        };
      }
    }

    const newEvidence: MockEvidence = {
      id: `ev_${crypto.randomBytes(6).toString("hex")}`,
      programId: program.id,
      targetId: evidenceData.targetId || null,
      assetId: evidenceData.assetId || null,
      findingId: evidenceData.findingId || null,
      title: evidenceData.title || originalName || "Evidence Item",
      type: evidenceData.type,
      content: evidenceData.content || null,
      storagePath: evidenceData.storagePath,
      metadata: evidenceData.metadata,
      uploadedBy: user.email,
      uploadedById: user.userId,
      createdAt: new Date().toISOString(),
    };

    dbStore.evidence.push(newEvidence);

    if (newEvidence.findingId) {
      const finding = dbStore.findings.find((f) => f.id === newEvidence.findingId);
      if (finding) {
        if (!finding.evidenceIds) finding.evidenceIds = [];
        if (!finding.evidenceIds.includes(newEvidence.id)) {
          finding.evidenceIds.push(newEvidence.id);
        }
      }
    }

    await createAuditLog({
      action: "EVIDENCE_UPLOAD",
      entityType: "Evidence",
      entityId: newEvidence.id,
      programId: program.id,
      userId: user.userId,
      details: {
        evidenceType: newEvidence.type,
        targetId: newEvidence.targetId,
        findingId: newEvidence.findingId,
        fileName: originalName || savedFilename,
      },
      req: request,
    });

    return NextResponse.json({ data: newEvidence }, { status: 201 });
  } catch (error) {
    console.error("POST evidence error:", error);
    return NextResponse.json({ error: "Failed to upload evidence" }, { status: 500 });
  }
}
