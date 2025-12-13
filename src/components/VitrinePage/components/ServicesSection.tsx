import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, Check, ExternalLink } from 'lucide-react';
import { Service } from '../types';

interface ServicesSectionProps {
  services: Service[];
  isVisible: boolean;
  expandedService: number | null;
  toggleServiceDetails: (serviceId: number) => void;
}

const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  isVisible,
  expandedService,
  toggleServiceDetails
}) => {
  const [animatedServices, setAnimatedServices] = useState<boolean[]>(Array(services.length).fill(false));
  
  // Animate services on scroll into view
  useEffect(() => {
    if (isVisible) {
      const timers = services.map((_, index) => {
        return setTimeout(() => {
          setAnimatedServices(prev => {
            const newState = [...prev];
            newState[index] = true;
            return newState;
          });
        }, 150 * index);
      });
      
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [isVisible, services.length]);
  
  // Filter services by category
  const [activeFilter, setActiveFilter] = useState<'all' | 'finance' | 'strategy' | 'tech'>('all');
  
  // Map services to categories for filtering
  const categoryMap = {
    finance: [1, 2, 4], // ERP, Expertise Comptable, Audit
    strategy: [3, 6],   // RH, Conseil Stratégique
    tech: [5]           // Innovation Digitale
  };
  
  const filteredServices = services.filter(service => 
    activeFilter === 'all' || categoryMap[activeFilter].includes(service.id)
  );
  
  return (
    <section id="services" className={`services-section ${isVisible ? 'section-visible' : ''}`}>
      <div className="services-bg-pattern"></div>
      <div className="container">
        <div className="section-header">
          <div className="section-badge">
            <Star size={16} />
            <span>Nos Expertises</span>
          </div>
          <h2>Des solutions complètes pour votre réussite</h2>
          <p>Découvrez notre gamme de services conçus pour accompagner votre entreprise à chaque étape de son développement</p>
        
          <div className="service-filters">
            <button 
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Tous les services
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'finance' ? 'active' : ''}`}
              onClick={() => setActiveFilter('finance')}
            >
              Finance &amp; Comptabilité
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'strategy' ? 'active' : ''}`}
              onClick={() => setActiveFilter('strategy')}
            >
              Stratégie &amp; RH
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'tech' ? 'active' : ''}`}
              onClick={() => setActiveFilter('tech')}
            >
              Innovation Tech
            </button>
          </div>
        </div>
        
        <div className="services-grid">
          {filteredServices.map((service, index) => {
            const IconComponent = service.icon;
            const isExpanded = expandedService === service.id;
            
            return (
              <div 
                key={service.id} 
                className={`service-card ${isExpanded ? 'expanded' : ''} ${animatedServices[index] ? 'animate-in' : ''}`}
              >
                <div className="service-card-inner">
                  <div className="service-icon-wrapper">
                    <div className="service-icon-bg"></div>
                    <IconComponent className="service-icon" size={48} />
                  </div>
                  <h3 className="service-title">{service.title}</h3>
                  
                  <div className="service-rating">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star}
                        size={16}
                        className="star-icon"
                        fill={star <= 5 ? "currentColor" : "none"}
                      />
                    ))}
                    <span className="rating-text">5.0</span>
                  </div>
                  
                  <p className="service-description">{service.description}</p>
                  
                  <div className="service-features">
                    {service.benefits.map((benefit, idx) => (
                      <span key={idx} className="feature-tag">{benefit}</span>
                    ))}
                  </div>

                  <button 
                    className="service-btn"
                    onClick={() => toggleServiceDetails(service.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`service-details-${service.id}`}
                  >
                    {isExpanded ? 'Voir moins' : 'En savoir plus'}
                  </button>
                </div>
                
                <div 
                  id={`service-details-${service.id}`}
                  className={`service-details ${isExpanded ? 'expanded' : ''}`}
                >
                  <h4>Détails du service</h4>
                  <p>{service.details}</p>
                  <ul className="service-list">
                    {service.features.map((feature, idx) => (
                      <li key={idx}>
                        <Check size={16} className="check-icon" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="service-actions">
                    <Link to="/login" className="service-cta primary">
                      <span>Demander un devis</span>
                      <ArrowRight size={16} />
                    </Link>
                    <a href="#contact" className="service-cta secondary">
                      <span>Nous contacter</span>
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="services-footer">
          <p className="services-note">Des besoins spécifiques ? Nous proposons également des solutions personnalisées pour votre entreprise.</p>
          <a href="#contact" className="services-contact-link">
            <span>Discutons de votre projet</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;