# ASL Customer/Dealer Lookup API

Firebase Firestore + Vercel serverless API that exposes the `Client_dealer_mapping.xlsx`
and `TPIN.xlsx` schemas as a **pure data layer** for a Webex Contact Center (WxCC) /
Webex Connect branch call flow.

Business-hours/holiday checks, TPIN generation, and TPIN validation are handled
natively inside the Webex CC flow itself — this API's job is just to look up
customers/dealers and read or persist the TPIN value.

100 **synthetic** sample records (fake names/numbers, real schema) are included in
`data/clients.json` and `data/tpins.json` so you can seed and test immediately.

## 1. Project structure

```
asl-customer-api/
├── api/
│   ├── health.js                     GET  /api/health
│   ├── customer.js                   GET  /api/customer?mobile=919167371528
│   ├── customer/accounts.js          GET  /api/customer/accounts?mobile=...
│   ├── customer/[entityId].js        GET  /api/customer/15329478
│   ├── dealer/[dealerId].js          GET  /api/dealer/475101
│   ├── tpin.js                       GET/POST /api/tpin  (fetch or store the TPIN value)
│   ├── dob/validate.js               POST /api/dob/validate
│   ├── verify.js                     POST /api/verify  (combined 3-factor check — see note below)
│   └── customer/lookup-by-dob.js     POST /api/customer/lookup-by-dob
├── lib/
│   ├── firebase.js              Firebase Admin init (from env vars)
│   ├── lookupCustomer.js        Mobile-number normalization + Firestore queries
│   ├── auth.js                  x-api-key header check
│   ├── tpin.js                  4-digit format check (storage integrity only)
│   └── formatAccount.js         Sanitizes field names with spaces to underscores + reformats DOB to DDMMYYYY, at the response layer only
├── scripts/
│   ├── generate-data.js         Regenerates the 100 sample records
│   └── seed-firestore.js        Pushes data/*.json into Firestore
├── data/
│   ├── clients.json             100 sample client/dealer mapping records
│   └── tpins.json               100 sample TPIN records
├── package.json
├── vercel.json
└── .env.example
```

## 2. Firestore data model

**Collection `clients`** — doc id = `ENTITY_ID` — all 27 columns from
`Client_dealer_mapping.xlsx` (ENTITY_NAME, ENT_MOBILE_NO, DEALER_ID, BRANCH_ID,
RM_ID, DOB, CS_UGC/PBRG/BRG, gc, critical_customer, etc.)

> **DOB format:** stored internally as `YYYY-MM-DD` (needed for the equality
> matching in `lib/lookupCustomer.js`), but every API response reformats it to
> `DDMMYYYY` before sending it back — matching the format the flow prompts the
> caller for. See `lib/formatAccount.js`.
>
> **Field-name format:** a few source columns have spaces in their names
> (`C1 Number`, `C2 Number`, `Extension of Primary RM`, `Extension of Secondary RM`).
> Webex Connect's Pebble expressions can't address a key containing a space, so
> every response rewrites these to underscores instead — `C1_Number`,
> `C2_Number`, `Extension_of_Primary_RM`, `Extension_of_Secondary_RM`. This is
> also response-layer only; Firestore still stores the original column names.

**Collection `tpins`** — doc id = `Customer_ANI` (mobile number, no `+`, e.g.
`919167371528`) — field `TPIN`.

## 3. One-time setup

### a) Create a Firebase project (if you don't already have one)
1. https://console.firebase.google.com → Add project.
2. Build → Firestore Database → Create database (production mode, pick a region close to your users, e.g. `asia-south1`).
3. Project Settings (gear icon) → Service accounts → **Generate new private key**. This downloads a JSON file with `project_id`, `client_email`, `private_key`.

### b) Configure environment variables
Copy `.env.example` to `.env` and fill in the three Firebase values from the JSON above, plus an `API_KEY` of your choosing (this is the shared secret Webex Connect will send).

```bash
cp .env.example .env
# edit .env
```

### c) Install dependencies
```bash
npm install
```

### d) Seed Firestore with the 100 sample records
```bash
npm run seed
```
This writes 100 docs to `clients` and 100 docs to `tpins`. Re-run `npm run generate-data` first if you want a fresh random batch, or replace `data/clients.json` / `data/tpins.json` with your real export before re-seeding.

## 4. Deploy to Vercel

```bash
npm install -g vercel   # if not already installed
vercel login
vercel                  # first deploy, follow prompts
vercel --prod           # promote to production
```

