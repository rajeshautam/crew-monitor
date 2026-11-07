'use strict';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const root = document.getElementById('app');

const state = {
  user: null,
  authView: 'login', // login or register
  authMessage: '',
  authError: '',
  lastEmail: '',
  busy: false,
  adminUsers: null,
  tempPassword: null,
  reportFrom: '',
  reportTo: '',
  reportCli: '',
  installPrompt: null,
  data: null,
  loading: false,
  error: '',
  notice: '',
  view: 'dashboard',
  selectedCli: '',
  reportCode: null,
  crewQuery: '',
  trainQuery: '',
  form: null,
};

// ── Small helpers. Everything is added as text, so sheet data can't act as page code. ──────────
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

const ICONS = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  train: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  crew: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
  message: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  admin: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  report: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
};

function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

function lv(label, value) {
  return el('span', { class: 'lv' }, el('b', {}, `${label}:`), String(value || '—'));
}

const pad = (n) => String(n).padStart(2, '0');
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function display(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${MONTHS[+m[2] - 1]}-${m[1]}` : (iso || '—');
}

function parseDisplay(text) {
  const m = String(text).trim().match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (month < 0) return null;
  const d = new Date(Date.UTC(+m[3], month, +m[1]));
  if (d.getUTCMonth() !== month || d.getUTCDate() !== +m[1]) return null;
  return `${m[3]}-${pad(month + 1)}-${m[1]}`;
}

function normaliseTime(time) {
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : String(time || '').trim();
}

// 24-hour HH:MM as it's typed: a digit that can't be part of a time is ignored, and 9 becomes 09.
// Must stay the same as typedTime in Models.kt.
function formatTime(typed) {
  let digits = '';
  for (const digit of String(typed).replace(/\D/g, '')) {
    if (digits.length === 0) digits = digit > '2' ? `0${digit}` : digit;
    else if (digits.length === 1 && digits[0] === '2' && digit > '3') continue;
    else if (digits.length === 2 && digit > '5') continue;
    else if (digits.length < 4) digits += digit;
  }
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

// DD/MM/YYYY as it's typed, the format the sheet's LCD column uses.
function formatLcd(typed) {
  const digits = String(typed).replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

const validLcd = (text) => /^\d{2}\/\d{2}\/\d{4}$/.test(text) && /^\d{4}-\d{2}-\d{2}$/.test(CrewLib.toIsoDate(text));

const validTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

function shiftFor(dep, arrival) {
  // Until the arrival is known, go by the departure alone. It's worked out again once it is.
  const arr = arrival || dep;
  if (!validTime(dep) || !validTime(arr)) return null;
  // Exactly 18:00 or 06:00 counts as day.
  return dep > '18:00' || arr < '06:00' ? 'NIGHT' : 'DAY';
}

function kmsBetween(from, to) {
  const km = state.data?.stationKm ?? {};
  if (!(from in km) || !(to in km)) return null;
  return String(Math.round(Math.abs(km[to] - km[from])));
}

function entriesFor(crew) {
  return state.data.entries
    .filter((e) => (e.code ? e.code === crew.code : e.nameOfMotorman.toLowerCase() === crew.name.toLowerCase()))
    .sort((a, b) => b.sortKey - a.sortKey);
}

let lastDatesCache = new WeakMap();

function lastDates(crew) {
  if (!lastDatesCache.has(crew)) lastDatesCache.set(crew, computeLastDates(crew));
  return lastDatesCache.get(crew);
}

/** The nominated CLI's latest footplating or counselling, plus 7 days for grade C, 15 for B and 30 for A. */
function crewDue(crew) {
  const days = { C: 7, B: 15, A: 30 }[crew.grade.trim().toUpperCase().charAt(0)];
  if (!days) return { isDue: false, dueDate: '' };
  const last = lastDates(crew).nominated;
  if (!last) return { isDue: true, dueDate: '' };
  const d = new Date(`${last}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  const dueDate = d.toISOString().slice(0, 10);
  return { isDue: isoToday() >= dueDate, dueDate };
}

/** Due first whatever the grade, then C, B, A, then the earliest due date. */
function sortedByDue(crew) {
  const rank = (c) => ({ C: 0, B: 1, A: 2 }[c.grade.trim().toUpperCase().charAt(0)] ?? 3);
  return crew
    .map((c) => ({ c, due: crewDue(c) }))
    .sort((a, b) => (b.due.isDue - a.due.isDue) || (rank(a.c) - rank(b.c)) ||
      a.due.dueDate.localeCompare(b.due.dueDate) || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c);
}

function dueLine(crew) {
  const due = crewDue(crew);
  const text = due.dueDate ? display(due.dueDate) : (due.isDue ? 'None yet by nominated CLI' : '');
  const line = lv(due.isDue ? 'Due' : 'Next due', text);
  if (due.isDue) line.classList.add('due');
  return line;
}

function tmLine(name, phone) {
  if (!phone) {
    const line = lv('Train Manager', name);
    line.classList.add('tm-name');
    return line;
  }
  return el('span', { class: 'lv' }, el('b', {}, 'Train Manager:'),
    el('button', { type: 'button', class: 'link tm-name', onclick: () => window.crew.callPhone(phone) }, `${name} · ${phone}`));
}

// The last dates show whoever did it. The due date only counts the nominated CLI's, kept apart in `nominated`.
function computeLastDates(crew) {
  let counselling = '';
  let footplating = '';
  let nominated = '';
  for (const e of entriesFor(crew)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    const subject = e.sub.toUpperCase();
    const isCounselling = subject.includes('COUNSELLING');
    const isFootplating = subject.includes('FOOTPLATING');
    if (isCounselling && e.date > counselling) counselling = e.date;
    if (isFootplating && e.date > footplating) footplating = e.date;
    if ((isCounselling || isFootplating) && e.date > nominated && CrewLib.doneByNominatedCli(e, crew, state.data.cliNames)) nominated = e.date;
  }
  return { counselling, footplating, nominated };
}

