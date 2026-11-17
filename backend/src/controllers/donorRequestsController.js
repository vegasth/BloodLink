import pool from '../config/db.js'
import { distanceKm } from '../utils/distance.js'
import { logAction } from '../utils/auditLog.js'

const CLOSED_STATUSES = ['fulfilled', 'cancelled', 'expired']
const CHANGEABLE = ['pending', 'accepted', 'declined']

// GET /api/donor/requests
export async function listMyRequests(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT rr.status AS response_status, rr.responded_at,
              r.id AS request_id, r.component, r.blood_group, r.units_required,
              r.urgency, r.required_by, r.status AS request_status, r.additional_info,
              h.hospital_name, h.address, h.city, h.latitude, h.longitude,
              d.approx_latitude, d.approx_longitude
       FROM request_responses rr
       JOIN blood_requests r ON r.id = rr.request_id
       JOIN hospital_profiles h ON h.user_id = r.hospital_id
       JOIN donor_profiles d ON d.user_id = rr.donor_id
       WHERE rr.donor_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    )

    const now = new Date()
    const requests = rows.map((row) => {
      const km =
        row.approx_latitude !== null && row.latitude !== null
          ? Math.round(
              distanceKm(
                Number(row.latitude), Number(row.longitude),
                Number(row.approx_latitude), Number(row.approx_longitude)
              ) * 10
            ) / 10
          : null

      return {
        request_id: row.request_id,
        component: row.component,
        blood_group: row.blood_group,
        units_required: row.units_required,
        urgency: row.urgency,
        required_by: row.required_by,
        additional_info: row.additional_info,
        hospital_name: row.hospital_name,
        hospital_address: row.address ? `${row.address}, ${row.city}` : row.city,
        distance_km: km, // rounded distance only: no coordinates are sent
        response_status: row.response_status,
        open_for_response:
          !CLOSED_STATUSES.includes(row.request_status) &&
          new Date(row.required_by) > now &&
          CHANGEABLE.includes(row.response_status),
      }
    })

    res.json({ requests })
  } catch (err) {
    console.error('List donor requests failed:', err.message)
    res.status(500).json({ message: 'Could not load your requests.' })
  }
}

// POST /api/donor/requests/:requestId/respond   body: { decision }
export async function respond(req, res) {
  const { decision } = req.body ?? {}
  if (!['accepted', 'declined'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be accepted or declined.' })
  }

  try {
    const found = await pool.query(
      `SELECT rr.status AS response_status, r.status AS request_status, r.required_by
       FROM request_responses rr
       JOIN blood_requests r ON r.id = rr.request_id
       WHERE rr.request_id = $1 AND rr.donor_id = $2`,
      [req.params.requestId, req.user.id]
    )
    const row = found.rows[0]

    if (!row) {
      return res.status(404).json({ message: 'Request not found.' })
    }
    if (CLOSED_STATUSES.includes(row.request_status) || new Date(row.required_by) <= new Date()) {
      return res.status(400).json({ message: 'This request is closed.' })
    }
    if (!CHANGEABLE.includes(row.response_status)) {
      return res.status(400).json({
        message: 'The hospital has already started processing your response, so it cannot be changed here.',
      })
    }

    await pool.query(
      `UPDATE request_responses
       SET status = $1, responded_at = NOW(), updated_at = NOW()
       WHERE request_id = $2 AND donor_id = $3`,
      [decision, req.params.requestId, req.user.id]
    )

    // First reply moves the request from "Donors Notified" to "Awaiting Responses"
    await pool.query(
      `UPDATE blood_requests SET status = 'awaiting_responses', updated_at = NOW()
       WHERE id = $1 AND status = 'donors_notified'`,
      [req.params.requestId]
    )

    await logAction({
      actorId: req.user.id,
      action: `donor_${decision}`,
      entityType: 'blood_request',
      entityId: req.params.requestId,
      ip: req.ip,
    })

    res.json({
      message:
        decision === 'accepted'
          ? 'Thank you! The hospital can now see your name and phone number.'
          : 'Response saved.',
    })
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ message: 'Invalid request id.' })
    }
    console.error('Donor respond failed:', err.message)
    res.status(500).json({ message: 'Could not save your response.' })
  }
}