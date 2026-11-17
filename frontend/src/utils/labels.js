export const COMPONENT_LABELS = {
  whole_blood: 'Whole Blood',
  red_blood_cells: 'Red Blood Cells',
  plasma: 'Plasma',
  platelets: 'Platelets',
}

export const URGENCY_LABELS = {
  critical: 'Critical',
  urgent: 'Urgent',
  scheduled: 'Scheduled',
}

// 'partially_fulfilled' becomes 'Partially Fulfilled'
export function statusLabel(status) {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}