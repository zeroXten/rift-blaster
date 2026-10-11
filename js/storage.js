// Local high scores and settings. Storage can be unavailable (private browsing, quota), so
// every access is wrapped and the game carries on without it.

const KEY = 'riftblaster.v1';
const DEFAULTS = { scores: [], music: true, voice: true, difficulty: 'medium' };

export function loadStore() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
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
  if (entry) { entry.score = run.score; entry.reached = run.incident + 1; }
  else store.scores.push({ id: run.id, score: run.score, reached: run.incident + 1 });
  store.scores.sort((a, b) => b.score - a.score);
  store.scores.length = Math.min(5, store.scores.length);
  saveStore(store);
}
