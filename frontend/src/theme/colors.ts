export const colors = {
  white: '#FFFFFF',
  cyan: '#00A7E1',
  navy: '#00171F',
  deep: '#003459',
  teal: '#007EA7',
} as const;

export type ColorKey = keyof typeof colors;
