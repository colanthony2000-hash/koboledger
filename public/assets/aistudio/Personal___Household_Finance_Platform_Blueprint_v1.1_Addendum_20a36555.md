# Personal & Household Finance Platform: Blueprint v1.1 Addendum

*Amends Master Blueprint v1.0 (4 November 2026). Where this addendum conflicts with v1.0, this addendum wins. Everything in v1.0 not mentioned here stays in force.*

## 0. How to use this addendum

Build in the order set by Section 1. The builder must not start a “Later” item until every “Must” item has passed its tests. Each rule and test here has a stable ID (for example INV-04, T-12) so that instructions and reports can reference it without ambiguity. Section 14 replaces the broken numbered lists in v1.0 sections 4.2 and 19.

## 1. MVP scope and cut line

| Area | Must (v1) | Should (v1.1) | Later |
| --- | --- | --- | --- |
| Foundation | Auth, personal workspace, accounts, categories, audit, idempotency, client IDs | MFA, data export | Household sharing, business workspace |
| Ledger | Posting-line ledger, expense, income, transfer, reversal and edit, opening balances | Refunds linked to originals, imports with mapping | Bank connectivity |
| Quick add | Rule-based parser producing drafts, review card | Learned suggestions | Optional LLM fallback |
| Budgets | Monthly and weekly, category allocations, thresholds, alerts | Quarterly, yearly, custom, rollover | Forecast refinements |
| Savings | Goals, manual contributions and withdrawals, milestones, access modes | Schedules, allocation rule previews | Rule-based automatic allocation execution |
| Reports | Cash flow, category spend, budget vs actual, account balances, CSV | PDF and spreadsheet export | Financial health indicators |
| Debts | Register, interest-free, reducing-balance and flat-rate terms, repayment split, urgency flags | Avalanche, snowball, smart priority, affordability engine | Negotiation, settlement, restructuring workflows |
| Projects | None | Templates, items, commitments, payments | Gifts, food and shopping sub-lists |
| Bills | None | Recurring bills, reminders, payment confirmation | Variable-bill forecasting |
| Currency | NGN only in the UI, but every amount stores a currency code | Additional currencies per account | Cross-currency transfers and conversion reports |
| Offline | Offline draft entry with safe sync | Offline viewing of recent data | Offline edits |

Deferred items must appear in the app only as clearly labelled “coming later” entries or not at all. They must never appear as controls that do nothing.

## 2. Ledger model: posting lines (replaces the single-entry design)

Every transaction becomes a header plus two or more **posting lines**. Within one transaction and one currency, the signed line amounts must sum to exactly zero. The database must reject any transaction that does not balance.

Ledger nodes are: real accounts (wallet, bank, mobile money), debt liability nodes (one per debt), income and expense category nodes, and an opening-balance node. Balances and reports are always derived from posting lines. Any cached balance must be rebuildable from them and checked by a reconciliation job.

| Transaction | Posting lines (debit / credit) |
| --- | --- |
| Expense ₦3,000, Transportation, paid from Wallet | Debit Expense: Transportation 3,000 / Credit Wallet 3,000 |
| Income ₦150,000 salary to Bank | Debit Bank 150,000 / Credit Income: Salary 150,000 |
| Transfer ₦20,000 Bank to Wallet | Debit Wallet 20,000 / Credit Bank 20,000 (no category nodes, so no income or expense) |
| Debt drawdown ₦50,000 with ₦2,500 fee deducted upfront | Debit Bank 47,500, Debit Expense: Financial costs 2,500 / Credit Liability: that debt 50,000 |
| Debt repayment ₦26,902.71 (principal 23,902.71, interest 3,000.00) | Debit Liability 23,902.71, Debit Expense: Loan interest 3,000.00 / Credit Bank 26,902.71 |
| Refund ₦3,000 of a linked expense | Debit Wallet 3,000 / Credit Expense: Transportation 3,000 (reduces that category’s spend) |

**Savings goals are not posting lines.** A goal held as a virtual allocation inside an account is a separate allocation record that earmarks part of that account’s balance. It moves no cash and does not touch the ledger. If a goal is linked to a separate real savings account, funding it is an ordinary transfer to that account. The UI must always show which kind of goal it is.

**Project and budget links.** A project is a tag on ledger transactions, not a separate expense. Marking a project item as paid links it to one existing transaction (or creates exactly one through the normal expense flow).

## 3. Balance definitions

One definition each, used everywhere (dashboard, reports, alerts, affordability):

- **Ledger balance** = opening balance plus all posted lines on the account. Pending and planned items are excluded.
- **Reserved** = goal allocations held in that account (by default all access modes; a setting may exclude Flexible goals) plus unpaid approved commitments (Section 4).
- **Spendable balance** = ledger balance minus reserved. It may be negative, and if so the UI must say so in words.
- **Available balance** is shown only when it comes from a trusted source (a manual statement reconciliation). It is never guessed.

