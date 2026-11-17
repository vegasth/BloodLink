// Creates FICTIONAL demo accounts for the college demonstration.
// Safe to run more than once. Do not use these accounts in real life.
import bcrypt from 'bcryptjs'
import pool from '../src/config/db.js'

const ADMIN_PASSWORD = 'Admin@12345'
const DEMO_PASSWORD = 'Demo@12345'

async function createUser({ email, fullName, phone, role, password }) {
  const hash = await bcrypt.hash(password, 10)
  const { rows } = await pool.query(
    `INSERT INTO users (email, phone, password_hash, full_name, role, privacy_consent_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [email, phone, hash, fullName, role]
  )
  return rows[0].id
}

async function seed() {
  const adminId = await createUser({
    email: 'admin@bloodlink.demo',
    fullName: 'BloodLink Admin (Demo)',
    phone: '9000000001',
    role: 'admin',
    password: ADMIN_PASSWORD,
  })

  const donorId = await createUser({
    email: 'donor@bloodlink.demo',
    fullName: 'Demo Donor',
    phone: '9000000002',
    role: 'donor',
    password: DEMO_PASSWORD,
  })
  await pool.query(
    `INSERT INTO donor_profiles (user_id, blood_group, city)
     VALUES ($1, 'O+', 'Demo City')
     ON CONFLICT (user_id) DO NOTHING`,
    [donorId]
  )

  const hospitalId = await createUser({
    email: 'hospital@bloodlink.demo',
    fullName: 'Demo Hospital Contact',
    phone: '9000000003',
    role: 'hospital',
    password: DEMO_PASSWORD,
  })
  await pool.query(
    `INSERT INTO hospital_profiles
       (user_id, hospital_name, registration_number, city,
        verification_status, verified_by, verified_at)
     VALUES ($1, 'Demo City Hospital (Demo)', 'DEMO-REG-001', 'Demo City',
             'approved', $2, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [hospitalId, adminId]
  )

  const pendingId = await createUser({
    email: 'pending@bloodlink.demo',
    fullName: 'Pending Hospital Contact',
    phone: '9000000004',
    role: 'hospital',
    password: DEMO_PASSWORD,
  })
  await pool.query(
    `INSERT INTO hospital_profiles
       (user_id, hospital_name, registration_number, city)
     VALUES ($1, 'Pending Demo Hospital (Demo)', 'DEMO-REG-002', 'Demo City')
     ON CONFLICT (user_id) DO NOTHING`,
    [pendingId]
  )

  console.log('Demo accounts are ready.')
  await pool.end()
}

seed().catch((err) => {
  console.error('Seeding failed:', err.message)
  process.exit(1)
})