/* Nufaa — Tailwind CDN config. Loaded after cdn.tailwindcss.com on every page. */
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Clash Display"', 'Outfit', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        ink:    '#0B1524',
        navy:   '#11264A',
        steel:  '#2E5A8F',
        pine:   '#176A32',
        leaf:   '#43A747',
        lime:   '#8CC63F',
        slate2: '#5B6B7F',
        cream:  '#F6F7F2',
        shell:  '#FFFFFF'
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
        xl4: '2.25rem'
      },
      maxWidth: {
        site: '78rem'
      }
    }
  }
};
