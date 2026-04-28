// analytics.js — data-science primitives for the Profile surface.
//
// Pure functions, no DOM, no side effects. Everything here operates on
// arrays of numbers or arrays of session-shaped records and returns
// either summary statistics or arrays ready for chart rendering.
//
// Categories:
//   • Descriptive — mean, median, stdDev, percentile, range, mode
//   • Trend       — linearRegression, movingAverage, weekOverWeek
//   • Comparison  — pearsonCorrelation, cohensD (effect size)
//   • Distribution — histogram, zScore, anomalyFlags
//   • Time helpers — bucketByHour, bucketByDayOfWeek, dailyTotals,
//                    weeklyTotals, calendarMatrix
//
// All thresholds and gating live in the Profile UI; this file is the
// honest math underneath. No formatting, no narrative, no HTML.

// ───────────────────────────────────────────────────────────────────────
// Descriptive statistics
// ───────────────────────────────────────────────────────────────────────

export function mean(values) {
    if (!values || !values.length) return 0;
    let total = 0;
    for (const v of values) total += v;
    return total / values.length;
}

export function median(values) {
    if (!values || !values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function stdDev(values) {
    if (!values || values.length < 2) return 0;
    const m = mean(values);
    const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

/** p in [0, 1]. percentile([1,2,3,4,5], 0.5) → 3. */
export function percentile(values, p) {
    if (!values || !values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** What percentile of `distribution` does `value` fall at? Returns [0,1]. */
export function percentileRank(value, distribution) {
    if (!distribution || !distribution.length) return 0;
    let below = 0;
    let equal = 0;
    for (const x of distribution) {
        if (x < value) below++;
        else if (x === value) equal++;
    }
    // The conventional "midrank" formula keeps the rank stable for ties.
    return (below + equal * 0.5) / distribution.length;
}

export function range(values) {
    if (!values || !values.length) return { min: 0, max: 0 };
    let min = values[0];
    let max = values[0];
    for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min, max };
}

// ───────────────────────────────────────────────────────────────────────
// Trends
// ───────────────────────────────────────────────────────────────────────

/** Ordinary least-squares regression. `points` is [[x, y], ...]. Returns
 *  { slope, intercept, r2 } where r² is the coefficient of determination
 *  (0 = noise, 1 = perfect line). r² < 0 only when the model is worse
 *  than predicting the mean — clamp to 0 in that case. */
export function linearRegression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: points[0]?.[1] ?? 0, r2: 0 };
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (const [x, y] of points) {
        sx += x; sy += y;
        sxx += x * x; sxy += x * y; syy += y * y;
    }
    const denom = n * sxx - sx * sx;
    if (denom === 0) return { slope: 0, intercept: sy / n, r2: 0 };
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    const ssTot = syy - (sy * sy) / n;
    let ssRes = 0;
    for (const [x, y] of points) {
        const predicted = slope * x + intercept;
        ssRes += (y - predicted) ** 2;
    }
    const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
    return { slope, intercept, r2 };
}

/** Trailing simple moving average. Returns one value per input position;
 *  positions before the window is filled use whatever values exist (so
 *  the line is defined for every x). Lengths are equal. */
export function movingAverage(values, window = 7) {
    if (!values || !values.length) return [];
    const out = new Array(values.length);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= window) sum -= values[i - window];
        const denom = Math.min(i + 1, window);
        out[i] = sum / denom;
    }
    return out;
}

/** % change between two contiguous halves of an array (newer − older).
 *  Useful for "your last 7 days vs the 7 before" callouts. */
export function changeAcross(values, splitPoint) {
    if (!values || values.length < 2) return null;
    const split = splitPoint != null ? splitPoint : Math.floor(values.length / 2);
    const older = values.slice(0, split);
    const newer = values.slice(split);
    if (!older.length || !newer.length) return null;
    const olderMean = mean(older);
    const newerMean = mean(newer);
    if (olderMean === 0) return { older: olderMean, newer: newerMean, delta: null };
    return {
        older: olderMean,
        newer: newerMean,
        delta: (newerMean - olderMean) / olderMean,
    };
}

