import React from 'react';
import { Star } from 'lucide-react';
import { Testimonial } from '../types';

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  currentTestimonial: number;
  setCurrentTestimonial: (index: number) => void;
  isVisible: boolean;
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  testimonials,
  currentTestimonial,
  setCurrentTestimonial,
  isVisible
}) => {
  return (
    <section id="temoignages" className={`testimonials-section ${isVisible ? 'animate-in' : ''}`}>
      <div className="container">
        <div className="section-header">
          <div className="section-badge">
            <Star size={16} />
            <span>Témoignages</span>
          </div>
          <h2>Ce que disent nos clients</h2>
          <p>Découvrez les retours d'expérience de nos clients satisfaits</p>
        </div>
        
        <div className="testimonials-carousel">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.id} 
              className={`testimonial-card ${index === currentTestimonial ? 'active' : ''}`}
            >
              <div className="testimonial-content">
                <div className="quote-icon">
                  <span>"</span>
                </div>
                <p className="testimonial-text">"{testimonial.content}"</p>
                <div className="testimonial-author">
                  <img src={testimonial.avatar} alt={testimonial.name} className="author-avatar" />
                  <div className="author-info">
                    <h4 className="author-name">{testimonial.name}</h4>
                    <p className="author-company">{testimonial.role} - {testimonial.company}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="testimonials-dots">
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`testimonial-dot ${index === currentTestimonial ? 'active' : ''}`}
              onClick={() => setCurrentTestimonial(index)}
              aria-label={`Témoignage ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;