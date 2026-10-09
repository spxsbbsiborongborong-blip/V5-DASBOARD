var voiceEnabled = false;
var currentFilter = 'all';
var alertedKeys = new Set();
var STORAGE_KEY = 'siborong_schedule_v1';
var HISTORY_KEY = 'siborong_backup_history_v1';
var MAX_HISTORY = 5;

function saveCurrentSchedule(label) {
  label = label || 'Auto-save';
  try {
    var payload = { schedule: schedule, savedAt: new Date().toISOString(), label: label, count: schedule.length };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    pushToHistory(payload);
  } catch (e) {}
}
function pushToHistory(payload) {
  try {
    var history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    var last = history[0];
    if (last && last.count === payload.count && JSON.stringify(last.schedule) === JSON.stringify(payload.schedule)) return;
    history.unshift(payload);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}
}
function loadFromLocalStorage() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    var data = JSON.parse(raw);
    if (data && Array.isArray(data.schedule) && data.schedule.length > 0) { schedule = data.schedule; return true; }
  } catch (e) {}
  return false;
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
}
function downloadCSV() {
  if (!schedule.length) { addMsg('Tidak ada data jadwal.'); return; }
  var csv = 'Route,Slot,Start Loading,ETD Origin\n';
  schedule.forEach(function(item) {
    csv += '"Siborong - Borong DC > ' + item.route + '",' + item.slot + ',' + item.start + ',' + item.etd + '\n';
  });
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'siborong_schedule.csv';
  a.click();
  addMsg('[OK] CSV di-download (' + schedule.length + ' rute).');
}
function showRestoreModal() {
  var history = getHistory();
  var list = document.getElementById('restoreList');
  if (!history.length) {
    list.innerHTML = '<p style="color:var(--muted)">Belum ada backup.</p>';
  } else {
    list.innerHTML = history.map(function(h, i) {
      var timeStr = new Date(h.savedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:0.75rem;display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:600">' + (h.label||'Backup') + ' - ' + h.count + ' rute</div><div style="font-size:0.75rem;color:var(--muted)">' + timeStr + '</div></div><button class="btn-primary" style="padding:0.35rem 0.75rem;font-size:0.8rem" onclick="restoreFromHistory(' + i + ')">Restore</button></div>';
    }).join('');
  }
  document.getElementById('restoreModal').style.display = 'flex';
}
function closeRestoreModal() { document.getElementById('restoreModal').style.display = 'none'; }
function restoreFromHistory(index) {
  var history = getHistory();
  if (!history[index]) return;
  var item = history[index];
  saveCurrentSchedule('Sebelum restore');
  schedule = item.schedule;
  alertedKeys.clear();
  currentFilter = 'all';
  document.querySelectorAll('.filters button').forEach(function(b) {
    b.classList.toggle('btn-active', b.dataset.filter === 'all');
  });
  saveCurrentSchedule('Restore: ' + (item.label || 'Backup'));
  renderTable();
  closeRestoreModal();
  addMsg('[OK] Restore berhasil (' + item.count + ' rute).');
  if (voiceEnabled) speak('Jadwal berhasil di-restore.');
}
function parseTime(str) {
  var p = str.split(':').map(Number);
  return p[0] * 60 + p[1];
}
function nowMinutes() {
  var wib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return wib.getHours() * 60 + wib.getMinutes();
}
function getNowDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
}
function formatCountdown(diffMin) {
  if (diffMin === 0) return 'Sekarang';
  var abs = Math.abs(diffMin);
  var h = Math.floor(abs / 60);
  var m = abs % 60;
  var sign = diffMin < 0 ? '-' : '';
  if (h > 0) return sign + h + 'j ' + m + 'm';
  return sign + m + ' menit';
}
function getStatus(item) {
  var now = nowMinutes();
  var start = parseTime(item.start);
  var etd = parseTime(item.etd);
  var diffStart = start - now;
  if (now > etd) return { key: 'done', label: 'Selesai', cls: 'status-done' };
  if (now >= start && now <= etd) return { key: 'loading', label: 'LOADING', cls: 'status-loading' };
  if (diffStart <= 30 && diffStart > 0) return { key: 'soon', label: '<=30 menit', cls: 'status-soon' };
  return { key: 'upcoming', label: 'Akan Datang', cls: 'status-upcoming' };
}
function renderTable() {
  var tbody = document.getElementById('tableBody');
  var upcoming = 0, loading = 0, done = 0;
  var rows = [];
  schedule.forEach(function(item, idx) {
    var status = getStatus(item);
    if (status.key === 'upcoming' || status.key === 'soon') upcoming++;
    if (status.key === 'loading') loading++;
    if (status.key === 'done') done++;
    if (currentFilter !== 'all') {
      if (currentFilter === 'soon' && status.key !== 'soon') return;
      if (currentFilter === 'loading' && status.key !== 'loading') return;
      if (currentFilter === 'upcoming' && status.key !== 'upcoming' && status.key !== 'soon') return;
    }
    var diff = parseTime(item.start) - nowMinutes();
    var rowClass = (status.key === 'loading' || status.key === 'soon') ? 'highlight-row' : '';
    rows.push('<tr class="' + rowClass + '"><td>' + (idx+1) + '</td><td class="route-name">' + item.route + '</td><td><span class="slot-badge">' + item.slot + '</span></td><td class="time-cell">' + item.start + '</td><td class="time-cell">' + item.etd + '</td><td><span class="status ' + status.cls + '">' + status.label + '</span></td><td class="countdown">' + formatCountdown(diff) + '</td></tr>');
  });
  tbody.innerHTML = rows.join('') || '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">Tidak ada data</td></tr>';
  document.getElementById('statUpcoming').textContent = upcoming;
  document.getElementById('statLoading').textContent = loading;
  document.getElementById('statDone').textContent = done;
  document.getElementById('lastUpdate').textContent = 'Update: ' + getNowDate().toLocaleTimeString('id-ID');
}
