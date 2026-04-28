// analytics.js — analytics + ML primitives for the Profile surface.
//
// Pure functions, no DOM, no side effects. Everything here operates on
// arrays of numbers or arrays of session-shaped records and returns
// either summary statistics or arrays ready for chart rendering.
//
// Categories:
//   • Descriptive — mean, median, stdDev, percentile, range
//   • Trend       — linearRegression, movingAverage, weekOverWeek
//   • Comparison  — pearsonCorrelation, cohensD (effect size)
//   • Distribution — histogram, zScore, anomalyFlags
//   • Time helpers — bucketByHour, bucketByDayOfWeek, dailyTotals,
//                    hourDayMatrix, calendarMatrix
//   • ML          — kMeans (with k-means++ init + restarts +
//                    elbow K selection), Holt-Winters additive
//                    seasonal exponential smoothing, conditional
//                    probability + lift analysis
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

// ───────────────────────────────────────────────────────────────────────
// ML — K-means clustering (k-means++ init, multi-restart, elbow-K)
// ───────────────────────────────────────────────────────────────────────
//
// Standard Lloyd's algorithm with two improvements that materially
// affect the quality of the result on small datasets:
//
//   1. k-means++ initialisation. Picking centroids uniformly at random
//      lands repeatedly on bad local minima; k-means++ samples each
//      next centroid with probability proportional to its squared
//      distance from the nearest existing centroid, which keeps the
//      seeds spread out.
//   2. Multi-restart. Run the whole thing N times (default 5) and keep
//      the assignment with the lowest within-cluster sum-of-squares
//      (inertia). On a session set of ~20 records, the difference
//      between best and worst run is meaningful.
//
// chooseBestK() runs k-means for K in [2, 4] and picks the K with the
// largest *relative* drop in inertia versus the previous K — a simple
// elbow heuristic. Falls back to K=3 when the data doesn't show a
// clear elbow.

function squaredEuclidean(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        s += d * d;
    }
    return s;
}

function pickWeighted(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return Math.floor(Math.random() * weights.length);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return weights.length - 1;
}

function kMeansPlusPlus(points, k) {
    const centroids = [];
    centroids.push([...points[Math.floor(Math.random() * points.length)]]);
    while (centroids.length < k) {
        const dists = points.map((p) => {
            let minD = Infinity;
            for (const c of centroids) {
                const d = squaredEuclidean(p, c);
                if (d < minD) minD = d;
            }
            return minD;
        });
        const idx = pickWeighted(dists);
        centroids.push([...points[idx]]);
    }
    return centroids;
}

/** k-means clustering. Returns { centroids, assignments, inertia } or
 *  null if input is degenerate. */
export function kMeans(points, k, { maxIter = 100, restarts = 5 } = {}) {
    if (!points || !points.length || k <= 0 || k > points.length) return null;
    const dim = points[0].length;
    let best = null;
    for (let restart = 0; restart < restarts; restart++) {
        let centroids = kMeansPlusPlus(points, k);
        const assignments = new Array(points.length).fill(0);
        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            for (let i = 0; i < points.length; i++) {
                let bestDist = Infinity, bestC = 0;
                for (let c = 0; c < k; c++) {
                    const d = squaredEuclidean(points[i], centroids[c]);
                    if (d < bestDist) { bestDist = d; bestC = c; }
                }
                if (assignments[i] !== bestC) {
                    assignments[i] = bestC;
                    changed = true;
                }
            }
            if (!changed && iter > 0) break;
            const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
            const counts = new Array(k).fill(0);
            for (let i = 0; i < points.length; i++) {
                const c = assignments[i];
                counts[c]++;
                for (let d = 0; d < dim; d++) sums[c][d] += points[i][d];
            }
            for (let c = 0; c < k; c++) {
                if (counts[c] === 0) {
                    // Empty cluster — re-seed with a random point.
                    centroids[c] = [...points[Math.floor(Math.random() * points.length)]];
                    continue;
                }
                const next = new Array(dim);
                for (let d = 0; d < dim; d++) next[d] = sums[c][d] / counts[c];
                centroids[c] = next;
            }
        }
        let inertia = 0;
        for (let i = 0; i < points.length; i++) {
            inertia += squaredEuclidean(points[i], centroids[assignments[i]]);
        }
        if (!best || inertia < best.inertia) {
            best = { centroids: centroids.map((c) => [...c]), assignments: [...assignments], inertia, k };
        }
    }
    return best;
}

/** Pick the best K in [kMin, kMax] using the elbow-method heuristic.
 *  Returns the full kMeans result for the chosen K. */
export function chooseBestK(points, { kMin = 2, kMax = 4 } = {}) {
    if (!points || points.length < kMin * 2) return null;
    const runs = [];
    for (let k = kMin; k <= kMax && k < points.length; k++) {
        const r = kMeans(points, k);
        if (r) runs.push(r);
    }
    if (runs.length === 0) return null;
    if (runs.length === 1) return runs[0];
    let bestRun = runs[0];
    let bestRelDrop = 0;
    for (let i = 1; i < runs.length; i++) {
        const prev = runs[i - 1].inertia;
        const cur = runs[i].inertia;
        if (prev <= 0) continue;
        const drop = (prev - cur) / prev;
        if (drop > bestRelDrop) {
            bestRelDrop = drop;
            bestRun = runs[i];
        }
    }
    return bestRun;
}

