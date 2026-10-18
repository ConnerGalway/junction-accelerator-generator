# Andrea's Resort - Design Demo Dashboard

This is a sandbox dashboard for testing design improvements before they go into production.

## How It Works

1. **Make changes here** - Edit `index.html` to test colours, spacing, components, or new features
2. **Document your changes** - Add comments or make separate commits for each improvement
3. **Request review** - Tell Conner which changes are ready for approval
4. **Selective merge** - Conner reviews and applies approved changes to the main template

## Workflow for Andrea

### Making Changes

Edit this dashboard using Claude Code. Each change stays isolated to this file until approved.

**Example change comment:**
```html
<!-- DESIGN CHANGE: Updated button hover colour from #aadab6 to #8fd4a0 -->
<style>
.btn-primary:hover { background: #8fd4a0; }
</style>
```

### Proposing Changes

When you have changes ready for review:

1. **Option A: Single change** - Tell Conner: "Review the button hover colour change in Andrea's Resort"
2. **Option B: Multiple changes** - Create a summary: "Ready for review: button colours, card shadows, week header spacing"

### Change Categories

Tag your changes to help with review:

- `/* COLOUR: description */` - Colour adjustments
- `/* TYPOGRAPHY: description */` - Font changes
- `/* SPACING: description */` - Padding/margin changes
- `/* COMPONENT: description */` - Component redesigns
- `/* FEATURE: description */` - New features
- `/* FIX: description */` - Bug fixes

## Workflow for Conner

### Reviewing Changes

1. **View the diff:**
   ```bash
   git diff clients/andreas-resort/index.html
   ```

2. **Compare with template:**
   ```bash
   diff template/accelerator-template.html clients/andreas-resort/index.html | head -100
   ```

3. **Search for tagged changes:**
   ```bash
   grep -n "COLOUR:\|TYPOGRAPHY:\|SPACING:\|COMPONENT:\|FEATURE:\|FIX:" clients/andreas-resort/index.html
   ```

### Approving Individual Changes

Use Claude Code to apply approved changes to the template:

**Example prompt:**
> "Apply the button hover colour change from Andrea's Resort to the main template. The change is on line 245."

**Or be specific:**
> "In template/accelerator-template.html, update the .btn-primary:hover background colour from #aadab6 to #8fd4a0"

### Batch Approval

For multiple related changes:
> "Review Andrea's Resort and apply all COLOUR tagged changes to the main template."

## Files

| File | Purpose |
|------|---------|
| `index.html` | The demo dashboard - edit this |
| `README.md` | This workflow documentation |

## Access

Andrea's Resort is available at:
- Local: `http://localhost:3000/clients/andreas-resort/`
- Production: `https://accelerator.elearningu.com/clients/andreas-resort/`

To grant access, add to Supabase `user_plans` table:
```sql
INSERT INTO user_plans (email, client_slug, role, active)
VALUES ('andrea@example.com', 'andreas-resort', 'client', true);
```
