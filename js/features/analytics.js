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
 *  Returns array of booleans the same length as `values`.
 *
 *  Uses **leave-one-out** by default: each value is z-scored against
 *  the mean/stdev of the *other* values, so a single big outlier can't
 *  inflate the distribution it's being measured against. Falls back to
 *  the in-sample stats when leaveOneOut is false. */
export function anomalyFlags(values, threshold = 1.5, { leaveOneOut = true } = {}) {
    if (!values || values.length < 2) return values ? values.map(() => false) : [];
    if (!leaveOneOut) {
        const m = mean(values);
        const sd = stdDev(values);
        if (sd === 0) return values.map(() => false);
        return values.map((v) => Math.abs((v - m) / sd) >= threshold);
    }
    const n = values.length;
    const sum = values.reduce((a, x) => a + x, 0);
    const sumSq = values.reduce((a, x) => a + x * x, 0);
    return values.map((v) => {
        const otherN = n - 1;
        const otherMean = (sum - v) / otherN;
        const otherVar = Math.max(
            0,
            (sumSq - v * v) / otherN - otherMean * otherMean
        );
        const otherSd = Math.sqrt(otherVar);
        if (otherSd === 0) return false;
        return Math.abs((v - otherMean) / otherSd) >= threshold;
    });
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
                    // Empty cluster — re-seed with the point furthest
                    // from any existing centroid. Picking uniformly at
                    // random tends to re-seed near another centroid and
                    // immediately re-empty the same slot on next iter;
                    // farthest-point seeding (k-means++ logic, applied
                    // to a single slot) is much more stable.
                    let farthestIdx = 0;
                    let farthestDist = -1;
                    for (let i = 0; i < points.length; i++) {
                        let nearest = Infinity;
                        for (let cc = 0; cc < k; cc++) {
                            if (cc === c) continue;
                            const d = squaredEuclidean(points[i], centroids[cc]);
                            if (d < nearest) nearest = d;
                        }
                        if (nearest > farthestDist) {
                            farthestDist = nearest;
                            farthestIdx = i;
                        }
                    }
                    centroids[c] = [...points[farthestIdx]];
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

/** Mean silhouette score for a clustering result. For each point p:
 *    a(p) = mean distance from p to other points in its own cluster
 *    b(p) = mean distance from p to points in the *nearest other* cluster
 *    s(p) = (b - a) / max(a, b)   — bounded in [-1, 1]
 *  The mean s across all points is high when clusters are dense and
 *  well-separated. Returns 0 when k=1 or every cluster is a singleton.
 *  O(n²·k) — fine for n ≤ 200. */
export function silhouetteScore(points, assignments, k) {
    if (!points || points.length < 2 || k < 2) return 0;
    // Pre-bucket point indices by cluster.
    const buckets = Array.from({ length: k }, () => []);
    for (let i = 0; i < points.length; i++) buckets[assignments[i]].push(i);
    let total = 0;
    let counted = 0;
    for (let i = 0; i < points.length; i++) {
        const own = assignments[i];
        if (buckets[own].length < 2) continue; // silhouette undefined for singleton clusters
        // a — mean distance to siblings in own cluster
        let sumA = 0;
        for (const j of buckets[own]) {
            if (j === i) continue;
            sumA += Math.sqrt(squaredEuclidean(points[i], points[j]));
        }
        const a = sumA / (buckets[own].length - 1);
        // b — min over other clusters of mean distance to that cluster
        let b = Infinity;
        for (let c = 0; c < k; c++) {
            if (c === own || buckets[c].length === 0) continue;
            let sumD = 0;
            for (const j of buckets[c]) sumD += Math.sqrt(squaredEuclidean(points[i], points[j]));
            const meanD = sumD / buckets[c].length;
            if (meanD < b) b = meanD;
        }
        if (b === Infinity) continue;
        const denom = Math.max(a, b);
        if (denom <= 0) continue;
        total += (b - a) / denom;
        counted++;
    }
    return counted > 0 ? total / counted : 0;
}

/** Pick the best K in [kMin, kMax] using **silhouette score** rather
 *  than the elbow heuristic. Silhouette is the principled choice for
 *  small-data K selection: it measures how well-separated the clusters
 *  actually are, not just whether the inertia drops on each new K. We
 *  also return `silhouette` so callers can suppress the insight when
 *  the data has no real cluster structure (silhouette < ~0.2 → groups
 *  are basically arbitrary).
 *
 *  Returns: { centroids, assignments, inertia, k, silhouette } | null. */
export function chooseBestK(points, { kMin = 2, kMax = 4 } = {}) {
    if (!points || points.length < kMin * 2) return null;
    const runs = [];
    for (let k = kMin; k <= kMax && k < points.length; k++) {
        const r = kMeans(points, k);
        if (!r) continue;
        const sil = silhouetteScore(points, r.assignments, k);
        runs.push({ ...r, silhouette: sil });
    }
    if (runs.length === 0) return null;
    return runs.reduce((best, run) => run.silhouette > best.silhouette ? run : best, runs[0]);
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
 *  Returns { level, trend, season, fitted, residualSd, clamped } or null.
 *
 *  Initialisation tightened over the textbook minimum:
 *  - Trend is the average per-step delta between paired observations
 *    one season apart, averaged over every available pair (Hyndman's
 *    additive HW init). Robust to a single spike at index 0 or `period`.
 *  - Seasonal indices average across all complete seasons in the data,
 *    not just the first season — the first 7 days for a new user are
 *    usually atypical and seeding from them alone biases everything
 *    downstream.
 *
 *  `residualSd` is the standard deviation of the in-sample residuals
 *  (values[t] - fitted[t]); callers use it to draw a 1-σ / 2-σ band
 *  around the forecast so the projection isn't shown as more confident
 *  than it is. */
export function holtWintersAdditive(values, period = 7, opts = {}) {
    const { alpha = 0.3, beta = 0.1, gamma = 0.1 } = opts;
    if (!values || values.length < period * 2) return null;

    // Initial level: mean of the first season.
    let level = 0;
    for (let i = 0; i < period; i++) level += values[i];
    level /= period;

    // Initial trend: average per-step difference between paired
    // observations one season apart, scaled to per-step rate.
    const seasonsAvail = Math.floor(values.length / period);
    let trendSum = 0;
    let trendCount = 0;
    for (let i = 0; i < period; i++) {
        for (let s = 1; s < seasonsAvail; s++) {
            const a = values[i + period * (s - 1)];
            const b = values[i + period * s];
            if (Number.isFinite(a) && Number.isFinite(b)) {
                trendSum += (b - a) / period;
                trendCount++;
            }
        }
    }
    let trend = trendCount > 0 ? trendSum / trendCount : 0;

    // Initial seasonal indices: average detrended deviation per period
    // slot across every complete season available, then center so the
    // sum is ~0 (additive convention).
    const season = new Array(period).fill(0);
    const slotCounts = new Array(period).fill(0);
    for (let s = 0; s < seasonsAvail; s++) {
        const seasonStart = s * period;
        let seasonMean = 0;
        for (let i = 0; i < period; i++) seasonMean += values[seasonStart + i];
        seasonMean /= period;
        for (let i = 0; i < period; i++) {
            season[i] += values[seasonStart + i] - seasonMean;
            slotCounts[i]++;
        }
    }
    for (let i = 0; i < period; i++) season[i] /= slotCounts[i] || 1;
    let seasonMean = 0;
    for (let i = 0; i < period; i++) seasonMean += season[i];
    seasonMean /= period;
    for (let i = 0; i < period; i++) season[i] -= seasonMean;

    const fitted = [];
    const residuals = [];
    for (let t = 0; t < values.length; t++) {
        const idx = t % period;
        if (t === 0) {
            fitted.push(level + season[idx]);
            residuals.push(values[t] - fitted[t]);
            continue;
        }
        const prevLevel = level;
        const prevTrend = trend;
        const prevSeason = season[idx];
        // One-step-ahead fitted before update (so residuals match a
        // genuine forecast, not an in-sample over-fit).
        const fHat = prevLevel + prevTrend + prevSeason;
        fitted.push(fHat);
        residuals.push(values[t] - fHat);
        level = alpha * (values[t] - prevSeason) + (1 - alpha) * (prevLevel + prevTrend);
        trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
        season[idx] = gamma * (values[t] - level) + (1 - gamma) * prevSeason;
    }
    // Population stdev on the residuals — denominator (n - 1) is the
    // sample stdev, but for bandwidth it doesn't materially change the
    // band visual at n = 30..90 and population stdev avoids a special
    // case at n = 1.
    const meanRes = residuals.reduce((a, x) => a + x, 0) / residuals.length;
    const varRes = residuals.reduce((a, x) => a + (x - meanRes) ** 2, 0) / residuals.length;
    const residualSd = Math.sqrt(varRes);

    return { level, trend, season, fitted, residuals, residualSd, alpha, beta, gamma };
}

/** Forecast `horizon` steps ahead from a fitted Holt-Winters model.
 *  Returns { mean, lower, upper, clamped } — `mean` is the point
 *  forecast (possibly clamped at 0 — focus minutes can't be negative;
 *  `clamped` records whether any step was clamped so callers can
 *  surface that honestly). `lower` / `upper` are 1-σ residual bands
 *  scaled by √h to widen with horizon (textbook Gaussian assumption). */
export function holtWintersForecast(model, horizon = 14) {
    if (!model || !model.season) return { mean: [], lower: [], upper: [], clamped: false };
    const sd = model.residualSd || 0;
    const mean = [];
    const lower = [];
    const upper = [];
    let clamped = false;
    for (let h = 0; h < horizon; h++) {
        const seasonalIdx = h % model.season.length;
        const raw = model.level + (h + 1) * model.trend + model.season[seasonalIdx];
        const stepSd = sd * Math.sqrt(h + 1);
        const m = Math.max(0, raw);
        if (raw < 0) clamped = true;
        mean.push(m);
        lower.push(Math.max(0, raw - stepSd));
        upper.push(Math.max(0, raw + stepSd));
    }
    return { mean, lower, upper, clamped };
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
 *  Returns null when the matching group is too small.
 *
 *  minSamples default is 10 — the standard rule of thumb for
 *  proportions is n*p ≥ 5 in each cell. Below 10, a single 100% rate
 *  on 3 sessions can dominate the ranked list with what's essentially
 *  a coin-flip's worth of evidence. */
export function conditionalLift(sessions, predicate, {
    minSamples = 10,
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

// ───────────────────────────────────────────────────────────────────────
// ML — Markov chain over session-completion transitions
// ───────────────────────────────────────────────────────────────────────
//
// Treats the user's session history as a 2-state chain — Completed (C)
// or Cut-short (X) — and estimates the four transition probabilities:
//   P(C|C), P(X|C), P(C|X), P(X|X)
// The interesting question this answers is one the completion rate
// alone can't: do cut-short sessions cluster? If P(X|X) >> P(X), one
// bad session predicts another, and the actionable advice changes from
// "finish more sessions" to "watch out for the next session after a
// cut-short one." This is a real psychological effect (consecutive
// failures erode follow-through) that's invisible to univariate stats.
//
// Stationary distribution and expected cut-short streak length are
// derived from the chain and exposed for the detail view.

/** Build a 2-state Markov chain over completed/cut-short transitions.
 *  Sessions must be sorted ascending by startedAt. Returns null when
 *  there's not enough data (need ≥ 5 transitions). */
export function sessionTransitionChain(sessions, { minTransitions = 5 } = {}) {
    if (!sessions || sessions.length < minTransitions + 1) return null;
    const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
    // counts[from][to] — 0 = cut-short, 1 = completed
    const counts = [[0, 0], [0, 0]];
    let total = 0;
    for (let i = 1; i < sorted.length; i++) {
        const from = sorted[i - 1].completed ? 1 : 0;
        const to = sorted[i].completed ? 1 : 0;
        counts[from][to]++;
        total++;
    }
    if (total < minTransitions) return null;
    // Marginal counts (rows) for normalising into probabilities.
    const fromCut = counts[0][0] + counts[0][1];
    const fromComplete = counts[1][0] + counts[1][1];
    // P(target | source) — rows sum to 1 by construction; if a row's
    // total is 0 (e.g. user has never cut a session) we report null
    // for both transitions out of that state.
    const pXgivenX = fromCut > 0 ? counts[0][0] / fromCut : null;
    const pCgivenX = fromCut > 0 ? counts[0][1] / fromCut : null;
    const pXgivenC = fromComplete > 0 ? counts[1][0] / fromComplete : null;
    const pCgivenC = fromComplete > 0 ? counts[1][1] / fromComplete : null;
    // Baseline (overall) completion rate, from the same time series.
    const overallComplete = sorted.filter((s) => s.completed).length / sorted.length;
    const overallCut = 1 - overallComplete;
    // Expected cut-short streak length from a self-loop probability:
    // E[length | started] = 1 / (1 - P(X|X)). Capped at 50 for display
    // sanity; the formula tends to infinity as P(X|X) → 1.
    const expectedCutStreak = pXgivenX !== null && pXgivenX < 1
        ? Math.min(50, 1 / (1 - pXgivenX))
        : null;
    // Stationary distribution — solve π = π P for a 2-state chain in
    // closed form. π_X = P(C|X) / (P(C|X) + P(X|C)) (when both rows
    // have non-zero outflow).
    let stationaryX = null;
    let stationaryC = null;
    if (pCgivenX !== null && pXgivenC !== null && (pCgivenX + pXgivenC) > 0) {
        stationaryX = pCgivenX / (pCgivenX + pXgivenC);
        stationaryC = 1 - stationaryX;
    }
    return {
        counts,
        total,
        // Conditional probabilities — null when source state was never seen.
        pXgivenX, pCgivenX, pXgivenC, pCgivenC,
        // Baseline rates from the same series.
        overallComplete, overallCut,
        // "Lift" of cut-after-cut over cut-overall (>1 means the next
        // session after a cut is more likely to be cut than baseline).
        cutClusterLift: pXgivenX !== null && overallCut > 0
            ? pXgivenX / overallCut
            : null,
        completeClusterLift: pCgivenC !== null && overallComplete > 0
            ? pCgivenC / overallComplete
            : null,
        expectedCutStreak,
        stationaryX, stationaryC,
    };
}

// ───────────────────────────────────────────────────────────────────────
// ML — Kernel density estimation (Gaussian, Silverman's rule)
// ───────────────────────────────────────────────────────────────────────
//
// A KDE smooths a 1-D distribution into a continuous curve, free of
// the bin-boundary artefacts a histogram suffers from. We use a
// Gaussian kernel with bandwidth via Silverman's rule of thumb:
//   h = 1.06 · σ · n^(-1/5)
// Output is { x: number[], y: number[] } evaluated at `resolution`
// equally-spaced points across the data range. Caller renders as a
// smooth filled area or polyline.

/** Gaussian kernel density estimate of a 1-D sample. */
export function kernelDensity(values, { resolution = 80, padFactor = 0.06 } = {}) {
    if (!values || values.length < 2) return null;
    const xs = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
    if (xs.length < 2) return null;
    const lo = xs[0];
    const hi = xs[xs.length - 1];
    const span = hi - lo || 1;
    const padding = span * padFactor;
    const xMin = lo - padding;
    const xMax = hi + padding;
    const sd = stdDev(xs);
    if (sd === 0) return null;
    // Silverman's rule of thumb. Robust enough for most unimodal
    // distributions; over-smooths bimodal data (which is a feature
    // here — we'd rather under-claim a second mode than fabricate one).
    const h = 1.06 * sd * Math.pow(xs.length, -1 / 5);
    const denom = Math.sqrt(2 * Math.PI) * h * xs.length;
    const x = new Array(resolution);
    const y = new Array(resolution);
    for (let i = 0; i < resolution; i++) {
        const xi = xMin + (i / (resolution - 1)) * (xMax - xMin);
        let acc = 0;
        for (const v of xs) {
            const u = (xi - v) / h;
            acc += Math.exp(-0.5 * u * u);
        }
        x[i] = xi;
        y[i] = acc / denom;
    }
    return { x, y, bandwidth: h };
}

// ───────────────────────────────────────────────────────────────────────
// ML — Change-point detection (CUSUM, two-sided)
// ───────────────────────────────────────────────────────────────────────
//
// CUSUM (cumulative sum) finds the moment a time series shifts level.
// We run a two-sided variant against the warm-up mean/stdev, looking
// for both upshifts and downshifts. The first index where either
// statistic crosses h·σ is reported as the change-point. Once a
// change-point fires, we recompute means before/after to describe the
// shift in plain numbers ("was 60 min/day, now 95 min/day").
//
// CUSUM is the right tool here because it's:
//   - cheap (O(n) one pass)
//   - small-data robust (degrades to "no change-point" gracefully)
//   - principled: detects step-shifts, which is what real life-event
//     changes (new project, vacation, semester start) look like in
//     daily focus minutes.
//
// We deliberately don't use Bayesian online change-point — it requires
// hyperprior choices that are non-trivial to expose to users, and on
// 60-day windows CUSUM gives the same answer at 30% of the code.

/** Detect the largest step-shift in a 1D time series. Returns null if
 *  no shift exceeds the significance threshold.
 *
 *  Algorithm:
 *  1. Use the first `warmup` points to estimate baseline mean μ̂ and σ̂.
 *  2. Walk forward, accumulating positive (s_pos) and negative (s_neg)
 *     CUSUM statistics with a slack `k` (in σ units) so small noise
 *     doesn't trigger.
 *  3. The first index where either statistic crosses `h * σ` is the
 *     change-point. We then segment around it and report:
 *        { index, beforeMean, afterMean, delta, direction }
 *
 *  Defaults (k=0.5, h=4) are the standard "moderate sensitivity"
 *  values from Page (1954); they're robust on noisy daily data with
 *  n=30..90 and rarely fire false positives.
 */
export function detectChangePoint(values, {
    warmup = null,
    k = 0.5,
    h = 4,
    minSegment = 5,
} = {}) {
    if (!values || values.length < 14) return null;
    const n = values.length;
    const wm = warmup || Math.max(7, Math.floor(n * 0.25));
    if (wm < 3 || n - wm < minSegment) return null;

    // Baseline stats from warm-up.
    const warmupSlice = values.slice(0, wm);
    const baseMean = mean(warmupSlice);
    const baseSd = stdDev(warmupSlice);
    if (baseSd === 0) return null;

    let sPos = 0;
    let sNeg = 0;
    let firstHit = -1;
    let direction = 0;
    for (let i = wm; i < n; i++) {
        const z = (values[i] - baseMean) / baseSd;
        sPos = Math.max(0, sPos + z - k);
        sNeg = Math.min(0, sNeg + z + k);
        if (sPos > h) {
            firstHit = i;
            direction = 1;
            break;
        }
        if (sNeg < -h) {
            firstHit = i;
            direction = -1;
            break;
        }
    }
    if (firstHit < 0) return null;

    // Segment for plain-numbers description: refine the change-point
    // by finding the index in [firstHit - period, firstHit] that
    // maximises the absolute difference between the two sub-means.
    const window = Math.min(7, firstHit - wm);
    let bestIdx = firstHit;
    let bestDelta = 0;
    for (let i = Math.max(wm, firstHit - window); i <= firstHit; i++) {
        if (i < minSegment || n - i < minSegment) continue;
        const before = values.slice(0, i);
        const after = values.slice(i);
        const d = Math.abs(mean(after) - mean(before));
        if (d > bestDelta) {
            bestDelta = d;
            bestIdx = i;
        }
    }
    const beforeArr = values.slice(0, bestIdx);
    const afterArr = values.slice(bestIdx);
    if (beforeArr.length < minSegment || afterArr.length < minSegment) return null;
    const beforeMean = mean(beforeArr);
    const afterMean = mean(afterArr);
    return {
        index: bestIdx,
        daysAgo: n - 1 - bestIdx,
        beforeMean,
        afterMean,
        delta: afterMean - beforeMean,
        direction: afterMean >= beforeMean ? 1 : -1,
        beforeN: beforeArr.length,
        afterN: afterArr.length,
    };
}
