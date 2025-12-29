import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addContactToBrevo } from "@/lib/brevo";
import { editTelegramMessage } from "@/lib/telegram";

// Email sequence configuration matching Brevo automation
const EMAIL_SEQUENCE = [
  {
    emailNumber: 1,
    templateId: 3,
    subject: "Твоят кастинг номер е генериран",
    delayHours: 0
  },
  {
    emailNumber: 2,
    templateId: 4,
    subject: "Кой всъщност ще те обучава?",
    delayHours: 24
  },
  {
    emailNumber: 3,
    templateId: 5,
    subject: "Поемам целия риск вместо теб",
    delayHours: 72 // 24h + 2 days
  },
];

// GET /api/candidates/:id - Get single candidate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidate = await prisma.candidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}

// PATCH /api/candidates/:id - Update candidate status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Update status
    const updated = await prisma.candidate.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: body.reviewedBy || "Admin",
      },
    });

    // If approved, add to Brevo and create scheduled email records
    if (status === "APPROVED") {
      const sequenceStartedAt = new Date();

      try {
        const brevoResponse = await addContactToBrevo({
          email: candidate.email,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          phone: candidate.phone || undefined,
          attributes: {
            CITY: candidate.city || "",
            CATEGORY: candidate.category || "",
          },
        });

        await prisma.candidate.update({
          where: { id },
          data: {
            brevoContactId: brevoResponse.id?.toString(),
            emailSequenceStartedAt: sequenceStartedAt,
          },
        });

        // Create scheduled email records for UI tracking
        const scheduledEmails = EMAIL_SEQUENCE.map((email) => ({
          candidateId: id,
          emailNumber: email.emailNumber,
          templateId: email.templateId,
          subject: email.subject,
          scheduledFor: new Date(sequenceStartedAt.getTime() + email.delayHours * 60 * 60 * 1000),
        }));

        await prisma.scheduledEmail.createMany({
          data: scheduledEmails,
          skipDuplicates: true,
        });
      } catch (brevoError) {
        console.error("Brevo error:", brevoError);
        // Don't fail the whole request if Brevo fails
      }
    }

    // Update Telegram message if we have the message ID
    if (candidate.telegramMessageId && candidate.telegramChatId) {
      const statusEmoji = status === "APPROVED" ? "✅" : "❌";
      const statusText = status === "APPROVED" ? "ОДОБРЕН" : "ОТХВЪРЛЕН";

      await editTelegramMessage({
        chatId: candidate.telegramChatId,
        messageId: candidate.telegramMessageId,
        text: `${statusEmoji} <b>${statusText}</b>\n\n👤 ${candidate.firstName} ${candidate.lastName}\n📧 ${candidate.email}`,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating candidate:", error);
    return NextResponse.json(
      { error: "Failed to update candidate" },
      { status: 500 }
    );
  }
}
