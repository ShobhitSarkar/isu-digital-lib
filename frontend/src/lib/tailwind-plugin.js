// src/lib/tailwind-plugin.js
const plugin = require('tailwindcss/plugin')

module.exports = plugin(function({ addUtilities }) {
  addUtilities({
    '.outline-ring': {
      'outline-color': 'var(--ring)'
    },
    '.outline-ring\\/50': {
      'outline-color': 'var(--ring)',
      'opacity': '0.5'
    },
    '.border-border': {
      'border-color': 'var(--border)'
    },
    '.bg-background': {
      'background-color': 'var(--background)'
    },
    '.text-foreground': {
      'color': 'var(--foreground)'
    },
    '.bg-cardinal': {
      'background-color': 'var(--cardinal)'
    },
    '.text-cardinal': {
      'color': 'var(--cardinal)'
    },
    '.bg-gold': {
      'background-color': 'var(--gold)'
    },
    '.text-gold': {
      'color': 'var(--gold)'
    }
  })
})