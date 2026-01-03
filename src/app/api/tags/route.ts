import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Default tags to seed
const DEFAULT_TAGS = [
  "VIP",
  "Urgent",
  "Follow-up",
  "Hot lead",
  "Waiting on them",
  "Question",
];

// GET /api/tags - List all tags (seeds defaults if empty)
export async function GET() {
  try {
    let tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
    });

    // Seed default tags if none exist
    if (tags.length === 0) {
      await prisma.tag.createMany({
        data: DEFAULT_TAGS.map((name) => ({ name })),
        skipDuplicates: true,
      });
      tags = await prisma.tag.findMany({
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if tag already exists
    const existing = await prisma.tag.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Tag already exists", tag: existing },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: { name: trimmedName },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
