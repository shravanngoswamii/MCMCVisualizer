import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(defineConfig({
  title: 'MCMCVisualizer',
  description: 'Parse, analyze, plot, and export MCMC sampling data in JavaScript/TypeScript.',
  base: process.env.DOCS_BASE ?? '/MCMCVisualizer/',

  head: [
    ['link', { rel: 'icon', href: '/MCMCVisualizer/favicon.svg', type: 'image/svg+xml' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'MCMCVisualizer',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/loading-data' },
      { text: 'Plots', link: '/plots/overview' },
      { text: 'CLI', link: '/cli' },
      { text: 'Demo', link: 'https://shravanngoswamii.github.io/MCMCVisualizer/', target: '_blank' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Architecture', link: '/guide/architecture' },
          { text: 'Data Model', link: '/guide/data-model' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Loading Data', link: '/api/loading-data' },
          { text: 'InferenceData', link: '/api/inference-data' },
          { text: 'Statistics', link: '/api/statistics' },
          { text: 'Functional Stats', link: '/api/functional-stats' },
          { text: 'Exporting & Detection', link: '/api/export' },
        ],
      },
      {
        text: 'Plots',
        items: [
          { text: 'Overview & Theming', link: '/plots/overview' },
          { text: 'Trace & Density', link: '/plots/trace-density' },
          { text: 'Histograms & ECDF', link: '/plots/histogram-ecdf' },
          { text: 'Diagnostics', link: '/plots/diagnostics' },
          { text: 'Multi-variable', link: '/plots/multi-variable' },
        ],
      },
      {
        text: 'CLI Tool',
        items: [
          { text: 'Commands & Options', link: '/cli' },
        ],
      },
      {
        text: 'More',
        items: [
          { text: 'Known Limitations', link: '/guide/limitations' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/shravanngoswamii/MCMCVisualizer' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/mcmc-visualizer' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'MCMCVisualizer',
    },

    editLink: {
      pattern: 'https://github.com/shravanngoswamii/MCMCVisualizer/edit/main/website/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },
  },

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
  },
}));
