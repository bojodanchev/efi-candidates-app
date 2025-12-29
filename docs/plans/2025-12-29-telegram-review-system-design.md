# EFI Candidate Review System - Design Document

**Date:** December 29, 2025
**Status:** Approved for implementation

---

## Overview

Build a web application that enables single-admin review of model candidates via Telegram, with automatic email drip campaigns for approved candidates via Brevo.

### Current Flow
```
Form submission → Gmail → Apps Script (10 min poll) → Google Sheet
```

### New Flow
```
Form submission → Gmail → Apps Script → Google Sheet
                                      ↓
                              Web App API (webhook)
                                      ↓
                         Telegram Bot (with photos)
                                      ↓
                    Admin clicks Approve/Disapprove
                                      ↓
                   [If Approved] → Brevo 3-email drip
```

---

## Architecture

### Tech Stack
- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js API routes (Vercel serverless)
- **Database:** PostgreSQL (Vercel Postgres or Supabase free tier)
- **Hosting:** Vercel
- **Integrations:** Telegram Bot API, Brevo API, Google Sheets API

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Hosting                        │
├─────────────────────────────────────────────────────────┤
│  React Dashboard          │  API Routes (serverless)    │
│  - Candidate list         │  - POST /api/candidates     │
│  - Approve/Reject buttons │  - POST /api/telegram/hook  │
│  - Status filters         │  - GET /api/candidates      │
│  - Candidate details      │  - PATCH /api/candidates/:id│
└─────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   Telegram Bot          Brevo API            PostgreSQL
   (notifications)       (email drip)         (candidates)
```

---

## Data Model

### Candidates Table
```sql
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Form data
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  birth_date DATE,
  height_cm INTEGER,
  instagram VARCHAR(500),
  tiktok VARCHAR(500),
  city VARCHAR(100),
  category VARCHAR(500),

  -- Photos (URLs from email attachments, stored in Google Drive)
  photo_urls TEXT[],

  -- Review status
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(100),

  -- Email sequence tracking
  brevo_contact_id VARCHAR(100),
  email_sequence_started_at TIMESTAMP,

  -- Telegram message ID (for updating after review)
  telegram_message_id VARCHAR(100),

  -- Metadata
  submitted_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_email ON candidates(email);
```

---

## API Endpoints

### POST /api/candidates
Called by Apps Script when new candidate arrives.
```json
{
  "firstName": "Simona",
  "lastName": "Yaneva",
  "email": "simona@example.com",
  "phone": "0882875009",
  "birthDate": "2007-06-14",
  "height": 168,
  "instagram": "https://instagram.com/...",
  "tiktok": "https://tiktok.com/...",
  "city": "Plovdiv",
  "category": "Runway, Artist",
  "photoUrls": ["https://drive.google.com/..."],
  "submittedAt": "2025-12-29T07:54:00Z"
}
```

**Actions:**
1. Insert candidate into database
2. Send Telegram message with inline buttons
3. Return success

### POST /api/telegram/webhook
Telegram callback when admin clicks button.
```json
{
  "callback_query": {
    "data": "approve:uuid" | "reject:uuid",
    "message": { "message_id": 123 }
  }
}
```

**Actions:**
1. Update candidate status in database
2. If approved: Add to Brevo + start email sequence
3. Update Telegram message to show result
4. Return success

### GET /api/candidates
Dashboard listing with filters.
```
?status=pending|approved|rejected
&page=1
&limit=20
```

### PATCH /api/candidates/:id
Update candidate from dashboard.
```json
{
  "status": "approved" | "rejected"
}
```

---

## Telegram Bot Message Format

```
📸 New Model Application

👤 Simona Yaneva
📧 simona@example.com
📱 0882875009
🎂 2007-06-14 (17 years old)
📏 168 cm
📍 Plovdiv

📂 Categories: Runway, Artist

