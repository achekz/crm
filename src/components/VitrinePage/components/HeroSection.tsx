import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, ArrowRight, Play } from 'lucide-react';
import { HeroSlide } from '../types';

interface HeroSectionProps {
  slides: HeroSlide[];
  currentSlide: number;
  setCurrentSlide: (index: number) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ slides, currentSlide, setCurrentSlide }) => {
  const nextSlide = () => {
    setCurrentSlide((currentSlide + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((currentSlide - 1 + slides.length) % slides.length);
  };

  return (
    <section id="accueil" className="hero-section">
      <div className="hero-carousel">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <h1 className="hero-title">{slide.title}</h1>
              <p className="hero-subtitle">{slide.subtitle}</p>
              
              <div className="hero-features">
                {slide.features.map((feature, idx) => (
                  <div key={idx} className="hero-feature">
                    <CheckCircle size={16} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="hero-actions">
                <Link to="/login" className="cta-button primary">
                  <span>Découvrir nos solutions</span>
                  <ArrowRight size={18} />
                </Link>
                <button className="cta-button secondary">
                  <Play size={16} />
                  <span>Voir la démo</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-controls">
        <button 
          className="carousel-prev"
          onClick={prevSlide}
          aria-label="Slide précédent"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="carousel-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Aller au slide ${index + 1}`}
            />
          ))}
        </div>
        
        <button 
          className="carousel-next"
          onClick={nextSlide}
          aria-label="Slide suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
};

export default HeroSection;