// ───────────────────────────────────────────────────────────────────────
// ML — Holt-Winters additive seasonal exponential smoothing
// ───────────────────────────────────────────────────────────────────────
//
// Triple exponential smoothing with three smoothing constants:
//   α (alpha) — level
//   β (beta)  — trend
//   γ (gamma) — seasonality
//
// The additive seasonal model assumes the seasonal component stays
// roughly constant in magnitude (vs. multiplicative which scales with
// level). For daily focus minutes that's the safer default — your
// Tuesday-vs-Friday gap doesn't grow proportionally with how long
// you've been using the app.
//
// Returns null when there's not enough data for two full seasons; the
// caller falls back to simple averages in that case.

/** Fit a Holt-Winters additive seasonal model.
 *  Returns { level, trend, season, fitted } or null. */
export function holtWintersAdditive(values, period = 7, opts = {}) {
    const { alpha = 0.3, beta = 0.1, gamma = 0.1 } = opts;
    if (!values || values.length < period * 2) return null;

    // Initial level: mean of the first season.
    let level = 0;
    for (let i = 0; i < period; i++) level += values[i];
    level /= period;

    // Initial trend: average rate of change between the first two seasons.
    let s2 = 0;
    for (let i = period; i < period * 2; i++) s2 += values[i];
    s2 /= period;
    let trend = (s2 - level) / period;

    // Initial seasonal: detrended residual within the first season.
    const season = new Array(period);
    for (let i = 0; i < period; i++) season[i] = values[i] - level;

    const fitted = [];
    for (let t = 0; t < values.length; t++) {
        const idx = t % period;
        if (t === 0) {
            fitted.push(level + season[idx]);
            continue;
        }
        const prevLevel = level;
        const prevTrend = trend;
        const prevSeason = season[idx];
        level = alpha * (values[t] - prevSeason) + (1 - alpha) * (prevLevel + prevTrend);
        trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
        season[idx] = gamma * (values[t] - level) + (1 - gamma) * prevSeason;
        fitted.push(level + trend + season[idx]);
    }
    return { level, trend, season, fitted, alpha, beta, gamma };
}

/** Forecast `horizon` steps ahead from a fitted Holt-Winters model.
 *  Negative predictions are clamped to 0 (focus minutes can't be
 *  negative). */
export function holtWintersForecast(model, horizon = 14) {
    if (!model || !model.season) return [];
    const out = [];
    for (let h = 0; h < horizon; h++) {
        const seasonalIdx = h % model.season.length;
        const value = model.level + (h + 1) * model.trend + model.season[seasonalIdx];
        out.push(Math.max(0, value));
    }
    return out;
}

// ───────────────────────────────────────────────────────────────────────
// ML — Conditional probability + lift analysis
// ───────────────────────────────────────────────────────────────────────
//
// For each named condition (a predicate over sessions), compute:
//   • P(target | condition)   — completion rate inside the matching set
//   • lift = P(target | cond) / P(target)  — ratio against the baseline
//   • absoluteDelta — straight percentage-point difference
// Filters out conditions with too few matching samples.
//
// This is essentially a per-feature univariate logistic-regression
// result. It's not a multivariate model (we'd need real gradient
// descent and regularisation for that on small samples), but for
// surfacing single strong relationships it's the right tool — and
// the output is interpretable in plain English without the user
// needing to read coefficients.

/** P(targetFn = true | predicate(session) = true) and its lift over
 *  baseline. `targetFn` defaults to checking `session.completed`.
 *  Returns null when the matching group is too small. */
export function conditionalLift(sessions, predicate, {
    minSamples = 3,
    targetFn = (s) => !!s.completed,
} = {}) {
    if (!sessions || !sessions.length) return null;
    const matching = sessions.filter(predicate);
    if (matching.length < minSamples) return null;
    const baseRate = sessions.filter(targetFn).length / sessions.length;
    const matchingRate = matching.filter(targetFn).length / matching.length;
    return {
        n: matching.length,
        rate: matchingRate,
        baselineRate: baseRate,
        lift: baseRate > 0 ? matchingRate / baseRate : 1,
        absoluteDelta: matchingRate - baseRate,
    };
}

/** Run several named conditions and return them sorted by absolute
 *  distance of lift from 1 (strongest signal first). */
export function rankConditions(sessions, conditions, opts = {}) {
    const out = [];
    for (const cond of conditions) {
        const result = conditionalLift(sessions, cond.predicate, opts);
        if (!result) continue;
        out.push({ name: cond.name, ...result });
    }
    out.sort((a, b) => Math.abs(b.lift - 1) - Math.abs(a.lift - 1));
    return out;
}
