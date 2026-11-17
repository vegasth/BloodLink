import pool from '../config/db.js'
import { compatibleDonorGroups } from '../config/compatibility.js'
import { distanceKm } from '../utils/distance.js'

// Search radius widens step by step until enough donors are found
export const RADII_KM = [5, 10, 20, 50]
const DONORS_WANTED_PER_UNIT = 2 // not everyone replies, so we alert extra donors
const MAX_NEW_NOTIFICATIONS = 50

// request: { id, component, blood_group, units_required }
// hospital: { latitude, longitude }
export async function findDonors(request, hospital) {
  const groups = compatibleDonorGroups(request.component, request.blood_group)

  const [candidates, existing] = await Promise.all([
    pool.query(
      `SELECT u.id, d.approx_latitude, d.approx_longitude
       FROM donor_profiles d
       JOIN users u ON u.id = d.user_id
       WHERE u.status = 'active'
         AND d.is_available = TRUE
         AND d.location_consent = TRUE
         AND d.approx_latitude IS NOT NULL
         AND d.approx_longitude IS NOT NULL
         AND d.blood_group = ANY($1)
         AND NOT EXISTS (
           SELECT 1 FROM request_responses r
           WHERE r.request_id = $2 AND r.donor_id = u.id
         )`,
      [groups, request.id]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM request_responses WHERE request_id = $1`,
      [request.id]
    ),
  ])

  const hLat = Number(hospital.latitude)
  const hLng = Number(hospital.longitude)

  const withDistance = candidates.rows
    .map((c) => ({
      donorId: c.id,
      distanceKm: distanceKm(hLat, hLng, Number(c.approx_latitude), Number(c.approx_longitude)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)

  const wanted = request.units_required * DONORS_WANTED_PER_UNIT
  const alreadyNotified = existing.rows[0].n

  let radiusKm = RADII_KM[0]
  let donors = []
  for (const radius of RADII_KM) {
    radiusKm = radius
    donors = withDistance.filter((d) => d.distanceKm <= radius)
    if (alreadyNotified + donors.length >= wanted) break
  }

  return { donors: donors.slice(0, MAX_NEW_NOTIFICATIONS), radiusKm, alreadyNotified }
}