// ───────────────────────────────────────────────────────────────────────
// Correlation + effect size
// ───────────────────────────────────────────────────────────────────────

/** Pearson r in [-1, 1]. */
export function pearsonCorrelation(xs, ys) {
    if (!xs || !ys || xs.length !== ys.length || xs.length < 2) return 0;
    const mx = mean(xs);
    const my = mean(ys);
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < xs.length; i++) {
        const a = xs[i] - mx;
        const b = ys[i] - my;
        num += a * b;
        dx += a * a;
        dy += b * b;
    }
    const denom = Math.sqrt(dx * dy);
    return denom === 0 ? 0 : num / denom;
}

/** Cohen's d — standardised difference between two distributions.
 *  |d| ≥ 0.2 is small, 0.5 medium, 0.8 large. */
export function cohensD(a, b) {
    if (!a?.length || !b?.length) return 0;
    const ma = mean(a);
    const mb = mean(b);
    const sa = stdDev(a);
    const sb = stdDev(b);
    const pooled = Math.sqrt(((a.length - 1) * sa * sa + (b.length - 1) * sb * sb)
        / Math.max(1, a.length + b.length - 2));
    return pooled === 0 ? 0 : (ma - mb) / pooled;
}

// ───────────────────────────────────────────────────────────────────────
// Distribution
// ───────────────────────────────────────────────────────────────────────

/** Bin `values` into `binCount` equal-width buckets covering [min, max].
 *  Returns array of { x0, x1, count, mid }. */
export function histogram(values, binCount = 10) {
    if (!values || !values.length || binCount < 1) return [];
    const { min, max } = range(values);
    if (max === min) return [{ x0: min, x1: max, count: values.length, mid: min }];
    const width = (max - min) / binCount;
    const bins = new Array(binCount).fill(0).map((_, i) => ({
        x0: min + i * width,
        x1: min + (i + 1) * width,
        mid: min + (i + 0.5) * width,
        count: 0,
    }));
    for (const v of values) {
        let idx = Math.floor((v - min) / width);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        bins[idx].count++;
    }
    return bins;
}

/** Z-score: how many standard deviations from the distribution mean? */
export function zScore(value, distribution) {
    const m = mean(distribution);
    const sd = stdDev(distribution);
    if (sd === 0) return 0;
    return (value - m) / sd;
}

/** Mark items with |z| ≥ threshold (default 1.5σ — moderately notable).
 *  Returns array of booleans the same length as `values`. */
export function anomalyFlags(values, threshold = 1.5) {
    const m = mean(values);
    const sd = stdDev(values);
    if (sd === 0) return values.map(() => false);
    return values.map((v) => Math.abs((v - m) / sd) >= threshold);
}

// ───────────────────────────────────────────────────────────────────────
// Time bucketing — operate on session-shaped records
// ───────────────────────────────────────────────────────────────────────

/** Hour-of-day distribution: 24 buckets, each value = total focus
 *  seconds in sessions whose start time fell in that hour. */
export function bucketByHour(sessions) {
    const out = new Array(24).fill(0);
    for (const s of sessions) {
        const h = new Date(s.startedAt).getHours();
        out[h] += s.durationSeconds || 0;
    }
    return out;
}

/** Day-of-week distribution: 7 buckets (Sun..Sat). */
export function bucketByDayOfWeek(sessions) {
    const out = new Array(7).fill(0);
    for (const s of sessions) {
        const d = new Date(s.startedAt).getDay();
        out[d] += s.durationSeconds || 0;
    }
    return out;
}

/** Daily focus minutes for the trailing N days (oldest first, today
 *  last). Used for time-series line charts and calendar heatmaps. */
export function dailyTotals(sessions, days = 30, key = 'durationSeconds') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const out = new Array(days).fill(0);
    for (const s of sessions) {
        const sd = new Date(s.startedAt);
        sd.setHours(0, 0, 0, 0);
        const ago = Math.floor((todayMs - sd.getTime()) / 86400_000);
        if (ago < 0 || ago >= days) continue;
        const value = key === 'durationSeconds'
            ? (s.durationSeconds || 0) / 60
            : (s[key] || 0);
        out[days - 1 - ago] += value;
    }
    return out;
}