function confirmBox({ title, text, action, danger }) {
  const box = document.getElementById('confirm');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;
  const ok = document.getElementById('confirm-ok');
  ok.textContent = action;
  ok.className = danger ? 'danger' : '';
  return new Promise((resolve) => {
    const done = (value) => {
      ok.onclick = null;
      document.getElementById('confirm-cancel').onclick = null;
      box.close();
      resolve(value);
    };
    ok.onclick = () => done(true);
    document.getElementById('confirm-cancel').onclick = () => done(false);
    box.oncancel = () => resolve(false);
    box.showModal();
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function refresh() {
  state.loading = true;
  state.error = '';
  loadUnsent();
  render();
  try {
    state.data = await window.crew.load();
    state.user = state.data.user;
    // Changes still on their way aren't in what the server just sent.
    Object.values(unsent).forEach(showRow);
    if (Object.keys(unsent).length) sendUnsent();
    if (isAdmin()) state.adminUsers = await window.crew.listUsers().catch(() => state.adminUsers);
    if (!state.selectedCli) {
      const words = (s) => s.toUpperCase().split(/\s+/).filter(Boolean).sort().join(' ');
      const mine = words(state.data.cliName);
      state.selectedCli = cliNames().find((n) => mine && words(n) === mine) ?? '';
    }
  } catch (error) {
    if (!handleSessionError(error)) state.error = error.message;
  }
  state.loading = false;
  render();
}

const isAdmin = () => state.user?.role === 'admin';
const canChange = (entry) => isAdmin() || String(entry.userMail).toLowerCase() === String(state.user?.email).toLowerCase();

// True when the error means the person has to sign in again or change their password first.
function handleSessionError(error) {
  if (error.code === 'AUTH') {
    state.user = null;
    state.data = null;
    state.selectedCli = '';
    state.adminUsers = null;
    state.authView = 'login';
    state.authError = error.message;
    return true;
  }
  if (error.code === 'MUST_CHANGE') {
    state.user = { ...state.user, mustChange: true };
    return true;
  }
  return false;
}

function cliNames() {
  // CLI(R), TCC-*, TLC-* and STATIONARY aren't working CLIs.
  const names = state.data.crew.map((c) => c.cliName).filter((n) => n && !/^(CLI\(R\)|TCC-|TLC-|STATIONARY$)/i.test(n.trim()));
  return [...new Set(names)].sort();
}

function go(view) {
  state.moreOpen = false;
  // Leaving saves what can be saved. A new entry that can't be saved yet waits here for the person to come back.
  const held = state.view === 'entry' && !flushSave() && state.form.id ? holdReason(state.form) : '';
  state.view = view;
  state.notice = held ? `Your last change was not saved. ${held}` : '';
  state.tempPassword = view === 'admin' ? state.tempPassword : null;
  if (state.form?.id) state.form = null;
  if (view === 'entry' && !state.form) {
    state.formReturn = 'dashboard';
    state.form = newForm();
    // Where the entry is made, recorded quietly like the phone app does.
    const form = state.form;
    window.crew.position().then((here) => {
      if (here && !form.location) {
        form.location = here;
        if (form === state.form && form.id) scheduleSave();
      }
    });
  }
  if (view === 'admin') loadUsers();
  render();
  window.scrollTo(0, 0);
}

function newForm() {
  const time = nowTime();
  return {
    newId: crypto.randomUUID(), startedHere: true, userMail: state.user.email, cliName: state.data.cliName || state.user.email,
    dateText: display(isoToday()), nameOfMotorman: '', grade: '', cmsCode: '', code: '', nameOfNominCli: '', depot: '',
    trainNo: '', unitNo: '', sub: '', line: '', fromStn: '', toStn: '', depTime: time, arrTime: '',
    kms: '', dayNight: shiftFor(time, '') ?? 'DAY', spec: '', lcd: '', tmgrName: '',
    deficiencyFound: false, remarkDeficiency: '', description: '',
  };
}

function editEntry(entry, returnTo = 'dashboard') {
  flushSave();
  state.formReturn = returnTo;
  const waiting = CrewLib.arrivalPending([entry], entry.userMail).length > 0 && canChange(entry);
  state.form = {
    ...entry,
    crewFilled: Boolean(crewFor(entry.nameOfMotorman)),
    dateText: display(entry.date),
    depTime: normaliseTime(entry.depTime),
    // Offered, not saved: opening an entry to look at it must not record an arrival.
    arrTime: waiting ? nowTime() : normaliseTime(entry.arrTime),
    arrivalOffered: waiting,
    openedFrom: entry.fromStn,
    openedTo: entry.toStn,
    openedLcd: entry.lcd,
  };
  state.form.lastRow = JSON.stringify(rowFor(state.form));
  state.view = 'entry';
  state.notice = '';
  render();
  window.scrollTo(0, 0);
}

function summary(e) {
  return [
    `${display(e.date)} · ${e.sub || 'No subject'}`,
    e.nameOfMotorman,
    `Train ${e.trainNo} · ${e.fromStn} → ${e.toStn}`,
    `Entered by ${e.cliName || e.userMail}`,
  ].join('\n');
}

// ── Saving as you go ──────────────────────────────────────────────────────────
// Each change is saved a moment after typing stops, or at once on leaving the field. The newest copy of a
// row waits in `unsent`, and is kept on this device, until the server has it, so no connection loses nothing.
const UNSENT_KEY = 'crew-unsent';
const SAVE_DELAY_MS = 800;
const RETRY_MS = 15000;
let unsent = {};
let unsentOwner = '';
let saveTimer = null;
let retryTimer = null;
let sending = null;
let offline = false;

function loadUnsent() {
  const email = state.user?.email ?? '';
  if (email === unsentOwner) return;
  unsentOwner = email;
  unsent = {};
  try {
    const saved = JSON.parse(localStorage.getItem(UNSENT_KEY));
    if (saved?.email === email) unsent = saved.rows ?? {};
  } catch { /* still kept in memory for as long as the app stays open */ }
}

function keepUnsent() {
  try {
    if (Object.keys(unsent).length) localStorage.setItem(UNSENT_KEY, JSON.stringify({ email: unsentOwner, rows: unsent }));
    else localStorage.removeItem(UNSENT_KEY);
  } catch { /* still kept in memory for as long as the app stays open */ }
}

function canEditForm(form) {
  return !form.id || canChange(form);
}

function isKnownStation(value, form) {
  const wanted = String(value ?? '').trim().toLowerCase();
  if (!wanted || wanted === String(form.openedFrom ?? '').toLowerCase() || wanted === String(form.openedTo ?? '').toLowerCase()) return true;
  return state.data.stations.some((s) => s.toLowerCase() === wanted)
    || state.data.trains.some((t) => t.fromStn.toLowerCase() === wanted || t.toStn.toLowerCase() === wanted);
}

// Why this form can't be saved as it stands, or '' when it can.
function holdReason(form) {
  if (!String(form.nameOfMotorman ?? '').trim() || !String(form.trainNo ?? '').trim()) return 'Saving starts once Motorman and Train No are filled.';
  if (!parseDisplay(form.dateText)) return 'Date must look like 05-Nov-2026.';
  if (form.depTime && !validTime(form.depTime)) return 'Dep Time must be 24-hour HH:MM, from 00:00 to 23:59.';
  if (form.arrTime && !validTime(form.arrTime)) return 'Arr Time must be 24-hour HH:MM, from 00:00 to 23:59.';
  // An older row can hold other text, and that needn't be fixed to change something else.
  if (form.lcd && form.lcd !== form.openedLcd && !validLcd(form.lcd)) return 'LCD must be a real date, DD/MM/YYYY.';
  if (!isKnownStation(form.fromStn, form)) return 'Pick From Stn from the list.';
  if (!isKnownStation(form.toStn, form)) return 'Pick To Stn from the list.';
  return '';
}

function rowFor(form) {
  const location = form.location ?? '';
  return CrewLib.entryToRow({
    ...form,
    id: form.id || form.newId,
    date: parseDisplay(form.dateText) ?? '',
    arrTime: form.arrivalOffered ? '' : form.arrTime,
    remarkDeficiency: form.deficiencyFound ? form.remarkDeficiency : '',
    fromLocation: form.fromLocation || (form.startedHere ? location : ''),
    toLocation: form.toLocation || (form.startedHere ? location : ''),
  });
}

// Puts a saved row into what the screens show, without waiting for a full sync.
function showRow(row) {
  const entries = state.data?.entries;
  if (!entries) return;
  const at = entries.findIndex((e) => e.id === row[0]);
  const old = entries[at];
  const place = old ? old.sortKey - (Date.parse(`${old.date}T00:00:00Z`) || 0) : entries.length + 1;
  const parsed = CrewLib.parseEntry(row, place);
  if (old) entries[at] = parsed; else entries.push(parsed);
  lastDatesCache = new WeakMap();
}

function paintSaveStatus() {
  const box = document.getElementById('save-status');
  const form = state.form;
  if (!box || !form) return;
  const hold = holdReason(form);
  let text = 'All changes saved';
  let kind = 'saved';
  if (hold) {
    text = hold;
    kind = 'hold';
  } else if (offline && unsent[form.id]) {
    text = 'No connection. Saved on this device, and it will reach the sheet when the connection returns.';
    kind = 'hold';
  } else if (saveTimer || sending || !form.id) {
    text = 'Saving…';
  }
  box.textContent = text;
  box.className = `save-status ${kind}`;
}

function scheduleSave() {
  const form = state.form;
  if (!form || !canEditForm(form)) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DELAY_MS);
  paintSaveStatus();
}

// False when the form can't be saved as it stands.
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const form = state.form;
  if (!form || !canEditForm(form)) return true;
  if (holdReason(form)) {
    paintSaveStatus();
    return false;
  }
  const row = rowFor(form);
  const text = JSON.stringify(row);
  if (form.lastRow === text) {
    paintSaveStatus();
    return true;
  }
  form.lastRow = text;
  if (!form.id) {
    form.id = form.newId;
    const title = document.getElementById('entry-title');
    if (title) title.textContent = 'Edit Entry';
    const remove = document.getElementById('entry-delete');
    if (remove) remove.hidden = false;
  }
  unsent[form.id] = row;
  keepUnsent();
  showRow(row);
  sendUnsent();
  paintSaveStatus();
  return true;
}

// One at a time and in order, so an older copy can never land after a newer one.
function sendUnsent() {
  if (sending) return sending;
  clearTimeout(retryTimer);
  if (!Object.keys(unsent).length) return Promise.resolve();
  sending = (async () => {
    try {
      for (let id = Object.keys(unsent)[0]; id; id = Object.keys(unsent)[0]) {
        const row = unsent[id];
        paintSaveStatus();
        try {
          await window.crew.saveRow(row);
          offline = false;
        } catch (error) {
          if (error.code === 'NETWORK') {
            offline = true;
            retryTimer = setTimeout(sendUnsent, RETRY_MS);
            return;
          }
          if (handleSessionError(error)) {
            render();
            return;
          }
          // Refused, so sending it again won't help. Let the next change try afresh.
          delete unsent[id];
          keepUnsent();
          if (state.form?.id === id) state.form.lastRow = '';
          state.error = `Not saved: ${error.message}`;
          render();
          continue;
        }
        // A newer copy may have arrived while this one was on its way, and that one still has to go.
        if (JSON.stringify(unsent[id]) === JSON.stringify(row)) {
          delete unsent[id];
          keepUnsent();
        }
      }
    } finally {
      sending = null;
      paintSaveStatus();
    }
  })();
  return sending;
}

window.addEventListener('online', () => { if (state.user && Object.keys(unsent).length) sendUnsent(); });
// A phone can close a backgrounded app at any time.
const saveBeforeHiding = () => { if (saveTimer) flushSave(); };
window.addEventListener('pagehide', saveBeforeHiding);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveBeforeHiding(); });

