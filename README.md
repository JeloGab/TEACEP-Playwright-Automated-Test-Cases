# TEACEP — Blueshirt test case automation

Automated end-to-end tests for the **Blueshirt Survey System**, written in
[Playwright](https://playwright.dev) and TypeScript.

The Blueshirt Survey System is a web app where an organisation's staff —
Org Admins, Division Officers, District Supervisors, Principals, Coaches and
Master Teachers — build surveys, send them to an audience, and read the
results. The test cases for it were written by hand in an Excel workbook, one
row per case, each row carrying an ID like `TCP - CRT - 004`, the role it
applies to, the steps to follow and the expected output.

This repo turns the rows marked **Automation** into code that runs in a
browser. Every test is titled with its Test Case ID, so a line in the test
report reads like a row in the sheet:

```
TCP - CRT - 004 · Principal · Create a Survey
```

That means you can take any ID from the workbook, search this repo for it, and
find the code that checks it — or run it on its own.

> **📗 The Excel sheet that contains the test cases is with your team leader.**
>
> It is not in this repo, and it must not be committed here. Ask for
> `Test Cases_Blueshirt_Functional.xlsx` before you write anything new — the
> IDs, the roles and the expected outputs all come from it.

---

## Setting this up on a new computer

Everything below is a fresh machine, start to finish. Should take about ten
minutes, most of it downloading.

### 1. Install Node.js

Get the **LTS** build from [nodejs.org](https://nodejs.org). This repo was
built on Node v22 and npm 10. Check it worked:

```powershell
node -v
npm -v
```

### 2. Clone the repo

```powershell
cd ~\Documents
git clone https://github.com/JeloGab/TEACEP--Playwright-Automated-Test-Cases.git
cd "TEACEP--Playwright-Automated-Test-Cases"
```

### 3. Install the dependencies and the browser

```powershell
npm install
npx playwright install chromium
```

The second command downloads the browser Playwright drives. It is separate
from `npm install` and it is easy to forget — if your first run dies with
"Executable doesn't exist", this is why.

### 4. Make your `.env`

```powershell
cp .env.example .env
```

Then open `.env` and fill in the accounts you were given. It looks like this:

```ini
DEV_BASE_URL=https://organization.dev.blueshirt.work

E2E_DEV_PRINCIPAL_EMAIL=someone@yopmail.com
E2E_DEV_PRINCIPAL_PASSWORD=...
E2E_DEV_COACH_EMAIL=
E2E_DEV_COACH_PASSWORD=
```

**You do not need every account to start.** A role whose two keys are blank
simply skips its tests, with a message naming the exact keys to fill in. Fill
them in one role at a time and the suite grows with you.

> ⚠️ **`.env` holds real passwords and is gitignored. Never commit it.**
> `.env.example` is the one that gets committed, and it must stay empty of
> real values. Ask your team leader for the test accounts — do not use a
> real person's login.

### 5. Prove it works

```powershell
npm test
```

You should see something close to this. Skips are normal — they are the
accounts you have not filled in yet:

```
43 tests · 33 passed · 10 skipped · 0 failed      (~46s)
```

If everything fails instead, work through [Troubleshooting](#troubleshooting)
at the bottom.

---

## Running the tests

```powershell
npm test                                           # everything
npx playwright test tests/principal.spec.ts        # one role
npx playwright test tests/principal.spec.ts --headed    # watch it in a real browser
npx playwright test --grep "CRT - 004"             # one case, by its workbook ID
npx playwright test --grep "Coach"                 # everything for one role
npm run report                                     # open the report from the last run
```

Flags combine — path, `--headed`, `--grep` are independent of each other.

Two that help while you are fixing something:

```powershell
npx playwright test tests/coach.spec.ts --headed --workers=1   # one at a time, in order
npx playwright test tests/coach.spec.ts --debug                # step through it
```

`--debug` opens Playwright Inspector paused on the first line, and highlights
each locator in the page as it runs. It is the fastest way to find out why a
selector is not matching.

---

## Adding your own test cases

The workflow, start to finish.

### 1. Find the row in the workbook

Get the sheet from your team leader. Note three things: the **Test Case ID**,
the **role** in the User column, and the **Mode of Testing**.

**If it says `Manual`, stop — it does not belong here.** This repo only holds
cases marked `Automation`. See [Scope](#scope).

### 2. Open that role's file

`tests/` is one file per role. A Principal case goes in
`tests/principal.spec.ts`, a Coach case in `tests/coach.spec.ts`. Cases whose
User column says "Any User" go in `tests/signed-out.spec.ts`.

### 3. Write the test

Copy the shape of the ones already there:

```ts
test('TCP - CRT - 004 · Principal · Create a Survey', async ({ page, loggedInPrincipal }) => {
  const surveyPage = new SurveyPage(page);
  const title = unique('Survey');

  // --- ACT ---
  await surveyPage.createPublishedSurvey(title);

  // --- ASSERT: the expected output from the sheet ---
  await surveyPage.openTab('Active');
  await expect(surveyPage.row(title)).toBeVisible();
});
```

Three rules that keep this from rotting:

1. **The title is the Test Case ID, verbatim.** `ID · Role · Case name`. This
   is what makes the report traceable back to the sheet.
2. **No selectors in the test.** If you need an element the page object does
   not expose, add it to the class in `pages/` and use it by name. A test
   should read like the steps column of the sheet.
3. **Give anything you create a unique name** with `unique('Survey')`. Tests
   run in parallel; two of them fighting over the same row is a flaky suite.

### 4. Need a screen that has no page object?

Add one in `pages/`, named `<screen>.page.ts`. Locators go in the constructor,
actions go underneath:

```ts
export class ReportPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Reports' });
    this.exportButton = page.getByRole('button', { name: 'Export' });
  }

  async goto() {
    await this.page.goto('/organisation/reports');
    await expect(this.heading).toBeVisible();
  }
}
```

**Read the locators off the running app, do not guess them.** `npm run codegen`
opens a browser that writes selectors as you click. Guessed selectors are the
single biggest source of wasted time in this repo — most of the page objects
here were wrong on the first attempt and had to be rebuilt against the live
site.

### 5. Check it

```powershell
npm run typecheck                                  # catches typos before a browser opens
npx playwright test --grep "CRT - 004" --headed    # watch your new test
npm test                                           # make sure nothing else broke
```

---

## What every folder does

Four folders, nothing else.

| Folder | What lives there |
| --- | --- |
| `config/` | One file. The base URL, the roles, and reading credentials out of `.env`. No browser code. |
| `pages/` | One class per screen — where its elements are and what you can do with them. The only files that know a selector. |
| `fixtures/` | `base-test.ts`: the `test` every spec imports, with one logged-in fixture per role. |
| `tests/` | The specs, **one file per role**. |

### `config/index.ts`

Throws rather than guess a target, so a bare `npm test` can never accidentally
hit production. `user('PRINCIPAL')` returns the account from `.env`, or
`undefined` when the keys are blank — which is how a role opts out.

### `pages/`

A spec says `await surveyPage.archive(title)`; only `survey.page.ts` knows that
this means clicking a row button and confirming a dialog. When the UI changes
you edit one file here instead of every spec.

```
login.page.ts             /login
signup.page.ts            /signup
survey.page.ts            /organisation/surveys + the builder
configure-survey.page.ts  /organisation/configure-run
audience.page.ts          /organisation/audience
```

### `tests/` — one file per role

Each file is that role's whole story, top to bottom: it signs in, then it
works. Open `principal.spec.ts` and you see everything a Principal can do,
with the workbook ID on every line.

```
signed-out.spec.ts           9   no account needed — run this first
division-officer.spec.ts     6   LGN/CRT/DRFT/ARCV/DUP/RNM - 002
district-supervisor.spec.ts  6   …- 003
principal.spec.ts           10   …- 004, plus Configure & Run and Audience
coach.spec.ts                6   …- 005
master-teacher.spec.ts       6   …- 006
```

`signed-out.spec.ts` holds the cases whose User column says "Any User" — the
signup checks, bad credentials, the login page itself. They belong to no role
and run on a machine with an empty `.env`.

There is no `org-admin.spec.ts`: its sign-in needs MFA, which the workbook
marks Manual. No `support.spec.ts` either — Support is redirected to
`/support`, has no survey access, and the sheets give it no cases. And no
`teacher.spec.ts`: Teacher signs in on a separate host
(`DEV_BASE_TEACHER_URL`) and is out of scope, so `TCP - LGN - 007` is not
covered. Note that **Master Teacher is a different role** and is covered in
full.

### `fixtures/base-test.ts`

Asking for a role's fixture means the test body starts signed in:

```ts
test('TCP - CRT - 004 · Principal · Create a Survey', async ({ page, loggedInPrincipal }) => {
  const surveyPage = new SurveyPage(page);
  ...
});
```

Each test logs in for itself — no cached sessions, no setup project. A role
whose `.env` keys are blank **skips** with a message naming the exact keys. A
skip is a missing precondition, never a failure; only red counts as broken.

---

## Scope

Only the cases whose "Mode of Testing" column says `Automation`. Cases marked
`Manual` are not represented anywhere in this repo, and the **NEW UPDATES**
sheet is out of scope in full.

The workbook lists six roles per Manage Survey case (001-006). All five cases
are written for **five** of them — Division Officer, District Supervisor,
Principal, Coach and Master Teacher. **Org Admin (001) is left out**: its
sign-in needs MFA, which `TCP - LGN - 001` itself marks Manual.

Checked against dev: District Supervisor, Principal, Coach and Master Teacher
see an identical Manage Surveys page — same Create Survey button, same
Active/Draft/Archive tabs, same row actions. Support is redirected to
`/support` and has no survey access at all, which is why the sheet does not
list it as a survey role.

## Where it stands

```
43 tests · 33 passed · 10 skipped · 0 failed      (~46s)
```

| Skipped | Why |
| --- | --- |
| `CRT/DRFT/ARCV/DUP/RNM - 002` (5) | No credentials for Division Officer |
| `LGN - 002` | Same — no Division Officer account |
| `CMPR - 008` | Needs an account that has verified its email but not completed its profile. None exists. |
| `RSRVY - 004`, `DRFT - 004` (Configure) | Needs an audience group — dev has none |
| `CRM - 002` | Same: no audience group to file a member under |

**Division Officer** is wired and waiting. Set
`E2E_DEV_DIVISION_OFFICER_EMAIL` and `E2E_DEV_DIVISION_OFFICER_PASSWORD` in
`.env` and its six tests run with no code change — verified by supplying a
working account through the environment, which turned all of them green.

- **Teacher** is out of scope: it signs in on a separate host, and a
  non-teacher account is rejected there. `DEV_BASE_TEACHER_URL` is still in
  `.env` but nothing reads it.
- **Org Admin** stays out: MFA.

## Things worth knowing about the app

Found by probing dev, and all of it contradicts something the workbook implied.
Read this before you spend an hour on a selector that cannot work:

- **Routes are namespaced under `/organisation`**: `/organisation/surveys`,
  `/organisation/surveys/create`, `/organisation/configure-run`,
  `/organisation/audience`. Plain `/manage-survey` is a 404.
- **Publish refuses silently-ish.** It needs a language — "Language is
  required" — and two options on the default multiple-choice question —
  "Please add at least two options." Neither is obvious from the sheet's steps.
- **Row actions are plain buttons, not a menu**: Details, Rename, Duplicate and
  Archive are all visible in the row. The app says **Details** where the
  workbook says Preview.
- **The language picker is a checkbox dropdown** (Arabic, English, French) with
  no accessible names, and the popover never settles for Playwright's
  stability check — it needs `click({ force: true })`.
- **The survey list renders blank skeleton rows first**, so anything reading
  the table has to wait the load out.
- **Audience tabs are singular**: "Group" and "Member".
- **Builder inputs have no label and no id** — only placeholders
  (`Master Survey Name`, `Section Title`, `Question`, `Option 1`).
- **Sign-in can take longer than 10s** on dev, so the signed-in assertion uses
  a 30s timeout rather than the default.
- **A malformed email does not disable the Sign up button** — the form relies
  on the email input's own browser validation. A short password *does* disable
  it.
- **Bad credentials produce exactly "Invalid email or password"** on `/login`.
- **The workbook says "Division Supervisor"; the app says "District
  Supervisor".** The code follows the app.

## Conventions

- Every spec is titled with its Test Case ID.
- Specs never contain selectors. Those live in `pages/`.
- A test creates whatever it needs and gives it a unique `E2E`-prefixed name,
  so tests run in parallel and in any order without fighting over a row.
- A missing precondition is a skip with a reason, never a silent pass and never
  a red failure.

## Troubleshooting

| What you see | What it means |
| --- | --- |
| `Executable doesn't exist at …chromium` | You skipped `npx playwright install chromium`. |
| `No base URL. Set DEV_BASE_URL in .env` | No `.env`, or the line is missing. Copy `.env.example` again. |
| Everything skips | `.env` has no accounts in it. That is the expected first run. |
| `No credentials for Coach. Set E2E_DEV_COACH_EMAIL …` | Exactly what it says — that role's two keys are blank. |
| A test times out waiting for a locator | The selector is wrong, or the page changed. Open the trace: `npx playwright show-trace test-results/<folder>/trace.zip`. |
| `strict mode violation: resolved to 2 elements` | Your locator matches more than one thing. Narrow it, or add `.first()` when that is genuinely right. |
| Tests pass alone but fail together | Two tests are sharing a record. Make sure each one creates its own with `unique()`. |

Every failure leaves a trace, a screenshot and a video under `test-results/`.
The trace is the useful one — it is a frame-by-frame replay with the DOM at
each step.
