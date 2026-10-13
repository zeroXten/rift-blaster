// Local high scores and settings. Storage can be unavailable (private browsing, quota), so
// every access is wrapped and the game carries on without it.

const KEY = 'riftblaster.v1';
const DEFAULTS = { scores: [], music: true, voice: true, difficulty: 'normal' };

export function loadStore() {
  try {
    const store = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    // What used to be called MEDIUM is now HARD.
    if (store.difficulty === 'medium') store.difficulty = 'hard';
    return store;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveStore(store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* scores just won't persist */ }
}

// One entry per run, updated as the run progresses; the best five are kept.
export function recordScore(store, run) {
  if (!run.score) return;
  const entry = store.scores.find(s => s.id === run.id);
  if (entry) { entry.score = run.score; entry.level = run.level; }
  else store.scores.push({ id: run.id, score: run.score, level: run.level });
  store.scores.sort((a, b) => b.score - a.score);
  store.scores.length = Math.min(5, store.scores.length);
  saveStore(store);
}
