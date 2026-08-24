import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">PAIMANA AI</div>
        <div className="footer__copy">
          © 2024 PAIMANA AI. SOVEREIGN INFRASTRUCTURE INTELLIGENCE.
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
