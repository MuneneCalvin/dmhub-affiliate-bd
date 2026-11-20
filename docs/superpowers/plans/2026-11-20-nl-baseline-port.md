# NL Baseline Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BND repo contains the full NL `main` platform, with BND deployment identity, as a separate app.

**Architecture:** Tree copy (not merge) of NL `main` into a new branch off `calvin-dev`, then substitute BND identifiers in the deployment files that NL ships. NL stays a fetch-only `upstream` remote.

**Tech Stack:** Laravel 12, Inertia/React 19, Tailwind 4, PostgreSQL, Pest, Playwright, Dokploy/GHCR.

**Spec:** `docs/superpowers/specs/2026-11-20-nl-baseline-port-design.md`

## Global Constraints

- NL source: `/Users/admin/Desktop/Work/DM Hub/dmhub-affiliates-nl`, ref `main` (read via git, never touch its working tree; it is checked out on `calvin-dev`).
- BND identity: `APP_NAME="Brand New Day"`, `APP_URL=https://affiliates-bnd.dmhub.cloud`, `IMAGE_REPO=ghcr.io/munenecalvin/dmhub-affiliate-bd`.
- No push, no change to the NL repo. Backup branch `backup/bnd-pre-nl` before any change.
- No BND data migration; database rebuilt from NL migrations.
- BND layer (branding, CoC, leads) is out of scope.
- Refinement of the spec: NL's deployment files (compose, workflows, Dockerfile, `docker/`, `.env*`) are newer than BND's and required by NL's features (fraud queue, scheduler, SHA-pinned deploys), so they are taken from NL and BND identifiers substituted, rather than keeping BND's old files.

## Review Focus

- Stale NL identifiers left in BND files (`dmhub-affiliate-nl`, `affiliates-nl.dmhub.cloud`, `DM Hub` as `APP_NAME`): grep must find none.
- BND-only files silently kept that conflict with NL (old `POSTBACK_SECRET`, `VerifyPostbackSecret`, BND leads code): none may remain after the copy.
- Missing `.env`/secrets or Postgres makes the verification step fail: report as environment failure, not code failure.
- NL gate scripts expect loopback Postgres: do not point at a remote DB.
- Stale untracked or ignored files (`vendor/`, `node_modules/`, `.env`) must survive the tree replacement.

---

### Task 1: Backup and branch

**Files:** none (git only)

**Interfaces:** Produces: branch `backup/bnd-pre-nl` at `calvin-dev` HEAD; checked-out branch `feat/nl-baseline`.

- [ ] **Step 1: Confirm clean tree.** Run `git status --porcelain` in the BND repo. Expected: only the two untracked `docs/superpowers/...` files (commit them first on `calvin-dev` only if the user agrees; otherwise carry them to the new branch).
- [ ] **Step 2: Create backup and branch.** `git branch backup/bnd-pre-nl calvin-dev && git switch -c feat/nl-baseline`.
- [ ] **Step 3: Verify.** `git branch --list 'backup/bnd-pre-nl' 'feat/nl-baseline'` shows both; `git rev-parse backup/bnd-pre-nl` equals `git rev-parse calvin-dev`.

### Task 2: Import NL tree

**Files:** whole repo tree.

**Interfaces:** Consumes: Task 1 branch. Produces: working tree identical to NL `main` except the carried `docs/superpowers/` files and ignored local files.

- [ ] **Step 1: Add upstream.** `git remote add upstream "/Users/admin/Desktop/Work/DM Hub/dmhub-affiliates-nl" && git fetch upstream main` (fetch from the local path; push URL set to `DISABLED` via `git remote set-url --push upstream DISABLED`).
- [ ] **Step 2: Replace tracked files.** `git rm -rq --ignore-unmatch . -- ':!docs/superpowers'` then `git archive upstream/main | tar -x -C .`. This removes BND-only tracked files (old leads code, `VerifyPostbackSecret`, etc.) and writes NL's tree. Ignored files (`vendor/`, `node_modules/`, `.env`) are untouched.
- [ ] **Step 3: Verify tree equality.** `git add -A && git diff --cached --stat upstream/main -- . ':!docs/superpowers'` shows no differences yet (identity substitution is Task 3).

### Task 3: BND identity in NL deployment files

**Files:** Modify `.env.example`, `.env.production.example`, `compose.dokploy.yaml`, `.github/workflows/*.yml`, `DEPLOYMENT.md`, `README.md`, `docker-compose.yml`, `composer.json`/`package.json` `name` fields if they carry NL names.

**Interfaces:** Consumes: Task 2 tree. Produces: no NL identifiers in deployment/config files.

- [ ] **Step 1: Find NL identifiers.** `git grep -n -i -E "dmhub-affiliate-nl|affiliates-nl|dmhub-dev/|APP_NAME=\"?DM Hub"` and list hits.
- [ ] **Step 2: Substitute** per Global Constraints: `IMAGE_REPO` to `ghcr.io/munenecalvin/dmhub-affiliate-bd`, `APP_URL` to `https://affiliates-bnd.dmhub.cloud`, `APP_NAME` to `"Brand New Day"`, GHCR/org references to the BND repo. Do not change product copy in `resources/` (branding is a later step).
- [ ] **Step 3: Verify.** Re-run Step 1 grep: no hits in config/deploy files (remaining hits only in `docs/` historical text are acceptable and listed in the report).

### Task 4: Verify the build

**Files:** none (read-only verification).

**Interfaces:** Consumes: Tasks 2-3 tree.

- [ ] **Step 1: Install.** `composer install` and `npm ci`. Expected: exit 0.
- [ ] **Step 2: Static checks.** `npm run types` and `npm run build`. Expected: exit 0.
- [ ] **Step 3: Backend tests.** With local Postgres and `.env` pointed at it (loopback only): `php artisan migrate:fresh --seed --force` then `php artisan test`. Expected: all pass.
- [ ] **Step 4: Lifecycle gate (if prerequisites exist).** `npm run test:lifecycle` per `README.md`. Expected exit 0. If Playwright/Postgres are missing, record as not run, with the reason.
- [ ] **Step 5: Report** each command's real result, including failures.

### Task 5: Commit

- [ ] **Step 1:** `git add -A && git commit -m "Import NL platform as BND baseline"` with message body listing: source `upstream/main` SHA, deployment identifiers substituted, verification results.
- [ ] **Step 2:** `git log --oneline -2` and `git status --short` (clean). Do not push.
