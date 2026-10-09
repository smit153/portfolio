// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://smiit.in',
  // blog posts are MDX: Markdown with interactive components dropped in
  integrations: [mdx()],
  markdown: {
    // mermaid blocks stay plain text: the project pages draw them as diagrams in the browser
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    // code in posts stays in the site's greys: keywords white, strings light, comments dim
    shikiConfig: {
      theme: {
        name: 'mono',
        type: 'dark',
        colors: { 'editor.background': '#0e0e10', 'editor.foreground': '#a3a3a3' },
        tokenColors: [
          { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#5a5a5a', fontStyle: 'italic' } },
          { scope: ['keyword', 'storage', 'keyword.operator.new', 'constant.language'], settings: { foreground: '#ffffff' } },
          { scope: ['string', 'constant.numeric', 'constant.other'], settings: { foreground: '#d4d4d4' } },
          { scope: ['entity.name.function', 'support.function', 'variable.other.property', 'meta.object-literal.key'], settings: { foreground: '#e7e7e7' } },
          { scope: ['punctuation', 'keyword.operator'], settings: { foreground: '#8d8d8d' } }
        ]
      }
    }
  },
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
    plugins: [tailwindcss()],
    // mermaid is only imported lazily (project diagrams), so pre-bundle it up front; found mid-session, the dev
    // server re-optimises and the page's import fails
    optimizeDeps: { include: ['mermaid'] }
  }
});
