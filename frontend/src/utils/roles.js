// Where each role goes after logging in
export function dashboardPath(role) {
  const paths = { donor: '/donor', hospital: '/hospital', admin: '/admin' }
  return paths[role] || '/'
}