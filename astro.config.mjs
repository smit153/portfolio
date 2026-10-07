// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Sohne Mono',
      cssVariable: '--font-sohne-mono',
      fallbacks: ['monospace'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/SohneMono-Extraleicht.woff2'], weight: 200, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-ExtraleichtKursiv.woff2'], weight: 200, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Leicht.woff2'], weight: 300, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-LeichtKursiv.woff2'], weight: 300, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Buch.woff2'], weight: 400, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-BuchKursiv.woff2'], weight: 400, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Kraftig.woff2'], weight: 500, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-KraftigKursiv.woff2'], weight: 500, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Halbfett.woff2'], weight: 600, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-HalbfettKursiv.woff2'], weight: 600, style: 'italic' },
          // the 700 italic's file name is truncated in the font package
          { src: ['./src/assets/fonts/SohneMono-Dreiviertelfett.woff2'], weight: 700, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-DreiviertelfettKurs.woff2'], weight: 700, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Fett.woff2'], weight: 800, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-FettKursiv.woff2'], weight: 800, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Extrafett.woff2'], weight: 900, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-ExtrafettKursiv.woff2'], weight: 900, style: 'italic' }
        ]
      }
    },
    {
      provider: fontProviders.local(),
      name: 'Grape Nuts',
      cssVariable: '--font-grape-nuts',
      fallbacks: ['cursive'],
      options: {
        variants: [{ src: ['./src/assets/fonts/GrapeNuts-Regular.woff2'], weight: 400, style: 'normal' }]
      }
    },
    {
      provider: fontProviders.google(),
      name: 'Caveat',
      cssVariable: '--font-caveat',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['cursive']
    }
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
