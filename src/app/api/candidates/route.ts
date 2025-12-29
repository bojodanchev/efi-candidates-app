import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendTelegramMessage,
  formatCandidateMessage,
  getInlineKeyboard,
} from "@/lib/telegram";

// Verify API key for Apps Script requests
function verifyApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  return token === process.env.API_KEY;
}

// POST /api/candidates - Create new candidate (from Apps Script)
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Parse submitted date
    let submittedAt: Date;
    if (body.submittedAt && body.time) {
      // Combine date and time from Google Sheet format
      const dateStr = `${body.submittedAt} ${body.time}`;
      submittedAt = new Date(dateStr);
      if (isNaN(submittedAt.getTime())) {
        submittedAt = new Date();
      }
    } else {
      submittedAt = new Date();
    }

    // Check if candidate already exists
    const existing = await prisma.candidate.findUnique({
      where: { email: body.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Candidate already exists", id: existing.id },
        { status: 409 }
      );
    }

    // Create candidate
    const candidate = await prisma.candidate.create({
      data: {
        firstName: body.firstName || "",
        lastName: body.lastName || "",
        email: body.email,
        phone: body.phone || null,
        birthDate: body.birthDate || null,
        heightCm: body.height ? parseInt(body.height) : null,
        instagram: body.instagram || null,
        tiktok: body.tiktok || null,
        city: body.city || null,
        category: body.category || null,
        photoUrls: body.photoUrls || [],
        submittedAt,
      },
    });

    // Send Telegram notification
    const telegramMessage = formatCandidateMessage(candidate);
    const inlineKeyboard = getInlineKeyboard(candidate.id);

    const telegramResponse = await sendTelegramMessage({
      text: telegramMessage,
      replyMarkup: inlineKeyboard,
    });

    // Save Telegram message ID for later editing
    if (telegramResponse.ok) {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          telegramMessageId: String(telegramResponse.result.message_id),
          telegramChatId: String(telegramResponse.result.chat.id),
        },
      });
    }

    return NextResponse.json({ success: true, id: candidate.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating candidate:", error);
    return NextResponse.json(
      { error: "Failed to create candidate" },
      { status: 500 }
    );
  }
}

// GET /api/candidates - List candidates with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = status ? { status: status.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED" } : {};

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          scheduledEmails: {
            orderBy: { emailNumber: "asc" },
          },
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    return NextResponse.json({
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing candidates:", error);
    return NextResponse.json(
      { error: "Failed to list candidates" },
      { status: 500 }
    );
  }
}