/** Hour × day-of-week matrix [24][7] — total focus minutes per cell. */
export function hourDayMatrix(sessions) {
    const matrix = Array.from({ length: 24 }, () => new Array(7).fill(0));
    for (const s of sessions) {
        const date = new Date(s.startedAt);
        const h = date.getHours();
        const d = date.getDay();
        matrix[h][d] += (s.durationSeconds || 0) / 60;
    }
    return matrix;
}

/** Calendar matrix for the trailing N days, organised week-by-week.
 *  Returns an object { weeks, monthLabels }:
 *    • weeks — array of weeks, each week is an array of 7 cells
 *      ({ date: Date, value: number, dayOfWeek: 0..6 } or null padder)
 *    • monthLabels — array of { weekIdx, label } for the strip
 *  Days are right-aligned to today; rows oldest-top, cols Sun-Sat. */
export function calendarMatrix(sessions, days = 90) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cells = new Map();
    for (const s of sessions) {
        const sd = new Date(s.startedAt);
        sd.setHours(0, 0, 0, 0);
        const key = sd.getTime();
        cells.set(key, (cells.get(key) || 0) + (s.durationSeconds || 0) / 60);
    }
    // Build day-list backwards from today.
    const dayList = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        dayList.push({
            date: d,
            value: cells.get(d.getTime()) || 0,
            dayOfWeek: d.getDay(),
        });
    }
    dayList.reverse();
    // Pack into weeks: each week starts on Sunday.
    const weeks = [];
    let week = new Array(7).fill(null);
    for (const cell of dayList) {
        if (week[cell.dayOfWeek] !== null) {
            // Should never trip given the right-to-left fill, but guard.
            weeks.push(week);
            week = new Array(7).fill(null);
        }
        week[cell.dayOfWeek] = cell;
        if (cell.dayOfWeek === 6) {
            weeks.push(week);
            week = new Array(7).fill(null);
        }
    }
    if (week.some((c) => c !== null)) weeks.push(week);
    // Month labels — first week of each month gets a label.
    const monthLabels = [];
    const monthFmt = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let lastMonth = -1;
    weeks.forEach((w, i) => {
        const firstReal = w.find((c) => c !== null);
        if (!firstReal) return;
        const m = firstReal.date.getMonth();
        if (m !== lastMonth) {
            lastMonth = m;
            monthLabels.push({ weekIdx: i, label: monthFmt[m] });
        }
    });
    return { weeks, monthLabels };
}

// ───────────────────────────────────────────────────────────────────────
// Sound correlation (split distributions on a sound's presence/absence)
// ───────────────────────────────────────────────────────────────────────

/** For each sound that has been used, compute the difference in mean
 *  session length when that sound is on vs off, the sample sizes, the
 *  effect size (Cohen's d), and the relative delta as a fraction.
 *  Sorts strongest |d| first. */
export function soundEffects(sessions, { minSamples = 4 } = {}) {
    const grouped = new Map();
    for (const s of sessions) {
        const sounds = Array.isArray(s.activeSounds) ? s.activeSounds : [];
        for (const sound of sounds) {
            if (!grouped.has(sound)) grouped.set(sound, []);
            grouped.get(sound).push(s);
        }
    }
    const out = [];
    for (const [sound, withList] of grouped.entries()) {
        if (withList.length < minSamples) continue;
        const without = sessions.filter(
            (s) => !(s.activeSounds || []).includes(sound)
        );
        if (without.length < minSamples) continue;
        const withDur = withList.map((s) => s.durationSeconds || 0);
        const withoutDur = without.map((s) => s.durationSeconds || 0);
        const withMean = mean(withDur);
        const withoutMean = mean(withoutDur);
        if (withoutMean <= 0) continue;
        const delta = (withMean - withoutMean) / withoutMean;
        const d = cohensD(withDur, withoutDur);
        out.push({
            sound,
            withMean,
            withoutMean,
            delta,
            d,
            withN: withList.length,
            withoutN: without.length,
        });
    }
    out.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    return out;
}