**Worked example (T-05).** Wallet ledger balance ₦200,000. Goal allocations: Emergency fund ₦30,000 and Christmas ₦20,000, so ₦50,000. Approved unpaid commitments: ₦40,000. Spendable = 200,000 − 50,000 − 40,000 = **₦110,000**. Pending salary of ₦80,000 is not counted anywhere until received.

## 4. One commitments concept (replaces budget\_commitments and project\_commitments)

A single `commitments` table holds every approved but unpaid obligation: workspace, source type (project item, bill, debt instalment, manual), source ID, amount, due date, status (approved, paid, cancelled, expired), optional ledger category, linked transaction ID once paid.

- Budgets, project summaries and the spendable balance all read from this table. None keeps its own copy.
- A commitment never changes a ledger balance. When it is paid, it links to the one resulting transaction and its status becomes paid.
- **Category rule for project spending.** The paid transaction carries a ledger category (required when marking an item paid) and a project tag. It counts once in total spending and once in its category budget. A budget may have the setting “exclude project-tagged spending”, off by default.

## 5. Privacy and visibility model

v1 ships personal workspaces only, but the schema must be ready for sharing:

- Accounts, debts, creditors, savings goals and income transactions carry `owner_user_id` and `visibility` (private or shared). Shared records are listed in a `record_shares` table (record, grantee, permission level).
- Workspace roles from v1.0 section 2 set the ceiling. Record shares can only grant access within it.
- Aggregates (dashboards, totals, budget usage) shown to a non-owner include only records that user can see. A shared budget’s totals must not reveal private spending by difference.
- All reads and writes go through one authorization layer. No module queries tables directly around it.
- Test T-21 must be run with at least three users and a private debt.

## 6. Edit, reverse and alert rules

- **Posted transactions are immutable.** An “edit” in the UI creates a reversal of the original and a replacement, linked in one revision group. The audit trail shows both. Users see a normal edit history.
- **Backdating** posts to the period of the effective date. Closed-period edits show a confirmation noting which reports will change.
- **Budget alert deduplication key** = budget ID + period + threshold + limit version. Each key fires at most once. If an edit drops usage below a threshold and it is crossed again, no new alert fires unless the limit changed. Refreshing, retrying or recalculating never fires an alert.
- **Overspend** is recorded and flagged, never blocked.

## 7. Money and rounding rules

- Store amounts as integer minor units (kobo for NGN) with a currency code. Never use binary floating point.
- Rounding mode: **half-up to the minor unit**, applied at each periodic interest calculation.
- Instalment schedules: every instalment except the last uses the calculated payment. The **last instalment absorbs the rounding residual** so the balance reaches exactly zero.
- Flat-rate interest is computed once on the original principal over the full term, then spread evenly. The last instalment absorbs any residual.
- Day-count: if the agreement does not say, the user chooses (default actual/365 for annual rates), and the result is labelled an estimate.
- Tests compare to the kobo for the stated convention. “Within rounding tolerance” in v1.0 means a difference of at most one kobo per instalment, and zero in total after the last-instalment adjustment.

## 8. Debt models with worked examples

Implement three term types in v1, plus “unknown terms”. Anything else is entered as unknown and shown as an estimate.

**D-1 Interest-free.** ₦100,000, four monthly instalments of ₦25,000. Total repayment ₦100,000. Interest ₦0.00 (T-13).

**D-2 Reducing balance.** ₦100,000 at 3% per month on the outstanding balance, four equal monthly payments. The equal payment is ₦26,902.71.

| Month | Opening | Interest | Principal | Payment | Closing |
| --- | --- | --- | --- | --- | --- |
| 1 | 100,000.00 | 3,000.00 | 23,902.71 | 26,902.71 | 76,097.29 |
| 2 | 76,097.29 | 2,282.92 | 24,619.79 | 26,902.71 | 51,477.50 |
| 3 | 51,477.50 | 1,544.33 | 25,358.38 | 26,902.71 | 26,119.12 |
| 4 | 26,119.12 | 783.57 | 26,119.12 | 26,902.69 | 0.00 |

Total paid ₦107,610.82, total interest ₦7,610.82. The final payment is ₦0.02 lower because it absorbs the residual (T-14).

**D-3 Flat rate.** ₦100,000 at 3% per month flat on the original principal for four months. Interest = 100,000 × 3% × 4 = ₦12,000. Total ₦112,000. Instalment ₦28,000. The same “3%” costs ₦12,000 here against ₦7,610.82 under D-2, so the app must show the total cost and not only the headline rate (T-14).

