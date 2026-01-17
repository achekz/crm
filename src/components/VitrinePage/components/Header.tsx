import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Menu, X } from 'lucide-react';

interface HeaderProps {
  isScrolled: boolean;
  isHeaderVisible: boolean;
  mobileMenuOpen?: boolean;
  toggleMobileMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isScrolled, isHeaderVisible, mobileMenuOpen, toggleMobileMenu }) => {
  return (
    <header 
      id="main-header" 
      className={`main-header ${isScrolled ? 'scrolled' : ''} ${!isHeaderVisible ? 'hidden' : ''}`}
    >
      <div className="logo-container">
        {toggleMobileMenu && (
          <button 
            type="button"
            className={`mobile-menu-btn ${isScrolled ? 'scrolled' : ''} ${!isHeaderVisible ? 'header-hidden' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMobileMenu();
            }}
            aria-label="Menu mobile"
            aria-controls="main-navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        )}
        <div className="logo-wrapper">
          <img 
            src=".\cmt.png" 
            alt="CMT Logo" 
            className="header-logo"
          />
          <div className="logo-overlay">
            <div className="logo-shine"></div>
          </div>
        </div>
        <div className="company-info-header">
          <span className="company-name">CMT Expertise</span>
          <span className="company-tagline">Votre partenaire de confiance</span>
        </div>
      </div>
      
      <div className="header-right">
        <div className="contact-info">
          <div className="contact-item">
            <div className="contact-icon">
              <Phone size={12} />
            </div>
            <a href="tel:+21694338220" className="contact-link" style={{ color: 'black' }}>94338220</a>
          </div>
          <div className="contact-item">
            <div className="contact-icon">
              <Mail size={12} />
            </div>
            <a href="mailto:contact@cmt-expertise.fr" className="contact-link" style={{ color: 'black' }}>contact@cmt.tn</a>
          </div>
          <div className="contact-item">
            <div className="contact-icon">
              <MapPin size={12} />
            </div>
            <span className="contact-text">MONASTIR, TUNISIE</span>
          </div>
        </div>
        <Link to="/login" className="header-login-button">
          <span>Se connecter</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </header>
  );
};

export default Header;