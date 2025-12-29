# EU Fashion Institute - Gmail Form Extraction to Google Sheets

## Project Overview

**Goal:** Extract 300+ candidate applications from Gmail form submissions and populate a Google Sheet with structured data.

**Website:** https://eufashioninstitute.com/candidate/
**Form Name:** "Стани модел" (Become a Model)

---

## Form Fields Captured

| Field (Bulgarian) | Field (English) | Required | Type |
|-------------------|-----------------|----------|------|
| Име | First Name | Yes | Text |
| Фамилия | Last Name | Yes | Text |
| Email | Email | Yes | Email |
| Телефон за връзка | Phone | Yes | Phone |
| Дата на раждане | Birth Date | Yes | Date (YYYY-MM-DD) |
| Височина в см. | Height (cm) | Yes | Number |
| Instagram link | Instagram | No | URL |
| Tik Tok link | TikTok | No | URL |
| Град в който живеете в момента | Current City | Yes | Text |
| Категория | Category | Yes | Checkboxes (multiple) |

**Categories available:**
- Инфлуенсър (Influencer)
- Плюс сайз модел (Plus Size Model)
- Бутиков и Runway модел (Boutique and Runway Model)
- Фотомодел (Photo Model)
- Артист и талант (Artist and Talent)

---

## Email Format

Emails arrive with:
- **Subject:** `New message from "Стани модел"`
- **From:** eufashioninstitute
- **Attachments:** 3 photos per submission

### Sample Email Body Structure:
```
Име : Simona
Фамилия: Yaneva
Email: simona.yaneva07@gmail.com
Телефон за връзка: 0882875009
Дата на раждане: 2007-06-14
Височина в см.: 168
Instagram link: https://www.instagram.com/simonaa_yaneva?igsh=...
Tik Tok link: https://www.tiktok.com/@simonayanevaa1?...
Град в който живеете в момента: Plovdiv
Категория:: Бутиков и Runway модел, Артист и талант
on
on

---

Date: December 29, 2025
Time: 7:54 am
Page URL: https://eufashioninstitute.com/candidate/
```

**Notes:**
- Some fields use single colon (`:`), others use double (`::`)
- "on" lines appear for checkbox fields that were selected
- Metadata (Date, Time, Page URL) appears after `---` separator
- Photo attachments are not included in plain text body

---

## Google Sheet Structure

**Sheet Name:** EU Fashion Institute - Candidate Applications
**Tab Name:** Sheet1

### Columns:
| Column | Header | Description |
|--------|--------|-------------|
| A | Date | Submission date (e.g., "December 29, 2025") |
| B | Time | Submission time (e.g., "7:54 am") |
| C | Име | First name |
| D | Фамилия | Last name |
| E | Email | Email address |
| F | Телефон | Phone number |
| G | Дата на раждане | Birth date (YYYY-MM-DD) |
| H | Височина (см) | Height in centimeters |
| I | Instagram | Instagram URL (cleaned) |
| J | TikTok | TikTok URL (cleaned) |
| K | Град | City |
| L | Категория | Selected categories |

---

## Google Apps Script - Complete Code

Save this in **Extensions → Apps Script** within your Google Sheet:

```javascript
/**
 * EU Fashion Institute - Gmail Form Submission Extractor
 * Extracts candidate applications from Gmail and populates Google Sheets
 *
 * Version: 1.0
 * Last Updated: December 29, 2025
 */

// Configuration
const CONFIG = {
  SEARCH_QUERY: 'subject:"New message from \\"Стани модел\\""',
  BATCH_SIZE: 100
};

/**
 * Main function - Run this to extract all emails
 */
function extractAllApplications() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (!sheet) {
    Logger.log('ERROR: No sheet found!');
    return;
  }

  Logger.log(`Using sheet: ${sheet.getName()}`);

  // Set up headers if not present
  if (sheet.getRange('A1').getValue() === '') {
    setupHeaders(sheet);
  }

  // Get existing emails to avoid duplicates
  const existingData = sheet.getDataRange().getValues();
  const existingKeys = new Set();
  for (let i = 1; i < existingData.length; i++) {
    const key = `${existingData[i][4]}_${existingData[i][0]}`;
    existingKeys.add(key);
  }

  // Search Gmail
  const threads = GmailApp.search(CONFIG.SEARCH_QUERY);
  Logger.log(`Found ${threads.length} email threads`);

  const newRows = [];

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const parsed = parseEmailBody(message.getPlainBody());

      if (parsed) {
        const key = `${parsed.email}_${parsed.date}`;

        if (!existingKeys.has(key)) {
          newRows.push([
            parsed.date,
            parsed.time,
            parsed.firstName,
            parsed.lastName,
            parsed.email,
            parsed.phone,
            parsed.birthDate,
            parsed.height,
            parsed.instagram,
            parsed.tiktok,
            parsed.city,
            parsed.category
          ]);
          existingKeys.add(key);
        }
      }
    }
  }

  // Sort by date (newest first)
  newRows.sort((a, b) => {
    const dateA = new Date(a[0]);
    const dateB = new Date(b[0]);
    return dateB - dateA;
  });

  // Append to sheet
  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, 12).setValues(newRows);
    Logger.log(`Added ${newRows.length} new applications`);
  } else {
    Logger.log('No new applications found');
  }

  sheet.autoResizeColumns(1, 12);
  Logger.log(`DONE: Processed ${threads.length} threads, added ${newRows.length} new applications`);
}

/**
 * Parse the email body to extract form fields
 */
function parseEmailBody(body) {
  if (!body) {
    return null;
  }

  try {
    body = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = body.split('\n');

    const data = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      birthDate: '',
      height: '',
      instagram: '',
      tiktok: '',
      city: '',
      category: '',
      date: '',
      time: ''
    };

    const labelMap = {
      'Име': 'firstName',
      'Фамилия': 'lastName',
      'Email': 'email',
      'Телефон за връзка': 'phone',
      'Дата на раждане': 'birthDate',
      'Височина в см.': 'height',
      'Височина в см': 'height',
      'Instagram link': 'instagram',
      'Tik Tok link': 'tiktok',
      'TikTok link': 'tiktok',
      'Град в който живеете в момента': 'city',
      'Категория': 'category',
      'Date': 'date',
      'Time': 'time'
    };

    for (const line of lines) {
      if (!line.trim()) continue;

      const colonMatch = line.match(/^([^:]+?):{1,2}\s*(.*)$/);

      if (colonMatch) {
        const label = colonMatch[1].trim();
        let value = colonMatch[2].trim();
        const key = labelMap[label];

        if (key) {
          if (key === 'instagram' || key === 'tiktok') {
            const urlMatch = value.match(/^(https?:\/\/[^\s]+)/);
            if (urlMatch) {
              value = urlMatch[1];
            } else if (value && !value.startsWith('http')) {
              value = '';
            }
          }

          if (key === 'city') {
            value = value.split('http')[0].trim();
            value = value.split('Категория')[0].trim();
          }

          data[key] = value;
        }
      }
    }

    if (!data.email) {
      return null;
    }

    return data;
  } catch (e) {
    Logger.log(`Error parsing email: ${e}`);
    return null;
  }
}

/**
 * Set up sheet headers
 */
function setupHeaders(sheet) {
  const headers = [
    'Date', 'Time', 'Име', 'Фамилия', 'Email', 'Телефон',
    'Дата на раждане', 'Височина (см)', 'Instagram', 'TikTok', 'Град', 'Категория'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
  sheet.setFrozenRows(1);
}

/**
 * Menu for easy access
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('EU Fashion Tools')
    .addItem('Extract Applications from Gmail', 'extractAllApplications')
    .addItem('Clear and Re-extract All', 'clearAndReextract')
    .addToUi();
}

/**
 * Clear and re-extract
 */
function clearAndReextract() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Confirm Clear', 'Delete all data and re-extract?', ui.ButtonSet.YES_NO);

  if (response === ui.Button.YES) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.clearContents();
    extractAllApplications();
  }
}
```