function saveArrival() {
  const form = state.form;
  form.arrivalOffered = false;
  setFormField('arrTime', form.arrTime);
  flushSave();
  render();
}

async function finishForm() {
  const form = state.form;
  const hold = holdReason(form);
  const blank = !form.id && !String(form.nameOfMotorman).trim() && !String(form.trainNo).trim();
  if (hold && !blank) {
    paintSaveStatus();
    document.getElementById('save-status')?.scrollIntoView({ block: 'center' });
    return;
  }
  flushSave();
  state.form = null;
  state.view = state.formReturn ?? 'dashboard';
  render();
  window.scrollTo(0, 0);
  if (blank) return;
  // Brings in the last dates and anything other CLIs entered, once this entry has landed.
  await sendUnsent();
  if (Object.keys(unsent).length) {
    state.notice = 'Saved on this device. It will reach the sheet when the connection returns.';
    render();
    return;
  }
  state.notice = 'Entry saved.';
  await refresh();
}

async function deleteForm() {
  const form = state.form;
  if (!await confirmBox({
    title: 'Delete this entry?',
    text: `This removes the record from CrewMonitor Data and can't be undone in the app.\n\n${summary(form)}`,
    action: 'Delete',
    danger: true,
  })) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  form.lastRow = JSON.stringify(rowFor(form));
  await sendUnsent();
  await runSave(async () => {
    if (unsent[form.id]) throw new Error('Could not reach the server. Check your connection and try again.');
    await window.crew.deleteEntry(form.id);
    state.data.entries = state.data.entries.filter((e) => e.id !== form.id);
  }, 'Entry deleted.');
}

async function runSave(action, message) {
  state.loading = true;
  state.error = '';
  render();
  try {
    await action();
    state.form = null;
    state.view = state.formReturn ?? 'dashboard';
    await refresh();
    state.notice = message;
  } catch (error) {
    if (!handleSessionError(error)) state.error = `Not saved: ${error.message}`;
  }
  state.loading = false;
  render();
  window.scrollTo(0, 0);
}

function setFormField(field, value) {
  const f = state.form;
  f[field] = value;
  if (field === 'fromStn' || field === 'toStn') {
    f.kms = kmsBetween(f.fromStn, f.toStn) ?? f.kms;
    if (f.startedHere && value && isKnownStation(value, {})) {
      window.crew.position().then((here) => {
        if (!here) return;
        f[field === 'fromStn' ? 'fromLocation' : 'toLocation'] = here;
        if (f === state.form && f.id) scheduleSave();
      });
    }
  }
  if (field === 'arrTime') f.arrivalOffered = false;
  if (field === 'depTime' || field === 'arrTime') {
    f.dayNight = shiftFor(f.depTime, f.arrivalOffered ? '' : f.arrTime) ?? f.dayNight;
  }
}

// Latest counselling or footplating entry as dd/MM/yyyy, the format the sheet's LCD column uses.
function lastContactDate(crew) {
  const { counselling, footplating } = lastDates(crew);
  const latest = counselling > footplating ? counselling : footplating;
  if (!latest) return '';
  const [y, m, d] = latest.split('-');
  return `${d}/${m}/${y}`;
}

function crewFor(name) {
  const wanted = String(name ?? '').trim().toLowerCase();
  return state.data.crew.find((c) => c.name.trim().toLowerCase() === wanted);
}

function fillFromCrew(name) {
  const crew = crewFor(name);
  if (!crew) {
    if (!state.form.crewFilled) return false;
    // The name changed, and these details belonged to the motorman it used to be.
    Object.assign(state.form, { crewFilled: false, grade: '', cmsCode: '', code: '', nameOfNominCli: '', depot: '', spec: '', lcd: '' });
    return true;
  }
  Object.assign(state.form, {
    crewFilled: true,
    nameOfMotorman: crew.name, grade: crew.grade, cmsCode: crew.cmsId, code: crew.code,
    nameOfNominCli: crew.cliName, depot: crew.depot, spec: crew.vision, lcd: lastContactDate(crew),
  });
  return true;
}

function fillFromTrain(trainNo) {
  const train = state.data.trains.find((t) => t.trainNo === trainNo.trim());
  if (!train) return false;
  if (train.fromStn) setFormField('fromStn', train.fromStn);
  if (train.toStn) setFormField('toStn', train.toStn);
  return true;
}

// ── Screens ───────────────────────────────────────────────────────────────────
function cardHead(entry) {
  return el('div', { class: 'card-head' },
    el('h3', { class: gradeClass(entry.grade) }, entry.nameOfMotorman || '—', entry.deficiencyFound ? el('span', { class: 'flag' }, '  !') : null),
    entry.dayNight ? el('span', { class: `pill ${entry.dayNight === 'NIGHT' ? 'night' : ''}` }, entry.dayNight) : null);
}

function routeLine(entry) {
  return el('span', { class: 'route' }, `${entry.fromStn || '—'} → ${entry.toStn || '—'}`);
}

function entryCard(entry) {
  return el('button', { class: 'card', type: 'button', onclick: () => editEntry(entry) },
    cardHead(entry),
    routeLine(entry),
    lv('Date', display(entry.date)),
    lv('Subject', entry.sub),
    lv('Train', entry.trainNo),
    lv('KMS', entry.kms));
}

// Grade C dark red, B blue, A black.
function gradeClass(grade) {
  const letter = String(grade || '').trim().toLowerCase().charAt(0);
  return ['a', 'b', 'c'].includes(letter) ? `grade-${letter}` : '';
}

function gradeLine(grade) {
  const line = lv('Grade', grade);
  const cls = gradeClass(grade);
  if (cls) line.classList.add(cls);
  return line;
}

// A dated heading with each duty detail on its own row.
function dutyBlock(title, date, duty) {
  const rows = duty
    ? duty.split('\n').map((line) => { const at = line.indexOf(': '); return lv(line.slice(0, at), line.slice(at + 2)); })
    : [lv('Status', 'Booking not loaded yet')];
  return el('div', { class: 'duty' }, el('div', { class: 'duty-title' }, `${title} Duty · ${display(date)}`), rows);
}

function crewDetails(crew) {
  const last = lastDates(crew);
  return [
    lv('Code', crew.code), lv('CMS-ID', crew.cmsId), gradeLine(crew.grade), lv('CLI', crew.cliName),
    lv('Depot', crew.depot), lv('Last Counselling', display(last.counselling)), lv('Last Footplating', display(last.footplating)),
    dueLine(crew),
    dutyBlock('Today', crew.todayDate, crew.dutyToday),
    dutyBlock('Next day', crew.nextDate, crew.dutyNext),
  ];
}

