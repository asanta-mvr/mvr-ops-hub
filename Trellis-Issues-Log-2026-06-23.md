# Trellis Platform — Issues & Operational Impact Log

**Prepared for:** MVR ⇄ Trellis review meeting
**Date prepared:** 2026-06-23
**Source:** Slack channel `#miamivr-x-trellis` (full history, 2026-05-07 → 2026-06-23)
**Reported primarily by:** Felipe Sarmiento (CX) and Andrés Santa (MVR)
**All times:** Miami local (EST). "Time to resolve" = first report → MVR-confirmed working (or last status if still open).

> **Note on tone:** Trellis has been responsive and fast on individual tickets (often same-day, several within 1–3 hours). The purpose of this log is **not** to dispute their effort — it is to make visible the *cumulative operational drag* these bugs created on a live CX operation handling real guest calls and messages during the Conduit → Trellis cutover.

---

## 1. Executive Summary

- **~25 distinct issues** logged in ~5 weeks, concentrated in the 2 weeks **after go-live / Conduit cutover (June 8 onward)**.
- **Most painful theme by far: the phone system.** Calls dropping on answer, no ringtone, calls not connecting — this recurred across **June 8, 9, 10, 12, 13, 18, and 22** (still open for the Sales line). Phone is mission-critical: guests could not reach us and we could not tell when they were calling.
- **Second theme: Guesty ⇄ Trellis sync reliability** — messages arriving late or missing, messages showing "sent" in Trellis but never delivered, truncated messages, missing reservation numbers, missing communication channels.
- **One full outage:** on **June 20** Trellis froze for the **entire team** (no calls, no messages) for roughly an hour, with message-sync disparity lingering most of the day.
- **Severity per Trellis' own tickets:** at least **4 issues classified P0** (highest), the majority **P1**.
- **Recurring / regression pattern:** several issues were reported fixed and then reappeared — notably the phone, reservation numbers, truncated messages, and user permissions.

### Issues still OPEN as of this meeting
| Ticket | Issue | First reported |
|---|---|---|
| PROD-6938 | Sales phone line — no inbound or outbound calls | 2026-06-22 |
| PROD-6937 | Inquiries show "Unknown" / guest last names not syncing | 2026-06-22 |
| PROD-6906 | Skills (e.g. Maintenance Triage Handler) still not auto-resolving; over-escalating | 2026-06-22 |
| PROD-6338 | Airbnb messages can't be sent — no channel available to select | 2026-06-19 (resolution unconfirmed) |

---

## 2. Master Issue Table

