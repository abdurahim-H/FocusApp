// password-policy.js — strength + safety checks for sign-up passwords.
//
// Aligned with OWASP password guidance (2024-ish): the strongest
// modern policy is length + dictionary/breach checks, NOT character-
// class complexity rules. Forcing "must contain uppercase + symbol"
// just produces predictable patterns ("Password1!"). What actually
// kills bad passwords is rejecting known-leaked / known-common ones
// regardless of how "complex" they look.
//
// Public surface:
//   evaluatePassword(password)   →  { score, label, message? }   (sync)
//   validatePassword(password)   →  { ok, code, message }        (sync)
//   isPasswordBreached(password) →  Promise<bool>                (HIBP)
//
// score: 0..4   label: 'too short' | 'weak' | 'fair' | 'good' | 'strong'
//
// HIBP uses k-anonymity (only first 5 chars of SHA-1 sent to the API),
// so the password itself never leaves the browser.

// Top-50 most-common passwords from the SecLists / NCSC top-100 lists,
// merged + deduplicated. Anything in here is flat-out rejected at
// sign-up regardless of length. The full HIBP dataset has hundreds
// of millions; this small set covers the worst offenders for the case
// where the user is offline / HIBP is unreachable.
const COMMON_PASSWORDS = new Set([
    '12345678', '123456789', '1234567890', '12345678910',
    'password', 'password1', 'password12', 'password123', 'password1234',
    'qwerty', 'qwerty123', 'qwerty1234', 'qwertyui', 'qwertyuiop',
    'iloveyou', 'iloveyou1', 'iloveyou123',
    'admin', 'admin123', 'admin1234', 'administrator',
    'welcome', 'welcome1', 'welcome123',
    'letmein', 'letmein1', 'letmein123',
    'monkey', 'monkey123',
    'football', 'football1', 'football123',
    'baseball', 'baseball1',
    'starwars', 'starwars1',
    'abc12345', 'abcd1234', 'abcdefgh', 'asdfasdf',
    'sunshine', 'sunshine1', 'princess',
    'master123', 'masterkey', 'shadow123', 'dragon123',
    '1q2w3e4r', '1qaz2wsx', 'zaq12wsx',
    'trustno1', 'changeme', 'changeme1',
]);

/** Fast structural check. Returns the first failure with a typed code
 *  + user-facing message, or `{ ok: true }`. Synchronous — no network. */
export function validatePassword(password) {
    if (typeof password !== 'string') {
        return { ok: false, code: 'invalid', message: 'Enter a password.' };
    }
    if (password.length < 8) {
        return { ok: false, code: 'too_short', message: 'Password must be at least 8 characters.' };
    }
    if (password.length > 128) {
        return { ok: false, code: 'too_long', message: 'Password is too long (128 characters max).' };
    }
    if (/^\s|\s$/.test(password)) {
        return { ok: false, code: 'whitespace', message: 'Password can\'t start or end with a space.' };
    }
    const lower = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lower)) {
        return { ok: false, code: 'common', message: 'That password is too common — pick something less guessable.' };
    }
    // Trivial single-character or single-class strings — "aaaaaaaa" or
    // "11111111" — are technically 8 chars but offer ~zero entropy.
    if (/^(.)\1{7,}$/.test(password)) {
        return { ok: false, code: 'repeated', message: 'Password can\'t be a single character repeated.' };
    }
    return { ok: true };
}

/** Quick visual strength estimate for the meter. Not a security gate;
 *  the gate is validatePassword + isPasswordBreached. This is just for
 *  the UI feedback bar. Returns 0..4 + a label. */
export function evaluatePassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        return { score: 0, label: 'too short' };
    }
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    // Character-class diversity — modest bonus, not a requirement
    const classes = [
        /[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/,
    ].filter((re) => re.test(password)).length;
    if (classes >= 3) score++;
    // Cap penalties: shrinking score for known-bad shapes
    const lower = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lower)) score = 0;
    if (/^(.)\1+$/.test(password)) score = 0;
    if (/^(\d+|[a-z]+)$/.test(password)) score = Math.min(score, 1);
    score = Math.max(0, Math.min(4, score));
    const labels = ['too weak', 'weak', 'fair', 'good', 'strong'];
    return { score, label: labels[score] };
}

/** Check the password against Have-I-Been-Pwned via the k-anonymity
 *  Range API. The password itself never leaves the browser — only the
 *  first 5 hex chars of its SHA-1 hash. The API returns all suffixes
 *  starting with that prefix; we match locally.
 *
 *  Returns true if the password appears in known breach data. Network
 *  failures resolve to FALSE (don't block sign-up if HIBP is down) —
 *  the validate + common-password checks are still enforced. */
export async function isPasswordBreached(password) {
    if (typeof password !== 'string' || password.length === 0) return false;
    if (typeof crypto === 'undefined' || !crypto.subtle?.digest) return false;
    try {
        const enc = new TextEncoder();
        const bytes = enc.encode(password);
        const hashBuf = await crypto.subtle.digest('SHA-1', bytes);
        const hex = Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        const prefix = hex.slice(0, 5);
        const suffix = hex.slice(5);
        // 4-second timeout — don't hang the sign-up flow on a slow API.
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            method: 'GET',
            signal: ctrl.signal,
            // Add-Padding asks HIBP to pad responses with random false
            // entries, defeating any traffic-analysis attack on the
            // 5-char prefix length.
            headers: { 'Add-Padding': 'true' },
        });
        clearTimeout(timer);
        if (!res.ok) return false;
        const text = await res.text();
        for (const line of text.split('\n')) {
            const colon = line.indexOf(':');
            if (colon < 0) continue;
            const lineSuffix = line.slice(0, colon).trim().toUpperCase();
            const count = Number(line.slice(colon + 1).trim());
            if (lineSuffix === suffix && count > 0) return true;
        }
        return false;
    } catch (_) {
        // AbortError, network error, CORS — treat as "no signal" rather
        // than blocking the user. The other policy checks still apply.
        return false;
    }
}
