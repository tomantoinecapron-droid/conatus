export const theme = {
  background: '#F7F4EE',
  surface: '#EDEAE3',
  surfaceHover: '#E3E0D8',
  border: '#D5D0C8',
  textSecondary: '#9A9690',
  textPrimary: '#1A1A2E',
} as const

export type Theme = typeof theme
