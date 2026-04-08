export const uiMotion = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '240ms',
    slow: '360ms',
    slower: '480ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  scale: {
    hover: '1.01',
    press: '0.985',
  },
  transition: {
    colors:
      'background-color 240ms cubic-bezier(0.2, 0, 0, 1), border-color 240ms cubic-bezier(0.2, 0, 0, 1), color 240ms cubic-bezier(0.2, 0, 0, 1)',
    emphasis:
      'background-color 240ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 240ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 240ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  reducedMotion: {
    duration: '1ms',
    behavior: 'reduce',
  },
} as const;

export type UIMotionToken = typeof uiMotion;
