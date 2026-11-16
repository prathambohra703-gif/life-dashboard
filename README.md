# Life Dashboard

An installable personal dashboard (web app) for one person: routine, training, nutrition, money, study and career.
The app lives in `app/` and is published to GitHub Pages by the workflow in `.github/workflows/pages.yml`.
`app/setup.html` is the step-by-step setup guide; open it from the published site.

Development: `python3 tools/build.py` regenerates `app/index.html` (needs the private source file, not in this repository);
`python3 tools/run_tests.py` runs the test suites against a local Postgres stand-in (`tools/mock`).
No keys, balances or personal records are stored in this repository.