---

## Setup Instructions

### Step 1: Create Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create new blank spreadsheet
3. Name it: "EU Fashion Institute - Candidate Applications"

### Step 2: Add Apps Script
1. In Google Sheets: **Extensions → Apps Script**
2. Delete any existing code
3. Paste the complete script above
4. Save (Ctrl+S)

### Step 3: Authorize & Run
1. Select `extractAllApplications` from the function dropdown
2. Click **Run**
3. Authorize when prompted:
   - Click "Review permissions"
   - Choose your Google account
   - Click "Advanced" → "Go to [project name] (unsafe)"
   - Click "Allow"
4. Script will populate the sheet

### Step 4: Verify
- Check that data populated correctly
- Custom menu "EU Fashion Tools" should appear after refresh

---

## Troubleshooting

### Error: "Cannot read properties of null (reading 'getSheetByName')"
**Cause:** Script not bound to spreadsheet
**Fix:** Open Apps Script from within the spreadsheet via Extensions → Apps Script

### Error: "Cannot read properties of undefined (reading 'replace')"
**Cause:** Some emails have no plain text body
**Fix:** The null check `if (!body) return null;` handles this

### Only one function in dropdown
**Cause:** Incomplete script pasted
**Fix:** Paste the COMPLETE script with all functions

### Data in wrong columns / mixed content
**Cause:** Email format parsing issues
**Fix:** Use the line-by-line parsing version with URL extraction

---

## Results

- **Total candidates extracted:** 461
- **Date range:** Historical submissions through December 29, 2025
- **Duplicate handling:** Script uses email + date as unique key

---

## Future Enhancements (Planned)

The client wants to build an automation pipeline:

### Proposed Architecture:
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Form Submit    │────▶│  Gmail Inbox     │────▶│  Google Sheet   │
│  (Website)      │     │  (Notification)  │     │  (Data Store)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Telegram Bot    │◀────│  Apps Script    │
                        │  (Review + Photos│     │  (Trigger)      │
                        └──────────────────┘     └─────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌──────────────┐       ┌──────────────┐
            │   Approve    │       │   Reject     │
            └──────────────┘       └──────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │  Email Marketing │
            │  Sequence        │
            │  (Mailchimp/etc) │
            └──────────────────┘
```

### Required Features:
1. **Real-time Telegram notifications** with applicant photos
2. **Approve/Reject buttons** in Telegram
3. **Email marketing integration** for approved candidates
4. **Photo storage** (Google Drive folders per applicant)

### Technology Options:
- **Option A:** Google Apps Script + Telegram Bot API (all Google ecosystem)
- **Option B:** n8n / Make.com (no-code automation platform)
- **Option C:** Custom Node.js/Python backend (most flexible)

---

## Files & Links

- **Google Sheet:** [Link to be added]
- **Gmail Account:** eufashioninstitute
- **Form URL:** https://eufashioninstitute.com/candidate/

---

## Contact / Handoff Notes

- Script is production-ready for extraction
- Running `extractAllApplications` again will only add NEW submissions (no duplicates)
- To set up auto-sync: Apps Script → Triggers → Add trigger for `extractAllApplications` (e.g., hourly)
- Photo attachments are NOT yet extracted - planned for Phase 2
