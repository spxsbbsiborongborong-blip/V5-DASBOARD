function processAI(q) {
  const now = nowMinutes();
  const loading = schedule.filter(i => getStatus(i).key === 'loading');
  const soon = schedule.filter(i => getStatus(i).key === 'soon');
  const upcoming = schedule.filter(i => {
    const s = getStatus(i).key;
    return s === 'upcoming' || s === 'soon';
  });
  const done = schedule.filter(i => getStatus(i).key === 'done');
  if (q.includes('loading sekarang') || q.includes('sedang loading')) {
    if (!loading.length) return 'Saat ini tidak ada rute yang sedang dalam proses loading.';
    let res = 'Sedang loading ada <b>' + loading.length + '</b> rute:<br>';
    loading.forEach(i => { res += '- ' + i.route + ' (Slot ' + i.slot + ') - Start ' + i.start + ', ETD ' + i.etd + '<br>'; });
    return res;
  }
  if (q.includes('30 menit') || q.includes('segera') || q.includes('akan loading')) {
    if (!soon.length) return 'Tidak ada rute yang akan loading dalam 30 menit ke depan.';
    let res = 'Dalam 30 menit akan mulai loading <b>' + soon.length + '</b> rute:<br>';
    soon.forEach(i => {
      const diff = parseTime(i.start) - now;
      res += '- ' + i.route + ' (Slot ' + i.slot + ') - ' + i.start + ' (dalam ' + diff + ' menit)<br>';
    });
    return res;
  }
  if (q.includes('ringkasan') || q.includes('status hari ini') || q.includes('status')) {
    return '<b>Ringkasan Status</b><br>- Akan datang / <=30 menit: <b>' + upcoming.length + '</b><br>- Sedang loading: <b>' + loading.length + '</b><br>- Selesai: <b>' + done.length + '</b><br><br>Total rute hari ini: ' + schedule.length;
  }
  if (q.includes('padang sidempuan') || q.includes('padangsidempuan')) {
    const matches = schedule.filter(i => i.route.toLowerCase().includes('padang sidempuan'));
    if (!matches.length) return 'Tidak ditemukan rute ke Padang Sidempuan.';
    let res = 'Ditemukan <b>' + matches.length + '</b> rute terkait Padang Sidempuan:<br>';
    matches.forEach(i => { const s = getStatus(i); res += '- Slot ' + i.slot + ' | ' + i.start + '-' + i.etd + ' | <b>' + s.label + '</b><br>'; });
    return res;
  }
  if (q.includes('jam berapa') || q.includes('waktu sekarang')) {
    return 'Waktu saat ini: <b>' + getNowDate().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB</b>';
  }
  if (q.includes('halo') || q.includes('hai')) {
    return 'Halo! Saya Agen AI Dashboard Siborong-Borong. Tanya saja tentang status loading atau ringkasan.';
  }
  return 'Saya bisa bantu: loading sekarang, <=30 menit, ringkasan, atau nama hub.';
}

function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    addMsg('File harus berformat CSV.', false);
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = parseCSV(e.target.result);
      if (!parsed.length) {
        addMsg('CSV kosong atau format tidak dikenali.', false);
        return;
      }
      saveCurrentSchedule('Sebelum upload: ' + file.name);
      schedule = parsed;
      alertedKeys.clear();
      currentFilter = 'all';
      document.querySelectorAll('.filters button').forEach(b => {
        b.classList.toggle('btn-active', b.dataset.filter === 'all');
      });
      saveCurrentSchedule('Upload: ' + file.name);
      renderTable();
      addMsg('[OK] Jadwal diganti! ' + parsed.length + ' rute dari "' + file.name + '".');
      showBanner(parsed.length + ' jadwal baru di-upload');
      if (voiceEnabled) speak('Jadwal berhasil diganti. ' + parsed.length + ' rute dimuat.');
    } catch (err) {
      addMsg('Gagal membaca CSV: ' + err.message, false);
    }
  };
  reader.readAsText(file, 'UTF-8');
  event.target.value = '';
}

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const colRoute = headers.findIndex(h => h.includes('route') || h.includes('rute'));
  const colSlot = headers.findIndex(h => h.includes('slot'));
  const colStart = headers.findIndex(h => h.includes('start') || h.includes('loading') || h.includes('mulai'));
  const colEtd = headers.findIndex(h => h.includes('etd') || h.includes('origin') || h.includes('berangkat'));
  if (colRoute === -1 || colStart === -1 || colEtd === -1) return parseCSVFixed(lines, sep);
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCSVLine(line, sep);
    if (cols.length < 3) continue;
    let route = (cols[colRoute] || '').trim().replace(/^"|"$/g, '');
    route = route.replace(/^Siborong\s*-\s*Borong\s*DC\s*>\s*/i, '').trim();
    if (!route) continue;
    const slot = parseInt((cols[colSlot] || '1').trim(), 10) || 1;
    const start = normalizeTime(cols[colStart] || '');
    const etd = normalizeTime(cols[colEtd] || '');
    if (!start || !etd) continue;
    result.push({ route: route, slot: slot, start: start, etd: etd });
  }
  return result;
}

function parseCSVFixed(lines, sep) {
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCSVLine(line, sep);
    if (cols.length < 4) continue;
    let route = (cols[0] || '').trim().replace(/^"|"$/g, '');
    route = route.replace(/^Siborong\s*-\s*Borong\s*DC\s*>\s*/i, '').trim();
    if (!route) continue;
    const slot = parseInt((cols[1] || '1').trim(), 10) || 1;
    const start = normalizeTime(cols[2] || '');
    const etd = normalizeTime(cols[3] || '');
    if (!start || !etd) continue;
    result.push({ route: route, slot: slot, start: start, etd: etd });
  }
  return result;
}

function splitCSVLine(line, sep) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === sep && !inQuotes) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

function normalizeTime(t) {
  t = String(t).trim().replace(/^"|"$/g, '').replace(/\./g, ':');
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function tick() {
  updateClock();
  renderTable();
  checkAlarms();
}

if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = function() {};
  speechSynthesis.getVoices();
}

loadVoicePref();
loadTheme();
var loaded = loadFromLocalStorage();
if (!loaded) saveCurrentSchedule('Jadwal awal');
tick();
setInterval(tick, 1000);

var deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
  var btn = document.getElementById('btnInstall');
  if (btn) btn.style.display = 'inline-flex';
});

function installPWA() {
  if (!deferredInstallPrompt) {
    addMsg('Aplikasi sudah terinstall atau browser tidak mendukung Install PWA.');
    return;
  }
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(function(result) {
    if (result.outcome === 'accepted') {
      addMsg('[OK] Aplikasi berhasil diinstall!');
      if (voiceEnabled) speak('Aplikasi berhasil diinstall.');
    }
    deferredInstallPrompt = null;
    var btn = document.getElementById('btnInstall');
    if (btn) btn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', function() {
  deferredInstallPrompt = null;
  var btn = document.getElementById('btnInstall');
  if (btn) btn.style.display = 'none';
  addMsg('[OK] SPX Siborong-Borong Dashboard V5 berhasil diinstall.');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').then(function(reg) {
      console.log('SW registered:', reg.scope);
    }).catch(function(err) {
      console.warn('SW registration failed:', err);
    });
  });
}
