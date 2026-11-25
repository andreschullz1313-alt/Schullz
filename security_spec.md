# Security Specification — Schullz Ink Tattoo

## 1. Data Invariants
1. Only the verified administrator (`request.auth.token.email == 'andreschullz1313@gmail.com'` with `email_verified == true`, or an explicit `/admins/{uid}` record) may create or update `/app_config/studio`.
2. `/app_config` documents can ONLY exist at the canonical ID `studio`; arbitrary document IDs or collection-wide public `list` queries are denied.
3. Every write to `/app_config/studio` must match the exact 17 keys declared in `firebase-blueprint.json` (no ghost/shadow fields).
4. `updatedByUid` must equal `request.auth.uid`, `updatedAt` must equal `request.time`, and `configVersion` cannot decrease on update.
5. All hex colors (`primaryColor`, `accentGoldColor`, `bgDarkColor`), `whatsapp`, `instagram`, `publicCoupon`, `logoDataUrl`, `promoBannerDataUrl`, `promoBannerTitle`, `promoBannerMonth`, and price arrays are strictly bounded by length, type, and regex to prevent XSS payloads or Denial-of-Wallet document bloat.
6. `/admins/{uid}` cannot be created, updated, listed, or deleted from client SDKs (prevents self-assigned admin escalation).
7. `/schedule_slots/{slotId}` contains zero PII and atomically prevents double-bookings; only verified admins may update or delete slot locks or create `'blocked'` slots.
8. `/appointments/{appointmentId}` contains client PII (`clientName`, `clientWhatsapp`) and is readable, listable, updatable, and deletable strictly by verified admins; client creation requires `status == 'pending'` and atomic `existsAfter`/`getAfter` slot lock pairing.

## 2. "Dirty Dozen" Attack Payloads (Must All Return PERMISSION_DENIED)
1. Unauthenticated write to `/app_config/studio`.
2. Signed-in non-admin user attempting to update `/app_config/studio`.
3. Email spoofing attack: user with `email: 'andreschullz1313@gmail.com'` but `email_verified: false`.
4. Shadow field injection: admin writes `app_config/studio` with extra field `isBypass: true`.
5. ID poisoning: admin writes to `/app_config/malicious_doc_id` instead of `studio`.
6. Self-escalation: signed-in attacker tries to write `/admins/{attackerUid}`.
7. Public list scraping: unauthenticated client attempts `list` on `/app_config`, `/admins`, or `/appointments`.
8. Timestamp forgery: admin sends client-supplied past timestamp instead of `serverTimestamp()`.
9. Color XSS injection: `primaryColor: "red;background:url(javascript:alert(1))"` fails hex regex.
10. Oversized logo/banner DoS: `logoDataUrl` > 350KB or `promoBannerDataUrl` > 420KB rejected.
11. Slot hijacking / double-booking: client tries to `update`, `delete`, or forge `'blocked'` on `/schedule_slots/{slotId}`.
12. Orphaned appointment / privilege spoof: client creates `/appointments/{id}` with `status: 'confirmed'` or without atomic `/schedule_slots/{slotId}` lock.