**D-4 Daily-rate digital loan (example for the unknown/custom path).** ₦50,000 at 0.5% per day simple interest for 30 days, with a 5% fee deducted upfront. Interest ₦7,500. Fee ₦2,500. Cash received ₦47,500. Repayment due ₦57,500. The app records the drawdown as in Section 2 and shows the true cost: ₦10,000 on ₦47,500 received.

**Payment split unknown.** If the user records a payment without a principal and interest split, store the total, mark the split unknown, and do not reduce principal by an invented amount (INV-10).

## 9. Affordability inputs (clarifies v1.0 section 10.5)

- **Essential flag.** Categories and subcategories carry `is_essential`. Defaults: staple foods, rent, utilities, essential healthcare, school fees, commuting transport, dependants’ essentials. Users can change flags.
- **Verified income** = the average of received (not expected) income over the last three complete months, configurable. Windfalls the user marks as one-off are excluded.
- **Monthly repayment capacity** = verified income − the higher of essential spending actually recorded and essential budget − recurring bills not already counted as essential − protected savings contributions − user safety buffer.
- **Shortfall rule.** If minimum payments exceed capacity, show the shortfall amount and state that the plan is not affordable. Never trim essentials to make it fit.
- The plan screen lists every input, its source and its date.

## 10. Quick-add parsing specification

1. **Deterministic first.** Extract the amount (₦3000, N3000, 3,000, 3k, 3.5k), the description, date words (today, yesterday, Monday) and account names the user has defined. Map categories from a keyword dictionary and from the user’s own corrected history.
2. **Nigerian phrasing.** Examples to support from day one: “Transport to Aba 3000”, “I buy fuel 5k”, “Bought airtime 2000”, “Paid light bill 20k”, “Sent Mum 15000”.
3. **Confidence per field.** Below the threshold, the field is left blank and asked about. An amount is never guessed.
4. **Ambiguity.** “Sent Mum 15000” could be family support (expense) or a transfer. The review card must ask.
5. **Drafts only.** The parser creates a draft. A person confirms it. Nothing is ever posted automatically.
6. **Optional LLM fallback (Later).** Off by default and enabled by the user. It receives only the entry text. It never sees balances, account names or other records. Cost and privacy must be disclosed. The deterministic path must keep working without it.

## 11. Offline and sync (design from Phase 1)

- Every client-created record gets a client-generated UUID that doubles as the idempotency key.
- v1 offline scope is draft creation only. Posted records cannot be edited offline.
- Sync returns, per record: accepted, duplicate (already applied, no change) or conflict. Conflicts go to a review screen. Nothing is silently overwritten.
- The sync API must be idempotent for repeated and out-of-order delivery (T-20).

## 12. Multi-currency stance for v1

Store amount plus currency code on every posting line from day one, and keep an `exchange_rates` table (currency pair, rate, source, timestamp) in the schema. The v1 UI supports NGN only. Reports never sum different currencies (T-19). When cross-currency transfers arrive, a transfer stores both amounts, the rate used and any fee.

## 13. Schema additions

Add to v1.0 section 14:

| Table | Purpose |
| --- | --- |
| posting\_lines | transaction, ledger node, signed amount (minor units), currency |
| commitments | Unified approved-unpaid obligations (Section 4) |
| record\_shares | Per-record sharing grants (Section 5) |
| goal\_allocations | Virtual earmarks of account balances for goals |
| exchange\_rates | Pair, rate, source, timestamp |
| statement\_reconciliations | Account, statement date and balance, matched lines, status |
| notification\_preferences | User, module, channel, quiet hours, snooze |
| recurring\_income | Expected income schedule (never affects balances until received) |
| payees | Named counterparties with a remembered default category |
| assets and asset\_valuations | Needed only if the net-worth report is built (Later) |

Also add: `is_essential` on categories; `owner_user_id` and `visibility` on the records in Section 5; `revision_group_id` on transactions; soft-delete and retention fields where the retention policy requires them.

## 14. Corrected rule and test IDs (replace v1.0 lists)

### Accounting invariants

| ID | Rule |
| --- | --- |
| INV-01 | Every posted transaction has a unique ID, workspace, type, amount, currency, effective date, creation timestamp and status. |
| INV-02 | Transfers between own accounts are never income or spending. |
| INV-03 | Savings contributions are not consumption expenses. |
| INV-04 | Debt principal is not an ordinary expense. Interest and fees are separate finance costs. |
| INV-05 | Planned and committed costs are not paid expenses until payment is confirmed. |
| INV-06 | A project payment references the underlying transaction and never creates a second expense. |
| INV-07 | Editing or reversing a transaction recalculates all linked balances and keeps an audit trail. |
| INV-08 | Backdated entries affect the period of the effective date. |
| INV-09 | Amounts are integer minor units or fixed decimals. Unlike currencies are never added without an explicit rate and timestamp. |
| INV-10 | Multi-record operations are atomic and idempotent. Retries cannot duplicate movements. Unknown payment splits are never invented. |
| INV-11 | Ledger, reserved and spendable balances are distinguished as in Section 3. |
| INV-12 | Planned income and pending bills never change actual balances. |
| INV-13 | Every transaction balances to zero per currency (Section 2). |

