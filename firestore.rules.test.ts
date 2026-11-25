/**
 * Security Rules verification test suite (reference specification for Dirty Dozen payloads).
 */
export const DIRTY_DOZEN_CASES = [
  { name: 'Unauthenticated write to app_config/studio', expected: 'PERMISSION_DENIED' },
  { name: 'Non-admin signed-in user write to app_config/studio', expected: 'PERMISSION_DENIED' },
  { name: 'Unverified admin email spoof write to app_config/studio', expected: 'PERMISSION_DENIED' },
  { name: 'Shadow field (isBypass: true) injection on app_config/studio', expected: 'PERMISSION_DENIED' },
  { name: 'ID poisoning write to /app_config/other_id', expected: 'PERMISSION_DENIED' },
  { name: 'Self-escalation create on /admins/{uid}', expected: 'PERMISSION_DENIED' },
  { name: 'Unauthenticated list query on /app_config', expected: 'PERMISSION_DENIED' },
  { name: 'Client-forged updatedAt timestamp on /app_config/studio', expected: 'PERMISSION_DENIED' },
  { name: 'Non-hex CSS injection string in primaryColor', expected: 'PERMISSION_DENIED' },
  { name: 'Oversized (>350KB) or javascript: URI in logoDataUrl', expected: 'PERMISSION_DENIED' },
  { name: 'Oversized (>420KB) or invalid MIME URI in promoBannerDataUrl', expected: 'PERMISSION_DENIED' },
  { name: 'Negative or inverted price tier bounds', expected: 'PERMISSION_DENIED' },
  { name: 'Delete attempt on /app_config/studio', expected: 'PERMISSION_DENIED' },
  { name: 'Public list/get read attempt on PII /appointments collection', expected: 'PERMISSION_DENIED' },
  { name: 'Non-admin attempt to update/delete or block /schedule_slots/{slotId}', expected: 'PERMISSION_DENIED' },
  { name: 'Client creating /appointments/{id} without atomic /schedule_slots lock or with status confirmed', expected: 'PERMISSION_DENIED' },
] as const;
