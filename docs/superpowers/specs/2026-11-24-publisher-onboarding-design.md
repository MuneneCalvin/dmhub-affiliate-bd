# Publisher onboarding: company or individual, and promotional channels (BND, priority 4) — design

## Intent
Client points 3.1–3.3: company name, CoC number and industry are not relevant for every publisher (individual creators, social accounts), and the most important thing to know about a publisher is **where they will promote**, possibly across several channels, each with a URL or account name. Today registration demands company, industry and CoC from everyone and collects one website only.

## Goals
- A publisher registers as **Company** or **Individual**. Individuals are not asked for company name, CoC number or industry.
- Every publisher picks **one or more channels** from: website or blog, comparison website, Facebook, Instagram, TikTok, YouTube, newsletter, cashback or loyalty platform, paid media, other — each with a URL or account name.
- Approvers see the publisher's type and channels on the partner pool detail page and the partner card, so they can judge fit.
- Advertiser sign-up is unchanged (always a company).
- Existing publishers keep working: they become type `company`; their website, if any, becomes a `website` channel.

## Non-goals
- Payout, tax or address details for individuals (asked later, at payout setup; separate work).
- Editing channels after sign-up (a follow-up; approvers can read them now, and edit stays on the existing partner edit screens).
- Changing campaign traffic rules. The existing `publishers.traffic_sources` list and the offers' allowed traffic sources are a different concept and are left alone.
- Verifying that a channel really belongs to the publisher.

## Anti-goals
- Forcing an individual to invent a company name, CoC number or industry.
- A publisher registering with no channel at all.
- Breaking tracking, applications or payouts for existing publishers.

## Constraints
- `publishers.website_url` is already nullable (an earlier repair migration); individuals with no website store `NULL`, as publishers registered without a website already do.
- `coc_number` stays unique where present; individuals store `NULL` (several allowed).
- Names shown in lists already fall back from business name to the contact's name; individuals rely on that.
- Dutch and English text for every label.

## Approaches
1. **New `publisher_channels` table plus `publisher_type` (chosen).** Queryable, validates per row, room to grow (verification, stats per channel).
2. A JSON column on `publishers`: simpler, but cannot be validated per row or queried, and would be mixed up with `traffic_sources`.
3. Reuse `traffic_sources`: wrong concept (campaign traffic restrictions), rejected.

## Design
- **Data:** `publishers.publisher_type` (`company` default | `individual`); table `publisher_channels` (`id`, `publisher_id` cascade, `type`, `handle` ≤255, timestamps, unique `(publisher_id, type)`). Channel types live in `config/publisher.php` (`channel_types`). A migration backfills existing publishers: a `website` channel from `website_url` when present.
- **Registration rules (publishers):** `publisher_type` required (`company`|`individual`); `channels` array of 1–10 entries `{type, handle}` with unique, known types; `handle` required, ≤255; `website` and `comparison_site` must be a valid http(s) URL; the others accept a URL or an account name (a value containing `://` or starting with `www.` must be a valid URL). Company: `business_name`, `industry`, `coc_number` required as today. Individual: those three are ignored and stored `NULL`. `publishers.website_url` is set from the website channel when there is one.
- **Advertisers:** rules unchanged.
- **Form (`register.tsx`, publisher step 2):** "I register as" Company / Individual (Company preselected); company fields shown only for Company; "Where will you promote?" list of channel checkboxes, each revealing a URL or account-name input; at least one required; inline errors per channel.
- **Approver views:** pool publisher detail shows "Registered as" and a Channels list (type label, handle, link when it is a URL); the publishers list/partner card shows the same. Channel labels and the type labels are translated.
- **Tests first:** Pest (validation matrix per type and channel, individual stores nulls, company unchanged, website_url from website channel, unique types, migration backfill, pool detail exposes channels, advertiser registration unchanged), Vitest (form behaviour: type toggles company fields, channel inputs appear and validate, at least one channel), Playwright (individual registers with two channels; approver sees them; existing company flow still works with one channel).

## Risks
- Existing e2e and lifecycle specs register publishers with company fields only; they must now add a channel (updated in the same change).
- The client may want more or other channel types; the list is one config array.

## Left to the builder
- Exact form layout and copy; whether channel inputs use `type=url`; label wording in Dutch.
