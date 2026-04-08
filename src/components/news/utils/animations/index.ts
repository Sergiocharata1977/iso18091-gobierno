'use client';

import React from 'react';

// Animation utility functions and keyframes for the news center

export const animations = {
  // Fade in animation
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  // Slide in from right
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  // Scale in animation
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  // Bounce animation for reactions
  bounce: {
    animate: { scale: [1, 1.2, 1] },
    transition: { duration: 0.6, ease: 'easeInOut' },
  },

  // Pulse animation for loading states
  pulse: {
    animate: { opacity: [1, 0.5, 1] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },

  // Stagger animation for lists
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  // Skeleton loading animation
  skeletonAnimation: {
    animate: {
      background: [
        'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
      ],
      backgroundSize: '200% 100%',
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },

  // Card hover effect
  cardHover: {
    initial: {},
    animate: {},
    whileHover: {
      y: -4,
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.2 },
    },
  },
};

// Custom hook for managing animation states
export function useAnimationState(initialState = false) {
  const [isAnimating, setIsAnimating] = React.useState(initialState);

  const triggerAnimation = React.useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600); // Reset after animation
  }, []);

  return [isAnimating, triggerAnimation] as const;
}

// Utility function to get responsive animation variants
export function getResponsiveAnimation(
  baseAnimation: any,
  breakpoint: 'mobile' | 'tablet' | 'desktop'
) {
  const multipliers = {
    mobile: 0.8,
    tablet: 0.9,
    desktop: 1,
  };

  const multiplier = multipliers[breakpoint];

  return {
    ...baseAnimation,
    transition: {
      ...baseAnimation.transition,
      duration: (baseAnimation.transition?.duration || 0.3) * multiplier,
    },
  };
}

// Loading skeleton animation
export const skeletonAnimation = {
  animate: {
    background: [
      'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    ],
    backgroundSize: '200% 100%',
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
};

// Hover animations for interactive elements
export const hoverAnimations = {
  lift: {
    whileHover: { y: -2 },
    transition: { duration: 0.2 },
  },

  glow: {
    whileHover: {
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
      scale: 1.02,
    },
    transition: { duration: 0.2 },
  },

  scale: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.1 },
  },
};

// Page transition animations
export const pageTransitions = {
  slideLeft: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
    transition: { duration: 0.3, ease: 'easeInOut' },
  },

  slideUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
    transition: { duration: 0.3, ease: 'easeInOut' },
  },

  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
};

// Notification animations
export const notificationAnimations = {
  slideDown: {
    initial: { opacity: 0, y: -50, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  toast: {
    initial: { opacity: 0, x: 300, scale: 0.8 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 300, scale: 0.8 },
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
};

// Modal animations
export const modalAnimations = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },

  modal: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// Button press animation
export const buttonPress = {
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Card hover effects
export const cardHover = {
  whileHover: {
    y: -4,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    transition: { duration: 0.2 },
  },
};

// Infinite scroll loading animation
export const infiniteScrollLoader = {
  animate: {
    rotate: 360,
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear',
  },
};
