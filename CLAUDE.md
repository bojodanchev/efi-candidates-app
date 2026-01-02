# EFI Candidates App

EU Fashion Institute candidate management system for processing model applications.

## Architecture

```
Gmail (form submissions) → Google Apps Script → Google Sheet → Google Apps Script → Web App → Telegram Bot
                                     ↓                                                    ↓
                              Google Drive (photos)                              Brevo (email campaigns)
```

## Data Flow

1. **Form Submission**: Candidates submit via Wix form → email sent to eufashioninstitute
2. **Gmail Extraction**: Apps Script extracts candidate data + photos → Google Sheet + Drive
3. **Push to App**: Apps Script pushes candidates to web app via API
4. **Telegram Notification**: Bot sends notification with Approve/Reject buttons
5. **Review**: Admin reviews in Telegram or web app
6. **Brevo Integration**: Approved candidates added to email campaign list

## Key Files

### Web App (Next.js)
- [src/app/api/candidates/route.ts](src/app/api/candidates/route.ts) - List/create candidates
- [src/app/api/candidates/[id]/route.ts](src/app/api/candidates/[id]/route.ts) - Get/update candidate
- [src/app/api/telegram/webhook/route.ts](src/app/api/telegram/webhook/route.ts) - Telegram callbacks
- [src/lib/telegram.ts](src/lib/telegram.ts) - Telegram helpers
- [src/lib/brevo.ts](src/lib/brevo.ts) - Brevo API integration
- [src/app/page.tsx](src/app/page.tsx) - Main UI with filters

### Google Apps Scripts
- [scripts/FINAL_gmail_to_sheet.txt](scripts/FINAL_gmail_to_sheet.txt) - Gmail extraction
- [scripts/FINAL_sheet_to_app.txt](scripts/FINAL_sheet_to_app.txt) - Push to web app

### Database
- [prisma/schema.prisma](prisma/schema.prisma) - Neon PostgreSQL schema

## Candidate Schema

```prisma
model Candidate {
  firstName, lastName, email (unique)
  phone, birthDate, heightCm
  instagram, tiktok
  city, category
  photoUrls String[]
  status: PENDING | APPROVED | REJECTED
  submittedAt DateTime  // Original form submission time
  brevoContactId, emailSequenceStartedAt
  telegramMessageId, telegramChatId
}
```

## Email Sequence (Brevo)

On approval, candidates receive 3 emails:
1. **Immediate** (Template 3): Casting number generated
2. **+24h** (Template 4): Who will train you?
3. **+72h** (Template 5): Risk guarantee

## Environment Variables

```
DATABASE_URL, DATABASE_URL_UNPOOLED  # Neon PostgreSQL
TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID
BREVO_API_KEY, BREVO_LIST_ID
API_KEY  # For Apps Script auth
```

## API Endpoints

### `POST /api/candidates`
Create candidate (from Apps Script). Supports `?silent=true` to skip Telegram.

### `GET /api/candidates`
List with filters: `status`, `city`, `minAge`, `maxAge`, `search`, `page`, `limit`

### `PATCH /api/candidates/[id]`
Update status. If APPROVED → adds to Brevo + creates scheduled emails.

### `POST /api/telegram/webhook`
Handles approve/reject button clicks from Telegram.

## Submission Date

The `submittedAt` field uses the Date/Time parsed from the original form submission email, not the sheet entry time. The Gmail script extracts these from the email body.

## Photo URLs

Photos stored in Google Drive use `lh3.googleusercontent.com/d/{fileId}` format for proper embedding (avoids CORS issues with drive.google.com/uc URLs).

## Running Locally

```bash
npm install
npx prisma generate
npm run dev
```

## Deployment

Deployed on Vercel at `efi-candidates-app.vercel.app`