### Acceptance tests

| ID | Test |
| --- | --- |
| T-01 | “Transport to Aba 3000” creates one draft. On confirmation, wallet, category, weekly and monthly budgets and reports each update exactly once. |
| T-02 | Editing ₦3,000 to ₦4,000 recalculates all linked figures and records the revision in the audit trail. |
| T-03 | A backdated expense affects the correct prior period. |
| T-04 | Crossing 75% fires one alert. Refresh or retry does not repeat it. |
| T-05 | Spendable balance matches the worked example in Section 3. |
| T-06 | Exceeding a budget saves the expense and shows the overspend. Entry is not blocked. |
| T-07 | A ₦20,000 own-account transfer changes both balances and leaves income and expense totals unchanged. |
| T-08 | A ₦10,000 contribution updates the goal and leaves ordinary spending unchanged. |
| T-09 | A ₦5,000 withdrawal updates the goal and account, keeps the reason, and recalculates the target forecast. |
| T-10 | Protected withdrawals need confirmation and a reason. Locked goals reject ordinary withdrawal until deliberately unlocked. |
| T-11 | An allocation preview respects priority, caps, minimum balance and insufficient-funds rules. Retry does not duplicate. |
| T-12 | A ₦100,000 project commitment lowers available project allocation and leaves cash and actual expense unchanged. |
| T-13 | An interest-free ₦100,000 debt (D-1) accrues no interest. |
| T-14 | D-2 and D-3 match the tables in Section 8 to the kobo. |
| T-15 | Several debts with different rates and dates produce explainable urgency and priority. |
| T-16 | If minimums exceed capacity, the shortfall is shown and the plan is not called affordable. |
| T-17 | A debt payment reduces the liability only by principal. Interest and fees post as finance costs. |
| T-18 | Avalanche, snowball and smart priority use identical assumptions and show estimated interest and payoff. |
| T-19 | Reports never sum NGN and USD without explicit conversion. |
| T-20 | Duplicate submission and network retry create no duplicate movements, including offline sync. |
| T-21 | A household member cannot see another member’s private debts or accounts, including through aggregates. |
| T-22 | Export preserves IDs, dates, amounts and currency. Backup restore reproduces balances and links. |
| T-23 | A transaction whose lines do not sum to zero is rejected by the database. |

## 15. Non-functional targets (proposed, to be confirmed)

- Common list and dashboard reads under 500 ms at the 95th percentile for a workspace with 50,000 transactions.
- Dashboard usable on a slow mobile connection, with the app shell loading from cache.
- Daily backups. Target recovery point of 24 hours or better. Restore drill at least quarterly, with balances verified against the ledger afterwards.
- No financial values in logs, URLs or analytics events.
- Compliance review of the Nigeria Data Protection Act 2023 obligations by qualified counsel before production.

## 16. Product success measures (proposed)

- Activation: a new user posts their first confirmed transaction within 24 hours.
- Habit: a user logs at least three transactions in a week, in at least three of their first six weeks.
- Trust: reported “balance looks wrong” issues per 1,000 active users, which should trend towards zero.

## 17. Christmas workbook reference (replaces the reference in v1.0 section 9)

The workbook is not available to the builder. Implement the project template with these sections only, using no sample values: master budget, confirmed funds, protected reserve, gifts, food, shopping, monthly savings schedule, summary.

## 18. Milestone instructions for the AI builder

| Milestone | Scope | Done when |
| --- | --- | --- |
| M0 | Chosen stack, architecture, schema from Sections 2, 5 and 13, screen map, assumptions | Plan approved |
| M1 | Auth, workspace, accounts, categories, posting-line ledger, reversal and edit, idempotency, audit | INV-01 to INV-13, T-02, T-03, T-07, T-20, T-23 pass |
| M2 | Income, expense, quick add, review card, search, basic dashboard | T-01, T-06 pass |
| M3 | Budgets, thresholds, alerts, basic reports | T-04, T-05 pass |
| M4 | Savings goals, contributions, withdrawals, access modes | T-08, T-09, T-10 pass |
| M5 | Debt register, three term types, repayment split, urgency | T-13, T-14, T-17 pass |
| M6 | Strategies, affordability, calendar | T-15, T-16, T-18 pass |
| M7 | Projects, commitments, bills | T-12 and project double-count tests pass |
| M8 | Hardening: security, accessibility, offline, export and restore, performance | T-21, T-22 and the Section 15 targets pass |

After each milestone the builder reports passed and failed tests, lists limitations, and waits for review before any high-impact architectural change.