function dashboard() {
  const { entries, crew } = state.data;
  const today = entries.filter((e) => e.date === isoToday());
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekStart = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  const kpi = (value, label) => el('div', { class: 'kpi' }, el('strong', {}, String(value)), label);
  const recent = [...entries].sort((a, b) => b.sortKey - a.sortKey).slice(0, 6);
  const mine = sortedByDue(crew.filter((c) => c.cliName === state.selectedCli));

  const pending = isAdmin() ? (state.adminUsers ?? []).filter((u) => u.status === 'PENDING').length : 0;
  const waiting = CrewLib.arrivalPending(entries, state.user.email);
  return [
    pending ? el('button', { class: 'banner banner-button', type: 'button', onclick: () => go('admin') }, `${pending} new ${pending === 1 ? 'user is' : 'users are'} waiting for approval. Tap to review.`) : null,
    waiting.length ? el('section', { id: 'arrival-pending' },
      el('h2', {}, `Arrival Pending (${waiting.length})`),
      el('div', { class: 'cards' }, waiting.map((e) => el('button', { class: 'card pending-card', type: 'button', onclick: () => editEntry(e) },
        el('h3', { class: gradeClass(e.grade) }, e.nameOfMotorman || '—'),
        routeLine(e),
        lv('Date', display(e.date)),
        lv('Train', e.trainNo),
        lv('Dep', normaliseTime(e.depTime)),
        el('span', { class: 'pending-tag' }, 'Arrival pending. Tap to enter.'))))) : null,
    el('section', { class: 'hero' },
      el('h2', {}, "Today's Summary"),
      el('div', { class: 'kpis' },
        kpi(today.length, 'Trips Today'),
        kpi(today.reduce((sum, e) => sum + (parseInt(e.kms, 10) || 0), 0), 'Total KMS'),
        kpi(entries.filter((e) => e.deficiencyFound && e.date >= weekStart).length, 'Deficiencies (Week)'),
        kpi(today.filter((e) => e.dayNight === 'DAY').length, 'Day Trips'),
        kpi(today.filter((e) => e.dayNight === 'NIGHT').length, 'Night Trips'))),
    el('button', { class: 'reports-button', type: 'button', onclick: () => go('reports') }, icon('report'), 'REPORTS'),
    el('h2', {}, 'Recent Entries'),
    el('div', { class: 'cards' }, recent.map(entryCard)),
    el('h2', {}, 'My Motorman'),
    el('div', { class: 'toolbar' },
      cliPicker('CLI Name', 'cli', cliNames().map((n) => [n, n]), state.selectedCli, 'Type to search CLI', (n) => { state.selectedCli = n; render(); })),
    state.selectedCli ? el('div', { class: 'count' }, `${mine.length} motormen. Click one for the report.`) : null,
    el('div', { class: 'cards' }, mine.map((c) => {
      const last = lastDates(c);
      return el('button', { class: 'card', type: 'button', onclick: () => { state.reportCode = c.code; go('report'); } },
        el('h3', { class: gradeClass(c.grade) }, c.name),
        lv('Code', c.code), gradeLine(c.grade), lv('Depot', c.depot), lv('Entries', entriesFor(c).length), dueLine(c),
        lv('Last Counselling', display(last.counselling)), lv('Last Footplating', display(last.footplating)));
    })),
  ];
}

function report() {
  const crew = state.data.crew.find((c) => c.code === state.reportCode);
  if (!crew) return [el('p', {}, 'This motorman is no longer in the working list.')];
  const entries = entriesFor(crew);
  const subjects = {};
  for (const e of entries) subjects[e.sub || 'No subject'] = (subjects[e.sub || 'No subject'] ?? 0) + 1;
  return [
    el('div', { class: 'toolbar' }, el('button', { class: 'ghost', onclick: () => go('dashboard') }, 'Back')),
    el('div', { class: 'card' },
      el('h3', { class: gradeClass(crew.grade) }, crew.name),
      crewDetails(crew),
      lv('Entries', entries.length),
      lv('KMS', entries.reduce((sum, e) => sum + (parseInt(e.kms, 10) || 0), 0)),
      lv('Deficiencies', entries.filter((e) => e.deficiencyFound).length),
      Object.entries(subjects).map(([subject, count]) => lv(subject, count))),
    el('h2', {}, 'Entries'),
    el('div', { class: 'cards' }, entries.map(entryCard)),
  ];
}

// An admin finds and opens every entry here, and a CLI their own. Saving or deleting comes back here.
function allEntriesView() {
  const admin = isAdmin();
  state.allFilters ??= { from: '', to: '', cli: '', text: '' };
  const filters = state.allFilters;
  if (!admin) filters.cli = state.user.email; // the server also refuses changes to anyone else's entry
  const limit = 100;
  const list = el('div', { class: 'cards' });
  const count = el('div', { class: 'count' });
  renderList = () => {
    const matches = CrewLib.filterEntries(state.data.entries, filters);
    count.textContent = matches.length > limit
      ? `${matches.length} entries. Showing the newest ${limit}, so filter to find older ones.`
      : `${matches.length} ${matches.length === 1 ? 'entry' : 'entries'}`;
    list.replaceChildren(...matches.slice(0, limit).map((entry) => el('button', {
      class: 'card', type: 'button', onclick: () => editEntry(entry, 'allEntries'),
    },
    cardHead(entry),
    routeLine(entry),
    lv('Date', display(entry.date)),
    admin ? lv('CLI', entry.cliName || entry.userMail) : null,
    lv('Subject', entry.sub),
    lv('Train', entry.trainNo))));
  };
  renderList();
  const dateInput = (label, key) => el('label', {}, el('span', {}, label),
    el('input', { type: 'date', value: filters[key], onchange: (e) => { filters[key] = e.target.value; renderList(); } }));
  return [
    el('h2', {}, admin ? 'All Entries' : 'My Entries'),
    el('div', { class: 'report-filters' },
      dateInput('From date', 'from'),
      dateInput('To date', 'to'),
      admin ? cliPicker('CLI', 'all-cli', reportCliOptions().map(([mail, name]) => [mail, `${name} (${mail})`]), filters.cli, 'All CLIs. Type to search', (mail) => { filters.cli = mail; renderList(); }) : null),
    searchBox(filters.text, admin ? 'Motorman, train, unit, subject or CLI' : 'Motorman, train, unit or subject', (v) => { filters.text = v; }),
    el('div', { class: 'toolbar' },
      el('button', { type: 'button', class: 'ghost', onclick: () => { state.allFilters = null; render(); } }, 'Clear filters')),
    count, list,
  ];
}

function searchBox(value, placeholder, onInput) {
  return el('input', {
    class: 'search', type: 'search', value, placeholder, 'aria-label': placeholder,
    oninput: (e) => { onInput(e.target.value); renderList(); },
  });
}

let renderList = () => {};

// A list of CLIs you can type into. choices are [value, text]. An empty box means none chosen.
function cliPicker(label, id, choices, current, placeholder, onPick) {
  return el('label', {}, el('span', {}, label),
    el('datalist', { id: `${id}-list` }, choices.map(([, text]) => el('option', { value: text }))),
    el('input', {
      type: 'search', list: `${id}-list`, 'data-field': id, placeholder, autocomplete: 'off',
      value: choices.find(([v]) => v === current)?.[1] ?? '',
      onfocus: (e) => e.target.select(),
      oninput: (e) => {
        const typed = e.target.value.trim().toLowerCase();
        if (!typed) { onPick(''); return; }
        const match = choices.find(([, text]) => text.toLowerCase() === typed);
        if (match) onPick(match[0]);
      },
    }));
}