| # | Date (first report) | Issue | Trellis Ticket | Severity | Operational impact | Time to resolve |
|---|---|---|---|---|---|---|
| 1 | 06-05 | Messages show "sent" in Trellis but never send in Guesty | PROD-4870 | P1 | Guests not receiving our replies; staff unaware | ~2h 10m |
| 2 | 06-05 | Team member sees only schedule tab (no inbox access) | — | — | Agent can't work guest chats | same day |
| 3 | 06-06 | Email communication via Guesty broken | — | — | Email channel unreliable | same day |
| 4 | 06-06 | AI drafts good but not auto-sent (timing) | — | — | Autopilot silently not replying | iterated |
| 5 | 06-07 | Bookings from Expedia / Rentals United → Guesty fail across channels | PROD-4973 | P1 | Can't message OTA guests | ~2h 30m |
| 6 | 06-07 | Reservation sidebar slow (1–2 min to load guest name/details) | PROD-4980 | P2 | Agents wait on every chat | improved same day |
| 7 | 06-08 | Multiple inbound calls from a number don't go through | — | — | Missed guest calls | same day |
| 8 | 06-08 | Some guests not showing up in Trellis | — | — | Lost visibility of conversations | same day |
| 9 | 06-08 | Message delays (~2 min); some messages never arrive | — | — | Slow/incomplete guest comms | ongoing |
| 10 | 06-08 | Agent **Luis Mora** lost permissions (again) | PROD-5063 | **P0** | Agent locked out mid-shift | ~30m (recurred) |
| 11 | 06-09 | **Calls don't ring / drop after a few seconds on answer**; AI not answering all messages | PROD-5153 | P1→**P0** | Guests can't reach CX; "all guests complaining" | ~1.5 days, multiple fixes |
| 12 | 06-09 | Luis Mora permissions lost again (dept-vs-role scoping) | (PROD-5063) | P0 | Agent locked out | fix ~15m, confirmed next AM |
| 13 | 06-09 | Outbound SMS fails — sending number not approved (err 30034) | PROD-5240 | P1 | Can't text guests | tied to A2P (below) |
| 14 | 06-09 | Early CI / Late CO skill not guiding guest, escalating instead | — | — | Manual handling of routine requests | iterated |
| 15 | 06-09 | Messages cut in half in Trellis (full text only in Guesty) | — | — | Agents must open Guesty to read | precursor to #19 |
| 16 | 06-10 | Calls drop immediately on answer / no audio on line | (PROD-5153) | P0 | Cannot complete guest calls | stabilized eve. 06-10 |
| 17 | 06-12 | AI / draft generation takes 2–3 minutes | PROD-5791 | P1 | Slow agent response time | clarified (by-design) |
| 18 | 06-12 | **No ringtone sound** unless Trellis tab is focused | PROD-5828 | P1 | Missed calls while multitasking | ~21h 50m |
| 19 | 06-15 | Inbox messages truncated in Trellis | PROD-5974 | P1 | Can't read full guest messages | ~2h 53m (false fixes) |
| 20 | 06-15 | Bookings don't show reservation #; OTA bookings mislabeled "Direct" | PROD-5984 | P2 | Can't identify reservations | partial; recurring |
| 21 | 06-15 | Email notifications show raw HTML entities | PROD-5985 | P1 | Unreadable email content | ~1h 38m |
| 22 | 06-17 | Agent trigger from Slack fails (permissions) | PROD-6130 | P1 | Lost & Found / Slack workflows blocked | ~6h 50m |
| 23 | 06-18 | **CX team error answering calls; calls ring but drop**; "Application error goodbye" on outbound | PROD-6206 | P1→**P0** | Phone effectively down for hours | ~10h 24m |
| 24 | 06-18 | Major Guesty↔Trellis inbox delay (30+ min) / missing messages | PROD-6214 | P1 | Late/missed guest messages | ~9h 25m |
| 25 | 06-18 | Sandbox error when testing LCO/ECI handler | — | — | Can't safely test agent changes | same day |
| 26 | 06-19 | Airbnb message can't be sent — no channel available | PROD-6338 | P1 | Can't reply to Airbnb guests | unconfirmed |
| 27 | 06-20 | **FULL FREEZE — entire team, no calls/messages, trapped in inbox** | PROD-6776 | **P0** | Total work stoppage ~1h; sync disparity all day | core fix ~55m; data align ~10h |
| 28 | 06-22 | "Done"/"Pending" leaves chat in Open or switches agent's whole view | PROD-6905 | P1 | Inbox unusable for triage | ~8h 21m |
| 29 | 06-22 | Skills (Maintenance Triage Handler) over-escalating instead of resolving | PROD-6906 | P2 | Manual handling of routine tickets | **OPEN** |
| 30 | 06-22 | Inquiries show "Unknown"; guest last names not syncing | PROD-6937 | P2 | No context on who's inquiring | **OPEN** (root-caused) |
| 31 | 06-22 | **Sales phone — no inbound or outbound calls** | PROD-6938 | P1 | Sales line down; can't split CX vs Sales | **OPEN** |
| — | 05-31→06-18 | SMS / A2P 10DLC campaign repeatedly rejected | (PROD-5240) | — | No business texting for weeks | resubmission pending |

---

## 3. Detailed Breakdown by Theme

### 🔴 THEME 1 — Phone System (highest operational impact)

The phone is the single most disruptive area. It broke, was fixed, and regressed repeatedly over a two-week span. Because guests call to reach CX, every phone failure is a direct guest-facing outage.

