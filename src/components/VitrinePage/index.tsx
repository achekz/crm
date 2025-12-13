import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from './components/Header';
import Navigation from './components/Navigation';
import HeroSection from './components/HeroSection';
import ServicesSection from './components/ServicesSection';
import StatsSection from './components/StatsSection';
import TestimonialsSection from './components/TestimonialsSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import { heroSlides, services, statsData, testimonials } from './data/content';
import { useScrollEffects } from './hooks/useScrollEffects';
import { useIntersectionObserver } from './hooks/useIntersectionObserver';
import { useCarousel } from './hooks/useCarousel';
import './styles/main.css';

const VitrinePage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notreCabinetDropdownOpen, setNotreCabinetDropdownOpen] = useState(false);
  const [expandedService, setExpandedService] = useState<number | null>(null);
  
  const { isScrolled, isHeaderVisible } = useScrollEffects();
  const { isVisible, animatedStats, observerRef } = useIntersectionObserver(statsData);
  const { currentSlide, setCurrentSlide } = useCarousel(heroSlides.length, 6000);
  const { currentSlide: currentTestimonial, setCurrentSlide: setCurrentTestimonial } = useCarousel(testimonials.length, 5000);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const navElement = document.getElementById('main-navigation');
      const menuBtn = document.querySelector('.mobile-menu-btn');
      
      if (mobileMenuOpen && navElement && !navElement.contains(event.target as Node) && 
          menuBtn && !menuBtn.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Close mobile menu on window resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
    setNotreCabinetDropdownOpen(false);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Toggle dropdown
  const toggleNotreCabinetDropdown = () => {
    setNotreCabinetDropdownOpen(!notreCabinetDropdownOpen);
  };

  // Toggle service details
  const toggleServiceDetails = (serviceId: number) => {
    setExpandedService(expandedService === serviceId ? null : serviceId);
  };

  return (
    <div className="vitrine-page">
      {/* Connection Section */}
      <div className={`connection-section ${isScrolled ? 'scrolled' : ''} ${!isHeaderVisible ? 'hidden' : ''}`}>
        <Link to="/login" className="login-button">
          <span>Se connecter</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>

      <Header isScrolled={isScrolled} isHeaderVisible={isHeaderVisible} />
      
      <Navigation 
        isScrolled={isScrolled}
        isHeaderVisible={isHeaderVisible}
        mobileMenuOpen={mobileMenuOpen}
        notreCabinetDropdownOpen={notreCabinetDropdownOpen}
        toggleMobileMenu={toggleMobileMenu}
        toggleNotreCabinetDropdown={toggleNotreCabinetDropdown}
        scrollToSection={scrollToSection}
      />

      <HeroSection 
        slides={heroSlides}
        currentSlide={currentSlide}
        setCurrentSlide={setCurrentSlide}
      />

      <ServicesSection 
        services={services}
        isVisible={isVisible.services}
        expandedService={expandedService}
        toggleServiceDetails={toggleServiceDetails}
      />

      <StatsSection 
        statsData={statsData}
        isVisible={isVisible.stats}
        animatedStats={animatedStats}
      />

      <TestimonialsSection 
        testimonials={testimonials}
        currentTestimonial={currentTestimonial}
        setCurrentTestimonial={setCurrentTestimonial}
        isVisible={isVisible.temoignages}
      />

      <ContactSection isVisible={isVisible.contact} />

      <Footer />
    </div>
  );
};

export default VitrinePage;