🔗 Instagram: [View](https://instagram.com/...)
🔗 TikTok: [View](https://tiktok.com/...)

[Photo 1 attached]
[Photo 2 attached]
[Photo 3 attached]

[✅ Approve] [❌ Reject]
```

After review:
```
✅ APPROVED by Admin
(or)
❌ REJECTED by Admin
```

---

## Brevo Email Sequence

**List:** EFI Approved Candidates

**Automation Workflow:**
1. Trigger: Contact added to list
2. Email 1: Immediately (Zoom invite)
3. Wait 24 hours
4. Email 2: Trust & Value
5. Wait 24 hours
6. Email 3: Guarantee

**Email templates configured in Brevo dashboard** - API just adds contact to list.

---

## Apps Script Architecture

**Two separate scripts, decoupled:**

### Script 1: Gmail Extractor (existing)
- File: `eufashion_script.txt`
- Function: `extractAllApplications()`
- Schedule: Every 10 minutes
- Job: Gmail → Google Sheet

### Script 2: Web App Pusher (new)
- File: `eufashion_push_script.txt`
- Function: `pushNewCandidatesToWebApp()`
- Schedule: Every 10 minutes (offset by 5 min from Script 1)
- Job: Google Sheet → Web App API

**Why separate?**
- Sheet remains source of truth
- Web app integration can fail without breaking extraction
- Easier to debug/maintain independently

### Script 2 Logic:
```javascript
/**
 * Push new candidates from Sheet to Web App
 * Tracks last pushed row to avoid duplicates
 */
function pushNewCandidatesToWebApp() {
  const CONFIG = {
    WEB_APP_URL: 'https://efi-candidates.vercel.app/api/candidates',
    API_KEY: PropertiesService.getScriptProperties().getProperty('API_KEY'),
    LAST_ROW_KEY: 'LAST_PUSHED_ROW'
  };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const props = PropertiesService.getScriptProperties();

  // Get last pushed row (start from 1 to skip header)
  const lastPushedRow = parseInt(props.getProperty(CONFIG.LAST_ROW_KEY) || '1');
  const lastRow = sheet.getLastRow();

  if (lastRow <= lastPushedRow) {
    Logger.log('No new rows to push');
    return;
  }

  // Get new rows
  const newRows = sheet.getRange(lastPushedRow + 1, 1, lastRow - lastPushedRow, 12).getValues();
  let pushedCount = 0;

  for (const row of newRows) {
    const candidate = {
      submittedAt: row[0],  // Date
      time: row[1],         // Time
      firstName: row[2],    // Име
      lastName: row[3],     // Фамилия
      email: row[4],        // Email
      phone: row[5],        // Телефон
      birthDate: row[6],    // Дата на раждане
      height: row[7],       // Височина
      instagram: row[8],    // Instagram
      tiktok: row[9],       // TikTok
      city: row[10],        // Град
      category: row[11]     // Категория
    };

    // Skip rows without email
    if (!candidate.email) continue;

    try {
      const response = UrlFetchApp.fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        contentType: 'application/json',
        headers: { 'Authorization': `Bearer ${CONFIG.API_KEY}` },
        payload: JSON.stringify(candidate),
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
        pushedCount++;
      } else {
        Logger.log(`Failed to push ${candidate.email}: ${response.getContentText()}`);
      }
    } catch (e) {
      Logger.log(`Error pushing ${candidate.email}: ${e}`);
    }
  }

  // Update last pushed row
  props.setProperty(CONFIG.LAST_ROW_KEY, lastRow.toString());
  Logger.log(`Pushed ${pushedCount} new candidates to web app`);
}

/**
 * Set up 10-minute trigger for web app pusher
 */
function setupPushTrigger() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'pushNewCandidatesToWebApp') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Create new trigger
  ScriptApp.newTrigger('pushNewCandidatesToWebApp')
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log('Push trigger created: runs every 10 minutes');
}

/**
 * Reset the last pushed row (use to re-push all candidates)
 */
function resetLastPushedRow() {
  PropertiesService.getScriptProperties().setProperty('LAST_PUSHED_ROW', '1');
  Logger.log('Reset last pushed row to 1');
}
```

---

## React Dashboard Pages

### /candidates (main list)
- Table with: Name, Email, City, Category, Status, Date
- Filter tabs: All | Pending | Approved | Rejected
- Click row → expand details
- Approve/Reject buttons (alternative to Telegram)

### /candidates/:id (detail view)
- Full candidate info
- Photo gallery
- Status history
- Email sequence status

---

## Environment Variables

```
# Database
DATABASE_URL=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=

# Brevo
BREVO_API_KEY=
BREVO_LIST_ID=

# Security
API_KEY= (for Apps Script → Web App auth)
```

---

## Implementation Order

1. Create GitHub repo + Vercel project
2. Set up database schema
3. Build API endpoints
4. Create Telegram bot + webhook
5. Integrate Brevo
6. Update Apps Script to push candidates
7. Build React dashboard
8. Test end-to-end

---

## Future Enhancements (not in v1)

- Viber integration for follow-up messages
- Photo storage in Google Drive with folder per candidate
- Analytics dashboard (approval rate, email open rates)
- Multi-reviewer support with assignments
