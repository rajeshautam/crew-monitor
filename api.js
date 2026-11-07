// Talks to the Apps Script backend. The session is a signed token, never a password.
window.crew = (() => {
  const SESSION_KEY = 'crew-session';
  const CACHE_NAME = 'crew-last-data';
  // Only a storage label, never fetched. The Cache API accepts http(s) only, and the desktop app's own address isn't.
  const CACHE_URL = 'https://crew-monitor.invalid/last-data.json';

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) ?? null;
    } catch {
      return null;
    }
  }
  let session = loadSession();

  function setSession(next) {
    session = next;
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* a private window still works until it closes */ }
  }

  class ApiError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  }

  async function post(action, fields = {}, timeout = 90000) {
    if (!window.CREW_API_URL) throw new ApiError('This app is not connected to its server yet.', 'CONFIG');
    let response;
    try {
      // Plain text keeps this a simple request, which is what Apps Script accepts from a browser.
      response = await fetch(window.CREW_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: session?.token, ...fields }),
        signal: AbortSignal.timeout(timeout),
        redirect: 'follow',
      });
    } catch {
      throw new ApiError('Could not reach the server. Check your connection and try again.', 'NETWORK');
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('The server sent an unexpected reply. Please try again.', 'NETWORK');
    }
    if (!body.ok) {
      if (body.code === 'AUTH') setSession(null);
      throw new ApiError(body.error || 'Something went wrong.', body.code);
    }
    return body;
  }

  async function saveLastData(raw) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(CACHE_URL, new Response(JSON.stringify({ at: Date.now(), raw })));
    } catch { /* offline copy is only a convenience */ }
  }

  async function readLastData() {
    try {
      const hit = await (await caches.open(CACHE_NAME)).match(CACHE_URL);
      return hit ? await hit.json() : null;
    } catch {
      return null;
    }
  }

  async function forgetLastData() {
    try {
      await caches.delete(CACHE_NAME);
    } catch { /* nothing to remove */ }
  }

  function position() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve('');
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(`${p.coords.latitude.toFixed(7)},${p.coords.longitude.toFixed(7)}`),
        () => resolve(''),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    });
  }

  return {
    user: () => session?.user ?? null,

    async login(email, password) {
      const reply = await post('login', { email, password });
      setSession({ token: reply.token, user: reply.user });
      return reply.user;
    },
    register: (name, email, password) => post('register', { name, email, password }),
    async changePassword(current, next) {
      const reply = await post('changePassword', { current, next });
      setSession({ token: reply.token, user: reply.user });
      return reply.user;
    },
    async signOut() {
      setSession(null);
      await forgetLastData();
    },

    async load() {
      try {
        const raw = await post('load');
        await saveLastData(raw);
        setSession({ token: session.token, user: raw.user });
        return CrewLib.assemble(raw);
      } catch (error) {
        if (error.code !== 'NETWORK') throw error;
        const saved = await readLastData();
        if (!saved || saved.raw?.user?.email !== session?.user?.email) throw error;
        return { ...CrewLib.assemble(saved.raw), offlineAt: saved.at };
      }
    },

    // Adds the row the first time and replaces it after that, so it's safe to send again.
    saveRow: (row) => post('saveEntry', { row }, 30000),
    deleteEntry: (id) => post('deleteEntry', { id }),

    listUsers: () => post('listUsers').then((r) => r.users),
    updateUser: (email, changes) => post('updateUser', { email, ...changes }).then((r) => r.users),
    resetPassword: (email) => post('resetPassword', { email }).then((r) => r.tempPassword),
    deleteUser: (email) => post('deleteUser', { email }).then((r) => r.users),

    callPhone(number) {
      window.location.href = `tel:${number}`;
    },
    position,
  };
})();
