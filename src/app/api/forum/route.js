// ═══════════════════════════════════════════════════
// /api/forum — Community Forum
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { forumPostSchema, forumReplySchema, moderateContent } from "@/lib/validation";

// POST /api/forum — Create post, reply, or like
export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  // ── Like a post ──
  if (body.action === "like") {
    const existing = await prisma.forumLike.findUnique({
      where: { postId_userId: { postId: body.postId, userId: auth.user.id } },
    });
    if (existing) {
      await prisma.forumLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.forumLike.create({
      data: { postId: body.postId, userId: auth.user.id },
    });
    return NextResponse.json({ liked: true });
  }

  // ── Reply to a post ──
  if (body.action === "reply") {
    const parsed = forumReplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Content moderation
    const mod = moderateContent(parsed.data.body);
    if (!mod.clean) {
      return NextResponse.json(
        { error: "Your message contains inappropriate language. Please keep the community supportive." },
        { status: 400 }
      );
    }

    const reply = await prisma.forumReply.create({
      data: {
        postId: body.postId,
        authorId: auth.user.id,
        body: parsed.data.body,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
    return NextResponse.json({ reply });
  }

  // ── Create a post ──
  const parsed = forumPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const mod = moderateContent(parsed.data.title + " " + parsed.data.body);
  if (!mod.clean) {
    return NextResponse.json(
      { error: "Your post contains inappropriate language. Please keep the community supportive." },
      { status: 400 }
    );
  }

  const post = await prisma.forumPost.create({
    data: {
      authorId: auth.user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      tags: parsed.data.tags,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      _count: { select: { replies: true, likes: true } },
    },
  });

  return NextResponse.json({ post });
}

// GET /api/forum — List posts
export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  const postId = searchParams.get("id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  // Single post with replies
  if (postId) {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
        replies: {
          include: { author: { select: { id: true, name: true, avatar: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        likes: { select: { userId: true } },
        _count: { select: { replies: true, likes: true } },
      },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    return NextResponse.json({
      post: {
        ...post,
        userLiked: post.likes.some(l => l.userId === auth.user.id),
      },
    });
  }

  // List posts
  const where = tag && tag !== "all" ? { tags: { has: tag } } : {};

  const posts = await prisma.forumPost.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      _count: { select: { replies: true, likes: true } },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.forumPost.count({ where });

  return NextResponse.json({ posts, total, page });
}
