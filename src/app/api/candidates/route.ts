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

    // Check for silent mode (skip Telegram notifications for bulk imports)
    const { searchParams } = new URL(request.url);
    const silent = searchParams.get("silent") === "true";

    const body = await request.json();

    // Parse submitted date from original form submission
    let submittedAt: Date;
    if (body.submittedAt) {
      // Combine date and optional time from Google Sheet format
      const dateStr = body.time ? `${body.submittedAt} ${body.time}` : body.submittedAt;
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

    // Send Telegram notification (skip in silent mode for bulk imports)
    if (!silent) {
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
    }

    return NextResponse.json({ success: true, id: candidate.id, silent }, { status: 201 });
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
    const city = searchParams.get("city");
    const minAge = searchParams.get("minAge");
    const maxAge = searchParams.get("maxAge");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED";
    }

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    // Age filter based on birthDate
    if (minAge || maxAge) {
      const today = new Date();
      if (maxAge) {
        // minAge means born BEFORE this date
        const minBirthDate = new Date(today.getFullYear() - parseInt(maxAge) - 1, today.getMonth(), today.getDate());
        where.birthDate = { ...where.birthDate, gte: minBirthDate.toISOString().split("T")[0] };
      }
      if (minAge) {
        // maxAge means born AFTER this date
        const maxBirthDate = new Date(today.getFullYear() - parseInt(minAge), today.getMonth(), today.getDate());
        where.birthDate = { ...where.birthDate, lte: maxBirthDate.toISOString().split("T")[0] };
      }
    }

    // Search by name, email, or phone
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [candidates, total, cities] = await Promise.all([
      prisma.candidate.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
        include: {
          scheduledEmails: {
            orderBy: { emailNumber: "asc" },
          },
        },
      }),
      prisma.candidate.count({ where }),
      // Get unique cities for filter dropdown
      prisma.candidate.findMany({
        select: { city: true },
        distinct: ["city"],
        where: { city: { not: null } },
      }),
    ]);

    return NextResponse.json({
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        cities: cities.map((c) => c.city).filter(Boolean).sort(),
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
