import { Droplet } from 'lucide-react'

function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-top">
          <div className="logo logo-light">
            <Droplet size={24} fill="#E63946" color="#E63946" />
            <span>Blood<span className="logo-accent">Link</span></span>
          </div>
          <p>Connecting Donors. Saving Lives.</p>
        </div>
        <p className="disclaimer">
          BloodLink is an academic prototype for donor discovery and request
          coordination. It is not a blood bank and does not make medical
          decisions. All medical screening and eligibility checks are done by
          qualified professionals at healthcare facilities.
        </p>
        <p className="copyright">© 2026 BloodLink. College project.</p>
      </div>
    </footer>
  )
}

export default Footer