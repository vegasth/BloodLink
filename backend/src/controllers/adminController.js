import pool from '../config/db.js'
import { logAction } from '../utils/auditLog.js'

export async function getStats(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'donor')::int AS donors,
        (SELECT COUNT(*) FROM users WHERE role = 'hospital')::int AS hospitals,
        (SELECT COUNT(*) FROM hospital_profiles
           WHERE verification_status = 'pending')::int AS pending_hospitals,
        (SELECT COUNT(*) FROM blood_requests)::int AS requests
    `)
    res.json(rows[0])
  } catch (err) {
    console.error('Stats failed:', err.message)
    res.status(500).json({ message: 'Could not load statistics.' })
  }
}

// GET /api/admin/hospitals?status=pending|approved|rejected|all
export async function listHospitals(req, res) {
  const status = req.query.status || 'all'
  const allowed = ['pending', 'approved', 'rejected', 'all']
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' })
  }

  const params = []
  let where = ''
  if (status !== 'all') {
    params.push(status)
    where = 'WHERE h.verification_status = $1'
  }

  try {
    const { rows } = await pool.query(
      `SELECT h.user_id, h.hospital_name, h.registration_number, h.city,
              h.verification_status, h.verification_notes, h.verified_at,
              u.full_name AS contact_name, u.email, u.phone, u.created_at
       FROM hospital_profiles h
       JOIN users u ON u.id = h.user_id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    )
    res.json({ hospitals: rows })
  } catch (err) {
    console.error('List hospitals failed:', err.message)
    res.status(500).json({ message: 'Could not load hospitals.' })
  }
}

// PATCH /api/admin/hospitals/:userId/verify
export async function verifyHospital(req, res) {
  const { userId } = req.params
  const { decision, notes } = req.body ?? {}

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approved or rejected.' })
  }
  if (decision === 'rejected' && !notes?.trim()) {
    return res.status(400).json({ message: 'Please give a reason for rejection.' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE hospital_profiles
       SET verification_status = $1,
           verification_notes = $2,
           verified_by = $3,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING user_id, hospital_name, verification_status`,
      [decision, notes?.trim() || null, req.user.id, userId]
    )

    if (!rows[0]) {
      return res.status(404).json({ message: 'Hospital not found.' })
    }

    await logAction({
      actorId: req.user.id,
      action: `hospital_${decision}`,
      entityType: 'hospital',
      entityId: userId,
      details: { hospitalName: rows[0].hospital_name, notes: notes?.trim() || null },
      ip: req.ip,
    })

    res.json({ hospital: rows[0] })
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ message: 'Invalid hospital id.' })
    }
    console.error('Verify hospital failed:', err.message)
    res.status(500).json({ message: 'Could not save the decision.' })
  }
}