function trainsView() {
  const list = el('div', { class: 'cards bold-cards' });
  const count = el('div', { class: 'count' });
  renderList = () => {
    const q = state.trainQuery.trim().toLowerCase();
    const matches = state.data.trains.filter((t) => !q ||
      [t.trainNo, t.setNo, t.fromStn, t.toStn, t.mmToday, t.tmToday, t.mmNext, t.tmNext].some((v) => v.toLowerCase().includes(q)));
    count.textContent = `${matches.length} trains found`;
    list.replaceChildren(...matches.slice(0, 120).map((t) => el('div', { class: 'card' },
      el('h3', {}, `Train ${t.trainNo}${t.mode ? ` · ${t.mode}` : ''}`),
      t.modeDetails ? el('div', { class: 'mode-details' }, `(${t.modeDetails})`) : null,
      lv('From', [t.fromStn, t.depTime, t.depPf].filter(Boolean).join(' - ')),
      lv('To', [t.toStn, t.arrTime, t.arrPf].filter(Boolean).join(' - ')),
      lv('Set', t.setNo), lv('Car', t.car), lv('Service', t.service), lv('Link', t.link),
      lv('Date', `${display(t.todayDate)} (today)`), lv('Motorman', t.mmToday), tmLine(t.tmToday, t.tmPhoneToday),
      lv('Date', `${display(t.nextDate)} (next)`), lv('Motorman', t.mmNext), tmLine(t.tmNext, t.tmPhoneNext))));
  };
  renderList();
  return [
    el('h2', {}, 'Train Search'),
    searchBox(state.trainQuery, 'Train, set, station or name', (v) => { state.trainQuery = v; }),
    count, list,
  ];
}

function crewView() {
  const list = el('div', { class: 'cards bold-cards' });
  const count = el('div', { class: 'count' });
  renderList = () => {
    const q = state.crewQuery.trim().toLowerCase();
    const matches = sortedByDue(state.data.crew
      .filter((c) => !q || [c.name, c.code, c.cmsId, c.grade, c.cliName, c.depot].some((v) => v.toLowerCase().includes(q))));
    count.textContent = `${matches.length} crew members`;
    list.replaceChildren(...matches.slice(0, 120).map((c) => el('div', { class: 'card' }, el('h3', { class: gradeClass(c.grade) }, c.name), crewDetails(c))));
  };
  renderList();
  return [
    el('h2', {}, 'Crew Search'),
    searchBox(state.crewQuery, 'Name, code, CMS-ID, CLI or depot', (v) => { state.crewQuery = v; }),
    count, list,
  ];
}

function field(label, control, wide) {
  return el('label', wide ? { class: 'wide' } : {}, el('span', {}, label), control);
}

function textField(label, name, opts = {}) {
  return field(label, el('input', {
    type: 'text', value: state.form[name] ?? '', list: opts.list ?? '', 'data-field': name,
    readOnly: Boolean(opts.locked), class: opts.locked ? 'locked' : '',
    title: opts.locked ? 'Filled in from the crew data' : '',
    oninput: (e) => {
      const value = opts.upper ? e.target.value.toUpperCase() : e.target.value;
      if (opts.upper) e.target.value = value;
      setFormField(name, value);
      if (opts.after && opts.after(value)) {
        render();
        // Redrawing replaces the box, so put the cursor back and let typing carry on.
        const again = document.querySelector(`input[data-field="${name}"]`);
        again?.focus();
        again?.setSelectionRange(again.value.length, again.value.length);
      }
      scheduleSave();
    },
  }), opts.wide);
}

// Type to search. Choosing or fully typing a station uses the list's spelling, which also fills in KMS.
function stationField(label, name) {
  return textField(label, name, {
    list: 'station-list',
    after: (typed) => {
      const exact = state.data.stations.find((s) => s.toLowerCase() === typed.trim().toLowerCase());
      if (!exact) return false;
      setFormField(name, exact);
      return true;
    },
  });
}

function selectField(label, name, options, wide) {
  const current = state.form[name] ?? '';
  const all = current && !options.includes(current) ? [current, ...options] : options;
  return field(label, el('select', {
    onchange: (e) => { setFormField(name, e.target.value); render(); scheduleSave(); },
  }, el('option', { value: '' }, ''), all.map((o) => el('option', { value: o, selected: o === current }, o))), wide);
}

function formSection(title, ...children) {
  return el('section', { class: 'form-section' }, el('h2', {}, title), el('div', { class: 'form-grid' }, children));
}

function timeField(label, name) {
  const hint = el('small', { class: 'field-hint', hidden: true }, '24-hour HH:MM, from 00:00 to 23:59');
  const flag = (input, show) => {
    input.classList.toggle('invalid', show);
    hint.hidden = !show;
  };
  return field(label, el('div', {}, el('input', {
    type: 'text', value: state.form[name] ?? '', placeholder: 'HH:MM', inputMode: 'numeric', 'data-field': name, maxLength: 5,
    onblur: (e) => flag(e.target, Boolean(e.target.value) && !validTime(e.target.value)),
    oninput: (e) => {
      e.target.value = formatTime(e.target.value);
      if (!e.target.value || validTime(e.target.value)) flag(e.target, false);
      setFormField(name, e.target.value);
      document.querySelectorAll('.shift button').forEach((b) => b.classList.toggle('active', b.textContent === state.form.dayNight));
      if (name === 'arrTime') document.getElementById('save-arrival')?.remove();
      scheduleSave();
    },
  }), hint));
}

// Locked when it came from the crew data. Otherwise type it or pick it.
function lcdField(locked) {
  const f = state.form;
  if (locked) return textField('LCD (Date)', 'lcd', { locked: true });
  const iso = CrewLib.toIsoDate(f.lcd);
  return field('LCD (Date)', el('div', { class: 'date-row' },
    el('input', {
      type: 'text', value: f.lcd ?? '', placeholder: 'DD/MM/YYYY', inputMode: 'numeric', 'data-field': 'lcd', maxLength: 10,
      oninput: (e) => {
        e.target.value = formatLcd(e.target.value);
        setFormField('lcd', e.target.value);
        scheduleSave();
      },
    }),
    el('input', {
      type: 'date', title: 'Pick the LCD date', 'aria-label': 'Pick the LCD date', 'data-picker': 'lcd',
      value: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '',
      onchange: (e) => {
        if (!e.target.value) return;
        setFormField('lcd', CrewLib.toSheetDate(e.target.value));
        render();
        scheduleSave();
      },
    })));
}

