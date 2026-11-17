import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  })
}

// Loads a user plus their donor or hospital profile (never the password)
async function getUserWithProfile(userId) {
  const { rows } = await pool.query(
    `SELECT id, email, phone, full_name, role, status, created_at
     FROM users WHERE id = $1`,
    [userId]
  )
  const user = rows[0]
  if (!user) return null

  if (user.role === 'donor') {
    const p = await pool.query(
            `SELECT blood_group, city, is_available, location_consent,
              approx_latitude, approx_longitude,
              last_donation_date::text AS last_donation_date
       FROM donor_profiles WHERE user_id = $1`,
      [userId]
    )
    user.donorProfile = p.rows[0] || null
  }

  if (user.role === 'hospital') {
    const p = await pool.query(
            `SELECT hospital_name, registration_number, address, city,
              latitude, longitude,
              verification_status, verification_notes
       FROM hospital_profiles WHERE user_id = $1`,
      [userId]
    )
    user.hospitalProfile = p.rows[0] || null
  }

  return user
}

export async function register(req, res) {
  const {
    role, fullName, email, phone, password,
    bloodGroup, hospitalName, registrationNumber, consent,
  } = req.body

  // Validation. Only donors and hospitals can self-register; never admins.
  if (!['donor', 'hospital'].includes(role)) {
    return res.status(400).json({ message: 'Invalid account type.' })
  }
  if (!fullName?.trim() || !phone?.trim()) {
    return res.status(400).json({ message: 'Name and phone number are required.' })
  }
  if (!EMAIL_REGEX.test(email || '')) {
    return res.status(400).json({ message: 'Please enter a valid email address.' })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' })
  }
  if (consent !== true) {
    return res.status(400).json({ message: 'Privacy consent is required.' })
  }
  if (role === 'donor' && !BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ message: 'Please select a valid blood group.' })
  }
  if (role === 'hospital' && (!hospitalName?.trim() || !registrationNumber?.trim())) {
    return res.status(400).json({ message: 'Hospital name and registration number are required.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Password is hashed here: the database never sees the real password
    const passwordHash = await bcrypt.hash(password, 10)

    const userResult = await client.query(
      `INSERT INTO users (email, phone, password_hash, full_name, role, privacy_consent_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [email.trim().toLowerCase(), phone.trim(), passwordHash, fullName.trim(), role]
    )
    const userId = userResult.rows[0].id

    if (role === 'donor') {
      await client.query(
        `INSERT INTO donor_profiles (user_id, blood_group) VALUES ($1, $2)`,
        [userId, bloodGroup]
      )
    } else {
      await client.query(
        `INSERT INTO hospital_profiles (user_id, hospital_name, registration_number)
         VALUES ($1, $2, $3)`,
        [userId, hospitalName.trim(), registrationNumber.trim()]
      )
    }

    await client.query('COMMIT')

    const user = await getUserWithProfile(userId)
    res.status(201).json({ token: createToken(user), user })
  } catch (err) {
    await client.query('ROLLBACK')

    if (err.code === '23505') {
      const message = err.constraint?.includes('registration_number')
        ? 'A hospital with this registration number already exists.'
        : 'An account with this email already exists.'
      return res.status(409).json({ message })
    }

    console.error('Register failed:', err.message)
    res.status(500).json({ message: 'Something went wrong. Please try again.' })
  } finally {
    client.release()
  }
}

export async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, password_hash, status FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    )
    const row = rows[0]

    // Same message for "no such user" and "wrong password" (safer)
    const passwordOk = row && (await bcrypt.compare(password, row.password_hash))
    if (!passwordOk) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }
    if (row.status !== 'active') {
      return res.status(403).json({ message: 'This account is suspended.' })
    }

    const user = await getUserWithProfile(row.id)
    res.json({ token: createToken(user), user })
  } catch (err) {
    console.error('Login failed:', err.message)
    res.status(500).json({ message: 'Something went wrong. Please try again.' })
  }
}

// Returns the currently logged-in user (used to keep you logged in on refresh)
export async function me(req, res) {
  try {
    const user = await getUserWithProfile(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json({ user })
  } catch (err) {
    console.error('Me failed:', err.message)
    res.status(500).json({ message: 'Something went wrong.' })
  }
}