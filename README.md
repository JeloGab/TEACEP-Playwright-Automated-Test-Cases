# TEACEP — Blueshirt test case automation

Playwright end-to-end tests for the Blueshirt Survey System, built from
`Test Cases_Blueshirt_Functional.xlsx`.

## Running it

```powershell
npm test                                         # everything
npx playwright test tests/principal.spec.ts      # one role
npx playwright test tests/principal.spec.ts --headed   # watch it
npx playwright test --grep "LGN - 004"           # one case, by its workbook ID
npm run report                                   # the HTML report from the last run
```

Every test is titled with its Test Case ID, so `--grep` takes any ID from the
sheet and a line in the report reads like a row in it:

```
TCP - CRT - 004 · Principal · Create a Survey
```

First time only: `npm install` and `npx playwright install chromium`, then
copy `.env.example` to `.env` and fill in what you have.

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

Found by probing dev, and all of it contradicts something the workbook implied:

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
