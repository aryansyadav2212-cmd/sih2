import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="footer__brand-word">TRACE</span>
          <span className="footer__brand-tag">Infrastructure Intelligence</span>
        </div>
        <div className="footer__copy">
          © 2026 TRACE. INFRASTRUCTURE DECISION-SUPPORT · ANALYZES PAIMANA MONITORING DATA.
        </div>
        <div className="footer__links">
          <a href="#" className="footer__link">Privacy Protocol</a>
          <a href="#" className="footer__link">Security Standards</a>
          <a href="#" className="footer__link">Institutional Access</a>
          <a href="#" className="footer__link">Intelligence Feed</a>
        </div>
      </div>
    </footer>
  );
}
