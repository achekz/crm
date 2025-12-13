import React from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';

interface NavigationProps {
  isScrolled: boolean;
  isHeaderVisible: boolean;
  mobileMenuOpen: boolean;
  notreCabinetDropdownOpen: boolean;
  toggleMobileMenu: () => void;
  toggleNotreCabinetDropdown: () => void;
  scrollToSection: (sectionId: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  isScrolled,
  isHeaderVisible,
  mobileMenuOpen,
  notreCabinetDropdownOpen,
  toggleMobileMenu,
  toggleNotreCabinetDropdown,
  scrollToSection
}) => {
  return (
    <>
      <button 
        className={`mobile-menu-btn ${isScrolled ? 'scrolled' : ''} ${!isHeaderVisible ? 'hidden' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Menu mobile"
        aria-controls="main-navigation"
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <nav 
        id="main-navigation" 
        className={`main-navigation ${isScrolled ? 'scrolled' : ''} ${mobileMenuOpen ? 'mobile-open' : ''} ${!isHeaderVisible ? 'hidden' : ''}`} 
        aria-label="Navigation principale"
      >
        <ul className="nav-menu" role="menubar">
          <li>
            <button onClick={() => scrollToSection('accueil')} className="nav-link">
              Accueil
            </button>
          </li>
          <li className="dropdown-container">
            <button onClick={toggleNotreCabinetDropdown} className="nav-link dropdown-trigger">
              Notre Cabinet 
              <ChevronDown size={16} className={`dropdown-arrow ${notreCabinetDropdownOpen ? 'rotated' : ''}`} />
            </button>
            <ul className={`dropdown-menu ${notreCabinetDropdownOpen ? 'visible' : ''}`}>
              <li><a href="#equipe" className="dropdown-link">Notre Équipe</a></li>
              <li><a href="#histoire" className="dropdown-link">Notre Histoire</a></li>
              <li><a href="#valeurs" className="dropdown-link">Nos Valeurs</a></li>
              <li><a href="#certifications" className="dropdown-link">Certifications</a></li>
            </ul>
          </li>
          <li>
            <button onClick={() => scrollToSection('services')} className="nav-link">
              Services
            </button>
          </li>
          <li>
            <button onClick={() => scrollToSection('temoignages')} className="nav-link">
              Témoignages
            </button>
          </li>
          <li>
            <button onClick={() => scrollToSection('contact')} className="nav-link">
              Contact
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Navigation;