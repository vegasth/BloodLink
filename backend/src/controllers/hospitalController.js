import pool from '../config/db.js'
import { logAction } from '../utils/auditLog.js'

const COMPONENTS = ['whole_blood', 'red_blood_cells', 'plasma', 'platelets']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const URGENCIES = ['critical', 'urgent', 'scheduled']
const CLOSED_STATUSES = ['fulfilled', 'cancelled', 'expired']

const text = (v) => (typeof v === 'string' ? v.trim() : '')
const toNumber = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v))

// PUT /api/hospital/profile
export async function updateProfile(req, res) {
  const { address, city, latitude, longitude } = req.body ?? {}
  const lat = toNumber(latitude)
  const lng = toNumber(longitude)

  if (!text(address) || !text(city)) {
    return res.status(400).json({ message: 'Address and city are required.' })
  }
  if (text(address).length > 200 || text(city).length > 100) {
    return res.status(400).json({ message: 'Address or city is too long.' })
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ message: 'Please enter a valid latitude and longitude.' })
  }

  try {
    const result = await pool.query(
      `UPDATE hospital_profiles
       SET address = $1, city = $2, latitude = $3, longitude = $4, updated_at = NOW()
       WHERE user_id = $5`,
      [text(address), text(city), lat, lng, req.user.id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Hospital profile not found.' })
    }
    res.json({ message: 'Hospital profile saved.' })
  } catch (err) {
    console.error('Update hospital profile failed:', err.message)
    res.status(500).json({ message: 'Could not save the profile.' })
  }
}

// POST /api/hospital/requests
export async function createRequest(req, res) {
  const { component, bloodGroup, unitsRequired, urgency, requiredBy, additionalInfo } =
    req.body ?? {}

  if (!COMPONENTS.includes(component)) {
    return res.status(400).json({ message: 'Please choose a blood component.' })
  }
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ message: 'Please choose a blood group.' })
  }
  const units = Number(unitsRequired)
  if (!Number.isInteger(units) || units < 1 || units > 50) {
    return res.status(400).json({ message: 'Units must be a whole number from 1 to 50.' })
  }
  if (!URGENCIES.includes(urgency)) {
    return res.status(400).json({ message: 'Please choose an urgency level.' })
  }
  const when = new Date(requiredBy)
  if (Number.isNaN(when.getTime())) {
    return res.status(400).json({ message: 'Please enter a valid required date and time.' })
  }
  if (when <= new Date()) {
    return res.status(400).json({ message: 'Required date and time must be in the future.' })
  }
  if (text(additionalInfo).length > 500) {
    return res.status(400).json({ message: 'Additional information is too long (500 characters max).' })
  }

  try {
    const profile = await pool.query(
      `SELECT verification_status, latitude, longitude
       FROM hospital_profiles WHERE user_id = $1`,
      [req.user.id]
    )
    const hospital = profile.rows[0]
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found.' })
    }

    // THE KEY RULE: only verified hospitals can create requests
    if (hospital.verification_status !== 'approved') {
      return res.status(403).json({ message: 'Only verified hospitals can create blood requests.' })
    }
    if (hospital.latitude === null || hospital.longitude === null) {
      return res.status(400).json({
        message: 'Please set your hospital location in your hospital profile first.',
      })
    }

    const { rows } = await pool.query(
      `INSERT INTO blood_requests
         (hospital_id, component, blood_group, units_required, urgency, required_by, additional_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, component, blood_group, units_required, urgency, status, required_by`,
      [req.user.id, component, bloodGroup, units, urgency, when.toISOString(), text(additionalInfo) || null]
    )

    await logAction({
      actorId: req.user.id,
      action: 'request_created',
      entityType: 'blood_request',
      entityId: rows[0].id,
      details: { component, bloodGroup, units, urgency },
      ip: req.ip,
    })

    res.status(201).json({ request: rows[0] })
  } catch (err) {
    console.error('Create request failed:', err.message)
    res.status(500).json({ message: 'Could not create the request.' })
  }
}

// GET /api/hospital/requests
export async function listRequests(req, res) {
  try {
    // Requests whose required time has passed become "expired"
    await pool.query(
      `UPDATE blood_requests
       SET status = 'expired', updated_at = NOW()
       WHERE hospital_id = $1
         AND required_by < NOW()
         AND status NOT IN ('fulfilled', 'cancelled', 'expired')`,
      [req.user.id]
    )

    const { rows } = await pool.query(
      `SELECT id, component, blood_group, units_required, units_fulfilled, urgency,
              status, required_by, search_radius_km, additional_info, created_at
       FROM blood_requests
       WHERE hospital_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )
    res.json({ requests: rows })
  } catch (err) {
    console.error('List requests failed:', err.message)
    res.status(500).json({ message: 'Could not load your requests.' })
  }
}

// POST /api/hospital/requests/:id/cancel
export async function cancelRequest(req, res) {
  try {
    const { rows } = await pool.query(
      `UPDATE blood_requests
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND hospital_id = $2
         AND status NOT IN ('fulfilled', 'cancelled', 'expired')
       RETURNING id`,
      [req.params.id, req.user.id]
    )
    if (!rows[0]) {
      return res.status(404).json({ message: 'Request not found or it can no longer be cancelled.' })
    }

    await logAction({
      actorId: req.user.id,
      action: 'request_cancelled',
      entityType: 'blood_request',
      entityId: rows[0].id,
      ip: req.ip,
    })
    res.json({ message: 'Request cancelled.' })
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ message: 'Invalid request id.' })
    }
    console.error('Cancel request failed:', err.message)
    res.status(500).json({ message: 'Could not cancel the request.' })
  }
}

// PATCH /api/hospital/requests/:id/progress   body: { unitsFulfilled }
export async function updateProgress(req, res) {
  const units = Number(req.body?.unitsFulfilled)
  if (!Number.isInteger(units) || units < 0) {
    return res.status(400).json({ message: 'Units must be a whole number.' })
  }

  try {
    const found = await pool.query(
      `SELECT units_required, units_fulfilled, status
       FROM blood_requests WHERE id = $1 AND hospital_id = $2`,
      [req.params.id, req.user.id]
    )
    const current = found.rows[0]
    if (!current) {
      return res.status(404).json({ message: 'Request not found.' })
    }
    if (CLOSED_STATUSES.includes(current.status)) {
      return res.status(400).json({ message: 'This request is closed.' })
    }
    if (units > current.units_required) {
      return res.status(400).json({ message: 'Units cannot be more than the units required.' })
    }
    if (units < current.units_fulfilled) {
      return res.status(400).json({ message: 'Progress cannot go backwards.' })
    }

    await pool.query(
      `UPDATE blood_requests
       SET units_fulfilled = $1::int,
           status = CASE WHEN $1::int >= units_required THEN 'fulfilled'
                         WHEN $1::int > 0 THEN 'partially_fulfilled'
                         ELSE status END,
           updated_at = NOW()
       WHERE id = $2 AND hospital_id = $3`,
      [units, req.params.id, req.user.id]
    )

    await logAction({
      actorId: req.user.id,
      action: 'request_progress_updated',
      entityType: 'blood_request',
      entityId: req.params.id,
      details: { unitsFulfilled: units },
      ip: req.ip,
    })
    res.json({ message: 'Progress updated.' })
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ message: 'Invalid request id.' })
    }
    console.error('Update progress failed:', err.message)
    res.status(500).json({ message: 'Could not update progress.' })
  }
}