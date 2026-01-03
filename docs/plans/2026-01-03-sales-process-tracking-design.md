# Sales Process Tracking Design

## Overview

Add sales process tracking for approved candidates, plus enhanced search by phone number.

## Features

### 1. Enhanced Search
- Add phone number to existing search (email/name already works)

### 2. Sales Pipeline (5 stages)
1. Contacted - Initial outreach made
2. Presentation Scheduled - Meeting booked
3. Presentation Done - Meeting completed
4. Contract Sent - Offer/contract delivered
5. Signed - Deal closed

### 3. Notes Field
- Free text area for any comments about the candidate

### 4. Tags System
- Selectable labels with ability to create new ones
- Default tags: VIP, Urgent, Follow-up, Hot lead, Waiting on them, Question

## Database Schema

```prisma
// Add to Candidate model
salesStage    String?   @map("sales_stage")
salesNotes    String?   @map("sales_notes")
tags          String[]  @default([])

// New Tag model
model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  @@map("tags")
}
```

## API Changes

1. `GET /api/candidates` - search includes phone
2. `PATCH /api/candidates/[id]` - accepts salesStage, salesNotes, tags
3. `GET /api/tags` - list all tags
4. `POST /api/tags` - create new tag

## UI Design

Sales Process section appears in detail panel (right side) for approved candidates only, below the email sequence timeline.

- Stage selector: radio buttons, click to update immediately
- Tags: pill badges, click to toggle, "+" to add new
- Notes: textarea with Save button
- Styled with dark theme (#0a0a0a background) and gold accents (#c9a227)
