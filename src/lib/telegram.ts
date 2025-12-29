const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!;

interface SendMessageOptions {
  chatId?: string;
  text: string;
  parseMode?: "HTML" | "Markdown";
  replyMarkup?: object;
}

export async function sendTelegramMessage({
  chatId = TELEGRAM_ADMIN_CHAT_ID,
  text,
  parseMode = "HTML",
  replyMarkup,
}: SendMessageOptions) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      }),
    }
  );

  return response.json();
}

export async function sendTelegramPhoto({
  chatId = TELEGRAM_ADMIN_CHAT_ID,
  photoUrl,
  caption,
}: {
  chatId?: string;
  photoUrl: string;
  caption?: string;
}) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: "HTML",
      }),
    }
  );

  return response.json();
}

export async function editTelegramMessage({
  chatId = TELEGRAM_ADMIN_CHAT_ID,
  messageId,
  text,
}: {
  chatId?: string;
  messageId: string;
  text: string;
}) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
      }),
    }
  );

  return response.json();
}

export function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function formatCandidateMessage(candidate: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  heightCm?: number | null;
  city?: string | null;
  category?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
}): string {
  const age = candidate.birthDate ? calculateAge(candidate.birthDate) : null;
  const ageText = age ? ` (${age} години)` : "";

  return `📸 <b>Нова кандидатура за модел</b>

👤 <b>${candidate.firstName} ${candidate.lastName}</b>
📧 ${candidate.email}
${candidate.phone ? `📱 ${candidate.phone}` : ""}
${candidate.birthDate ? `🎂 ${candidate.birthDate}${ageText}` : ""}
${candidate.heightCm ? `📏 ${candidate.heightCm} см` : ""}
${candidate.city ? `📍 ${candidate.city}` : ""}

${candidate.category ? `📂 Категории: ${candidate.category}` : ""}

${candidate.instagram ? `🔗 <a href="${candidate.instagram}">Instagram</a>` : ""}
${candidate.tiktok ? `🔗 <a href="${candidate.tiktok}">TikTok</a>` : ""}`.trim();
}

export function getInlineKeyboard(candidateId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Одобри", callback_data: `approve:${candidateId}` },
        { text: "❌ Отхвърли", callback_data: `reject:${candidateId}` },
      ],
    ],
  };
}
