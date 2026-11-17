import pool from '../config/db.js'
import { findDonors } from '../servicess/matching.js'
import { distanceKm } from '../utils/distance.js'
import { logAction } from '../utils/auditLog.js'

const CLOSED_STATUSES = ['fulfilled', 'cancelled', 'expired']
const HOSPITAL_CAN_SET = [
  'contacted', 'arrived', 'screened', 'donation_completed', 'did_not_arrive', 'not_eligible',
]
const COMPONENT_NAMES = {
  whole_blood: 'Whole Blood',
  red_blood_cells: 'Red Blood Cells',
  plasma: 'Plasma',
  platelets: 'Platelets',
}

// POST /api/hospital/requests/:id/match
export async function runMatching(req, res) {
  let client
  try {
    const found = await pool.query(
      `SELECT r.id, r.component, r.blood_group, r.units_required, r.status, r.required_by,
              h.hospital_name, h.latitude, h.longitude, h.verification_status
       FROM blood_requests r
       JOIN hospital_profiles h ON h.user_id = r.hospital_id
       WHERE r.id = $1 AND r.hospital_id = $2`,
      [req.params.id, req.user.id]
    )
    const request = found.rows[0]

    if (!request) {
      return res.status(404).json({ message: 'Request not found.' })
    }
    if (CLOSED_STATUSES.includes(request.status)) {
      return res.status(400).json({ message: 'This request is closed.' })
    }
    if (new Date(request.required_by) <= new Date()) {
      return res.status(400).json({ message: 'The required time has passed. Please create a new request.' })
    }
    if (request.verification_status !== 'approved') {
      return res.status(403).json({ message: 'Only verified hospitals can notify donors.' })
    }
    if (request.latitude === null || request.longitude === null) {
      return res.status(400).json({ message: 'Please set your hospital location first.' })
    }

    const { donors, radiusKm, alreadyNotified } = await findDonors(request, {
      latitude: request.latitude,
      longitude: request.longitude,
    })

    // Nobody new found
    if (donors.length === 0) {
      await pool.query(
        `UPDATE blood_requests
         SET status = CASE WHEN status = 'open' THEN 'matching' ELSE status END,
             search_radius_km = $2::int, updated_at = NOW()
         WHERE id = $1`,
        [request.id, radiusKm]
      )
      return res.json({
        notified: 0,
        radiusKm,
        message:
          alreadyNotified > 0
            ? `No new compatible donors found (searched up to ${radiusKm} km). ${alreadyNotified} donor(s) were already notified.`
            : `No compatible, available donors found within ${radiusKm} km.`,
      })
    }

    const message =
      `[SIMULATED, not actually sent] Urgent request: ${request.units_required} unit(s) of ` +
      `${COMPONENT_NAMES[request.component]} (${request.blood_group}) needed at ` +
      `${request.hospital_name}. Open BloodLink to respond.`

    client = await pool.connect()
    await client.query('BEGIN')

    const inserted = await client.query(
      `INSERT INTO request_responses (request_id, donor_id)
       SELECT $1::uuid, UNNEST($2::uuid[])
       ON CONFLICT (request_id, donor_id) DO NOTHING
       RETURNING donor_id`,
      [request.id, donors.map((d) => d.donorId)]
    )
    const newIds = inserted.rows.map((r) => r.donor_id)

    if (newIds.length > 0) {
      // Simulated SMS and email log (nothing is really sent)
      await client.query(
        `INSERT INTO notifications (user_id, request_id, channel, message, is_simulated)
         SELECT d, $1::uuid, c, $3::text, TRUE
         FROM UNNEST($2::uuid[]) AS d
         CROSS JOIN UNNEST(ARRAY['sms', 'email']) AS c`,
        [request.id, newIds, message]
      )
    }

    await client.query(
      `UPDATE blood_requests
       SET status = CASE WHEN status IN ('open', 'matching') THEN 'donors_notified' ELSE status END,
           search_radius_km = $2::int, updated_at = NOW()
       WHERE id = $1`,
      [request.id, radiusKm]
    )
    await client.query('COMMIT')

    await logAction({
      actorId: req.user.id,
      action: 'donors_notified',
      entityType: 'blood_request',
      entityId: request.id,
      details: { notified: newIds.length, radiusKm },
      ip: req.ip,
    })

    res.json({
      notified: newIds.length,
      radiusKm,
      message: `Notified ${newIds.length} donor(s) within ${radiusKm} km. They can see the request in BloodLink. SMS and email are simulated in this prototype.`,
    })
  } catch (err) {
    if (client) await client.query('ROLLBACK')
    if (err.code === '22P02') {
      return res.status(400).json({ message: 'Invalid request id.' })
    }
    console.error('Matching failed:', err.message)
    res.status(500).json({ message: 'Could not search for donors.' })
  } finally {
    if (client) client.release()
  }
}

