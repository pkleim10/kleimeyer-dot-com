// The "request a registration code" mailto, shared by the home-page callout and
// the register form so the two links stay identical. Kept here (not in server/)
// because the register form is a Client Component.

export const ADMIN_EMAIL = 'admin@kleimeyer.com'

export function buildRegistrationMailto(seasonYear) {
  const subject = encodeURIComponent(`${seasonYear} Dead Pool Registration`)
  const body = encodeURIComponent(
    `Please reply with a registration code for the ${seasonYear} Flaming Red Head's Dead Pool`
  )
  return `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`
}