function entryView() {
  const f = state.form;
  const readOnly = Boolean(f.id) && !canChange(f);
  const someoneElses = Boolean(f.id) && String(f.userMail).toLowerCase() !== String(state.user.email).toLowerCase();
  const crew = crewFor(f.nameOfMotorman);
  // Details from the crew data can't be typed over. A blank one is still open, for when the data has nothing.
  const fromCrew = (name) => ({ locked: Boolean(crew) && String(f[name] ?? '').trim() !== '' });
  const picker = el('input', {
    type: 'date', title: 'Pick a date', 'aria-label': 'Pick a date', value: parseDisplay(f.dateText) ?? '',
    onchange: (e) => { if (e.target.value) { f.dateText = display(e.target.value); render(); scheduleSave(); } },
  });
  const status = readOnly ? null : el('div', { id: 'save-status', class: 'save-status', role: 'status' });
  queueMicrotask(paintSaveStatus);
  return [
    el('h2', { id: 'entry-title' }, readOnly ? 'View Entry' : f.id ? 'Edit Entry' : 'New Duty Entry'),
    readOnly ? el('div', { class: 'banner' }, `Entered by ${f.cliName || f.userMail}. Only they or an admin can change or delete it.`) : null,
    !readOnly && someoneElses ? el('div', { class: 'banner' }, `Entered by ${f.cliName || f.userMail}. You are changing it as admin.`) : null,
    status,
    el('datalist', { id: 'crew-list' }, state.data.crew.map((c) => el('option', { value: c.name }))),
    el('datalist', { id: 'train-list' }, state.data.trains.map((t) => el('option', { value: t.trainNo }))),
    el('datalist', { id: 'tm-list' }, state.data.trainManagers.map((n) => el('option', { value: n }))),
    el('datalist', { id: 'station-list' }, state.data.stations.map((s) => el('option', { value: s }))),
    el('form', { class: 'entry', onsubmit: (e) => { e.preventDefault(); flushSave(); }, onfocusout: () => { if (saveTimer) flushSave(); } },
      formSection('Crew Information',
        field('Date', el('div', { class: 'date-row' },
          el('input', { type: 'text', value: f.dateText, placeholder: 'DD-MMM-YYYY', 'data-field': 'dateText', oninput: (e) => { f.dateText = e.target.value; scheduleSave(); } }),
          picker), true),
        textField('Name of Motorman *', 'nameOfMotorman', { list: 'crew-list', upper: true, after: fillFromCrew, wide: true }),
        crew ? el('details', {
          class: 'crew-more', open: Boolean(state.crewDetailsOpen),
          ontoggle: (e) => { state.crewDetailsOpen = e.target.open; },
        }, el('summary', {}, 'Duty and due details'), crewDetails(crew)) : null,
        textField('Grade', 'grade', fromCrew('grade')), textField('CMS-ID', 'cmsCode', fromCrew('cmsCode')),
        textField('Nominated CLI', 'nameOfNominCli', { ...fromCrew('nameOfNominCli'), wide: true }), textField('Depot', 'depot', fromCrew('depot'))),
      formSection('Train Details',
        textField('Train No *', 'trainNo', { list: 'train-list', upper: true, after: fillFromTrain }),
        textField('Unit No', 'unitNo')),
      formSection('Route & Timing',
        selectField('Subject', 'sub', state.data.subjects, true),
        selectField('Line', 'line', state.data.lines, true),
        stationField('From Stn', 'fromStn'),
        stationField('To Stn', 'toStn'),
        timeField('Dep Time', 'depTime'), timeField('Arr Time', 'arrTime'),
        f.arrivalOffered && !readOnly ? el('div', { class: 'arrival-offer', id: 'save-arrival' },
          el('p', {}, 'Arr Time is set to the time now and is not saved yet. Change it if needed, or tap Save Arrival.'),
          el('button', { type: 'button', onclick: saveArrival }, 'Save Arrival')) : null,
        textField('KMS', 'kms'),
        field('Shift', el('div', { class: 'shift' }, ['DAY', 'NIGHT'].map((s) => el('button', {
          type: 'button', class: f.dayNight === s ? 'active' : '',
          onclick: () => { f.dayNight = s; render(); scheduleSave(); },
        }, s))))),
      formSection('Inspection',
        textField('VISION', 'spec', fromCrew('spec')), lcdField(fromCrew('lcd').locked),
        textField('Train Manager Name', 'tmgrName', { list: 'tm-list', upper: true, wide: true })),
      formSection('Deficiency Report',
        el('label', { class: 'check wide' },
          el('input', { type: 'checkbox', checked: f.deficiencyFound, onchange: (e) => { f.deficiencyFound = e.target.checked; render(); scheduleSave(); } }),
          'Deficiency Found?'),
        f.deficiencyFound ? textField('Deficiency Details', 'remarkDeficiency', { wide: true }) : null,
        textField('Description / Remarks', 'description', { wide: true })),
      el('div', { class: 'actions' },
        readOnly ? el('button', { type: 'button', class: 'ghost', onclick: () => { state.form = null; go(state.formReturn ?? 'dashboard'); } }, 'Back')
          : el('button', { type: 'button', onclick: finishForm }, 'Done'),
        readOnly ? null : el('button', { id: 'entry-delete', type: 'button', class: 'danger', hidden: !f.id, onclick: deleteForm }, 'Delete Entry'))),
  ];
}

// ── Login, register and change password ───────────────────────────────────────
function authPage(subtitle, ...content) {
  return el('main', { class: 'auth-page' },
    el('div', { class: 'auth-box' },
      el('div', { class: 'auth-brand' },
        el('img', { class: 'auth-logo', src: 'icons/icon-192.png', alt: '' }),
        el('h1', {}, 'CREW MONITOR'),
        el('p', {}, subtitle)),
      ...content,
      el('p', { class: 'auth-credit' }, 'CREW MONITOR — by Rajesh Gautam (AMIE) · © 2026')));
}

function authField(label, type, autocomplete, id, initial = '') {
  return el('label', {}, el('span', {}, label), el('input', { id, type, autocomplete, required: true, value: initial }));
}

function authBanner() {
  return [
    state.authError ? el('div', { class: 'banner error', role: 'alert' }, state.authError) : null,
    state.authMessage ? el('div', { class: 'banner' }, state.authMessage) : null,
  ];
}

function value(id) {
  return document.getElementById(id).value;
}

async function authAction(work) {
  state.busy = true;
  state.authError = '';
  state.authMessage = '';
  render();
  try {
    await work();
  } catch (error) {
    state.authError = error.message;
  }
  state.busy = false;
  render();
}

function loginView() {
  return authPage('Western Railway — Mumbai Division',
    el('form', {
      class: 'auth-card',
      onsubmit: (e) => {
        e.preventDefault();
        const email = value('login-email').trim();
        const password = value('login-password');
        state.lastEmail = email;
        authAction(async () => {
          state.user = await window.crew.login(email, password);
          if (!state.user.mustChange) await refresh();
        });
      },
    },
    authBanner(),
    authField('Email', 'email', 'username', 'login-email', state.lastEmail),
    authField('Password', 'password', 'current-password', 'login-password'),
    el('button', { type: 'submit', class: 'wide-button', disabled: state.busy }, state.busy ? 'Signing in…' : 'Sign In'),
    el('button', {
      type: 'button',
      class: 'ghost wide-button',
      onclick: () => { state.authView = 'register'; state.authError = ''; state.authMessage = ''; render(); },
    }, 'Register'),
    el('p', { class: 'auth-hint' }, 'Forgot your password? Ask the admin to reset it.')));
}

function registerView() {
  return authPage('Create your account',
    el('form', {
      class: 'auth-card',
      onsubmit: (e) => {
        e.preventDefault();
        const [name, email, password, confirm] = ['reg-name', 'reg-email', 'reg-password', 'reg-confirm'].map(value);
        if (password !== confirm) {
          state.authError = 'The two passwords do not match';
          render();
          return;
        }
        authAction(async () => {
          const reply = await window.crew.register(name.trim(), email.trim(), password);
          state.authView = 'login';
          state.authMessage = reply.message;
        });
      },
    },
    authBanner(),
    authField('Your name (as CLI)', 'text', 'name', 'reg-name'),
    authField('Email', 'email', 'username', 'reg-email'),
    authField('Password (at least 8 characters)', 'password', 'new-password', 'reg-password'),
    authField('Confirm password', 'password', 'new-password', 'reg-confirm'),
    el('button', { type: 'submit', class: 'wide-button', disabled: state.busy }, state.busy ? 'Registering…' : 'Register'),
    el('button', {
      type: 'button',
      class: 'ghost wide-button',
      onclick: () => { state.authView = 'login'; state.authError = ''; render(); },
    }, 'Back to Sign In')));
}

function passwordForm(forced) {
  return el('form', {
    class: 'auth-card',
    onsubmit: (e) => {
      e.preventDefault();
      const [current, next, confirm] = ['pw-current', 'pw-next', 'pw-confirm'].map(value);
      if (next !== confirm) {
        state.authError = 'The two new passwords do not match';
        render();
        return;
      }
      authAction(async () => {
        try {
          state.user = await window.crew.changePassword(current, next);
        } catch (error) {
          if (!handleSessionError(error)) throw error;
          return;
        }
        state.authMessage = 'Password changed.';
        if (forced || !state.data) await refresh();
      });
    },
  },
  el('h2', {}, 'Change your password'),
  forced ? el('p', { class: 'auth-hint' }, 'This is a temporary password. Set your own to continue.') : null,
  authBanner(),
  authField('Current password', 'password', 'current-password', 'pw-current'),
  authField('New password (at least 8 characters)', 'password', 'new-password', 'pw-next'),
  authField('Confirm new password', 'password', 'new-password', 'pw-confirm'),
  el('button', { type: 'submit', class: 'wide-button', disabled: state.busy }, state.busy ? 'Saving…' : 'Set new password'),
  forced ? el('button', {
    type: 'button',
    class: 'ghost wide-button',
    onclick: async () => { await window.crew.signOut(); state.user = null; state.authError = ''; state.authMessage = ''; render(); },
  }, 'Sign out') : null);
}

