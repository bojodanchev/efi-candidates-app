# EFI Candidates App - Production Flow Plan

## Current State

### Working Components
1. **Gmail Extraction Script** (`scripts/eufashion_script.txt`)
   - Extracts candidates from Gmail to Google Sheet
   - Uses Gmail Message ID for duplicate detection
   - Auto-sync every 10 minutes available

2. **Sheet-to-App Push Script** (`scripts/eufashion_push_script.txt`)
   - Pushes candidates from Google Sheet to Web App API
   - API Key: `2214e1a8a20448ccb36cecb5fd079d7a0747b52c6da3f3872d15ad0d0743a0fd`
   - Endpoint: `https://efi-candidates-app.vercel.app/api/candidates`

3. **Web App Dashboard**
   - Dark luxurious UI with split view
   - Status filtering (Pending/Approved/Rejected)
   - Instagram profile photos via unavatar.io

4. **Telegram Integration**
   - Bot sends notification on new candidate
   - Approve/Reject inline buttons
   - Updates candidate status on button click

5. **Brevo Integration**
   - Adds approved candidates to List #3
   - API connected and working

### Not Yet Working
1. **Photo extraction** - Emails have 3 photo attachments not being captured
2. **Email automation** - Templates exist in Brevo but automation not triggered
3. **Viber integration** - Not implemented (out of scope for now)

---

## Architecture Options

### Option A: Two Scripts (Recommended)
```
Gmail → Script 1 → Google Sheet (with photos in Drive)
                        ↓
              Script 2 (push)
                        ↓
                   Web App API
                        ↓
              Telegram Notification
                        ↓
              Admin Approves/Rejects
                        ↓
              Brevo Email Automation
```

**Pros:**
- Google Sheet serves as backup/audit trail
- Easy manual review in Sheet before pushing
- Photos stored in Google Drive (reliable, free)

**Cons:**
- Two scripts to maintain
- Slight delay between submission and notification

### Option B: Direct Gmail to App
```
Gmail → Single Script → Web App API (direct)
                             ↓
                        Telegram Notification
                             ↓
                   Admin Approves/Rejects
                             ↓
                   Brevo Email Automation
```

**Pros:**
- Simpler, single script
- Faster notifications

**Cons:**
- No backup/audit in Google Sheet
- Need separate photo storage solution

### Recommendation: Option A
Keep the two-script approach because:
1. Google Sheet provides valuable audit trail
2. Photos can be stored in Google Drive for free
3. Manual oversight possible before pushing to app

---

## Implementation Plan

### Phase 1: Photo Extraction (Gmail → Sheet → Drive)

Update the Gmail extraction script to:
1. Create a Google Drive folder for each candidate
2. Save all 3 photo attachments to that folder
3. Store the Drive folder URL in a new column (M or N)

**Sheet Structure (Updated):**
| Column | Content |
|--------|---------|
| A-L | Existing fields |
| M | MessageID (hidden) |
| N | PhotoFolderURL (new) |

### Phase 2: Push Script with Photos

Update the push script to:
1. Include photo URLs when pushing to API
2. Web App stores `photoUrls` array in database (already supported)

### Phase 3: Brevo Email Automation

Configure Brevo automation:
1. **Trigger:** Contact added to List #3
2. **Sequence:**
   - Email 1: Immediately (Casting number generated)
   - Email 2: 24 hours later (Who will train you)
   - Email 3: 2 days later (The Guarantee)

**Templates already created in Brevo:**
- Template ID 3: Sequence 1 - Casting Number Generated
- Template ID 4: Sequence 2 - Who Will Train You
- Template ID 5: Sequence 3 - The Guarantee

### Phase 4: Telegram Refinements

Current flow works but could add:
1. Include candidate photo in Telegram message
2. Show photo gallery from Drive
3. Add "View in Dashboard" link

---

## Scripts to Create/Update

### 1. Updated Gmail Extraction Script (with Photos)

Location: `scripts/eufashion_script_v2.txt`

New functions needed:
- `extractPhotosToGoogleDrive(message, candidateName)` - Saves attachments
- `createCandidateFolder(name, email)` - Creates folder in Drive
- Returns folder URL for sheet column N

### 2. Updated Push Script (with Photos)

Location: `scripts/eufashion_push_script_v2.txt`

Changes:
- Read PhotoFolderURL from column N
- Include in API payload as `photoUrls`

---

## Brevo Automation Setup

### Step 1: Create Automation
1. Go to Brevo → Automations → Create
2. Entry point: "Contact added to list"
3. Select List: "EFI Approved Candidates" (#3)

### Step 2: Add Email Steps
1. **Step 1:** Send Template #3 (Immediate)
2. **Wait 24 hours**
3. **Step 2:** Send Template #4
4. **Wait 2 days**
5. **Step 3:** Send Template #5

### Step 3: Activate
- Review and activate the automation
- All future approved candidates will receive the sequence

---

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/candidates` | POST | API Key | Create candidate |
| `/api/candidates` | GET | None | List candidates |
| `/api/candidates/[id]` | PATCH | None | Update status |
| `/api/telegram/webhook` | POST | None | Telegram callbacks |

---

## Environment Variables (Production)

| Variable | Value | Set |
|----------|-------|-----|
| `DATABASE_URL` | Neon PostgreSQL | ✅ |
| `API_KEY` | 2214e1a8a20448ccb36cecb5fd079d7a0747b52c6da3f3872d15ad0d0743a0fd | ✅ |
| `TELEGRAM_BOT_TOKEN` | 8523831163:AAH... | ✅ |
| `TELEGRAM_ADMIN_CHAT_ID` | 1101684590 | ✅ |
| `BREVO_API_KEY` | xkeysib-5ecb... | ✅ |
| `BREVO_LIST_ID` | 3 | ✅ |

---

## Next Steps (Priority Order)

1. [ ] Create updated Gmail script with photo extraction
2. [ ] Update push script to include photo URLs
3. [ ] Set up Brevo email automation workflow
4. [ ] Test complete flow end-to-end
5. [ ] Document final setup for client handoff
