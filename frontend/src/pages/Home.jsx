import { Link } from 'react-router-dom'
import {
  HeartHandshake,
  Building2,
  ShieldCheck,
  UserPlus,
  FileText,
  Bell,
  CheckCircle2,
} from 'lucide-react'

const features = [
  {
    icon: HeartHandshake,
    title: 'For Donors',
    text: 'Register, set your availability, and choose to receive requests from hospitals near you.',
  },
  {
    icon: Building2,
    title: 'For Hospitals',
    text: 'Verified hospitals can post urgent blood requests and see potential nearby donors.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted Platform',
    text: 'Hospital verification, consent-based location use, and privacy-focused data handling.',
  },
]

const steps = [
  { icon: UserPlus, title: 'Register', text: 'Donors and hospitals create an account. Hospitals submit documents for verification.' },
  { icon: FileText, title: 'Request', text: 'A verified hospital creates an urgent blood request.' },
  { icon: Bell, title: 'Get Notified', text: 'Matching donors nearby are notified of the request.' },
  { icon: CheckCircle2, title: 'Respond', text: 'Donors accept or decline, and the hospital tracks responses.' },
]

function Home() {
  return (
    <main id="top">
      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <h1>
            Connecting Donors.<br />
            <span className="accent">Saving Lives.</span>
          </h1>
          <p className="hero-text">
            BloodLink helps verified hospitals find potential blood donors
            nearby during emergencies, quickly and with respect for donor privacy.
          </p>
          <div className="hero-buttons">
            <Link to="/register?role=donor" className="btn btn-primary btn-lg">Become a Donor</Link>
            <Link to="/register?role=hospital" className="btn btn-outline btn-lg">Request Blood</Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section" id="about">
        <div className="container">
          <h2 className="section-title">About BloodLink</h2>
          <p className="section-subtitle">
            In emergencies, finding a donor often depends on phone calls and
            social media. BloodLink gives hospitals and donors one organized place to connect.
          </p>
          <div className="card-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <div className="card" key={title}>
                <div className="icon-circle"><Icon size={26} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section-gray" id="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="card-grid four">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div className="card" key={title}>
                <div className="step-number">{i + 1}</div>
                <div className="icon-circle"><Icon size={24} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="cta">
        <div className="container">
          <h2>Ready to help save a life?</h2>
          <p>Join BloodLink as a donor or register your hospital.</p>
          <Link to="/register" className="btn btn-light btn-lg">Get Started</Link>
        </div>
      </section>
    </main>
  )
}

export default Home