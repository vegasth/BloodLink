import pool from '../config/db.js'

// Records an important action in the audit_logs table
export async function logAction({ actorId, action, entityType, entityId, details, ip }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actorId,
        action,
        entityType,
        String(entityId),
        details ? JSON.stringify(details) : null,
        ip || null,
      ]
    )
  } catch (err) {
    // A logging problem should not break the main action
    console.error('Audit log failed:', err.message)
  }
}