import { useState, useEffect } from 'react';

export const useScrollEffects = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  let lastScrollY = 0;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Determine if header should be visible
      if (currentScrollY > 100) {
        // Hide header when scrolling down, show when scrolling up
        setIsHeaderVisible(currentScrollY < lastScrollY || currentScrollY < 300);
      } else {
        setIsHeaderVisible(true);
      }
      
      // Set scrolled state for styling
      setIsScrolled(currentScrollY > 50);
      
      // Update last scroll position
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { isScrolled, isHeaderVisible };
};