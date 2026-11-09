// Finding a stargazer by GitHub username as they type. No React and no DOM, so it can be tested
// and timed on its own.

/** How well a login matches, best first. */
export const RANK = { exact: 0, prefix: 1, word: 2, substring: 3, fuzzy: 4 } as const;
export type Rank = (typeof RANK)[keyof typeof RANK];

export type LoginMatch = {
  /** The star's place in the feed, oldest first. */
  index: number;
  login: string;
  rank: Rank;
  /** Where the query starts in the login, or -1 for a fuzzy match. */
  at: number;
};

/** Every login lowercased and split into words, built once when the feed loads. */
export type LoginIndex = {
  logins: readonly string[];
  lower: string[];
  words: number[][];
  /** The letters and digits in each login, one bit each (digits share a few), to rule logins out fast. */
  letters: Uint32Array;
};

/** What people type: "@Name " finds "name". */
export const normalize = (query: string) => query.trim().replace(/^@/, "").toLowerCase();

// Character codes: logins are ASCII letters, digits, "-" (and "_" from elsewhere).
const isSep = (c: number) => c === 45 || c === 95;
const isDigit = (c: number) => c >= 48 && c <= 57;
const isUpper = (c: number) => c >= 65 && c <= 90;
const isLower = (c: number) => c >= 97 && c <= 122;

/**
 * Where words start inside a login, past its first letter: after a "-" or "_", where digits start
 * or stop, and at a capital after a small letter ("behnamAzimi") or before one ("HTMLParser").
 */
export function wordStarts(login: string) {
  const starts: number[] = [];
  for (let i = 1; i < login.length; i++) {
    const a = login.charCodeAt(i - 1);
    const b = login.charCodeAt(i);
    const c = login.charCodeAt(i + 1);
    if (isSep(b)) continue;
    if (
      isSep(a) ||
      isDigit(a) !== isDigit(b) ||
      (isUpper(b) && (isLower(a) || (isUpper(a) && isLower(c))))
    )
      starts.push(i);
  }
  return starts;
}

/** One bit per letter, and the digits folded onto the bits left over. */
const lettersIn = (lower: string) => {
  let bits = 0;
  for (let k = 0; k < lower.length; k++) {
    const c = lower.charCodeAt(k);
    if (isLower(c)) bits |= 1 << (c - 97);
    else if (isDigit(c)) bits |= 1 << (26 + ((c - 48) % 6));
  }
  return bits >>> 0;
};

export function indexLogins(logins: readonly string[]): LoginIndex {
  const lower = logins.map((l) => l.toLowerCase());
  return {
    logins,
    lower,
    words: logins.map(wordStarts),
    letters: Uint32Array.from(lower, lettersIn),
  };
}

/** Whether `l` from `li` on starts with `q` from `qi` on. */
const restMatches = (q: string, qi: number, l: string, li: number) => {
  if (l.length - li < q.length - qi) return false;
  for (; qi < q.length; qi++, li++) if (q[qi] !== l[li]) return false;
  return true;
};

/** Whether the login, read from `from`, starts with the query but for one letter wrong, missing, extra or swapped. */
const oneTypo = (l: string, q: string, from: number) => {
  let i = 0;
  while (i < q.length && q[i] === l[from + i]) i++;
  if (i === q.length) return true;
  const at = from + i;
  return (
    restMatches(q, i + 1, l, at + 1) ||
    restMatches(q, i + 1, l, at) ||
    restMatches(q, i, l, at + 1) ||
    (q[i] === l[at + 1] && q[i + 1] === l[at] && restMatches(q, i + 2, l, at + 2))
  );
};

/** Whether the query's letters all appear in the login, in order. */
const inOrder = (l: string, q: string) => {
  let j = 0;
  for (let k = 0; k < l.length && j < q.length; k++) if (l[k] === q[j]) j++;
  return j === q.length;
};

/** Whether `a` should be listed before `b`: the better rank, then the shorter login, then the earlier star. */
const before = (a: LoginMatch, b: LoginMatch) =>
  a.rank - b.rank || a.login.length - b.login.length || a.index - b.index;

/**
 * The best `limit` logins for a query, best first. Keeps only the best few as it goes instead of
 * sorting every match, and skips the fuzzy checks once those few are all better than fuzzy, so a
 * keystroke stays well under a frame with tens of thousands of stars.
 */
export function searchLogins(index: LoginIndex, query: string, limit = 6): LoginMatch[] {
  const q = normalize(query);
  const top: LoginMatch[] = [];
  if (!q || limit < 1) return top;
  const { logins, lower, words, letters } = index;
  const wanted = lettersIn(q);
  // A typo only counts once there is enough typed to tell what was meant.
  const typos = q.length >= 4;
  for (let i = 0; i < lower.length; i++) {
    const l = lower[i];
    const full = top.length === limit;
    let rank: Rank;
    let at = l.indexOf(q);
    if (at === 0) rank = l.length === q.length ? RANK.exact : RANK.prefix;
    else if (at > 0) {
      rank = RANK.substring;
      for (const s of words[i])
        if (l.startsWith(q, s)) {
          [rank, at] = [RANK.word, s];
          break;
        }
    } else {
      if (full && top[limit - 1].rank < RANK.fuzzy) continue;
      // Letters in order need every letter of the query; one typo can bring in one letter at most.
      const missing = (wanted & ~letters[i]) >>> 0;
      if (missing && (!typos || missing & (missing - 1))) continue;
      let near = !missing && inOrder(l, q);
      if (!near && typos) {
        near = oneTypo(l, q, 0);
        for (let k = 0; !near && k < words[i].length; k++) near = oneTypo(l, q, words[i][k]);
      }
      if (!near) continue;
      rank = RANK.fuzzy;
    }
    const match = { index: i, login: logins[i], rank, at };
    if (full && before(match, top[limit - 1]) >= 0) continue;
    let k = full ? limit - 1 : top.length;
    while (k > 0 && before(match, top[k - 1]) < 0) k--;
    top.splice(k, 0, match);
    if (top.length > limit) top.pop();
  }
  return top;
}