// GET /api/hospital/requests/:id/responses
export async function listResponses(req, res) {
  try {
    const found = await pool.query(
      `SELECT r.id, r.component, r.blood_group, r.units_required, r.units_fulfilled,
              r.urgency, r.status, r.required_by, r.search_radius_km,
              h.latitude, h.longitude
       FROM blood_requests r
       JOIN hospital_profiles h ON h.user_id = r.hospital_id
       WHERE r.id = $1 AND r.hospital_id = $2`,
      [req.params.id, req.user.id]
    )
    const r = found.rows[0]
    if (!r) {
      return res.status(404).json({ message: 'Request not found.' })
    }

    const { rows } = await pool.query(
      `SELECT rr.donor_id, rr.status, rr.responded_at,
              u.full_name, u.phone,
              d.blood_group, d.approx_latitude, d.approx_longitude
       FROM request_responses rr
       JOIN users u ON u.id = rr.donor_id
       JOIN donor_profiles d ON d.user_id = rr.donor_id
       WHERE rr.request_id = $1
       ORDER BY rr.responded_at NULLS LAST, rr.created_at`,
      [req.params.id]
    )

    const counts = { notified: rows.length, pending: 0, accepted: 0, declined: 0 }
    const donors = []

    for (const row of rows) {
      if (row.status === 'pending') {
        counts.pending++
      } else if (row.status === 'declined') {
        counts.declined++
      } else {
        // PRIVACY: name and phone are shared only after the donor accepts
        counts.accepted++
        const km =
          row.approx_latitude !== null && r.latitude !== null
            ? Math.round(
                distanceKm(
                  Number(r.latitude), Number(r.longitude),
                  Number(row.approx_latitude), Number(row.approx_longitude)
                ) * 10
              ) / 10
            : null
        donors.push({
          donor_id: row.donor_id,
          full_name: row.full_name,
          phone: row.phone,
          blood_group: row.blood_group,
          status: row.status,
          distance_km: km,
        })
      }
    }

    res.json({
      request: {
        id: r.id,
        component: r.component,
        blood_group: r.blood_group,
        units_required: r.units_required,
        units_fulfilled: r.units_fulfilled,
        urgency: r.urgency,
        status: r.status,
        required_by: r.required_by,
        search_radius_km: r.search_radius_km,
      },
      counts,
      donors,
    })
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ message: 'Invalid request id.' })
    }
    console.error('List responses failed:', err.message)
    res.status(500).json({ message: 'Could not load responses.' })
  }
}

// PATCH /api/hospital/requests/:id/responses/:donorId   body: { status }
export async function updateResponseStatus(req, res) {
  const { status } = req.body ?? {}
  if (!HOSPITAL_CAN_SET.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE request_responses rr
       SET status = $1, updated_at = NOW()
       FROM blood_requests r
       WHERE rr.request_id = r.id
         AND r.id = $2 AND r.hospital_id = $3
         AND rr.donor_id = $4
         AND rr.status IN ('accepted', 'contacted', 'arrived', 'screened')
       RETURNING rr.status`,
      [status, req.params.id, req.user.id, req.params.donorId]
    )
    if (!rows[0]) {
      return res.status(404).json({ message: 'Donor response not found or can no longer be changed.' })
    }

    await logAction({
      actorId: req.user.id,
      action: 'donor_status_updated',
      entityType: 'blood_request',
      entityId: req.params.id,
      details: { donorId: req.params.donorId, status },
      ip: req.ip,
    })
    res.json({ message: 'Status updated.' })
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ message: 'Invalid id.' })
    }
    console.error('Update response status failed:', err.message)
    res.status(500).json({ message: 'Could not update the status.' })
  }
}