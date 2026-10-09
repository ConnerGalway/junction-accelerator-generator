---
name: accelerator
description: Work on the Junction Accelerator Generator project. Use when the user says "Work on Accelerator", "junction project", "accelerator generator", or wants to generate/edit client dashboards.
user-invocable: true
argument-hint: "[generate|update|fix] [client-slug]"
---

# Junction Accelerator Generator

You are now working on the Junction Dashboard Generator project.

## Setup (required)

1. Read the project instructions:
```bash
cat CLAUDE.md
```

2. Check git status to understand current state:
```bash
git status
```

## Project Overview

This project generates polished HTML dashboard pages for Junction/eLearningU clients. There are two dashboard types:

- **Accelerator** (marketing): `template/accelerator-dashboard-template.html`
- **Experience** (tourism operators): `template/experience-template.html`

Client files live in `clients/[slug]/` with:
- `plan.md` - the client's plan (input)
- `index.html` - generated dashboard (output)
- `plan.json` - structured data for email system

## Common Commands

**Generate a new dashboard:**
> "Generate an accelerator page for [Client Name] using clients/[slug]/plan.md"
> Coach email: [email]
> Onboarding call date: [YYYY-MM-DD]

**Update an existing dashboard:**
> "Update the accelerator page for [Client] - [what changed]"

**List clients:**
```bash
ls clients/
```

## Key Rules

1. **Never write dashboards from scratch** - always copy template first, then edit in place
2. **Use Canadian spelling** (colour, favourite, optimise) except "program"
3. **No em dashes** - use colons, periods, or commas instead
4. **Every checkbox needs `data-key`** for Supabase sync

## What would you like to do?

Tell me what you need:
- Generate a new client dashboard
- Update an existing dashboard
- Fix an issue
- Explore the codebase
