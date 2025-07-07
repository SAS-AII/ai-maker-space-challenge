import { useState, useEffect } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  startDelay?: number;
}

export const useTypewriter = ({ 
  text, 
  speed = 35, 
  startDelay = 0 
}: UseTypewriterOptions) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, currentIndex === 0 ? startDelay : speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && !isComplete) {
      setIsComplete(true);
    }
  }, [currentIndex, text, speed, startDelay, isComplete]);

  const reset = () => {
    setDisplayText('');
    setCurrentIndex(0);
    setIsComplete(false);
  };

  return { displayText, isComplete, reset };
}; 