- **06-08:** Multiple calls from a guest number don't go through.
- **06-09 (07:46):** Calls don't ring, and drop a few seconds after answering. AI also not responding to all messages. → **PROD-5153**, raised to **P0**. Andrés: *"all the guests are complaining about."* Felipe: a guest *"called us all afternoon and we did not see any calls."* Trellis announced incoming calls fixed at 22:46.
- **06-10 (08:27–09:44):** Still dropping on answer / no audio. *"We're starting to get worried... fix this ASAP."* Multiple fixes pushed through the day (double-ring, ring duration). First clean call confirmed ~17:47; further stability fixes that night.
- **06-12 (14:59):** No ringtone sound unless the Trellis tab is focused. → **PROD-5828 (P1)**. CX switches tabs constantly, so calls were silently missed. **Resolved 06-13 ~12:48 (~22h).**
- **06-18 (08:55):** CX team gets an error answering calls; calls ring but drop on answer; outbound plays *"Application error goodbye."* → **PROD-6206**, escalated to **P0**. Down and up repeatedly through the day. **Resolved ~19:19 (~10.5h).**
- **06-22 (14:21):** Sales phone line works for neither inbound nor outbound. → **PROD-6938 (P1). STILL OPEN.** Blocks the CX-vs-Sales call separation we need.

**Pattern:** at least 5 separate phone incidents across 8 days, with regressions. This is the headline item.

---

### 🔴 THEME 2 — Guesty ⇄ Trellis Sync & Inbox Reliability

The inbox is the core daily tool. Sync gaps mean agents miss or misread guest messages.

- **06-05:** Messages show "sent" in Trellis but never send in Guesty (**PROD-4870, P1**) — guests didn't get our replies. Fixed ~2h.
- **06-08:** ~2-min message delays; some messages never arrive. Some guests don't appear in Trellis at all.
- **06-09 / 06-15:** Messages truncated in Trellis — agents had to open Guesty to read the full text (**PROD-5974, P1**). Took several "fixed/still broken" cycles before resolved.
- **06-18:** Major delay (30+ min) / missing messages between Guesty and Trellis (**PROD-6214, P1**). An isolated 32-min latency case found and merged.
- **06-20:** Full freeze (see Theme 5).

---

### 🔴 THEME 3 — Reservation Data & Channel Identity

- **06-11 → 06-16:** Reservation number not syncing to bookings, recurring (**PROD-5984, P2**). Reported "mostly solved" then reappeared on new bookings.
- Root issue surfaced: **OTA bookings (Airbnb, Expedia/Rentals United) are displayed as "Direct"** in Trellis, and some carry the wrong reservation ID. This undermines trust in the booking data shown to agents.
- **06-07:** Expedia / Rentals United → Guesty messages failing across channels (**PROD-4973, P1**), plus reservation sidebar taking 1–2 min to load (**PROD-4980, P2**).
- **06-11 / 06-12 / 06-19:** "Communication channel missing" — no channel available to reply on (Airbnb), forcing wrong-channel replies. A guest was confused we answered Airbnb messages via SMS. **PROD-6338 (06-19)** resolution unconfirmed.
- **06-22:** Inquiries show "Unknown" with no subject; current guests show first name only, no last name (**PROD-6937, P2**). Root cause: Airbnb sent the last name in a later update that Trellis didn't sync. **OPEN.**

---

### 🟠 THEME 4 — AI Agent / Skills Not Performing

- **06-05 / 06-06:** Autopilot "thought of" a response but didn't send it; AI drafts good but not delivered.
- **06-09 / 06-16:** Early Check-in / Late Check-out skills not guiding guests — escalating routine requests to humans instead.
- **06-11 root cause:** skills migrated from Conduit carried **internal reference codes instead of readable names**, so the agent couldn't recognize when to use them. Trellis renamed/reorganized all skills — this fixed several skill-activation issues.
- **06-12:** AI/draft generation takes 2–3 minutes (**PROD-5791, P1**). Trellis clarified the "G" full-generation is slower by design (multi-tool + guardrails); "Cmd+G" produces a faster draft. We also requested inline "Write with AI" editing (**PROD-5792**, feature request).
- **06-22:** Maintenance Triage Handler still over-escalating instead of resolving repeat maintenance chats (**PROD-6906, P2**). **OPEN** — in progress as of 06-23.