function changePasswordView(forced) {
  return authPage('Western Railway — Mumbai Division', passwordForm(forced));
}

async function installApp() {
  const prompt = state.installPrompt;
  state.installPrompt = null;
  if (prompt) await prompt.prompt();
  render();
}

// ── Reports ───────────────────────────────────────────────────────────────────
function reportCliOptions() {
  const byMail = new Map();
  for (const e of state.data.entries) {
    if (e.userMail && !byMail.has(e.userMail.toLowerCase())) byMail.set(e.userMail.toLowerCase(), e.cliName || e.userMail);
  }
  return [...byMail.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function reportsView() {
  if (!state.reportFrom) state.reportFrom = `${isoToday().slice(0, 8)}01`;
  if (!state.reportTo) state.reportTo = isoToday();
  const pick = () => CrewReports.select(state.data.entries, {
    from: state.reportFrom,
    to: state.reportTo,
    email: state.user.email,
    isAdmin: isAdmin(),
    cli: state.reportCli,
  });
  const entries = pick();
  const summary = CrewReports.summarise(entries);
  const bad = state.reportFrom > state.reportTo;
  const who = isAdmin()
    ? (state.reportCli ? (reportCliOptions().find(([m]) => m === state.reportCli)?.[1] ?? state.reportCli) : 'All CLIs')
    : (state.data.cliName || state.user.email);
  const details = () => ({
    title: 'Crew Monitor - Duty Report',
    lines: [
      `CLI: ${who}`,
      `Period: ${CrewReports.shownDate(state.reportFrom)} to ${CrewReports.shownDate(state.reportTo)}`,
      `Downloaded by ${state.user.email} on ${new Date().toLocaleString('en-IN')}`,
    ],
    entries,
  });
  const fileName = (ext) => `CrewMonitor_Report_${who.replace(/[^A-Za-z0-9]+/g, '_')}_${state.reportFrom}_to_${state.reportTo}.${ext}`;
  const dateInput = (label, key) => el('label', {}, el('span', {}, label),
    el('input', { type: 'date', value: state[key], max: isoToday(), onchange: (e) => { state[key] = e.target.value; render(); } }));

  return [
    el('div', { class: 'toolbar' }, el('button', { class: 'ghost', onclick: () => go('dashboard') }, 'Back')),
    el('h2', {}, 'Reports'),
    el('div', { class: 'report-filters' },
      dateInput('From date', 'reportFrom'),
      dateInput('To date', 'reportTo'),
      isAdmin() ? cliPicker('CLI', 'report-cli', reportCliOptions().map(([mail, name]) => [mail, `${name} (${mail})`]), state.reportCli, 'All CLIs. Type to search', (mail) => { state.reportCli = mail; render(); }) : null),
    bad ? el('div', { class: 'banner error' }, 'The From date must not be after the To date.') : null,
    el('div', { class: 'kpis report-summary' },
      el('div', { class: 'kpi' }, el('strong', {}, String(summary.count)), 'Entries'),
      el('div', { class: 'kpi' }, el('strong', {}, String(summary.kms)), 'KMS'),
      el('div', { class: 'kpi' }, el('strong', {}, String(summary.deficiencies)), 'Deficiencies')),
    el('div', { class: 'toolbar report-actions' },
      el('button', {
        type: 'button',
        disabled: bad || entries.length === 0,
        onclick: () => CrewReports.download(CrewReports.pdfBlob(details()), fileName('pdf')),
      }, 'Download PDF'),
      el('button', {
        type: 'button',
        disabled: bad || entries.length === 0,
        onclick: () => CrewReports.download(CrewReports.excelBlob(details()), fileName('xlsx')),
      }, 'Download Excel')),
    !bad && entries.length === 0 ? el('p', { class: 'count' }, 'No entries for these dates.') : null,
    el('div', { class: 'report-subjects' }, Object.entries(summary.subjects).map(([subject, count]) => lv(subject, count))),
    !bad && entries.length ? reportPreview(entries) : null,
  ];
}

// Ready to post in a WhatsApp group. The user picks the group and sends it in WhatsApp.
function messageView() {
  const entry = CrewLib.latestActivity(state.data.entries, state.user.email);
  if (!entry) {
    return [el('h2', {}, 'Latest Activity'), el('p', { class: 'count' }, 'You have no Footplating, Monitoring, Piloting or Ambush Check entries yet.')];
  }
  const text = CrewLib.activityMessage(entry);
  return [
    el('h2', {}, 'Latest Activity'),
    el('p', { class: 'count' }, `Entry date ${CrewLib.displayDate(entry.date)}`),
    el('pre', { class: 'activity-message' }, text),
    el('div', { class: 'toolbar' },
      el('button', {
        type: 'button',
        onclick: () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener'),
      }, 'Send to WhatsApp'),
      el('button', {
        type: 'button',
        class: 'ghost',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(text);
            state.notice = 'Copied. Paste it into your WhatsApp group.';
          } catch {
            state.notice = 'Could not copy. Please select the text and copy it.';
          }
          render();
        },
      }, 'Copy')),
  ];
}

// The same rows the downloads contain, so they can be checked first.
function reportPreview(entries) {
  const { head, body } = CrewReports.table(entries);
  const limit = 300;
  return el('div', { class: 'report-preview' },
    el('h2', {}, 'Preview'),
    body.length > limit ? el('div', { class: 'count' }, `Showing the first ${limit} of ${body.length} rows. The download has them all.`) : null,
    el('div', { class: 'table-scroll', tabIndex: 0 },
      el('table', {},
        el('thead', {}, el('tr', {}, head.map((name) => el('th', {}, name)))),
        el('tbody', {}, body.slice(0, limit).map((row) => el('tr', {}, row.map((cell) => el('td', {}, String(cell)))))))));
}

// ── Admin ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    state.adminUsers = await window.crew.listUsers();
  } catch (error) {
    if (!handleSessionError(error)) state.error = error.message;
  }
  render();
}

async function adminAction(work, notice) {
  state.error = '';
  state.notice = '';
  try {
    const users = await work();
    if (Array.isArray(users)) state.adminUsers = users;
    state.notice = notice;
  } catch (error) {
    if (!handleSessionError(error)) state.error = error.message;
  }
  render();
  window.scrollTo(0, 0);
}

function adminCard(u) {
  const me = u.email === state.user.email;
  const name = u.name || u.email;
  const update = (changes, notice) => adminAction(() => window.crew.updateUser(u.email, changes), notice);
  const ask = (title, text, action, danger) => confirmBox({ title, text, action, danger });
  return el('div', { class: `card user-card status-${u.status.toLowerCase()}` },
    el('h3', {}, name),
    lv('Email', u.email),
    lv('Role', u.role === 'admin' ? 'Admin' : 'CLI'),
    lv('Status', u.status),
    lv('Registered', u.created),
    lv('Last login', u.lastLogin),
    u.hasTempPassword ? lv('Password', 'Temporary, not changed yet') : null,
    el('div', { class: 'user-actions' },
      u.status === 'PENDING' ? el('button', {
        type: 'button',
        onclick: async () => {
          if (await ask('Approve this user?', `${name}\n${u.email}\n\nCheck this is really them. They will see all crew and duty data, and own any existing entries saved under this email.`, 'Approve')) {
            update({ status: 'ACTIVE' }, `${name} approved.`);
          }
        },
      }, 'Approve') : null,
      u.status === 'ACTIVE' && !me ? el('button', {
        type: 'button',
        class: 'ghost',
        onclick: async () => {
          if (await ask('Disable this user?', `${name} will be signed out everywhere and can't sign in. Their entries stay in the sheet.`, 'Disable', true)) {
            update({ status: 'DISABLED' }, `${name} disabled.`);
          }
        },
      }, 'Disable') : null,
      u.status === 'DISABLED' ? el('button', {
        type: 'button',
        class: 'ghost',
        onclick: () => update({ status: 'ACTIVE' }, `${name} enabled.`),
      }, 'Enable') : null,
      !me ? el('button', {
        type: 'button',
        class: 'ghost',
        onclick: async () => {
          const toAdmin = u.role !== 'admin';
          const text = toAdmin
            ? `${name} will get full control: all users, and every entry.`
            : `${name} will only be able to change their own entries.`;
          if (await ask(toAdmin ? 'Make admin?' : 'Remove admin?', text, toAdmin ? 'Make admin' : 'Remove admin', !toAdmin)) {
            update({ role: toAdmin ? 'admin' : 'cli' }, `${name} updated.`);
          }
        },
      }, u.role === 'admin' ? 'Remove admin' : 'Make admin') : null,
      el('button', {
        type: 'button',
        class: 'ghost',
        onclick: async () => {
          const newName = window.prompt(`Name for ${u.email} (use their CLI name)`, u.name);
          if (newName !== null) update({ name: newName }, 'Name updated.');
        },
      }, 'Edit name'),
      !me ? el('button', {
        type: 'button',
        class: 'ghost',
        onclick: async () => {
          if (!await ask('Reset this password?', `${name} will be signed out everywhere and must use a new temporary password.`, 'Reset', true)) return;
          await adminAction(async () => {
            state.tempPassword = { email: u.email, password: await window.crew.resetPassword(u.email) };
            return window.crew.listUsers();
          }, '');
        },
      }, 'Reset password') : null,
      !me ? el('button', {
        type: 'button',
        class: 'danger',
        onclick: async () => {
          if (await ask('Delete this user?', `${name} (${u.email}) loses their account. Their entries stay in the sheet.`, 'Delete', true)) {
            adminAction(() => window.crew.deleteUser(u.email), `${name} deleted.`);
          }
        },
      }, 'Delete') : null));
}

