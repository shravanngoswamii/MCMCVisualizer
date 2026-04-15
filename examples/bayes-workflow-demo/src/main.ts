import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import Plotly from 'plotly.js-dist-min';

// mcmc-visualizer's DOM-based plot functions call getPlotly()
// which checks globalThis.Plotly — set it here before mounting.
(window as Record<string, unknown>).Plotly = Plotly;

createApp(App).mount('#app');
