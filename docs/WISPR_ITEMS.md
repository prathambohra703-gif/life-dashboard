# Wispr logger: items the cloud agent writes

The agent reads the Wispr notes twice a day and writes ONE `proposals` record per run (collection `proposals`, through the Drive inbox):

    {"date":"2026-11-30","auto":true,"run":"14:00","at":1764500000000,"items":[ ... ]}

- Record id: `<date>-<HHMM>`, for example `2026-11-30-1400`. `run` is `"14:00"` or `"00:30"`. `at` is the finish time in ms. `auto:true` is required, on the record AND on every item: the Drive inbox script passes only `date` and `items`, so the app also treats a record as automatic when its items carry `"auto":true`. Without it the record is the old manual Nightly review.
- The app saves every valid non-money item at once and lists it in a compact strip, "From Wispr · N logged", with a tick (confirm, hides it) and Undo; "Keep all" confirms everything, and items auto-confirm after 3 days. Confirmed state is kept in the `meta/wispr-applied` register (`ok:true`), so it stays hidden on every device. The strip disappears when nothing is unconfirmed.
- Money kinds (`expense`, `income`, `repay`, `paid`, `poker`, and any `ask` whose options contain one) are NEVER applied automatically, even with `auto:true`. They wait in a "To confirm" card with Approve, Edit (amount, account, category, note, split) and Dismiss. Approve applies exactly once (recorded in the register) and the item disappears; Dismiss records it as skipped. Tapping a money option of an `ask` is the approval.
- The app turns anything unclear into a question. Do not send items you are unsure about as guesses: send an `ask`.

## src and date (every item)

- `src`: `"<wisprNoteId>#<n>"`, n = the item's position inside that note (0, 1, 2 ...). Same note, same item, same src, every run. The app applies each src exactly once, even if a later run repeats it.
- `date`: `YYYY-MM-DD`, the logical day the note is about (the day ends at 4 AM: "last night" at 1 AM belongs to the day before). If left out, the record's `date` is used. `deadline.date` is the due date instead; `todo` uses `due`.
- Numbers are plain numbers. Money is rupees. Times are 24 h `HH:MM`.

## Kinds (exact fields, ? = optional)

| kind | fields | example |
|---|---|---|
| water | ml (20 to 6000) | `{"src":"n1#0","kind":"water","ml":500,"date":"2026-11-30"}` |
| meal | name, kcal, p, c?, f?, portion? | `{"src":"n1#1","kind":"meal","name":"Paneer wrap","kcal":420,"p":24,"c":40,"f":16}` |
| sets | exercise, sets:[{w,r}] | `{"src":"n1#2","kind":"sets","exercise":"bench press","sets":[{"w":40,"r":8},{"w":40,"r":8},{"w":40,"r":7}]}` |
| cardio | min | `{"src":"n1#3","kind":"cardio","min":20}` |
| habit | key, done | `{"src":"n1#4","kind":"habit","key":"creatine","done":true}` (keys: mobility, creatine, gym, alcohol, clean; a name like "creatine" or "no alcohol" is matched to the habit's label, and an unknown habit becomes a question. `gym` done:true, and any `cardio` or `sets` item on a training day, also mark that day's session done in Train; Undo reverses both) |
| weight | kg | `{"src":"n1#5","kind":"weight","kg":68.4}` |
| steps | n | `{"src":"n1#6","kind":"steps","n":8200}` |
| waist | cm | `{"src":"n1#7","kind":"waist","cm":80}` |
| wake / bed | time | `{"src":"n1#8","kind":"wake","time":"06:10"}` |
| mood / sleepQ | v (1 to 5) | `{"src":"n1#9","kind":"mood","v":4}` |
| study | min, course? | `{"src":"n1#10","kind":"study","min":45,"course":"Securities Regulation"}` |
| cfa | min | `{"src":"n1#11","kind":"cfa","min":30}` |
| expense | amount, account, category?, note, split?:[{person,amount}], paidBy?, mine? | `{"src":"n1#12","kind":"expense","amount":600,"account":"KM","category":"Food","note":"dinner","split":[{"person":"Wrik","amount":200},{"person":"Dia","amount":200}]}` |
| income | amount, account, note | `{"src":"n1#13","kind":"income","amount":1000,"account":"FC","note":"tutoring"}` |
| repay | person, amount, account? | they paid me: `{"src":"n1#14","kind":"repay","person":"Dia","amount":100,"account":"KM"}` |
| paid | person, amount, account? | I paid them: `{"src":"n1#15","kind":"paid","person":"Wrik","amount":50,"account":"Cash"}` |
| poker | buyin, cashout, hours?, note? | `{"src":"n1#16","kind":"poker","buyin":1000,"cashout":1800,"hours":3}` |
| todo | title, due?, pri? (high/med/low), q? (q1 to q4) | `{"src":"n1#17","kind":"todo","title":"Email the JSA HR","due":"2026-12-03"}` |
| deadline | title, date (the due date), course?, k? | `{"src":"n1#18","kind":"deadline","title":"Moot memo draft","date":"2026-12-10","course":"Securities Regulation","k":"Submission"}` |
| note | text | `{"src":"n1#19","kind":"note","text":"Felt strong today"}` |
| contact | name, note? | sets the contact's last touch to `date`: `{"src":"n1#20","kind":"contact","name":"Manraj sir","note":"Texted"}`. The note is the verb shown on the card ("Texted Manraj sir"). No match: the app asks "Add Manraj sir as a contact?". |
| intern | firm?, matter, work, learned?, with?, skill? | `{"src":"n1#21","kind":"intern","firm":"JSA","matter":"Loan facility","work":"Reviewed the term sheet","learned":"Cross-default"}` |
| ask | question, options:[{label,item}] | `{"src":"n1#22","kind":"ask","question":"Was the 6 PM session at the gym?","options":[{"label":"Gym","item":{"kind":"habit","key":"gym","done":true}},{"label":"Skip","item":null}]}` |

Rules per kind:
- `account` is an account id or name from the app (fc, km, cash, cc, or "FC Bank", "KM Bank", "Cash", "Credit Card"). An unknown or missing account makes the item a question, not a save.
- `sets.exercise` is matched by name to that day's plan, then the exercise library. Unknown names become a question with the day's exercises as buttons.
- `expense.split` lists what others owe you. `paidBy` (someone else paid) records that you owe them `mine` (default: the whole amount) and needs no account.
- `study`, `cfa`, `cardio` add minutes to the day; the others set the value for that day.
- An `ask` is never applied until he taps a button; the tapped option's `item` is saved under the ask's src (`item:null` just dismisses it).
- An item that fails the checks (bad date, missing amount, unknown account or course) is not saved. It shows as "Couldn't save ... which account?" with Edit.
