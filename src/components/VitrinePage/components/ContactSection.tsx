import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send, Calendar, CheckCircle, Loader2 } from 'lucide-react';

interface ContactSectionProps {
  isVisible: boolean;
}

const ContactSection: React.FC<ContactSectionProps> = ({ isVisible }) => {
  const [formState, setFormState] = useState({
    nom: '',
    email: '',
    entreprise: '',
    service: '',
    message: '',
  });
  
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formState.nom.trim()) errors.nom = 'Le nom est requis';
    
    if (!formState.email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/^\S+@\S+\.\S+$/.test(formState.email)) {
      errors.email = 'Format d\'email invalide';
    }
    
    if (!formState.message.trim()) errors.message = 'Le message est requis';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    
    // Clear error when typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormStatus('submitting');
    
    // Simulate form submission
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setFormStatus('success');
      setFormState({
        nom: '',
        email: '',
        entreprise: '',
        service: '',
        message: '',
      });
      setTimeout(() => setFormStatus('idle'), 3000);
    } catch (error) {
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };
  
  return (
    <section id="contact" className={`contact-section ${isVisible ? 'animate-in' : ''}`}>
      <div className="contact-background"></div>
      <div className="contact-pattern"></div>
      <div className="contact-content">
        <div className="section-header">
          <span className="section-badge">Contact</span>
          <h2 className="contact-title">Parlons de votre projet</h2>
          <div className="section-subtitle">Notre équipe d'experts est à votre disposition pour étudier vos besoins et vous proposer des solutions sur mesure.</div>
        </div>
        
        <div className="contact-grid">
          <div className="contact-info-section">
            <div className="contact-methods">
              <div className="contact-method">
                <div className="method-icon">
                  <Phone size={20} />
                </div>
                <div className="method-info">
                  <h4>Téléphone</h4>
                  <p><a href="tel:+21694338220" style={{ color: 'black' }}>94338220</a></p>
                </div>
              </div>
              
              <div className="contact-method">
                <div className="method-icon">
                  <Mail size={20} />
                </div>
                <div className="method-info">
                  <h4>Email</h4>
                  <p><a href="mailto:contact@cmt.tn" style={{ color: 'black' }}>contact@cmt.tn</a></p>
                </div>
              </div>
              
              <div className="contact-method">
                <div className="method-icon">
                  <MapPin size={20} />
                </div>
                <div className="method-info">
                  <h4>Adresse</h4>
                  <p>Monastir<br />Monastir, Tunisie</p>
                </div>
              </div>
              
              <div className="contact-method">
                <div className="method-icon">
                  <Calendar size={20} />
                </div>
                <div className="method-info">
                  <h4>Horaires</h4>
                  <p>Lundi - Vendredi : 9h - 18h<br />Week-end : Fermé</p>
                </div>
              </div>
            </div>
            
            <div className="contact-map">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2933.473272665128!2d10.830032203349582!3d35.76539559083775!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x130212c8d76d9fd7%3A0x8242cb8afd4cbe60!2sQR8H%2B32R%2C%20Monastir!5e0!3m2!1sen!2stn!4v1753097831796!5m2!1sen!2stn" 
                width="100%" 
                height="250" 
                style={{ border: 0, borderRadius: '1rem' }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Carte de notre localisation"
              ></iframe>
            </div>
          </div>
          
          <div className="contact-form-container">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row form-row-2">
                <div className={`form-group ${formErrors.nom ? 'has-error' : ''}`}>
                  <label htmlFor="nom">Nom <span className="required-mark">*</span></label>
                  <input 
                    type="text" 
                    id="nom" 
                    name="nom" 
                    value={formState.nom}
                    onChange={handleInputChange}
                    required 
                  />
                  {formErrors.nom && <span className="error-message">{formErrors.nom}</span>}
                </div>
                <div className={`form-group ${formErrors.email ? 'has-error' : ''}`}>
                  <label htmlFor="email">Email <span className="required-mark">*</span></label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={formState.email}
                    onChange={handleInputChange}
                    required 
                  />
                  {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="entreprise">Entreprise</label>
                <input 
                  type="text" 
                  id="entreprise" 
                  name="entreprise" 
                  value={formState.entreprise}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="service">Service souhaité</label>
                <select 
                  id="service" 
                  name="service" 
                  value={formState.service}
                  onChange={handleInputChange}
                >
                  <option value="">Sélectionnez un service</option>
                  <option value="erp">Solutions ERP</option>
                  <option value="comptable">Expertise Comptable</option>
                  <option value="rh">Conseil RH</option>
                  <option value="audit">Audit & Contrôle</option>
                  <option value="digital">Innovation Digitale</option>
                  <option value="strategique">Conseil Stratégique</option>
                </select>
              </div>
              
              <div className={`form-group ${formErrors.message ? 'has-error' : ''}`}>
                <label htmlFor="message">Message <span className="required-mark">*</span></label>
                <textarea 
                  id="message" 
                  name="message" 
                  rows={5} 
                  value={formState.message}
                  onChange={handleInputChange}
                  required
                ></textarea>
                {formErrors.message && <span className="error-message">{formErrors.message}</span>}
              </div>
              
              <div className="form-submit-row">
                <div className="form-status">
                  {formStatus === 'success' && (
                    <span className="success-message">
                      <CheckCircle size={16} />
                      Message envoyé avec succès !
                    </span>
                  )}
                  {formStatus === 'error' && (
                    <span className="error-message">
                      Une erreur est survenue. Veuillez réessayer.
                    </span>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={formStatus === 'submitting'}
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Envoyer le message</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;