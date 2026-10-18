# Andrea's Resort - Design Sandbox

A sandbox dashboard for testing design improvements before they go into production.

## How It Works

1. **Andrea makes changes** - Edit `index.html` using Claude Code
2. **Changes are tracked automatically** - Git captures every edit
3. **Conner reviews** - Views the diff to see exactly what changed
4. **Selective approval** - Approved changes get applied to the master template

## Workflow for Andrea

### Making Changes

Use Claude Code to edit this dashboard. Just describe what you want to change:

- "Make the button hover colour lighter"
- "Increase the spacing between week cards"
- "Add a subtle shadow to the tactic cards"

Each change is automatically committed to git, so Conner can see exactly what you changed and when.

### Letting Conner Know

When you have changes ready for review, just message him:
> "I've made some improvements to the card shadows and button states in Andrea's Resort - ready for review"

## Workflow for Conner

### Viewing Andrea's Changes

See all uncommitted changes:
```bash
git diff clients/andreas-resort/index.html
```

See recent commits to the sandbox:
```bash
git log --oneline -10 -- clients/andreas-resort/
```

View a specific commit's changes:
```bash
git show <commit-hash> -- clients/andreas-resort/index.html
```

### Approving Changes

Use Claude Code to apply specific changes to the master template:

> "Apply the card shadow changes from Andrea's Resort (commit abc123) to template/accelerator-template.html"

Or be specific:
> "In template/accelerator-template.html, update the .week-card box-shadow to match what Andrea has in her sandbox"

## Files

| File | Purpose |
|------|---------|
| `index.html` | The sandbox dashboard - Andrea edits this |
| `README.md` | This workflow documentation |

## Access

- Production: https://accelerator.elearningu.com/clients/andreas-resort/
- No login required (public demo)
