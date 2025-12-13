import { DivideIcon as LucideIcon } from 'lucide-react';

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  features: string[];
}

export interface Service {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  details: string;
  benefits: string[];
  features: string[];
}

export interface StatData {
  key: string;
  target: number;
  label: string;
  suffix: string;
  description: string;
}

export interface Testimonial {
  id: number;
  name: string;
  company: string;
  role: string;
  content: string;
  avatar: string;
}