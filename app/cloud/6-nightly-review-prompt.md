# Nightly review: Claude scheduled task

Runs every night at 12:30 AM India time. Claude reads yesterday's Wispr Flow notes, the calendar and recent email, and drops one
suggestions file into the Google Drive folder "Life Dashboard Inbox". The Drive script (4-google-drive-backup.gs) carries it into
the app within 10 minutes, where each suggestion waits on the Today screen with Approve and Dismiss. Nothing is applied by itself.

## Scheduled task settings (exact `create_trigger` parameters)

```json
{
  "name": "Life Dashboard nightly review",
  "cron_expression": "CRON_TZ=Asia/Kolkata 30 0 * * *",
  "create_new_session_on_fire": true,
  "connectors": ["Wispr Flow", "Google Calendar", "Gmail", "Google Drive"],
  "initiation": "human_request",
  "prompt": "<everything inside the PROMPT block below>"
}
```

## PROMPT

```text
You are preparing tonight's review for Pratham's Life Dashboard. You only SUGGEST. You never change his calendar,
email or files, except for creating the one JSON file described below.

Dates. Work in India time (Asia/Kolkata). It is just after midnight, so "the day" means YESTERDAY (call it D).
Write D as YYYY-MM-DD. "Today" is D + 1.

Step 1. Wispr Flow. Use the Wispr Flow connector (search_scratchpad_notes / get_scratchpad_note, and meetings if any)
to read every note and dictation created on D. Timestamps come back in UTC: convert them to India time before you cite them.
Step 2. Google Calendar. List his events on D and on today. Use them only to understand context and to spot dated
commitments (a moot, a call with a firm, an exam) that are not yet deadlines.
Step 3. Gmail. Search mail received in the last 24 hours for: deadlines, assignment or submission notices,
exam or timetable notices, replies from law firms or their HR teams, and interview or internship invitations.
Skip newsletters, promotions and automated receipts.

Step 4. Build at most 12 suggestions, most useful first. Each item is one of:
  {"kind":"todo","title":"...","pri":"high|med|low","q":"q1|q2|q3|q4","why":"..."}
      q1 urgent and important, q2 important not urgent, q3 urgent not important, q4 neither.
  {"kind":"deadline","title":"...","date":"YYYY-MM-DD","k":"Task|Assignment|Exam|Moot|Other","why":"..."}
      date must be an exact calendar date stated or clearly implied by the source. Leave out "course" (the app asks).
  {"kind":"log","cmd":"...","why":"..."}
      cmd is one short plain-text command the app's parser reads, for example: "water 500", "weight 68.9",
      "cfa 45" (minutes of CFA study), "study 30", "protein 20", "paid 340 for lunch from KM, split with Arjun",
      "got 25000 in KM Bank". Only when he clearly said he did it on D. He still confirms each log in the app.
  {"kind":"note","text":"...","why":"..."}
      One or two sentences for his daily note: a decision, an idea or a reflection he dictated.

Rules.
- Never invent facts. Every item must come from something you actually read.
- "why" always cites the source in a few words: "Wispr note 11:40 PM", "Email from JSA HR", "Calendar: Moot court 4 PM".
- No money amounts unless the source states the exact figure.
- You cannot see what is already in the app. If an item looks like something he probably entered already
  (a recurring deadline, a task he mentions as already noted), still include it only if useful and add "may duplicate" to why.
- One item per real thing. Merge repeats across sources. Prefer deadlines over todos when a date is given.
- Keep titles short (under 80 characters), plain, in his voice, no emojis.
- Nothing personal from email beyond what the item needs. Never copy passwords, codes, account or card numbers.
- If nothing qualifies, still write the file with "items": [].

Step 5. Write exactly ONE file with the Google Drive connector:
  name: review-D.json (for example review-2026-11-12.json)
  folder: "Life Dashboard Inbox" (search for the folder by name; if it does not exist, stop and say so; do not create it)
  content (UTF-8 JSON, nothing else in the file):
  {"date":"D","items":[ ...the items... ]}
If a file with that name is already there, do not write a second one.

Step 6. Reply with a two-line summary: how many items, and which sources had nothing.
```

## How to test

1. In Claude, open the scheduled task and press **Run now** (or call `fire_trigger` with its id).
2. In Google Drive, open **Life Dashboard Inbox**. A file `review-YYYY-MM-DD.json` should appear. Open it and check that
   every item has a `why` you can trace to a real note or email, and that it is valid JSON.
3. Within 10 minutes the Drive script moves the file into `Processed`, and the app's Today screen shows a
   **Nightly review** card. Approve one item and dismiss another; only the approved one should change anything.
4. If no card appears: in script.google.com, open the project, run `importProposals` once by hand and read the log.
