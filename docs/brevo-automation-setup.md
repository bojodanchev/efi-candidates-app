# Brevo Email Automation Setup Guide

## Overview

When a candidate is approved in Telegram, they are automatically added to Brevo List #3 ("EFI Approved Candidates"). This guide explains how to set up the email automation in Brevo to send the 3-email sequence.

## Email Templates (Already Created)

The following templates have been created in Brevo:

| ID | Name | Timing |
|----|------|--------|
| 3 | Sequence 1 - Casting Number Generated | Immediate |
| 4 | Sequence 2 - Who Will Train You | 24 hours after |
| 5 | Sequence 3 - The Guarantee | 2 days after |

## Setting Up the Automation

### Step 1: Access Automations

1. Log in to [Brevo](https://app.brevo.com)
2. Go to **Automations** → **Create an automation**
3. Select **Create from scratch**

### Step 2: Set Entry Point

1. Click **Add entry point**
2. Select **Contact is added to a list**
3. Choose **EFI Approved Candidates** (List #3)
4. Click **Done**

### Step 3: Add First Email (Immediate)

1. Click the **+** button after the entry point
2. Select **Send an email**
3. Configure:
   - **Template**: Select "Sequence 1 - Casting Number Generated" (ID: 3)
   - **From name**: Марта Желязкова
   - **From email**: Your configured sender email
4. Click **Done**

### Step 4: Add Wait Period (24 hours)

1. Click the **+** button after the first email
2. Select **Add a delay**
3. Set **1 day**
4. Click **Done**

### Step 5: Add Second Email

1. Click the **+** button after the delay
2. Select **Send an email**
3. Configure:
   - **Template**: Select "Sequence 2 - Who Will Train You" (ID: 4)
   - **From name**: Марта Желязкова
   - **From email**: Your configured sender email
4. Click **Done**

### Step 6: Add Wait Period (2 days)

1. Click the **+** button after the second email
2. Select **Add a delay**
3. Set **2 days**
4. Click **Done**

### Step 7: Add Third Email

1. Click the **+** button after the delay
2. Select **Send an email**
3. Configure:
   - **Template**: Select "Sequence 3 - The Guarantee" (ID: 5)
   - **From name**: Марта Желязкова
   - **From email**: Your configured sender email
4. Click **Done**

### Step 8: Activate

1. Review the automation flow
2. Click **Activate automation** (top right)
3. Confirm activation

## Automation Flow Diagram

```
┌─────────────────────────────────────┐
│   Contact added to List #3          │
│   (EFI Approved Candidates)         │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Send Email 1: Casting Number      │
│   (Template #3 - Immediate)         │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Wait 24 hours                     │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Send Email 2: Who Will Train You  │
│   (Template #4)                     │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Wait 2 days                       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Send Email 3: The Guarantee       │
│   (Template #5)                     │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   End of sequence                   │
└─────────────────────────────────────┘
```

## Testing the Automation

1. Create a test candidate in the app
2. Approve them via Telegram
3. Check Brevo to verify:
   - Contact appears in List #3
   - Automation is triggered (check automation logs)
   - First email is sent immediately

## Troubleshooting

### Emails not sending

1. Check that the automation is **Active** (not Draft)
2. Verify the sender email is verified in Brevo
3. Check Brevo logs for errors

### Contact not appearing in list

1. Check the app logs for Brevo API errors
2. Verify `BREVO_API_KEY` is correct in Vercel env vars
3. Verify `BREVO_LIST_ID` is set to `3`

### Wrong template content

1. Go to **Email Templates** in Brevo
2. Edit templates 3, 4, or 5 as needed
3. Templates are used by ID, so changes apply automatically

## Contact Attributes

When a contact is added, these attributes are set:

| Attribute | Description |
|-----------|-------------|
| FIRSTNAME | Candidate's first name |
| LASTNAME | Candidate's last name |
| SMS | Phone number (if provided) |
| CITY | City from application |
| CATEGORY | Model category |

These can be used in email templates with `{{ contact.FIRSTNAME }}` etc.

## Notes

- The automation only triggers on **new** additions to the list
- If a contact is already in the list, they won't receive emails again
- To re-send the sequence, remove the contact from the list first, then re-add
