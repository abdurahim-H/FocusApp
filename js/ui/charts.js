// charts.js — premium-feel SVG chart primitives.
//
// Each function returns a complete `<svg>...</svg>` string ready to drop
// into innerHTML. No d3, no Chart.js — hand-rolled so we control type,
// color, cadence, and feel down to the pixel. The visual register is
// the same across all charts:
//   • thin axis hairlines (0.7 px, 6% alpha)
//   • tabular-figure labels in light Inter
//   • warm amber for the data line / fill / dots
//   • subtle drop-shadow glow on the main strokes
//   • no chartjunk — no boxes, gridlines only where they help reading
//
// Inputs are arrays of numbers or objects; outputs are SVG strings.
// IDs are uniqued so multiple charts can co-exist on a page.

let __uid = 0;
function uniq(prefix) { return `${prefix}_${++__uid}`; }

function fmtTick(n) {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
    return Math.round(n).toString();
}

// ───────────────────────────────────────────────────────────────────────
// Line chart — with optional area fill, trend regression line, dots.
// ───────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {number[]} opts.values     — y-values, oldest first
 * @param {string[]} [opts.labels]   — x-axis labels (sparse — every Nth)
 * @param {number} [opts.width=520]
 * @param {number} [opts.height=180]
 * @param {boolean} [opts.area=true] — fill under the line
 * @param {number[]} [opts.trend]    — separate y-array for trend overlay
 * @param {string} [opts.unit]       — axis-tick suffix (e.g. " min")
 * @param {boolean} [opts.dots=true]
 */
