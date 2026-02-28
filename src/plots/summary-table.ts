import type { InferenceData } from '../types';
import type { PlotOptions } from './types';

export function summaryTable(
  container: HTMLElement,
  data: InferenceData,
  options?: PlotOptions,
): { destroy(): void; update(): void } {
  const isDark = options?.theme !== 'light';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'overflow-x:auto;border-radius:8px;';
  container.appendChild(wrapper);

  function render() {
    const summaries = data.summary();
    const bg = isDark ? '#1a1d27' : '#f8f9fa';
    const headerBg = isDark ? '#252836' : '#e5e7eb';
    const borderColor = isDark ? '#333' : '#d1d5db';
    const textColor = isDark ? '#e0e0e0' : '#1a1a1a';
    const mutedColor = isDark ? '#888' : '#666';

    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;color:${textColor};font-family:system-ui,sans-serif">`;
    html += `<thead><tr style="background:${headerBg}">`;
    for (const c of ['Variable', 'Mean', 'Std', '5%', '25%', '50%', '75%', '95%', 'ESS', 'R\u0302', 'HDI 90%']) {
      html += `<th style="padding:10px 14px;text-align:left;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${mutedColor};white-space:nowrap">${c}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (const s of summaries) {
      const rhatColor = s.rhat === undefined ? mutedColor : s.rhat < 1.05 ? '#22c55e' : s.rhat < 1.1 ? '#eab308' : '#ef4444';
      const essColor = s.ess > 400 ? '#22c55e' : s.ess > 100 ? '#eab308' : '#ef4444';
      html += `<tr style="border-bottom:1px solid ${borderColor}">`;
      html += `<td style="padding:8px 14px;font-weight:600">${s.variable}</td>`;
      html += td(s.mean, textColor);
      html += td(s.stdev, textColor);
      html += td(s.quantiles.q5, textColor);
      html += td(s.quantiles.q25, textColor);
      html += td(s.quantiles.q50, textColor);
      html += td(s.quantiles.q75, textColor);
      html += td(s.quantiles.q95, textColor);
      html += `<td style="padding:8px 14px;color:${essColor};font-variant-numeric:tabular-nums">${Math.round(s.ess)}</td>`;
      html += `<td style="padding:8px 14px;color:${rhatColor};font-variant-numeric:tabular-nums">${s.rhat !== undefined ? s.rhat.toFixed(3) : '\u2014'}</td>`;
      html += `<td style="padding:8px 14px;font-variant-numeric:tabular-nums;white-space:nowrap">[${s.hdi90[0].toFixed(3)}, ${s.hdi90[1].toFixed(3)}]</td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    wrapper.innerHTML = html;
  }

  render();
  return { destroy: () => wrapper.remove(), update: render };
}

function td(v: number, color: string): string {
  return `<td style="padding:8px 14px;font-variant-numeric:tabular-nums;color:${color}">${isNaN(v) ? '\u2014' : v.toFixed(4)}</td>`;
}