---

### 🔴 THEME 5 — Full Platform Freeze (June 20)

- **06-20 08:30:** Felipe: *"Trellis is completely froze to all the team, no calls no messages. I am trapped inside the inbox view and cannot exit."* Already tried clearing cookies/refresh. → **PROD-6776, P0.**
- Root cause: client-side error. **Core fix deployed ~09:25 (~55 min).**
- Aftermath: large disparity between Trellis and Guesty chats; message backfill/alignment took until **~18:49** the same day. Roughly **a full business day of degraded inbox** even after the freeze itself was cleared.

---

### 🟠 THEME 6 — User Permissions (recurring)

- **06-05:** New team member can only see schedule/shift tab despite message permissions.
- **06-08:** Agent **Luis Mora** loses permissions (**PROD-5063, P0**) — fixed in ~30 min, then broke again same session.
- **06-09:** Luis Mora loses access again; root cause was **department-vs-role scoping** (restricting cleaners stripped his inbox access). Confirmed restored next morning. Additional logging added to prevent regressions.
- **06-10:** Skills can only be assigned to "Property Manager," not the CX agent role.

---

### 🟠 THEME 7 — Inbox Status / Workflow UX

- **06-05:** "Done" button lag — 30–60s delay, sometimes needs 2–3 presses.
- **06-16:** Many inquiries showing Open that were marked Done days earlier.
- **06-22:** Pressing "Done"/"Pending" leaves the chat in Open, or yanks the agent into the Done view instead of just filing the chat (**PROD-6905, P1**). Resolved ~8h later. This directly breaks the agent triage workflow.

---

### 🟠 THEME 8 — Email Rendering

- **06-15:** Email notification text shows raw, unescaped HTML entities on **every** email received through Trellis (**PROD-5985, P1**). Fixed in ~1h 40m.

---

### 🟡 THEME 9 — SMS / A2P 10DLC Activation (multi-week blocker)

- From **05-31** onward, business texting was blocked pending A2P 10DLC carrier registration.
- The carrier campaign was **rejected multiple times** (errors 30034, 30909 / MESSAGE_FLOW). Blockers included a **privacy-policy page returning 404** and the **public contact form missing the required SMS consent language / phone field**.
- MVR fixed the privacy policy and contact page by **06-18**; resubmission was pending. Net effect: **weeks without reliable business SMS** during the transition. (Much of this is carrier-compliance work, but it kept a core channel offline.)

---

### 🟡 THEME 10 — Other

- **06-18:** Sandbox error blocked safe testing of LCO/ECI handler changes.
- **06-07:** Reservation sidebar slowness (PROD-4980).

---

## 4. Suggested Talking Points for the Meeting

1. **Phone reliability is the #1 priority.** It has broken and regressed 5+ times in two weeks and is *still* down for the Sales line (PROD-6938). We need a stability plan + monitoring, not just per-incident fixes.
2. **Regressions.** Multiple issues were marked fixed and came back (phone, reservation #, truncated messages, permissions). Ask about regression testing / release verification before "fixed" is communicated.
3. **Guesty sync as a system.** Late/missing messages, "sent-but-not-sent," missing channels, missing reservation #s, OTA bookings labeled "Direct" — these point to sync robustness, not isolated bugs.
4. **Open items to close first:** PROD-6938 (Sales phone), PROD-6937 (Unknown/names), PROD-6906 (skills escalating), PROD-6338 (Airbnb channel).
5. **Quantify the guest impact** with concrete examples we already have (guest who called all afternoon unseen; guest confused by SMS reply to Airbnb; June 20 full freeze).

---

*Generated from the `#miamivr-x-trellis` Slack history. Ticket IDs and P0/P1/P2 severities are Trellis' own classifications as posted by their ticket bot. Resolution times are best-effort from the thread record; where a fix was never explicitly confirmed by MVR, it is marked open/unconfirmed.*
