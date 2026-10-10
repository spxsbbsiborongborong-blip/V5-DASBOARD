function processAI(q) {
  var now = nowMinutes();
  var loading = schedule.filter(function(i) { return getStatus(i).key === 'loading'; });
  var soon = schedule.filter(function(i) { return getStatus(i).key === 'soon'; });
  var upcoming = schedule.filter(function(i) {
    var s = getStatus(i).key;
    return s === 'upcoming' || s === 'soon';
  });
  var done = schedule.filter(function(i) { return getStatus(i).key === 'done'; });

  function fmtItem(i, idx) {
    var st = getStatus(i);
    var diff = parseTime(i.start) - now;
    var cd = formatCountdown(diff);
    var n = (idx !== undefined) ? (idx + 1) + '. ' : '';
    return n + '<b>' + i.route + '</b><br>' +
      '&nbsp;&nbsp;Slot: <b>' + i.slot + '</b> &nbsp;|&nbsp; Start: <b>' + i.start + '</b> &nbsp;|&nbsp; ETD: <b>' + i.etd + '</b><br>' +
      '&nbsp;&nbsp;Status: <b>' + st.label + '</b> (' + cd + ')<br>';
  }

  function fmtList(arr, title) {
    if (!arr.length) return title + '<br>Tidak ada data.';
    var r = title + '<br><br>';
    arr.forEach(function(i, idx) { r += fmtItem(i, idx) + '<br>'; });
    return r;
  }

  if (q.includes('loading sekarang') || q.includes('sedang loading') || q.includes('apa yang loading') || q === 'loading sekarang?') {
    if (!loading.length) return 'Saat ini <b>tidak ada</b> rute yang sedang loading.';
    return fmtList(loading, 'Sedang loading: <b>' + loading.length + '</b> rute');
  }

  if (q.includes('30 menit') || q.includes('segera') || (q.includes('akan loading') && q.indexOf('pukul') === -1 && q.indexOf('jam') === -1)) {
    if (!soon.length) return 'Tidak ada rute yang akan loading dalam 30 menit ke depan.';
    return fmtList(soon, 'Akan loading dalam 30 menit: <b>' + soon.length + '</b> rute');
  }

  if (q.includes('ringkasan') || q.includes('status hari ini') || q === 'status') {
    return '<b>RINGKASAN DASHBOARD V5</b><br><br>' +
      'Akan datang / <=30 menit : <b>' + upcoming.length + '</b><br>' +
      'Sedang loading          : <b>' + loading.length + '</b><br>' +
      'Selesai                 : <b>' + done.length + '</b><br>' +
      'Total rute hari ini     : <b>' + schedule.length + '</b><br><br>' +
      'Waktu sekarang: <b>' + getNowDate().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB</b>';
  }

  if (q.includes('jam berapa') || q.includes('waktu sekarang') || q.includes('sekarang jam') || q.includes('pukul berapa sekarang')) {
    return 'Waktu saat ini: <b>' + getNowDate().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB</b>';
  }

  if (q.includes('berapa rute') || q.includes('total rute') || q.includes('total jadwal')) {
    return 'Total ada <b>' + schedule.length + '</b> jadwal loading dari Siborong-Borong DC hari ini.';
  }

  if (q.includes('halo') || q.includes('hai') || q.includes('hello') || q.includes('pagi') || q.includes('siang') || q.includes('malam')) {
    return 'Halo! Saya Agen AI Dashboard V5 Siborong-Borong.<br><br>Anda bisa tanya:<br>' +
      '- Pukul berapa loading ke [wilayah]?<br>' +
      '- Berapa slot arah [wilayah]?<br>' +
      '- Loading sekarang? / Ringkasan<br>' +
      '- Nama hub: Beringin, Saipar, Tarutung, Balige, dll';
  }

  var stopwords = {
    'pukul':1,'berapa':1,'jam':1,'arah':1,'tujuan':1,'wilayah':1,'loading':1,'di':1,'ke':1,'yang':1,
    'ada':1,'untuk':1,'dari':1,'slot':1,'rute':1,'kapan':1,'mulai':1,'etd':1,'start':1,'jadwal':1,
    'dengan':1,'apa':1,'siapa':1,'mana':1,'saya':1,'ingin':1,'tolong':1,'cek':1,'lihat':1,
    'info':1,'informasi':1,'tentang':1,'seputar':1,'dashboard':1,'v5':1,'hub':1,'the':1,'dan':1
  };
  var words = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function(w) {
    return w.length >= 3 && !stopwords[w];
  });

  var matches = [];
  if (words.length > 0) {
    matches = schedule.filter(function(item) {
      var route = item.route.toLowerCase();
      return words.some(function(w) { return route.indexOf(w) !== -1; });
    });
  }

  matches.sort(function(a, b) { return parseTime(a.start) - parseTime(b.start); });

  if (matches.length > 0) {
    var askSlot = q.includes('slot') || q.includes('berapa slot');
    var askTime = q.includes('pukul') || q.includes('jam') || q.includes('kapan') || q.includes('waktu') || q.includes('mulai') || q.includes('etd') || q.includes('start');
    var keyword = words.join(', ');

    var head = '';
    if (askSlot) {
      var slots = [];
      matches.forEach(function(i) {
        if (slots.indexOf(i.slot) === -1) slots.push(i.slot);
      });
      head = 'Untuk wilayah <b>' + keyword + '</b> ditemukan <b>' + matches.length + '</b> jadwal.<br>' +
        'Slot yang dipakai: <b>' + slots.join(', ') + '</b><br><br>';
    } else if (askTime) {
      head = 'Jadwal loading wilayah <b>' + keyword + '</b> (' + matches.length + ' rute):<br><br>';
    } else {
      head = 'Ditemukan <b>' + matches.length + '</b> jadwal untuk <b>' + keyword + '</b>:<br><br>';
    }

    var body = '';
    matches.forEach(function(i, idx) {
      body += fmtItem(i, idx) + '<br>';
    });

    var allSlots = [];
    matches.forEach(function(i) {
      if (allSlots.indexOf(i.slot) === -1) allSlots.push(i.slot);
    });
    var foot = '---<br>Total: <b>' + matches.length + '</b> jadwal | Slot: <b>' + allSlots.join(', ') + '</b>';

    return head + body + foot;
  }

  if (q.includes('daftar') || q.includes('semua rute') || q.includes('semua hub') || q.includes('list')) {
    var resL = 'Daftar ' + schedule.length + ' jadwal hari ini (15 pertama):<br><br>';
    schedule.slice(0, 15).forEach(function(i, idx) {
      resL += (idx + 1) + '. Slot ' + i.slot + ' | ' + i.start + ' | ' + i.route.substring(0, 55) + (i.route.length > 55 ? '...' : '') + '<br>';
    });
    if (schedule.length > 15) resL += '<br>... dan ' + (schedule.length - 15) + ' rute lainnya. Ketik nama wilayah untuk detail.';
    return resL;
  }

  return 'Maaf, saya belum menemukan rute yang cocok.<br><br>' +
    '<b>Coba tanya seperti ini:</b><br>' +
    '1. "Pukul berapa loading Beringin?"<br>' +
    '2. "Berapa slot arah Padang Sidempuan?"<br>' +
    '3. "Kapan Tarutung mulai loading?"<br>' +
    '4. "Saipar" / "Balige" / "Natal" / "Sorkam"<br>' +
    '5. "Loading sekarang?" / "Ringkasan"<br><br>' +
    'Ketik nama hub atau wilayah tujuan saja, saya akan tampilkan detailnya.';
}

function handleCSVUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    addMsg('File harus berformat CSV.', false);
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var parsed = parseCSV(e.target.result);
      if (!parsed.length) {
        addMsg('CSV kosong atau format tidak dikenali.', false);
        return;
      }
      saveCurrentSchedule('Sebelum upload: ' + file.name);
      schedule = parsed;
      alertedKeys.clear();
      currentFilter = 'all';
      document.querySelectorAll('.filters button').forEach(function(b) {
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
  var lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  var sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  var headers = lines[0].split(sep).map(function(h) { return h.trim().toLowerCase().replace(/['"]/g, ''); });
  var colRoute = headers.findIndex(function(h) { return h.includes('route') || h.includes('rute'); });
  var colSlot = headers.findIndex(function(h) { return h.includes('slot'); });
  var colStart = headers.findIndex(function(h) { return h.includes('start') || h.includes('loading') || h.includes('mulai'); });
  var colEtd = headers.findIndex(function(h) { return h.includes('etd') || h.includes('origin') || h.includes('berangkat'); });
  if (colRoute === -1 || colStart === -1 || colEtd === -1) return parseCSVFixed(lines, sep);
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var cols = splitCSVLine(line, sep);
    if (cols.length < 3) continue;
    var route = (cols[colRoute] || '').trim().replace(/^"|"$/g, '');
    route = route.replace(/^Siborong\s*-\s*Borong\s*DC\s*>\s*/i, '').trim();
    if (!route) continue;
    var slot = parseInt((cols[colSlot] || '1').trim(), 10) || 1;
    var start = normalizeTime(cols[colStart] || '');
    var etd = normalizeTime(cols[colEtd] || '');
    if (!start || !etd) continue;
    result.push({ route: route, slot: slot, start: start, etd: etd });
  }
  return result;
}

function parseCSVFixed(lines, sep) {
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var cols = splitCSVLine(line, sep);
    if (cols.length < 4) continue;
    var route = (cols[0] || '').trim().replace(/^"|"$/g, '');
    route = route.replace(/^Siborong\s*-\s*Borong\s*DC\s*>\s*/i, '').trim();
    if (!route) continue;
    var slot = parseInt((cols[1] || '1').trim(), 10) || 1;
    var start = normalizeTime(cols[2] || '');
    var etd = normalizeTime(cols[3] || '');
    if (!start || !etd) continue;
    result.push({ route: route, slot: slot, start: start, etd: etd });
  }
  return result;
}

function splitCSVLine(line, sep) {
  var result = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === sep && !inQuotes) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

function normalizeTime(t) {
  t = String(t).trim().replace(/^"|"$/g, '').replace(/\./g, ':');
  var match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  var h = parseInt(match[1], 10);
  var m = parseInt(match[2], 10);
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
if (typeof updateNotifBtn === 'function') updateNotifBtn();
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
