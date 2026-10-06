// The student account: profile and access, both from the Django backend.
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const [profile, sub] = await Promise.all([getProfile(event), getSubscription(event)])
  return {
    profile: {
      firstName: profile!.first_name,
      lastName: profile!.last_name,
      email: profile!.email,
      phone: profile!.phone,
      emailVerified: profile!.email_verified,
      googleOnly: profile!.has_google_auth
    },
    subscription: subscriptionFromDjango(sub),
    /** After access ends the account stays open until this date (to renew), then closes */
    accountExpiresAt: sub?.account_expires_at ?? null
  }
})
