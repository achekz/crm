import { useState, useEffect } from 'react';

export const useCarousel = (length: number, interval: number = 5000) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [length, interval]);

  return { currentSlide, setCurrentSlide };
};