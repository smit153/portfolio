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
          { src: ['./src/assets/fonts/SohneMono-Extraleicht.ttf'], weight: 200, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-ExtraleichtKursiv.ttf'], weight: 200, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Leicht.ttf'], weight: 300, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-LeichtKursiv.ttf'], weight: 300, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Buch.ttf'], weight: 400, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-BuchKursiv.ttf'], weight: 400, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Kraftig.ttf'], weight: 500, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-KraftigKursiv.ttf'], weight: 500, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Halbfett.ttf'], weight: 600, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-HalbfettKursiv.ttf'], weight: 600, style: 'italic' },
          // the 700 italic's file name is truncated in the font package
          { src: ['./src/assets/fonts/SohneMono-Dreiviertelfett.ttf'], weight: 700, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-DreiviertelfettKurs.ttf'], weight: 700, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Fett.ttf'], weight: 800, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-FettKursiv.ttf'], weight: 800, style: 'italic' },
          { src: ['./src/assets/fonts/SohneMono-Extrafett.ttf'], weight: 900, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-ExtrafettKursiv.ttf'], weight: 900, style: 'italic' }
        ]
      }
    },
    {
      provider: fontProviders.local(),
      name: 'Grape Nuts',
      cssVariable: '--font-grape-nuts',
      fallbacks: ['cursive'],
      options: {
        variants: [{ src: ['./src/assets/fonts/GrapeNuts-Regular.ttf'], weight: 400, style: 'normal' }]
      }
    }
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
