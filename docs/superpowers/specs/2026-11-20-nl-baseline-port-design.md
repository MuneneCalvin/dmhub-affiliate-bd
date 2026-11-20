# Port NL platform into Brand New Day (step 1) — short design

## Intent
`dmhub-affiliates-nl` (NL, `main`, 517 commits, latest 2026-11-17) is the new platform: redesign, fraud engine, financial ledger, conversion-event pipeline, customer promotions, analytics, R2 media, Playwright lifecycle gate. `dmhub-affiliate-bd` (BND, 3 commits) is the older base for a different client. Goal: BND runs on NL's code, as a **separate app** that can evolve independently.

## Goals
- BND repo contains everything from NL `main`.
- BND keeps its own deployment identity: `.env*` examples, `compose.dokploy.yaml`, domain `affiliates-bnd.dmhub.cloud`.
- Old BND state recoverable.

## Non-goals (this step)
- Brand New Day branding/theme, Dutch CoC-number rules, leads module: **later steps**, each small and separate.
- Fixing issues from the earlier BND review (NL's ledger/event pipeline is expected to supersede them).
- Any change to the NL repo.

## Anti-goals
- A merge of unrelated histories with mass conflicts.
- Leaking NL-specific config (domains, secrets, client names) into BND.
- Silently losing BND-only behaviour before the later steps re-add it.

## Constraints
- No live BND data: database is rebuilt from NL migrations; no data migration. NL's irreversible `remove_lead_storage` migration is acceptable now; the leads table is re-added in the leads step as a BND-only module on NL's event pipeline (leads never create earnings directly; every lead creates a `submission` event).
- Work on a new branch from `calvin-dev`; nothing pushed without approval.

## Approaches
1. **Downstream fork via tree copy (chosen).** Replace BND tree with NL `main` in one commit; NL kept as an `upstream` remote for optional later pulls.
2. Merge unrelated histories: near-total conflicts, no benefit.
3. One codebase, BND as configured tenant of NL: rejected — pushes BND-only code (CoC, PII leads) into the shared product; clients should stay separate.

## Design
1. Create `backup/bnd-pre-nl` at current `calvin-dev` HEAD.
2. New branch `feat/nl-baseline` from `calvin-dev`.
3. Export NL `main` (`git archive`) into the working tree, removing BND files NL does not have; preserve BND deployment files listed above (re-apply BND domain values on top of NL's).
4. Add NL as remote `upstream` (fetch only).
5. Verify: `composer install`, `npm ci`, `npm run types`, `npm run build`, Pest suite on Postgres, then `npm run test:lifecycle` if prerequisites exist. Report results as-is.
6. One commit: "Import NL platform as BND baseline".

## Left to the builder
- Exact preserve/overwrite decisions per deployment file; CI workflow branch names.
- Whether `test:lifecycle` can run locally (needs Playwright + Postgres).