function adminView() {
  if (!isAdmin()) return [el('p', {}, 'Administrator access required.')];
  const order = { PENDING: 0, ACTIVE: 1, DISABLED: 2 };
  const users = [...(state.adminUsers ?? [])].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || a.email.localeCompare(b.email));
  return [
    el('h2', {}, 'Users'),
    state.tempPassword ? el('div', { class: 'banner temp-password' },
      el('div', {}, `Temporary password for ${state.tempPassword.email}. It won't be shown here again, so give it to them now:`),
      el('code', {}, state.tempPassword.password),
      el('button', { type: 'button', class: 'ghost', onclick: () => { state.tempPassword = null; render(); } }, 'Done')) : null,
    el('div', { class: 'count' }, `${users.length} users. An admin can also change or delete any entry, and report on any CLI.`),
    el('div', { class: 'cards' }, users.map(adminCard)),
  ];
}

function render() {
  if (!state.user) {
    root.replaceChildren(state.authView === 'register' ? registerView() : loginView());
    return;
  }
  // A sync can finish while someone is typing, and redrawing mustn't take the cursor out of the box.
  const typingIn = document.activeElement?.dataset?.field;
  const caret = typingIn ? document.activeElement.selectionStart : null;
  if (state.user.mustChange) {
    root.replaceChildren(changePasswordView(true));
    return;
  }
  const tab = (view, label, iconName, extraClass = '') => el('button', {
    class: `${state.view === view ? 'active' : ''} ${extraClass}`.trim(), type: 'button', onclick: () => go(view),
  }, icon(iconName), el('span', {}, label));
  const usersWaiting = isAdmin() ? (state.adminUsers ?? []).filter((u) => u.status === 'PENDING').length : 0;
  const moreViews = ['message', 'allEntries', 'admin', 'password', 'reports'];
  document.body.classList.toggle('more-open', Boolean(state.moreOpen));
  const body = state.data ? {
    dashboard, report, trains: trainsView, crew: crewView, entry: entryView, reports: reportsView, message: messageView, allEntries: allEntriesView, admin: adminView, password: () => [passwordForm(false)],
  }[state.view]() : [el('p', { class: 'center' }, state.loading ? 'Loading Data…' : 'No data loaded.')];

  root.replaceChildren(
    el('header', {},
      el('div', { class: 'brand' },
        el('img', { src: 'icons/icon-192.png', alt: '' }),
        el('div', { class: 'brand-text' },
          el('h1', {}, 'Crew Monitor'),
          el('div', { class: 'who' }, `Welcome, ${state.data?.cliName || state.user.name || state.user.email}${isAdmin() ? ' (Admin)' : ''}`))),
      el('button', {
        class: 'sync-button', type: 'button', disabled: state.loading, 'aria-label': 'Sync',
        onclick: () => { state.notice = ''; refresh(); },
      }, icon('sync'), el('span', {}, state.loading ? 'Syncing…' : 'Sync')),
      el('nav', {},
        tab('dashboard', 'Dashboard', 'home'), tab('trains', 'Trains', 'train'), tab('entry', 'New Entry', 'add', 'tab-new'), tab('crew', 'Crew', 'crew'),
        el('button', {
          class: `more-button ${moreViews.includes(state.view) ? 'active' : ''}`.trim(), type: 'button', 'aria-label': 'More',
          onclick: () => { state.moreOpen = !state.moreOpen; render(); },
        }, icon('menu'), el('span', {}, 'More'), usersWaiting ? el('span', { class: 'tab-badge' }, String(usersWaiting)) : null),
        el('button', { class: 'more-backdrop', type: 'button', 'aria-label': 'Close menu', onclick: () => { state.moreOpen = false; render(); } }),
        el('div', { class: 'more' },
        el('div', { class: 'more-title' }, 'More'),
        tab('message', 'Message', 'message'),
        tab('allEntries', isAdmin() ? 'All Entries' : 'My Entries', 'list'),
        isAdmin() ? tab('admin', 'Admin', 'admin') : null,
        state.installPrompt ? el('button', { type: 'button', onclick: installApp }, icon('download'), el('span', {}, 'Install app')) : null,
        tab('password', 'Password', 'lock'),
        el('button', {
          type: 'button',
          onclick: async () => {
            flushSave();
            const waiting = Object.keys(unsent).length;
            if (waiting && !await confirmBox({
              title: 'Sign out and lose unsaved changes?',
              text: `${waiting} ${waiting === 1 ? 'entry has' : 'entries have'} not reached the sheet yet, so signing out now loses them. Stay signed in until the connection returns to keep them.`,
              action: 'Sign out',
              danger: true,
            })) return;
            clearTimeout(retryTimer);
            unsent = {};
            keepUnsent();
            unsentOwner = '';
            await window.crew.signOut();
            state.user = null;
            state.data = null;
            state.form = null;
            state.selectedCli = '';
            state.adminUsers = null;
            state.allFilters = null;
            state.view = 'dashboard';
            state.authView = 'login';
            state.authError = '';
            state.authMessage = '';
            state.moreOpen = false;
            render();
          },
        }, icon('logout'), el('span', {}, 'Sign out'))))),
    el('main', {},
      state.updateReady ? el('button', { class: 'banner banner-button', type: 'button', onclick: () => window.location.reload() }, 'A new version is ready. Tap to update.') : null,
      state.error ? el('div', { class: 'banner error' }, state.error) : null,
      state.notice ? el('div', { class: 'banner' }, state.notice) : null,
      state.data?.offlineAt
        ? el('div', { class: 'banner error' }, `Offline. Showing data from ${new Date(state.data.offlineAt).toLocaleString('en-IN')}. Entries stay on this device until the connection returns.`)
        : null,
      state.data && !state.loading && !state.data.offlineAt && state.view === 'dashboard'
        ? el('div', { class: 'banner synced' }, `Synced: ${state.data.crew.length} crew, ${state.data.trains.length} trains, ${state.data.entries.length} entries`)
        : null,
      body));
  if (typingIn) {
    const again = document.querySelector(`input[data-field="${typingIn}"]`);
    if (again) {
      again.focus();
      again.setSelectionRange(caret, caret);
    }
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.installPrompt = event;
  render();
});

if ('serviceWorker' in navigator) {
  const hadVersion = Boolean(navigator.serviceWorker.controller);
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  // An installed app can stay open for days, so look for a new version whenever it comes back into view.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {});
  });
  // A new version never reloads by itself, so it can't lose a half-filled form.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadVersion) return;
    state.updateReady = true;
    render();
  });
}

(async () => {
  state.user = window.crew.user();
  render();
  if (state.user && !state.user.mustChange) await refresh();
})();
