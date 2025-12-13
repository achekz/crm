import { useState, useEffect, useRef } from 'react';
import { StatData } from '../types';

export const useIntersectionObserver = (statsData: StatData[]) => {
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({});
  const [animatedStats, setAnimatedStats] = useState<{ [key: string]: number }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Animate stats numbers
  const animateStats = () => {
    statsData.forEach(stat => {
      let current = 0;
      const increment = stat.target / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= stat.target) {
          current = stat.target;
          clearInterval(timer);
        }
        setAnimatedStats(prev => ({ ...prev, [stat.key]: Math.floor(current) }));
      }, 30);
    });
  };

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
            
            // Animate stats when stats section becomes visible
            if (entry.target.id === 'stats') {
              animateStats();
            }

            // Animate service cards
            if (entry.target.classList.contains('service-card')) {
              entry.target.classList.add('animate-in');
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe all sections
    const sections = document.querySelectorAll('section[id], .service-card');
    sections.forEach(section => {
      if (observerRef.current) {
        observerRef.current.observe(section);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { isVisible, animatedStats, observerRef };
};