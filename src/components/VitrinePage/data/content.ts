import { BarChart3, Calculator, Users, Shield, Lightbulb, Handshake } from 'lucide-react';
import { HeroSlide, Service, StatData, Testimonial } from '../types';

export const heroSlides: HeroSlide[] = [
  {
    id: 1,
    title: "Solutions ERP Innovantes",
    subtitle: "Transformez votre gestion d'entreprise avec nos solutions sur mesure adaptées à votre secteur d'activité",
    image: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    features: ["Intégration complète", "Interface intuitive", "Support 24/7"]
  },
  {
    id: 2,
    title: "Expertise Comptable",
    subtitle: "Accompagnement personnalisé par nos experts-comptables certifiés pour optimiser votre gestion financière",
    image: "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    features: ["Conseil fiscal", "Déclarations", "Optimisation"]
  },
  {
    id: 3,
    title: "Conseil Stratégique",
    subtitle: "Développez votre entreprise avec nos conseils d'experts et notre vision stratégique du marché",
    image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    features: ["Analyse marché", "Plan d'action", "Suivi performance"]
  }
];

export const services: Service[] = [
  {
    id: 1,
    icon: BarChart3,
    title: "Solutions ERP",
    description: "Systèmes de gestion intégrés pour optimiser vos processus métier et améliorer votre productivité",
    details: "Nos solutions ERP sur mesure vous permettent de centraliser et automatiser l'ensemble de vos processus d'entreprise. Gestion des stocks, comptabilité, CRM, tout est intégré dans une seule plateforme.",
    benefits: ["Gain de temps 40%", "Réduction erreurs 60%", "ROI sous 12 mois"],
    features: [
      "Gestion des stocks en temps réel",
      "Comptabilité intégrée",
      "CRM avancé",
      "Reporting automatisé",
      "Interface mobile"
    ]
  },
  {
    id: 2,
    icon: Calculator,
    title: "Expertise Comptable",
    description: "Gestion comptable complète et conseil fiscal personnalisé par nos experts certifiés",
    details: "Notre équipe d'experts-comptables vous accompagne dans toutes vos démarches comptables et fiscales. De la tenue de comptabilité aux déclarations fiscales.",
    benefits: ["Conformité 100%", "Optimisation fiscale", "Conseil personnalisé"],
    features: [
      "Tenue de comptabilité",
      "Déclarations fiscales",
      "Conseil en optimisation",
      "Audit comptable",
      "Formation équipes"
    ]
  },
  {
    id: 3,
    icon: Users,
    title: "Conseil RH",
    description: "Optimisation de la gestion des ressources humaines et développement des talents",
    details: "Accompagnement dans la gestion de vos équipes, paie, et développement des compétences. Solutions complètes pour votre politique RH.",
    benefits: ["Gestion paie", "Formation équipes", "Recrutement"],
    features: [
      "Gestion de la paie",
      "Recrutement et sélection",
      "Formation du personnel",
      "Évaluation des performances",
      "Politique RH"
    ]
  },
  {
    id: 4,
    icon: Shield,
    title: "Audit & Contrôle",
    description: "Audit interne et externe pour sécuriser vos opérations et identifier les risques",
    details: "Évaluation complète de vos processus pour identifier les risques et opportunités d'amélioration. Audit financier, opérationnel et de conformité.",
    benefits: ["Sécurité renforcée", "Conformité réglementaire", "Amélioration continue"],
    features: [
      "Audit financier",
      "Audit opérationnel",
      "Contrôle interne",
      "Évaluation des risques",
      "Recommandations"
    ]
  },
  {
    id: 5,
    icon: Lightbulb,
    title: "Innovation Digitale",
    description: "Transformation numérique et intégration des nouvelles technologies",
    details: "Accompagnement dans votre transformation digitale avec les dernières innovations technologiques. IA, automatisation, dématérialisation.",
    benefits: ["Modernisation", "Automatisation", "Compétitivité"],
    features: [
      "Transformation digitale",
      "Intelligence artificielle",
      "Automatisation des processus",
      "Dématérialisation",
      "Solutions cloud"
    ]
  },
  {
    id: 6,
    icon: Handshake,
    title: "Conseil Stratégique",
    description: "Stratégie d'entreprise et développement commercial pour accélérer votre croissance",
    details: "Élaboration de stratégies sur mesure pour accélérer votre croissance et votre développement. Analyse concurrentielle et plan d'action.",
    benefits: ["Croissance +25%", "Nouveaux marchés", "Stratégie gagnante"],
    features: [
      "Analyse stratégique",
      "Plan de développement",
      "Étude de marché",
      "Conseil en croissance",
      "Accompagnement changement"
    ]
  }
];

export const statsData: StatData[] = [
  { key: 'clients', target: 500, label: 'Clients Satisfaits', suffix: '+', description: 'Entreprises nous font confiance' },
  { key: 'experience', target: 15, label: "Années d'Expérience", suffix: '', description: 'Dans le conseil aux entreprises' },
  { key: 'satisfaction', target: 98, label: 'Taux de Satisfaction', suffix: '%', description: 'De nos clients recommandent nos services' },
  { key: 'support', target: 24, label: 'Support Client', suffix: '/7', description: 'Disponibilité de notre équipe' }
];

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Marie Dubois",
    company: "TechStart SAS",
    role: "Directrice Générale",
    content: "CMT nous a accompagnés dans notre transformation digitale. Leur expertise et leur réactivité ont été déterminantes pour notre croissance. Une équipe exceptionnelle qui comprend vraiment les enjeux de l'entreprise moderne.",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: 2,
    name: "Pierre Martin",
    company: "Industrie Plus",
    role: "Directeur Financier",
    content: "Un partenaire de confiance depuis 8 ans. Leur solution ERP a révolutionné notre gestion et nous a fait gagner un temps précieux. L'accompagnement personnalisé fait toute la différence.",
    avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: 3,
    name: "Sophie Laurent",
    company: "Commerce Retail",
    role: "Responsable Comptabilité",
    content: "L'équipe CMT est exceptionnelle. Leur accompagnement personnalisé et leur expertise technique sont remarquables. Ils ont su s'adapter parfaitement à nos besoins spécifiques.",
    avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=100&h=100&fit=crop&crop=face"
  }
];