Then in the Vercel dashboard: **Project → Settings → Environment Variables**, add the
same four variables from your `.env` (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY`, `API_KEY`) for the Production environment, then redeploy.

> **FIREBASE_PRIVATE_KEY in Vercel:** paste it with literal `\n` characters as one line
> (the way it appears in the downloaded JSON) — `lib/firebase.js` converts those back
> to real newlines at runtime.

You'll get a URL like `https://asl-customer-api.vercel.app`.

## 5. Flow-to-API map (Branch_Call_Flow_drawio)

Business-hours/holiday checks, TPIN generation, and TPIN validation/comparison
all happen natively in the Webex CC / Webex Connect flow (using its own
prompt-collect-compare and OTP capabilities). This API supplies the data those
flow steps need:

| Flow step | Endpoint |
|---|---|
| Check if a HOLIDAY / Check IF WITHIN BUSINESS HOURS | Handled in-flow (Webex Connect schedule/holiday config) — no API call |
| Check if registered/unregistered (by ANI or manually entered mobile) | `GET /api/customer?mobile=` |
| Check first time caller? | `GET /api/tpin?mobile=` → `exists:false` means first-time caller (no TPIN on file yet) |
| Generate TPIN and send to registered mobile no. and email ID | Generated and sent by the flow itself; once generated, the flow calls `POST /api/tpin` to persist it |
| Prompt: enter your TPIN → Check valid input? | Flow fetches the stored value via `GET /api/tpin?mobile=` and compares it to caller input itself (Evaluate node) |
| "Do you wish to Reset TPIN?" → Reset TPIN flow (trigger temp TPIN, validate, choose new, same-as-old / repetitive-digit checks, confirm) | Entirely in-flow — Webex Connect holds the temp TPIN / new-TPIN candidate as flow/session variables across the nodes of a single call. Once the customer confirms the new TPIN, the flow calls `POST /api/tpin` to persist it |
| Check SINGLE or MULTIPLE accounts for the same number | `GET /api/customer/accounts?mobile=` (`type` = `single` / `multiple` / `none`) |
| Prompt: enter DOB (DDMMYYYY) → Check valid input? | `POST /api/dob/validate` (accepts `DDMMYYYY` or `YYYY-MM-DD`; pass `entityId` once an account is chosen on the multiple-accounts branch) |
| Retrieve account by number + DOB (any step needing to identify an account via both factors together) | `POST /api/customer/lookup-by-dob` — matches all five contact fields (`ENT_MOBILE_NO`, `ENT_MOBILE_NO_2`, `AR_MOBILE_NUMBER`, `C1 Number`, `C2 Number`) |
| Check mapped/unmapped → Transfer to mapped dealer / CnT queue | Use the `customer`/`accounts` response's `DEALER_ID`: truthy → mapped, transfer using `DEALER_NAME`/`DEALER_EMAIL_ID`/`BRANCH_ID`; blank → unmapped → route to CnT queue. No separate endpoint needed. |
| Standard error flow (shared sub-flow) | Implemented natively in Webex Connect/WxCC as a reusable error sub-flow |

**Why `/api/tpin` exposes the raw stored value:** since the flow (not this API)
now does the comparison, it needs the value to compare against. This is a
server-to-server call from a trusted flow node, protected by the `x-api-key`
header — treat that key as sensitive and rotate it if it ever leaks.

## 6. API reference

All endpoints require header `x-api-key: <your API_KEY>` (skip auth by leaving `API_KEY` unset — fine for local testing only).

### GET /api/health
Quick uptime check, no auth required.

### GET /api/customer?mobile=919167371528
Looks up every client record linked to the number by matching it against
`ENT_MOBILE_NO`, `ENT_MOBILE_NO_2`, `AR_MOBILE_NUMBER`, `C1 Number`, and
`C2 Number` — so a number registered only as an Authorized Representative, or
only as a landline contact, still returns every account it's linked to.
Accepts the number in any common format (`9167371528`, `919167371528`,
`+919167371528`).
```json
{
  "success": true,
  "found": true,
  "count": 2,
  "type": "multiple",
  "accounts": [ { "ENTITY_ID": 15329478, "ENTITY_NAME": "Ayaan Chawla", "...": "..." }, { "ENTITY_ID": 15329501, "...": "..." } ],
  "customer": { "ENTITY_ID": 15329478, "...": "..." }
}
```
`customer` is just `accounts[0]`, kept as a convenience field for flow steps
that only need a single record (e.g. the initial registered/unregistered
check). `count`/`type` (`single`/`multiple`/`none`) let the flow branch
directly on this same call instead of needing a second request.

### GET /api/customer/:entityId
Direct lookup by `ENTITY_ID`.

### GET /api/customer/accounts?mobile=919167371528
Same underlying lookup as `GET /api/customer` above (all five contact
fields — `ENT_MOBILE_NO`, `ENT_MOBILE_NO_2`, `AR_MOBILE_NUMBER`, `C1 Number`,
`C2 Number`) — kept as a separate path for flows already wired to call it
explicitly for the single-vs-multiple check.
```json
{ "success": true, "count": 2, "type": "multiple", "accounts": [ { "ENTITY_ID": 1, "...": "..." }, { "ENTITY_ID": 2, "...": "..." } ] }
```

### GET /api/dealer/:dealerId
Returns branch/RM/region context for a given `DEALER_ID`.

### GET /api/tpin?mobile=919167371528
Fetches the currently stored TPIN so the flow can compare it itself.
```json
{ "success": true, "exists": true, "tpin": "1234" }
```
`exists:false, tpin:null` signals a first-time caller / no TPIN issued yet.

### POST /api/tpin
Body: `{ "mobile": "919167371528", "tpin": "4321" }` — stores/overwrites the
TPIN. Used both for the very first TPIN a flow generates and to finalize a
reset. Only checks that the value is exactly 4 digits; all business rules
(same-as-old, repetitive digits, attempt counts) are the flow's responsibility.
```json
{ "success": true, "stored": true }
```

### POST /api/dob/validate
Body: `{ "mobile": "919167371528", "dob": "15031990", "entityId": "15329478" }` (`entityId` optional).
Accepts DOB as `DDMMYYYY` (as prompted in the flow) or `YYYY-MM-DD`. Returns
`{ valid: true, customer: {...} }` or `{ valid: false, reason: "no_account_found" | "dob_mismatch" }`.
Matches against all five contact fields (including `AR_MOBILE_NUMBER`).

### POST /api/customer/lookup-by-dob
Body: `{ "mobile": "919167371528", "dob": "15031990" }` (accepts `DDMMYYYY` or `YYYY-MM-DD`).
Retrieves account(s) by matching the number **and** DOB together, against all
five contact fields — `ENT_MOBILE_NO`, `ENT_MOBILE_NO_2`, `AR_MOBILE_NUMBER`,
`C1 Number`, `C2 Number` — same field set as `GET /api/customer`, but requires
DOB to also match.
```json
{ "success": true, "found": true, "count": 1, "accounts": [ { "ENTITY_ID": 15329478, "...": "..." } ] }
```

### POST /api/verify
Body: `{ "mobile": "919167371528", "dob": "1990-01-30", "tpin": "1234" }`

A separate, combined convenience endpoint (from an earlier WxCC AI-voicebot
self-service build) that itself compares DOB and TPIN server-side. **This
overlaps with "TPIN validation happens in the flow" for the branch call flow above** —
keep it only if another flow still relies on it; otherwise flag it and I can
remove it or convert it to a data-only variant like `/api/tpin`.

## 7. Wiring into a Webex CC / Webex Connect flow

Use a **"Send API Request" / HTTP Request** node:

1. **Method:** GET, **URL:** `https://<your-vercel-domain>/api/customer?mobile={{System.Call.ANI}}`
   **Headers:** `x-api-key: <API_KEY>`
   → Use the response's `customer.ENTITY_NAME`, `customer.RM_ID`, `customer.BRANCH_NAME` etc. to personalize the greeting and set routing variables.

2. **Method:** GET, **URL:** `https://<your-vercel-domain>/api/tpin?mobile={{System.Call.ANI}}`
   → Store `tpin` in a flow variable; compare it to the digits collected from the caller using the flow's own Evaluate/Compare node.

3. After a TPIN reset is confirmed in-flow: **Method:** POST, **URL:** `.../api/tpin`
   **Body:** `{ "mobile": "{{System.Call.ANI}}", "tpin": "{{new_tpin}}" }`

## 8. Notes / next steps
- The 100 records are **synthetic** — swap in your real export (same column names) before go-live, then re-run `npm run seed`.
- `Client_dealer_mapping.xlsx` has no customer-email column (only `DEALER_EMAIL_ID`, which is the dealer's own email) — irrelevant now that the flow handles TPIN send itself, but worth knowing if any other step needs to email the customer.
- **Landline number format caveat:** `normalizeToPlus91()` assumes a 10-digit national number before adding the `91` prefix. The synthetic `C1 Number`/`C2 Number` sample data follows that same 10-digit pattern (STD code + subscriber number), so lookups work correctly against it. Real Indian landline numbers can vary in total length depending on the STD code, so if your actual export has shorter/longer landline numbers, double-check a few real records match correctly after seeding — you may need to adjust `normalizeToPlus91()` if the format differs.
- Add Firestore composite indexes if you later query on combinations of fields (single-field equality queries used here don't need one).
- Consider Firestore security rules restricting direct client-side reads, since all access here goes through the Admin SDK on the server side only.
- Since `/api/tpin` (GET) returns the TPIN in plaintext to be compared in-flow, make sure the `x-api-key` is treated as a real secret (Vercel env var, not hardcoded in the flow's visible config) and consider IP-allowlisting the Vercel function to Webex Connect's egress ranges if that's supported in your setup.
