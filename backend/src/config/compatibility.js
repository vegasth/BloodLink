// ACADEMIC SIMPLIFICATION. NOT MEDICAL ADVICE.
// These rules MUST be reviewed by qualified blood-bank professionals
// before any real-world use. Final compatibility is always decided by
// the hospital's clinical staff, never by this software.

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// "AB+" -> "AB", "O-" -> "O"
const abo = (group) => group.slice(0, -1)

// Red blood cells: which donor groups can give to each recipient group
const RBC_DONORS = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': [...BLOOD_GROUPS],
}

// Plasma works the other way around (ABO only, Rh is ignored)
const PLASMA_ABO_DONORS = {
  O: ['O', 'A', 'B', 'AB'],
  A: ['A', 'AB'],
  B: ['B', 'AB'],
  AB: ['AB'],
}

// Returns the donor blood groups that may be matched for a request
export function compatibleDonorGroups(component, recipientGroup) {
  switch (component) {
    case 'whole_blood':
      // Conservative: exact same group only
      return [recipientGroup]

    case 'red_blood_cells':
      return RBC_DONORS[recipientGroup] ?? []

    case 'plasma': {
      const allowed = PLASMA_ABO_DONORS[abo(recipientGroup)] ?? []
      return BLOOD_GROUPS.filter((g) => allowed.includes(abo(g)))
    }

    case 'platelets':
      // Conservative: same ABO group (Rh not considered here)
      return BLOOD_GROUPS.filter((g) => abo(g) === abo(recipientGroup))

    default:
      return []
  }
}