export function lineChart({
    values,
    labels = null,
    width = 520,
    height = 180,
    area = true,
    trend = null,
    unit = '',
    dots = true,
} = {}) {
    if (!values || values.length < 2) return emptyChart(width, height, 'not enough data');
    const M = { l: 36, r: 12, t: 14, b: 26 };
    const W = width, H = height;
    const innerW = W - M.l - M.r;
    const innerH = H - M.t - M.b;
    const max = Math.max(...values, ...(trend || [0]), 1);
    const min = 0;
    const x = (i) => M.l + (i / (values.length - 1)) * innerW;
    const y = (v) => M.t + innerH - ((v - min) / (max - min)) * innerH;
    const points = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
    const areaPath = `M ${x(0).toFixed(2)},${(M.t + innerH).toFixed(2)}
        L ${points.split(' ').join(' L ')}
        L ${x(values.length - 1).toFixed(2)},${(M.t + innerH).toFixed(2)} Z`;
    const trendPath = trend && trend.length === values.length
        ? `M ${trend.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' L ')}`
        : null;
    const ticks = [0, max / 2, max].map((v) => ({ v, label: fmtTick(v) + unit }));
    const xLabels = labels && labels.length
        ? labels.map((lab, i) => ({ x: x(i), label: lab })).filter((_, i, all) => {
            // Show ~5 labels max — pick stride.
            const stride = Math.max(1, Math.floor(all.length / 5));
            return i === 0 || i === all.length - 1 || i % stride === 0;
          })
        : [];
    const id = uniq('lc');
    return `
        <svg class="chart chart--line" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" role="img">
            <defs>
                <!-- currentColor + stop-opacity lets the section accent
                     drive the gradient via CSS color inheritance. -->
                <linearGradient id="${id}_fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                </linearGradient>
                <filter id="${id}_glow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="1.4" />
                </filter>
            </defs>
            ${ticks.map((t) => `
                <line class="chart__grid"
                      x1="${M.l}" x2="${M.l + innerW}"
                      y1="${y(t.v).toFixed(2)}" y2="${y(t.v).toFixed(2)}" />
                <text class="chart__tick" x="${M.l - 8}" y="${(y(t.v) + 4).toFixed(2)}"
                      text-anchor="end">${t.label}</text>
            `).join('')}
            ${xLabels.map((l) => `
                <text class="chart__tick chart__tick--x"
                      x="${l.x.toFixed(2)}" y="${H - 8}"
                      text-anchor="middle">${escapeText(l.label)}</text>
            `).join('')}
            ${area ? `<path d="${areaPath}" fill="url(#${id}_fill)" />` : ''}
            ${trendPath ? `<path d="${trendPath}" class="chart__trend" />` : ''}
            <polyline class="chart__line" points="${points}" filter="url(#${id}_glow)" />
            <polyline class="chart__line" points="${points}" />
            ${dots ? values.map((v, i) => `
                <circle cx="${x(i).toFixed(2)}" cy="${y(v).toFixed(2)}" r="2.2"
                        class="chart__dot" />
            `).join('') : ''}
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Bar chart — vertical bars with values on top.
// ───────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {Array<{label:string,value:number}>} opts.bars
 * @param {number} [opts.width=520]
 * @param {number} [opts.height=180]
 * @param {string} [opts.unit='']
 * @param {boolean} [opts.showValues=true]
 */
export function barChart({
    bars,
    width = 520,
    height = 180,
    unit = '',
    showValues = true,
} = {}) {
    if (!bars || !bars.length) return emptyChart(width, height, 'no bars');
    const M = { l: 36, r: 12, t: 16, b: 32 };
    const innerW = width - M.l - M.r;
    const innerH = height - M.t - M.b;
    const max = Math.max(...bars.map((b) => b.value), 1);
    const slot = innerW / bars.length;
    const barW = Math.min(slot * 0.6, 40);
    const ticks = [0, max / 2, max].map((v) => ({ v, label: fmtTick(v) + unit }));
    const id = uniq('bc');
    return `
        <svg class="chart chart--bar" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img">
            <defs>
                <!-- Section-aware via currentColor inheritance. -->
                <linearGradient id="${id}_fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" stop-opacity="0.82" />
                    <stop offset="100%" stop-color="currentColor" stop-opacity="0.32" />
                </linearGradient>
            </defs>
            ${ticks.map((t) => {
                const y = M.t + innerH - (t.v / max) * innerH;
                return `
                    <line class="chart__grid"
                          x1="${M.l}" x2="${M.l + innerW}"
                          y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" />
                    <text class="chart__tick" x="${M.l - 8}" y="${(y + 4).toFixed(2)}"
                          text-anchor="end">${t.label}</text>
                `;
            }).join('')}
            ${bars.map((b, i) => {
                const cx = M.l + slot * i + slot / 2;
                const h = (b.value / max) * innerH;
                const y = M.t + innerH - h;
                return `
                    <rect class="chart__bar"
                          x="${(cx - barW / 2).toFixed(2)}" y="${y.toFixed(2)}"
                          width="${barW.toFixed(2)}" height="${Math.max(0.5, h).toFixed(2)}"
                          rx="3" fill="url(#${id}_fill)" />
                    <text class="chart__tick chart__tick--x"
                          x="${cx.toFixed(2)}" y="${height - 10}"
                          text-anchor="middle">${escapeText(b.label)}</text>
                    ${showValues && b.value > 0 ? `
                        <text class="chart__bar-val"
                              x="${cx.toFixed(2)}" y="${(y - 6).toFixed(2)}"
                              text-anchor="middle">${fmtTick(b.value)}</text>
                    ` : ''}
                `;
            }).join('')}
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Calendar heatmap — GitHub-style, but cosmic.
// ───────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {{ weeks, monthLabels }} opts.matrix from analytics.calendarMatrix
 * @param {number} [opts.cell=12]
 * @param {number} [opts.gap=3]
 */
export function calendarHeatmap({
    matrix,
    cell = 12,
    gap = 3,
} = {}) {
    if (!matrix || !matrix.weeks || !matrix.weeks.length) {
        return emptyChart(420, 110, 'no calendar data');
    }
    const { weeks, monthLabels } = matrix;
    // Find peak for normalisation.
    let peak = 0;
    for (const w of weeks) for (const c of w) if (c && c.value > peak) peak = c.value;
    const W = (cell + gap) * weeks.length + 30;
    const H = (cell + gap) * 7 + 24;
    const dayLabels = ['', 'M', '', 'W', '', 'F', ''];
    const id = uniq('ch');
    const cells = [];
    for (let wi = 0; wi < weeks.length; wi++) {
        for (let di = 0; di < 7; di++) {
            const c = weeks[wi][di];
            const x = 30 + wi * (cell + gap);
            const y = 16 + di * (cell + gap);
            if (!c) {
                // Padder cell — neutral, not section-coloured.
                cells.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2"
                                  fill="rgba(255, 220, 160, 0.05)" />`);
                continue;
            }
            const intensity = peak === 0 ? 0 : c.value / peak;
            const alpha = 0.08 + 0.78 * intensity;
            const isToday = c.date.toDateString() === new Date().toDateString();
            // currentColor + fill-opacity → section-coloured via CSS.
            cells.push(`
                <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2"
                      fill="currentColor" fill-opacity="${alpha.toFixed(3)}"
                      ${isToday ? 'class="chart__cal-today"' : ''}>
                    <title>${c.date.toDateString()} · ${c.value.toFixed(0)} min</title>
                </rect>
            `);
        }
    }
    return `
        <svg class="chart chart--heatmap" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" role="img">
            ${monthLabels.map((m) => {
                const x = 30 + m.weekIdx * (cell + gap);
                return `<text class="chart__tick chart__tick--x"
                              x="${x}" y="10">${m.label}</text>`;
            }).join('')}
            ${dayLabels.map((d, i) => d ? `
                <text class="chart__tick" x="22" y="${16 + i * (cell + gap) + cell - 2}"
                      text-anchor="end">${d}</text>
            ` : '').join('')}
            ${cells.join('')}
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Hour × Day heatmap — when you focus across the week.
// ───────────────────────────────────────────────────────────────────────

/**
 * Hour × day heatmap, landscape — 24 hours along x, 7 days along y.
 * (Was tall portrait — clipped inside chart cards because the SVG
 * height ran past the card body. Landscape fits naturally.)
 *
 * @param {object} opts
 * @param {number[][]} opts.matrix [24][7] — minutes per (hour, day)
 */
export function hourDayHeatmap({ matrix } = {}) {
    if (!matrix) return emptyChart(640, 200, 'no data');
    const cell = 18;
    const gap = 3;
    const padLeft = 40;   // room for day labels on the left
    const padTop = 26;    // room for hour labels on top
    const padRight = 8;
    const padBottom = 6;
    const W = padLeft + 24 * (cell + gap) + padRight;
    const H = padTop + 7 * (cell + gap) + padBottom;
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let peak = 0;
    for (const row of matrix) for (const v of row) if (v > peak) peak = v;
    const cells = [];
    for (let h = 0; h < 24; h++) {
        for (let d = 0; d < 7; d++) {
            const v = matrix[h][d];
            const intensity = peak === 0 ? 0 : v / peak;
            const alpha = 0.06 + 0.82 * intensity;
            const x = padLeft + h * (cell + gap);
            const y = padTop + d * (cell + gap);
            // currentColor + fill-opacity → section-coloured via CSS.
            cells.push(`
                <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3"
                      fill="currentColor" fill-opacity="${alpha.toFixed(3)}">
                    <title>${dayLabels[d]} · ${formatHour(h)} · ${v.toFixed(0)} min</title>
                </rect>
            `);
        }
    }
    // Hour labels above — 12a / 6a / 12p / 6p / 12a (right edge).
    const hourTicks = [
        { h: 0,  label: '12a' },
        { h: 6,  label: '6a'  },
        { h: 12, label: '12p' },
        { h: 18, label: '6p'  },
    ].map(({ h, label }) => {
        const x = padLeft + h * (cell + gap) + cell / 2;
        return `<text class="chart__tick chart__tick--x" x="${x.toFixed(2)}" y="16"
                       text-anchor="middle">${label}</text>`;
    }).join('');
    // Day labels on the left — 3-letter abbreviations vertically aligned
    // to each row's centre.
    const dayTicks = dayLabels.map((lab, i) => {
        const y = padTop + i * (cell + gap) + cell - 4;
        return `<text class="chart__tick" x="${padLeft - 8}" y="${y.toFixed(2)}"
                       text-anchor="end">${lab}</text>`;
    }).join('');
    return `
        <svg class="chart chart--heatmap chart--hourday" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" role="img">
            ${hourTicks}
            ${dayTicks}
            ${cells.join('')}
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Histogram (uses analytics.histogram bins).
// ───────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {Array<{x0,x1,mid,count}>} opts.bins
 * @param {string} [opts.unit='']
 */
export function histogramChart({
    bins,
    width = 520,
    height = 160,
    unit = '',
} = {}) {
    if (!bins || !bins.length) return emptyChart(width, height, 'no data');
    const M = { l: 30, r: 12, t: 12, b: 30 };
    const innerW = width - M.l - M.r;
    const innerH = height - M.t - M.b;
    const max = Math.max(...bins.map((b) => b.count), 1);
    const slot = innerW / bins.length;
    const barW = Math.max(2, slot * 0.78);
    const id = uniq('hg');
    return `
        <svg class="chart chart--histogram" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img">
            <defs>
                <linearGradient id="${id}_fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" stop-opacity="0.66" />
                    <stop offset="100%" stop-color="currentColor" stop-opacity="0.2" />
                </linearGradient>
            </defs>
            <line class="chart__grid"
                  x1="${M.l}" x2="${M.l + innerW}"
                  y1="${M.t + innerH}" y2="${M.t + innerH}" />
            ${bins.map((b, i) => {
                const cx = M.l + slot * i + slot / 2;
                const h = (b.count / max) * innerH;
                const y = M.t + innerH - h;
                return `<rect x="${(cx - barW / 2).toFixed(2)}" y="${y.toFixed(2)}"
                              width="${barW.toFixed(2)}" height="${Math.max(0.5, h).toFixed(2)}"
                              rx="2" fill="url(#${id}_fill)" />`;
            }).join('')}
            ${[bins[0].x0, bins[bins.length - 1].x1].map((v, i) => {
                const x = i === 0 ? M.l : M.l + innerW;
                return `<text class="chart__tick chart__tick--x"
                             x="${x}" y="${height - 10}"
                             text-anchor="${i === 0 ? 'start' : 'end'}">${fmtTick(v) + unit}</text>`;
            }).join('')}
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Donut — sound-usage distribution.
// ───────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {Array<{label:string,value:number,color?:string}>} opts.slices
 * @param {number} [opts.size=180]
 */
export function donut({ slices, size = 180 } = {}) {
    if (!slices || !slices.length) return emptyChart(size, size, 'no data');
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = size * 0.42;
    const rInner = size * 0.28;
    const total = slices.reduce((a, s) => a + s.value, 0);
    if (total <= 0) return emptyChart(size, size, 'no data');
    const palette = [
        'rgba(255, 220, 160, 0.92)',
        'rgba(255, 200, 110, 0.76)',
        'rgba(255, 184, 92, 0.62)',
        'rgba(225, 168, 84, 0.52)',
        'rgba(200, 156, 88, 0.42)',
        'rgba(180, 144, 88, 0.36)',
    ];
    let cursor = -Math.PI / 2;
    const arcs = [];
    slices.forEach((slice, i) => {
        const angle = (slice.value / total) * 2 * Math.PI;
        const a0 = cursor;
        const a1 = cursor + angle;
        cursor = a1;
        const x0o = cx + Math.cos(a0) * rOuter;
        const y0o = cy + Math.sin(a0) * rOuter;
        const x1o = cx + Math.cos(a1) * rOuter;
        const y1o = cy + Math.sin(a1) * rOuter;
        const x0i = cx + Math.cos(a1) * rInner;
        const y0i = cy + Math.sin(a1) * rInner;
        const x1i = cx + Math.cos(a0) * rInner;
        const y1i = cy + Math.sin(a0) * rInner;
        const large = angle > Math.PI ? 1 : 0;
        arcs.push(`
            <path d="
                M ${x0o.toFixed(2)} ${y0o.toFixed(2)}
                A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)}
                L ${x0i.toFixed(2)} ${y0i.toFixed(2)}
                A ${rInner} ${rInner} 0 ${large} 0 ${x1i.toFixed(2)} ${y1i.toFixed(2)} Z"
                fill="${slice.color || palette[i % palette.length]}">
                <title>${escapeText(slice.label)} · ${slice.value}</title>
            </path>
        `);
    });
    return `
        <svg class="chart chart--donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" role="img">
            ${arcs.join('')}
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Percentile gauge — radial fill 0..1.
// ───────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {number} opts.value 0..1
 * @param {number} [opts.size=160]
 * @param {string} [opts.label]
 */
export function percentileGauge({ value, size = 160, label = '' } = {}) {
    const v = Math.max(0, Math.min(1, value || 0));
    const cx = size / 2;
    const cy = size / 2 + 8;
    const r = size * 0.42;
    const a0 = Math.PI; // 180deg (left)
    const a1 = a0 + Math.PI * v; // travels clockwise to right
    const aFull = a0 + Math.PI;
    const polar = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    const [bx0, by0] = polar(a0, r);
    const [bxF, byF] = polar(aFull, r);
    const [bx1, by1] = polar(a1, r);
    const id = uniq('pg');
    return `
        <svg class="chart chart--gauge" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" role="img">
            <defs>
                <linearGradient id="${id}_g" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stop-color="rgba(255, 220, 160, 0.32)" />
                    <stop offset="100%" stop-color="rgba(255, 220, 160, 0.92)" />
                </linearGradient>
            </defs>
            <path d="M ${bx0.toFixed(2)} ${by0.toFixed(2)} A ${r} ${r} 0 0 1 ${bxF.toFixed(2)} ${byF.toFixed(2)}"
                  stroke="rgba(255, 220, 160, 0.1)" stroke-width="6" fill="none" stroke-linecap="round" />
            <path d="M ${bx0.toFixed(2)} ${by0.toFixed(2)} A ${r} ${r} 0 0 1 ${bx1.toFixed(2)} ${by1.toFixed(2)}"
                  stroke="url(#${id}_g)" stroke-width="6" fill="none" stroke-linecap="round" />
            <text class="chart__gauge-num" x="${cx}" y="${cy + 6}" text-anchor="middle">${Math.round(v * 100)}</text>
            ${label ? `<text class="chart__tick" x="${cx}" y="${cy + 26}" text-anchor="middle">${escapeText(label)}</text>` : ''}
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Sparkline — tiny inline trend.
// ───────────────────────────────────────────────────────────────────────

export function sparkline({ values, width = 140, height = 38 } = {}) {
    if (!values || values.length < 2) return '';
    const max = Math.max(...values, 1);
    const x = (i) => (i / (values.length - 1)) * (width - 4) + 2;
    const y = (v) => height - 2 - (v / max) * (height - 4);
    const pts = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
    return `
        <svg class="chart chart--spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" role="img">
            <polyline points="${pts}" class="chart__line" />
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

function emptyChart(W, H, msg) {
    return `
        <div class="chart-empty" style="width:${W}px;height:${H}px;">
            <span>${escapeText(msg || 'no data yet')}</span>
        </div>
    `;
}

function escapeText(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatHour(h) {
    const ampm = h >= 12 ? 'pm' : 'am';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}${ampm}`;
}
