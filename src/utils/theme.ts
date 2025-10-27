// Consistent theme configuration for Tailwind classes
export const theme = {
  // Colors
  bg: {
    primary: 'bg-gray-900',
    secondary: 'bg-gray-800',
    overlay: 'bg-gray-950/50',
    button: 'bg-gray-800/50',
    hover: 'hover:bg-gray-700/50',
  },

  colors: {
    primary: 'text-gray-200',
    secondary: 'text-gray-300',
    muted: 'text-gray-400',
    dim: 'text-gray-500',
    accent: 'text-blue-400',
    warning: 'text-yellow-500',
  },

  border: {
    default: 'border-gray-800/40',
    subtle: 'border-gray-700/30',
  },

  // Spacing
  padding: {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'px-3 py-1.5',
    lg: 'px-6 py-3',
  },

  // Typography
  size: {
    xs: 'text-[10px]',
    sm: 'text-[11px]',
    base: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  },

  // Buttons
  button: {
    base: 'transition-all rounded',
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    secondary: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400',
    ghost: 'hover:bg-gray-800/50 text-gray-500 hover:text-gray-300',
  },
} as const;

// Utility to join class names
export const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');
