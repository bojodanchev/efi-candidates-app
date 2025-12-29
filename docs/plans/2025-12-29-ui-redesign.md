# EFI Candidates Dashboard - UI Redesign

## Overview

Transform the current basic table UI into a premium, dark luxurious fashion-industry aesthetic with improved information density.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Visual style | Dark & luxurious (black/gold, Vogue-like) |
| Layout | Split view (list left, detail panel right) |
| Photos | Instagram via unavatar.io + submission photos (Phase 2) |

## Color Scheme

- **Background**: Deep black `#0a0a0a`
- **Panels**: Charcoal `#141414`
- **Accent/Gold**: `#c9a227`
- **Text Primary**: White `#ffffff`
- **Text Secondary**: Muted gray `#888888`
- **Borders**: Dark gray `#2a2a2a`

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  EFI CASTING                              [Stats] [Filter Tabs] │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│   CANDIDATES LIST (60%)        │   DETAIL PANEL (40%)           │
│   - Compact rows               │   - Submission photos gallery  │
│   - IG thumbnail               │   - Full candidate details     │
│   - Key stats inline           │   - Social links               │
│   - Quick status badge         │   - Approve/Reject buttons     │
│                                │                                │
└────────────────────────────────┴────────────────────────────────┘
```

## Candidates List (Left Panel)

### Row Design
```
┌──────────────────────────────────────────────────────────────┐
│ [IG Photo]  Name Surname          Sofia    168cm   ● Чакащ  │
│   40x40     Runway, Photo Model   21 год   @insta           │
└──────────────────────────────────────────────────────────────┘
```

### Elements
- **IG Thumbnail** (40x40): From unavatar.io, gold border on hover
- **Name**: Bold white
- **Category**: Muted gray, truncated
- **City**: Compact column
- **Height + Age**: Calculated from birthDate
- **Status Badge**: Gold outline (pending), solid green (approved), muted strikethrough (rejected)

### Interactions
- Row hover: Subtle gold left border
- Selected row: Dark gold background `#1a1608`
- Click: Loads detail panel

### Filter Tabs
```
Всички (461)  │  Чакащи (45)  │  Одобрени (312)  │  Отхвърлени
```
Underlined text style, active = gold underline

## Detail Panel (Right Side)

```
┌────────────────────────────────────────┐
│  SIMONA YANEVA            ● Чакащ     │
│  Runway Model • Photo Model            │
├────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ Photo  │ │ Photo  │ │ Photo  │     │
│  │   1    │ │   2    │ │   3    │     │
│  └────────┘ └────────┘ └────────┘     │
│       (click to expand lightbox)       │
├────────────────────────────────────────┤
│  ДЕТАЙЛИ                               │
│  Възраст      21 години                │
│  Височина     168 см                   │
│  Град         Plovdiv                  │
│  Телефон      0882 875 009             │
│  Email        simona@gmail.com         │
│  Дата         29 дек 2025              │
├────────────────────────────────────────┤
│  СОЦИАЛНИ МРЕЖИ                        │
│  [IG] @simonaa_yaneva    →             │
│  [TT] @simonayanevaa     →             │
├────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐      │
│  │  ОДОБРИ ✓   │  │  ОТХВЪРЛИ   │      │
│  │   (gold)    │  │   (outlined)│      │
│  └─────────────┘  └─────────────┘      │
└────────────────────────────────────────┘
```

## Instagram Photo Integration

```typescript
const getInstagramPhoto = (igUrl: string) => {
  const username = igUrl.match(/instagram\.com\/([^/?]+)/)?.[1];
  if (!username) return null;
  return `https://unavatar.io/instagram/${username}`;
};
```

**Fallback**: Gold gradient initials avatar

## Submission Photos Architecture (Phase 2)

```
Gmail Email → Apps Script → Google Drive → Public URLs → Dashboard
     │              │              │
     └──────────────┴──────────────┘
        Extract 3 attachments per candidate
        Store in /candidates/{email}/ folder
```

### Database Update
```prisma
model Candidate {
  // ... existing fields
  photos  String[]  // Array of photo URLs
}
```

## Implementation Phases

### Phase 1 (Now)
- [x] Dark theme styling
- [x] Split view layout
- [x] Instagram thumbnails via unavatar.io
- [x] Enhanced detail panel
- [x] Improved status badges
- [ ] Photo gallery placeholder (ready for URLs)

### Phase 2 (Future)
- [ ] Apps Script photo extraction from Gmail
- [ ] Google Drive storage setup
- [ ] Photo URLs in database
- [ ] Lightbox gallery viewer

---

**Created**: 2025-12-29
**Status**: Approved for implementation
