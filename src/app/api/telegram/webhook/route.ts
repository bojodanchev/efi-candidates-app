import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addContactToBrevo } from "@/lib/brevo";
import { editTelegramMessage, sendTelegramMessage } from "@/lib/telegram";

// POST /api/telegram/webhook - Handle Telegram callbacks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle callback queries (button clicks)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const data = callbackQuery.data; // format: "approve:candidateId" or "reject:candidateId"
      const [action, candidateId] = data.split(":");

      if (!candidateId) {
        return NextResponse.json({ ok: true });
      }

      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        await sendTelegramMessage({
          chatId: callbackQuery.message.chat.id.toString(),
          text: "❌ Кандидатът не е намерен.",
        });
        return NextResponse.json({ ok: true });
      }

      if (candidate.status !== "PENDING") {
        await sendTelegramMessage({
          chatId: callbackQuery.message.chat.id.toString(),
          text: `ℹ️ Този кандидат вече е бил ${candidate.status === "APPROVED" ? "одобрен" : "отхвърлен"}.`,
        });
        return NextResponse.json({ ok: true });
      }

      const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

      // Update candidate status
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: callbackQuery.from.username || callbackQuery.from.first_name || "Telegram Admin",
        },
      });

      // If approved, add to Brevo for email sequence
      if (newStatus === "APPROVED") {
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
            where: { id: candidateId },
            data: {
              brevoContactId: brevoResponse.id?.toString(),
              emailSequenceStartedAt: new Date(),
            },
          });
        } catch (brevoError) {
          console.error("Brevo error:", brevoError);
        }
      }

      // Update the Telegram message to show result
      const statusEmoji = newStatus === "APPROVED" ? "✅" : "❌";
      const statusText = newStatus === "APPROVED" ? "ОДОБРЕН" : "ОТХВЪРЛЕН";
      const reviewerName = callbackQuery.from.username || callbackQuery.from.first_name || "Admin";

      await editTelegramMessage({
        chatId: callbackQuery.message.chat.id.toString(),
        messageId: callbackQuery.message.message_id.toString(),
        text: `${statusEmoji} <b>${statusText}</b> от ${reviewerName}

👤 ${candidate.firstName} ${candidate.lastName}
📧 ${candidate.email}
${candidate.phone ? `📱 ${candidate.phone}` : ""}
${candidate.city ? `📍 ${candidate.city}` : ""}
${candidate.category ? `📂 ${candidate.category}` : ""}`,
      });

      // Answer callback query to remove loading state
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: newStatus === "APPROVED" ? "Кандидатът е одобрен!" : "Кандидатът е отхвърлен.",
          }),
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

// GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: "Telegram webhook endpoint active" });
}
