# Morning paper: data contract

A one-page newspaper, ready at 5:45 AM India time. Two halves:

1. **The morning agent** (cloud scheduled task, Sonnet) writes what needs the outside world: news, quote, markets, calendar.
2. **The app** adds what it already knows, live at the moment he opens it: dashboard summary, to-dos and deadlines, and the important Outlook emails.

## 1. Record written by the agent

Collection `meta`, id `paper-YYYY-MM-DD` (the date the paper is for, Asia/Kolkata). Written with `public.service_put`. Writing again the same day replaces the fields.

```json
{
  "date": "2026-11-20",
  "at": 1795100000000,
  "quote": {"text": "...", "by": "Author name"},
  "markets": [
    {"name": "Nifty 50", "value": "24,350.10", "chg": "+0.42%", "asof": "19 Nov close"},
    {"name": "Sensex", "value": "...", "chg": "...", "asof": "..."},
    {"name": "USD/INR", "value": "...", "chg": "...", "asof": "..."},
    {"name": "Gold (MCX, 10 g)", "value": "...", "chg": "...", "asof": "..."}
  ],
  "calendar": [{"time": "10:00", "title": "Moot court practice"}],
  "news": [
    {"sec": "Law & regulation", "head": "...", "gist": "...", "src": "Livemint", "url": "https://...", "when": "19 Nov"}
  ],
  "lead": 0
}
```

Rules:
- `news`: 8 to 10 items. `sec` is one of `Law & regulation` (RBI, SEBI, MCA, IRDAI, courts, NCLT, CCI, international regulators), `Finance` (markets, banking, deals, economy), `AI`, `Trading` (markets structure, F&O, crypto rules, notable moves). At least 2 Law & regulation items when they exist. `head` at most 90 characters, `gist` at most 220 characters (one or two plain sentences: what happened and why it matters to a law and finance student). Every item from the last 36 hours, with the publisher name in `src` and the article link in `url`. Never invent a story, figure or link.
- `lead`: index into `news` of the most important story (shown large).
- `markets`: previous close values as text, exactly as found; leave the array empty if they cannot be confirmed. Never estimate.
- `calendar`: today's events from Google Calendar, 24 h time, `"All day"` for all-day events. Empty array if none.
- `quote`: one real, correctly attributed quote (motivation, discipline, law, markets). Do not repeat a quote used in the last 30 papers (read the earlier `paper-*` records).
- Status record after every run: `meta/agent-paper` `{at, ok, summary, detail}`.

## 2. What the app adds (live)

- **Yesterday at a glance**: habits done of total, water, protein against target, kcal, steps, weight (7-day average), CFA minutes, study minutes, spend (his share) against the daily budget. From the app's own data for yesterday.
- **To do**: open to-dos (high priority first, at most 6) and deadlines in the next 7 days (at most 5), each with days left.
- **From your inbox**: items from the latest two `proposals` records whose id starts with `outlook-` (written by the Mac Outlook check at 9:15 PM). Each shows the source from `why` (sender and time), the title or text, and its state: Pending (not yet approved), Added, or Dismissed.
- **Today's plan**: today's training session name and the kcal and protein targets, from the recomposition programme when active.

## 3. Display

- Today screen: a small "Morning paper" card with the date, the lead headline and "Open". Shown every day; if today's record is missing, it says "Today's paper is not ready yet" and offers the latest one.
- Tapping opens a full-screen newspaper page laid out to fit ONE A4 page: masthead (title "The Daily Brief", date, quote), lead story, news in columns by section, markets strip, calendar, yesterday at a glance, to do, inbox.
- Buttons: **Save as PDF** (prints the page; print CSS fits one A4 page, no app chrome) and **Close**. Every news headline links to its `url` (opens in a new tab).
