const plugin = require('tailwindcss/plugin')
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,html}"],
  darkMode: "class",
  theme: {
    // Add xs breakpoint for small mobile devices
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1440px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1rem',
        md: '2rem',
        lg: '2rem',
        xl: '2.5rem',
        '2xl': '3rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      // ======================
      // Apple-Inspired Colors
      // ======================
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        // === Semantic Colors ===
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },

        // === Apple-Inspired System Palette ===
        apple: {
          blue: '#007AFF',
          'blue-dark': '#0051D5',
          green: '#34C759',
          indigo: '#5856D6',
          orange: '#FF9500',
          pink: '#FF2D55',
          purple: '#AF52DE',
          red: '#FF3B30',
          teal: '#5AC8FA',
          yellow: '#FFCC00',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F2F2F7',
          200: '#E5E5EA',
          300: '#D1D1D6',
          400: '#C7C7CC',
          500: '#AEAEB2',
          600: '#8E8E93',
          700: '#636366',
          800: '#48484A',
          900: '#3A3A3C',
          950: '#1C1C1E',
        },
      },

      // ======================
      // Radius
      // ======================
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      },

      // ======================
      // Font System
      // ======================
      fontFamily: {
        sans: [
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        text: ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Roboto Mono',
          'source-code-pro',
          'Menlo',
          'monospace',
        ],
      },

      fontSize: {
        'display-2xl': ['clamp(2.25rem, 1.5rem + 2vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-xl':  ['clamp(2rem, 1.25rem + 1.5vw, 3rem)',   { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'headline':    ['clamp(1.5rem, 1.1rem + 0.9vw, 2rem)',   { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'title':       ['clamp(1.25rem, 1.05rem + 0.5vw, 1.5rem)',{ lineHeight: '1.25' }],
        'subhead':     ['clamp(1.125rem, 1rem + 0.3vw, 1.25rem)', { lineHeight: '1.35' }],
        'body':        ['1rem', { lineHeight: '1.5' }],
        'callout':     ['0.9375rem', { lineHeight: '1.45' }],
        'footnote':    ['0.8125rem', { lineHeight: '1.4' }],
        'caption2':    ['0.75rem', { lineHeight: '1.35', letterSpacing: '0.01em' }],
      },

      // ======================
      // Spacing
      // ======================
      spacing: {
        '0.5': '2px',
        '1.5': '6px',
        '2.5': '10px',
        '3.5': '14px',
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
        '17': '68px',
        '18': '72px',
        '19': '76px',
        '21': '84px',
        'theme-xs': 'calc(0.25rem * var(--spacing-unit, 1))',
        'theme-sm': 'calc(0.5rem * var(--spacing-unit, 1))',
        'theme-md': 'calc(1rem * var(--spacing-unit, 1))',
        'theme-lg': 'calc(1.5rem * var(--spacing-unit, 1))',
        'theme-xl': 'calc(2rem * var(--spacing-unit, 1))',
        'theme-2xl': 'calc(3rem * var(--spacing-unit, 1))',
      },

      opacity: {
        2.5: '0.025',
        7.5: '0.075',
        15: '0.15',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '18px',
      },

      // ======================
      // Shadows
      // ======================
      boxShadow: {
        'apple-xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'apple-sm': '0 1px 2px rgba(0,0,0,0.05), 0 1px 1px rgba(0,0,0,0.08)',

        'apple-md': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'apple-xl': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',

        // Depth system
        'depth-1': '0 0.5px 1px rgba(0, 0, 0, 0.025), 0 0.5px 0.5px rgba(0, 0, 0, 0.035)',
        'depth-2': '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 1px rgba(0, 0, 0, 0.04)',
        'depth-3': '0 2px 4px rgba(0, 0, 0, 0.035), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'depth-4': '0 4px 8px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.035)',
        'depth-5': '0 8px 16px rgba(0, 0, 0, 0.045), 0 4px 8px rgba(0, 0, 0, 0.03)',
      },

      // ======================
      // Animations
      // ======================
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-subtle': 'bounceSubtle 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'scroll': 'scroll 30s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-in': 'cubic-bezier(0.42, 0, 1, 1)',
        'ios-out': 'cubic-bezier(0, 0, 0.58, 1)',
        'bounce-subtle': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    }
  },

  plugins: [
    plugin(function({ addComponents, addUtilities, theme }) {
      // --- Components ---
      addComponents({
        // Buttons
        '.btn': {
          '@apply inline-flex items-center justify-center select-none rounded-full font-medium transition-all duration-200 ease-ios focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2': {},
          minHeight: '44px',
          paddingInline: '1rem',
          lineHeight: '1.25',
        },
        '.btn-primary': {
          background: `linear-gradient(180deg, ${theme('colors.primary.DEFAULT')} 0%, ${theme('colors.secondary.DEFAULT')} 100%)`,
          color: theme('colors.primary.foreground'),
          '@apply shadow-apple-sm hover:shadow-apple-md active:scale-[0.98]': {},
        },
        '.btn-outline': {
          '@apply border border-border text-foreground bg-background hover:bg-muted/50 active:scale-[0.98]': {},
        },
        '.btn-ghost': {
          '@apply bg-transparent text-foreground hover:bg-muted/40': {},
        },

        // Cards
        '.card': {
          '@apply rounded-2xl  text-card-foreground  border border-border/60': {},
        },
        '.card-glass': {
          '@apply rounded-2xl border border-white/20 shadow-glass': {},
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          backdropFilter: 'saturate(160%) blur(10px)',
        },

        // Badges
        '.badge': {
          '@apply inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border': {},
        },
        '.badge-info': {
          '@apply badge bg-info/10 text-info border-info/20': {},
        },
        '.badge-success': {
          '@apply badge bg-success/10 text-success border-success/20': {},
        },
        '.badge-warning': {
          '@apply badge bg-warning/10 text-warning border-warning/20': {},
        },
        '.badge-destructive': {
          '@apply badge bg-destructive/10 text-destructive border-destructive/20': {},
        },

        // Navigation blur bar
        '.nav-blur': {
          '@apply sticky top-0 z-40 border-b border-border/40': {},
          background: 'rgba(250, 250, 252, 0.6)',
          backdropFilter: 'saturate(180%) blur(12px)',
        },
        '.nav-blur-dark': {
          background: 'rgba(22, 22, 24, 0.6)',
          backdropFilter: 'saturate(180%) blur(12px)',
        },
      });

      // --- Utilities ---
      addUtilities({
        '.scrollbar-hide': {
          /* Hide scrollbar for Chrome, Safari and Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          /* Hide scrollbar for IE, Edge and Firefox */
          '-ms-overflow-style': 'none',  /* IE and Edge */
          'scrollbar-width': 'none',  /* Firefox */
        },
        '.scrollbar-thin': {
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(156, 163, 175, 0.4)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(156, 163, 175, 0.6)',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(156, 163, 175, 0.4) transparent',
        },
        '.safe-area-inset': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
        // Elevation scale
        '.elevation-1': { boxShadow: theme('boxShadow.depth-1') },
        '.elevation-2': { boxShadow: theme('boxShadow.depth-2') },
        '.elevation-3': { boxShadow: theme('boxShadow.depth-3') },
        '.elevation-4': { boxShadow: theme('boxShadow.depth-4') },
        '.elevation-5': { boxShadow: theme('boxShadow.depth-5') },

        // Focus ring
        '.focus-ring': {
          outline: 'none',
          boxShadow: `0 0 0 2px ${theme('colors.ring')}, 0 0 0 4px rgba(0,0,0,0.05)`,
        },

        // Pressable micro-interaction
        '.pressable': {
          transition: 'transform 120ms var(--tw-ease-bounce-subtle), box-shadow 200ms var(--tw-ease-ios)',
        },
        '.pressable:active': {
          transform: 'translateY(1px) scale(0.99)',
        },

        // Glass helpers
        '.glass': {
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          backdropFilter: 'saturate(160%) blur(10px)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: theme('boxShadow.glass'),
        },

        // Skeleton block
        '.skeleton': {
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03), rgba(0,0,0,0.06))',
          backgroundSize: '200% 100%',
          animation: 'skeleton-loading 1.2s ease-in-out infinite',
        },
        '@keyframes skeleton-loading': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },

        // Segmented control
        '.segmented': {
          '@apply inline-flex items-center rounded-full bg-muted p-1 border border-border/60': {},
        },
        '.segmented-item': {
          '@apply px-3 py-1.5 rounded-full text-sm transition-all duration-200 ease-ios': {},
        },
        '.segmented-item[aria-pressed="true"], .segmented-item[aria-selected="true"]': {
          '@apply bg-background shadow-apple-xs': {},
        },

        /* ---------- Premium Section Helpers ---------- */
        '.section-ink': {
          background: 'radial-gradient(1200px 600px at 20% -10%, rgba(99,102,241,0.10), transparent 60%), radial-gradient(1000px 500px at 90% 10%, rgba(147,51,234,0.10), transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.02))'
        },
        '.section-ink-dark': {
          background: 'radial-gradient(1200px 600px at 20% -10%, rgba(99,102,241,0.20), transparent 60%), radial-gradient(1000px 500px at 90% 10%, rgba(147,51,234,0.20), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00))'
        },
        '.ambient': {
          position: 'relative'
        },
        '.ambient:before': {
          content: '""',
          position: 'absolute',
          inset: '-2px',
          borderRadius: '24px',
          background: 'conic-gradient(from 180deg at 50% 50%, rgba(147,51,234,0.25), rgba(59,130,246,0.25), rgba(147,51,234,0.25))',
          filter: 'blur(24px)',
          opacity: '0.5',
          pointerEvents: 'none'
        },
        '.noise-soft': {
          backgroundImage: 'url("data:image/svg+xml;utf8,&lt;svg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'140\' viewBox=\'0 0 140 140\'&gt;&lt;filter id=\'n\' x=\'0\' y=\'0\'&gt;&lt;feTurbulence type=\'fractalNoise\' baseFrequency=\'.65\' numOctaves=\'2\' stitchTiles=\'stitch\'/&gt;&lt;/filter&gt;&lt;rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\' opacity=\'.04\' /&gt;&lt;/svg&gt;")',
          backgroundSize: '140px 140px'
        },
        '.edge-fade-x': {
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)'
        },
        '.hairline-top': {
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)'
        },
        '.scroll-snap-x': {
          scrollSnapType: 'x mandatory'
        },
        '.snap-center': {
          scrollSnapAlign: 'center'
        },
        '.snap-always': {
          scrollSnapStop: 'always'
        }
      });
    }),
  ],
}
