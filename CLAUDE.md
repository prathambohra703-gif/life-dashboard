# Working rules for this repo (Life Dashboard)

Read `HANDOFF.md` and `ORIGINAL_BRIEF.md` before doing anything.

## Who you are working for
Pratham is a law student, not a developer. Every step he must do himself has to be copy-paste simple, with exact button names. Keep replies short and clean: short paragraphs, no dense nested lists. He has repeatedly said responses feel cluttered.

## Model roles
- Planning, architecture, design decisions, reviews and anything touching data safety: **Fable 5.2** (the main session).
- Implementation, tests, refactors, screenshots, asset work: delegate to subagents. Use **Opus** for hard or cross-cutting code (sync, merge, SQL, reminders, importer) and **Sonnet** for well-specified, bounded tasks (UI screens, styling, test writing, docs). Fable decides which per task, writes each task with exact files, acceptance checks and constraints, and reviews the result before accepting it.
- Run independent tasks in parallel; never let two agents edit the same file at once.

## Hard rules
1. Never lose or overwrite his data. Imports are additive and verified per type. Do not touch or delete the old artifact until he confirms.
2. Never hardcode keys or secrets. Env vars or Supabase secrets only. The publishable key may live on the device; secret and service keys never go in client code or the repo.
3. Never store card or account numbers, logins or passwords.
4. No placeholder data, fake numbers or broken image links in anything he sees.
5. Do not add: a separate sleep tab, a full journaling module, more habits, live stock tickers.
6. Nothing is applied silently: logging needs his confirmation; nightly-review suggestions need approval.
7. Do not claim "done" or "premium" without passing tests and screenshots you have looked at.
8. Stop and ask only for: creating an account, pasting a key, approving a cost, an import mismatch, or a requirement that turns out impossible.

## Commands
See HANDOFF.md section 8. `python3 tools/build.py` regenerates `app/index.html`; never hand-edit it without also updating `build.py`.
