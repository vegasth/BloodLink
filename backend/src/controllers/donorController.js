import pool from '../config/db.js'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
// 2 decimals is roughly 1 km: approximate on purpose, for privacy
const round2 = (n) => Math.round(n * 100) / 100

// PUT /api/donor/profile
export async function updateProfile(req, res) {
  const { city, isAvailable, lastDonationDate, locationConsent, latitude, longitude } =
    req.body ?? {}

  if (typeof isAvailable !== 'boolean' || typeof locationConsent !== 'boolean') {
    return res.status(400).json({ message: 'Invalid form data.' })
  }
  if (city && city.length > 100) {
    return res.status(400).json({ message: 'City name is too long.' })
  }

  // Self-reported date, for the donor's own records only
  let lastDate = null
  if (lastDonationDate) {
    if (!DATE_REGEX.test(lastDonationDate) || Number.isNaN(Date.parse(lastDonationDate))) {
      return res.status(400).json({ message: 'Invalid donation date.' })
    }
    if (new Date(lastDonationDate) > new Date()) {
      return res.status(400).json({ message: 'Donation date cannot be in the future.' })
    }
    lastDate = lastDonationDate
  }

  // Location is used only with consent, and only in rounded form
  let lat = null
  let lng = null
  if (locationConsent && latitude != null && longitude != null) {
    const la = Number(latitude)
    const lo = Number(longitude)
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      return res.status(400).json({ message: 'Invalid location.' })
    }
    lat = round2(la)
    lng = round2(lo)
  }

  try {
    const result = await pool.query(
      `UPDATE donor_profiles SET
         city = $1,
         is_available = $2::boolean,
         last_donation_date = $3::date,
         location_consent = $4::boolean,
         location_consent_at = CASE WHEN $4::boolean
                                    THEN COALESCE(location_consent_at, NOW())
                                    ELSE NULL END,
         approx_latitude = CASE WHEN $4::boolean
                                THEN COALESCE($5::numeric, approx_latitude)
                                ELSE NULL END,
         approx_longitude = CASE WHEN $4::boolean
                                 THEN COALESCE($6::numeric, approx_longitude)
                                 ELSE NULL END,
         updated_at = NOW()
       WHERE user_id = $7`,
      [city?.trim() || null, isAvailable, lastDate, locationConsent, lat, lng, req.user.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Donor profile not found.' })
    }
    res.json({ message: 'Profile saved.' })
  } catch (err) {
    console.error('Update donor profile failed:', err.message)
    res.status(500).json({ message: 'Could not save your profile.' })
  }
}