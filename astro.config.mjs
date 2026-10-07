// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

const sohne = (/** @type {string} */ file, /** @type {number} */ weight) => [
  { src: [`./src/assets/fonts/SohneMono-${file}.ttf`], weight, style: 'normal' },
  { src: [`./src/assets/fonts/SohneMono-${file}Kursiv.ttf`], weight, style: 'italic' }
];

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
          ...sohne('Extraleicht', 200),
          ...sohne('Leicht', 300),
          ...sohne('Buch', 400),
          ...sohne('Kraftig', 500),
          ...sohne('Halbfett', 600),
          // the italic file name is truncated in the font package
          { src: ['./src/assets/fonts/SohneMono-Dreiviertelfett.ttf'], weight: 700, style: 'normal' },
          { src: ['./src/assets/fonts/SohneMono-DreiviertelfettKurs.ttf'], weight: 700, style: 'italic' },
          ...sohne('Fett', 800),
          ...sohne('Extrafett', 900)
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
