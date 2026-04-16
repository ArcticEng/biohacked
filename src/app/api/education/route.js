// ═══════════════════════════════════════════════════
// /api/education — Videos, Papers, Educator Uploads
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { summarizeResearchPaper } from "@/lib/ai";
import { videoUploadSchema } from "@/lib/validation";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "videos";
  const category = searchParams.get("category");
  const mine = searchParams.get("mine");

  if (type === "papers") {
    const where = category ? { category } : {};
    const papers = await prisma.researchPaper.findMany({ where, orderBy: { year: "desc" } });
    return NextResponse.json({ papers });
  }

  // Educator: my videos only
  if (mine && (auth.user.role === "EDUCATOR" || auth.user.role === "ADMIN")) {
    const videos = await prisma.educationVideo.findMany({
      where: { authorId: auth.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ videos });
  }

  const where = {
    approved: true,
    ...(category && category !== "all" ? { category } : {}),
  };
  const videos = await prisma.educationVideo.findMany({
    where,
    orderBy: { views: "desc" },
    include: {
      author: { select: { id: true, name: true, verified: true, credentials: true } },
    },
  });

  return NextResponse.json({ videos });
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  // AI Summary (premium)
  if (body.action === "summarize") {
    if (auth.user.tier === "FREE") {
      return NextResponse.json({ error: "AI summaries are a Premium feature" }, { status: 403 });
    }

    const paper = await prisma.researchPaper.findUnique({ where: { id: body.paperId } });
    if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

    if (paper.aiSummary) return NextResponse.json({ summary: JSON.parse(paper.aiSummary) });

    const result = await summarizeResearchPaper({ title: paper.title, abstract: paper.abstract });
    if (result.success) {
      await prisma.researchPaper.update({
        where: { id: paper.id },
        data: { aiSummary: JSON.stringify(result.summary) },
      });
      return NextResponse.json({ summary: result.summary });
    }
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // AI research topic analysis (premium)
  if (body.action === "analyse") {
    if (auth.user.tier === "FREE") {
      return NextResponse.json({ error: "AI analysis is a Premium feature" }, { status: 403 });
    }

    const result = await summarizeResearchPaper({
      title: body.topic,
      abstract: `Provide an evidence-based breakdown of: ${body.topic}. Consult relevant sports science literature.`,
    });
    if (result.success) return NextResponse.json({ summary: result.summary });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Video upload (educators only)
  if (body.action === "upload_video") {
    if (auth.user.role !== "EDUCATOR" && auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only educators can upload videos" }, { status: 403 });
    }

    const parsed = videoUploadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const video = await prisma.educationVideo.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        videoUrl: parsed.data.videoUrl,
        thumbnailUrl: parsed.data.thumbnailUrl || null,
        duration: parsed.data.duration || null,
        category: parsed.data.category,
        authorName: auth.user.name,
        authorId: auth.user.id,
        approved: auth.user.verified, // auto-approve if educator verified
      },
    });
    return NextResponse.json({ video });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(request) {
  const auth = await requireRole(request, ["EDUCATOR", "ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.educationVideo.deleteMany({
    where: { id, authorId: auth.user.id },
  });

  return NextResponse.json({ success: true });
}
