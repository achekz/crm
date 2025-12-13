import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

interface HeaderProps {
  isScrolled: boolean;
  isHeaderVisible: boolean;
}

const Header: React.FC<HeaderProps> = ({ isScrolled, isHeaderVisible }) => {
  return (
    <header 
      id="main-header" 
      className={`main-header ${isScrolled ? 'scrolled' : ''} ${!isHeaderVisible ? 'hidden' : ''}`}
    >
      <div className="logo-container">
        <div className="logo-wrapper">
          <img 
            src="public\cmt-logo-temp.png" 
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
      
      <div className="contact-info">
        <div className="contact-item">
          <div className="contact-icon">
            <Phone size={14} />
          </div>
          <a href="tel:+21694338220" className="contact-link" style={{ color: 'black' }}>94338220</a>
        </div>
        <div className="contact-item">
          <div className="contact-icon">
            <Mail size={14} />
          </div>
          <a href="mailto:contact@cmt-expertise.fr" className="contact-link" style={{ color: 'black' }}>contact@cmt.tn</a>
        </div>
        <div className="contact-item">
          <div className="contact-icon">
            <MapPin size={14} />
          </div>
          <span className="contact-text">MONASTIR, TUNISIE</span>
        </div>
      </div>
    </header>
  );
};

export default Header;