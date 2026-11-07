// Turns what the backend reads from the sheets into what the screens show.
// Same sheet layout and rules as the Android app (SheetsRemoteDataSource.kt).
const CrewLib = (() => {
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const cell = (row, index) => String(row[index] ?? '').trim();
const pad = (n) => String(n).padStart(2, '0');

function isRealDate(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Sheet or form date to yyyy-MM-dd, or the text unchanged when it isn't a date. */
function toIsoDate(raw) {
  const value = String(raw ?? '').trim();
  let m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m && isRealDate(+m[3], +m[2], +m[1])) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = value.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const month = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) + 1;
    if (month && isRealDate(+m[3], month, +m[1])) return `${m[3]}-${pad(month)}-${m[1]}`;
  }
  m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m && isRealDate(+m[1], +m[2], +m[3])) return value;
  return value;
}

function displayDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}-${MONTHS[+m - 1]}-${y}`;
}

// CrewMonitor Data has an India locale, so this is stored as a real date like the older rows.
function toSheetDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function normaliseTime(time) {
  const m = String(time ?? '').trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : String(time ?? '').trim();
}

const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function todayAndNext(now) {
  return [isoLocal(now), isoLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))];
}

// SET-MASTER: A SET, B TRAIN, C DEPOT, D TYPE, E ON TIME, F ON STN, G OFF TIME, H OFF STN, K-N the same for Sunday.
function setDetails(set, depot, date, sets) {
  const all = sets.get(set);
  if (!all) return /^\d+$/.test(set) ? `Set: ${set}` : `Status: ${set}`;
  const matching = all.filter((r) => cell(r, 2) === depot);
  const rows = matching.length ? matching : all;
  const row = rows[0];
  const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
  const timing = (weekday) => (sunday && cell(row, weekday + 6)) || cell(row, weekday);
  const trains = [...new Set(rows.map((r) => cell(r, 1)).filter(Boolean))].join(', ');
  // One "Label: value" per line, which the screens show as separate rows.
  return `Set: ${set}\nType: ${cell(row, 3)}\nSign On: ${timing(4)} ${timing(5)}\nSign Off: ${timing(6)} ${timing(7)}\nTrains: ${trains}`;
}

// A booking row: A DATE, B DEPOT, C CODE, D NAME, E WORKING (a set, or a word such as LEAVE), G second set.
function dutyText(row, date, sets) {
  const working = cell(row, 4);
  if (!working) return 'Status: Not booked';
  const second = cell(row, 6);
  const first = setDetails(working, cell(row, 1), date, sets);
  return !second || second === '0' ? first : `${first}\nSecond ${setDetails(second, cell(row, 1), date, sets)}`;
}

// imprt_mstr_bdata, stopping at column H. WORKING crew only, and nothing personal is read.
// visionRows is column AD on its own, row for row, so the personal columns around it stay unread.
function parseCrew(rows, bookings = [], setMaster = [], now = new Date(), visionRows = []) {
  const [today, next] = todayAndNext(now);
  const sets = new Map();
  for (const row of setMaster.slice(1)) {
    const set = cell(row, 0);
    if (!set) continue;
    if (!sets.has(set)) sets.set(set, []);
    sets.get(set).push(row);
  }
  const duties = {};
  for (const row of bookings) {
    const date = toIsoDate(row[0]);
    if (cell(row, 2) && (date === today || date === next)) duties[`${date}|${cell(row, 2)}`] = dutyText(row, date, sets);
  }
  return rows.flatMap((row, index) => {
    const code = cell(row, 0);
    if (!code || cell(row, 5).toUpperCase() !== 'WORKING') return [];
    return [{
      code,
      cmsId: cell(row, 1),
      name: cell(row, 2),
      grade: cell(row, 3),
      cliName: cell(row, 4),
      depot: cell(row, 7),
      vision: cell(visionRows[index] ?? [], 0),
      todayDate: today,
      dutyToday: duties[`${today}|${code}`] ?? '',
      nextDate: next,
      dutyNext: duties[`${next}|${code}`] ?? '',
    }];
  });
}

// TM-SET shows its date as 06-11-26.
function chartDate(raw) {
  const m = String(raw ?? '').trim().match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (m && isRealDate(2000 + +m[3], +m[2], +m[1])) return `20${m[3]}-${m[2]}-${m[1]}`;
  const iso = toIsoDate(raw);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

/** TM-DATA rows to date -> (set -> name). A later row replaces an earlier one. */
function parseTmData(rows) {
  const saved = {};
  for (const row of rows.slice(1)) {
    const date = toIsoDate(row[0]);
    const set = cell(row, 1);
    if (date && set) (saved[date] ??= {})[set] = cell(row, 2);
  }
  return saved;
}

/** TM-SET rows that aren't already saved for its date, as { date, changes: [[set, name]] }. */
function tmChanges(tmSet, saved) {
  const date = chartDate(cell(tmSet.find((r) => cell(r, 1) === 'TM') ?? [], 2));
  if (!date) return { date: null, changes: [] };
  const changes = tmSet
    .filter((r) => cell(r, 0) && cell(r, 1))
    .map((r) => [cell(r, 0), cell(r, 1)])
    .filter(([set, name]) => saved[date]?.[set] !== name);
  return { date, changes };
}

const contactKey = (name) => String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// The range starts at column G: G name, H number, then J name, K number.
function parseTmContacts(rows) {
  const contacts = {};
  for (const row of rows) {
    for (const [nameAt, numberAt] of [[0, 1], [3, 4]]) {
      const name = contactKey(row[nameAt]);
      const number = cell(row, numberAt).replace(/\D/g, '');
      if (name && number.length >= 10 && !(name in contacts)) contacts[name] = number;
    }
  }
  return contacts;
}

// Train Legs, train-MM (A SET, B TRAIN), IMPRT_BKG-cv (A DATE, D NAME, E SET, G second SET), TM-DATA.
function parseTrains(legs, motormen, trainManagers, bookings, now = new Date(), contacts = {}) {
  const setByTrain = new Map(motormen.filter((r) => cell(r, 1)).map((r) => [cell(r, 1), cell(r, 0)]));
  const [today, next] = todayAndNext(now);

  // Same rule as train-MM: a crew member's main set (E) comes before a second one (G).
  const motormanBySet = {};
  const rowsForDates = bookings.filter((r) => [today, next].includes(toIsoDate(r[0])));
  for (const column of [6, 4]) {
    for (const row of rowsForDates) {
      const set = cell(row, column);
      if (set && set !== '0') motormanBySet[`${toIsoDate(row[0])}|${set}`] = cell(row, 3);
    }
  }

  const byTrain = new Map();
  for (const row of legs.slice(1)) {
    const trainNo = cell(row, 0);
    if (!trainNo) continue;
    if (!byTrain.has(trainNo)) byTrain.set(trainNo, []);
    byTrain.get(trainNo).push(row);
  }
  return [...byTrain.entries()].map(([trainNo, trainLegs]) => {
    // A train with several legs runs from its first leg's start to its last leg's end.
    const first = trainLegs[0];
    const last = trainLegs[trainLegs.length - 1];
    const setNo = setByTrain.get(trainNo) || cell(first, 17);
    return {
      trainNo,
      setNo,
      fromStn: cell(first, 7),
      toStn: cell(last, 8),
      depTime: cell(first, 9),
      arrTime: cell(last, 10),
      link: cell(first, 11),
      car: cell(first, 12),
      service: cell(first, 13),
      mode: cell(first, 14),
      modeDetails: cell(first, 15),
      depPf: cell(first, 18),
      arrPf: cell(last, 19),
      todayDate: today,
      mmToday: motormanBySet[`${today}|${setNo}`] ?? '',
      tmToday: (trainManagers[today]?.[setNo] ?? '').toUpperCase(),
      tmPhoneToday: contacts[contactKey(trainManagers[today]?.[setNo])] ?? '',
      nextDate: next,
      mmNext: motormanBySet[`${next}|${setNo}`] ?? '',
      tmNext: (trainManagers[next]?.[setNo] ?? '').toUpperCase(),
      tmPhoneNext: contacts[contactKey(trainManagers[next]?.[setNo])] ?? '',
    };
  }).sort((a, b) => a.trainNo.localeCompare(b.trainNo));
}

function parseDropdowns(rows) {
  const headings = new Set(['SUBJECT', 'STN FROM-TO', 'LINE']);
  const column = (i) => [...new Set(rows.map((r) => cell(r, i)).filter((v) => v && !headings.has(v)))];
  return { subjects: column(0), stations: column(1), lines: column(2) };
}

function parseTrainManagers(rows) {
  return [...new Set(rows.map((r) => cell(r, 0).toUpperCase()).filter((v) => v && v !== 'NAME'))];
}

// The range starts at column B, so index 0 is STN and index 6 is column H, WTT-KM.
function parseDistances(rows) {
  const km = {};
  for (const row of rows) {
    const stn = cell(row, 0);
    const value = Number(cell(row, 6));
    if (stn && cell(row, 6) !== '' && Number.isFinite(value) && !(stn in km)) km[stn] = value;
  }
  return km;
}

function parseEmailMaps(rows) {
  return rows.slice(1).flatMap((r) => (cell(r, 1) ? [{ userMail: cell(r, 1), cliName: cell(r, 2) }] : []));
}

// Column order matches the entry tab. location, fromLocation and toLocation are carried through
// untouched, so an edit on the PC doesn't wipe what a phone recorded.
function parseEntry(row, rowIndex) {
  const id = cell(row, 0);
  if (!id) return null;
  const date = toIsoDate(row[4]);
  const millis = Date.parse(`${date}T00:00:00Z`);
  const remark = cell(row, 25);
  return {
    id,
    userMail: cell(row, 1),
    location: cell(row, 2),
    cliName: cell(row, 3),
    date,
    sortKey: (Number.isNaN(millis) ? 0 : millis) + rowIndex,
    sub: cell(row, 5),
    nameOfMotorman: cell(row, 6),
    grade: cell(row, 7),
    nameOfNominCli: cell(row, 8),
    code: cell(row, 9),
    cmsCode: cell(row, 10),
    spec: cell(row, 11),
    lcd: cell(row, 12),
    trainNo: cell(row, 13),
    unitNo: cell(row, 14),
    line: cell(row, 15),
    fromStn: cell(row, 16),
    depTime: cell(row, 17),
    toStn: cell(row, 18),
    arrTime: cell(row, 19),
    dayNight: cell(row, 20),
    kms: cell(row, 21),
    tmgrName: cell(row, 22),
    description: cell(row, 23),
    imageUri: cell(row, 24),
    remarkDeficiency: remark,
    deficiencyFound: remark !== '',
    depot: cell(row, 26),
    fromLocation: cell(row, 27),
    toLocation: cell(row, 28),
  };
}

function entryToRow(e) {
  return [
    e.id, e.userMail, e.location ?? '', e.cliName, toSheetDate(e.date), e.sub ?? '', e.nameOfMotorman,
    e.grade ?? '', e.nameOfNominCli ?? '', e.code ?? '', e.cmsCode ?? '', e.spec ?? '', e.lcd ?? '',
    e.trainNo, e.unitNo ?? '', e.line ?? '', e.fromStn ?? '', e.depTime ?? '', e.toStn ?? '', e.arrTime ?? '',
    e.dayNight ?? '', e.kms ?? '', e.tmgrName ?? '', e.description ?? '', e.imageUri ?? '',
    e.remarkDeficiency ?? '', e.depot ?? '', e.fromLocation ?? '', e.toLocation ?? '',
  ];
}

function validateEntry(e, isEdit) {
  if (!String(e.nameOfMotorman ?? '').trim()) return 'Motorman name is required';
  if (!String(e.trainNo ?? '').trim()) return 'Train number is required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date ?? '')) return 'Date must look like 05-Nov-2026';
  const timeOk = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t ?? '') || (isEdit && !t);
  if (!timeOk(e.depTime) || !timeOk(e.arrTime)) return 'Dep and Arr time must be HH:MM, for example 09:30';
  return null;
}

// The same name however it's written: S.B.SINGH and S.B. SINGH, or GAUTAM RAJESH and RAJESH GAUTAM.
function nameKey(name) {
  return String(name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').split('').sort().join('');
}

// Only these count towards the due date. Last Counselling and Last Footplating show anyone's.
// Goes by who was nominated when the entry was made, so a later change of CLI doesn't undo it.
function doneByNominatedCli(entry, crew, cliNames = {}) {
  const nominated = nameKey(entry.nameOfNominCli || crew.cliName);
  if (!nominated) return false;
  return [entry.cliName, cliNames[String(entry.userMail ?? '').trim().toLowerCase()]].some((name) => nameKey(name) === nominated);
}

// Everything the backend sends after sign-in, in the shape the screens use.
function assemble(raw, now = new Date()) {
  const entries = (raw.entries ?? []).slice(1).map(parseEntry).filter(Boolean);
  return {
    user: raw.user,
    cliNames: Object.fromEntries((raw.cliNames ?? []).map((r) => [cell(r, 0).toLowerCase(), cell(r, 1)])),
    cliName: raw.user?.name ?? '',
    crew: parseCrew(raw.crew ?? [], raw.bookings ?? [], raw.setMaster ?? [], now, raw.vision ?? []),
    trains: parseTrains(raw.legs ?? [], raw.trainMm ?? [], parseTmData(raw.tmData ?? []), raw.bookings ?? [], now, parseTmContacts(raw.tmContacts ?? [])),
    ...parseDropdowns(raw.dropdowns ?? []),
    trainManagers: parseTrainManagers(raw.tmContacts ?? []),
    stationKm: parseDistances(raw.distances ?? []),
    entries,
  };
}

// The subjects worth reporting to the group. Counselling is left out, and "FOOTPLATING & MONITORING" counts.
const ACTIVITY_SUBJECT = /FOOTPLATING|MONITORING|PILOTING|AMBUSH/i;

// The signed-in user's own newest entry, admins included: by entry date, then by position in the sheet.
// Rows with no train number are skipped: there would be nothing to post.
function latestActivity(entries, email) {
  const wanted = String(email ?? '').trim().toLowerCase();
  return entries
    .filter((e) => ACTIVITY_SUBJECT.test(e.sub) && String(e.trainNo ?? '').trim()
      && e.userMail.trim().toLowerCase() === wanted)
    .sort((a, b) => b.sortKey - a.sortKey)[0] ?? null;
}

// The signed-in user's own entries still waiting for an arrival time, newest first.
// Before this date most rows have a Dep Time and no Arr Time (723 of 934), because arrivals weren't recorded then.
const ARRIVAL_PENDING_FROM = '2026-11-07';

function arrivalPending(entries, email) {
  const wanted = String(email ?? '').trim().toLowerCase();
  return entries
    .filter((e) => e.date >= ARRIVAL_PENDING_FROM
      && String(e.depTime ?? '').trim() && !String(e.arrTime ?? '').trim()
      && String(e.userMail ?? '').trim().toLowerCase() === wanted)
    .sort((a, b) => b.sortKey - a.sortKey);
}

// LCD as DD-MMM-YYYY. Anything that isn't a date is shown as it was typed.
function lcdShown(raw) {
  const iso = toIsoDate(raw);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? displayDate(iso) : iso;
}

// The latest footplating or counselling entry as DD/MM/YYYY, the format the sheet's LCD column uses.
function latestContactDate(entries, exceptId) {
  const dates = entries
    .filter((e) => e.id !== exceptId && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && /FOOTPLATING|COUNSELLING/i.test(e.sub ?? ''))
    .map((e) => e.date);
  return dates.length ? toSheetDate(dates.sort().at(-1)) : '';
}

// The admin's All Entries list, newest first. A date filter leaves out rows with no usable date.
function filterEntries(entries, { from = '', to = '', cli = '', text = '' } = {}) {
  const wantedCli = cli.trim().toLowerCase();
  const words = text.trim().toLowerCase();
  return entries
    .filter((e) => (!from || e.date >= from) && (!to || e.date <= to)
      && (!(from || to) || /^\d{4}-\d{2}-\d{2}$/.test(e.date))
      && (!wantedCli || String(e.userMail ?? '').trim().toLowerCase() === wantedCli)
      && (!words || [e.nameOfMotorman, e.trainNo, e.unitNo, e.sub, e.cliName]
        .some((v) => String(v ?? '').toLowerCase().includes(words))))
    .sort((a, b) => b.sortKey - a.sortKey);
}

function activityMessage(e) {
  const time = normaliseTime(e.depTime);
  return [
    `${e.trainNo}/${e.unitNo}`,
    `${e.nameOfMotorman}/Grad : ${e.grade}`.trim(),
    `LCD - ${lcdShown(e.lcd)}`.trim(),
    `${e.fromStn} to ${e.toStn}${time ? ` Dep : ${time}` : ''}`,
    e.sub,
  ].join('\n');
}

return {
  latestActivity, activityMessage, filterEntries, arrivalPending, doneByNominatedCli, lcdShown, latestContactDate,
  assemble, parseCrew, parseTrains, parseTmContacts, parseTmData, tmChanges, chartDate, parseDropdowns, parseTrainManagers,
  parseDistances, parseEntry, entryToRow, toIsoDate, toSheetDate, normaliseTime, validateEntry, displayDate,
};
})();

if (typeof module !== 'undefined') module.exports = CrewLib;