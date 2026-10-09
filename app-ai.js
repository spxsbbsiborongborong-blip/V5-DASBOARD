function processAI(q) {
  var now = nowMinutes();
  var loading = schedule.filter(function(i) { return getStatus(i).key === 'loading'; });
  var soon = schedule.filter(function(i) { return getStatus(i).key === 'soon'; });
  var upcoming = schedule.filter(function(i) {
    var s = getStatus(i).key;
    return s === 'upcoming' || s === 'soon';
  });
  var done = schedule.filter(function(i) { return getStatus(i).key === 'done'; });

  if (q.includes('loading sekarang') || q.includes('sedang loading') || q.includes('apa yang loading')) {
    if (!loading.length) return 'Saat ini tidak ada rute yang sedang loading.';
    var res = 'Sedang loading ada <b>' + loading.length + '</b> rute:<br>';
    loading.forEach(function(i) {
      res += '- ' + i.route + ' | Slot <b>' + i.slot + '</b> | Start ' + i.start + ' - ETD ' + i.etd + '<br>';
    });
    return res;
  }

  if (q.includes('30 menit') || q.includes('segera') || (q.includes('akan loading') && !q.includes('pukul'))) {
    if (!soon.length) return 'Tidak ada rute yang akan loading dalam 30 menit ke depan.';
    var res2 = 'Dalam 30 menit akan loading <b>' + soon.length + '</b> rute:<br>';
    soon.forEach(function(i) {
      var diff = parseTime(i.start) - now;
      res2 += '- ' + i.route + ' | Slot <b>' + i.slot + '</b> | pukul ' + i.start + ' (dalam ' + diff + ' menit)<br>';
    });
    return res2;
  }

  if (q.includes('ringkasan') || q.includes('status hari ini') || q === 'status') {
    return '<b>Ringkasan Status Dashboard V5</b><br>' +
      '- Akan datang / <=30 menit: <b>' + upcoming.length + '</b><br>' +
      '- Sedang loading: <b>' + loading.length + '</b><br>' +
      '- Selesai: <b>' + done.length + '</b><br>' +
      '- Total rute hari ini: <b>' + schedule.length + '</b>';
  }

  if (q.includes('jam berapa') || q.includes('waktu sekarang') || q.includes('sekarang jam') || q.includes('pukul berapa sekarang')) {
    return 'Waktu saat ini: <b>' + getNowDate().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB</b>';
  }

  if (q.includes('berapa rute') || q.includes('total rute') || q.includes('total jadwal')) {
    return 'Total ada <b>' + schedule.length + '</b> jadwal loading dari Siborong-Borong DC hari ini.';
  }

  if (q.includes('halo') || q.includes('hai') || q.includes('hello') || q.includes('pagi') || q.includes('siang') || q.includes('malam')) {
    return 'Halo! Saya Agen AI Dashboard V5 Siborong-Borong. Tanya saja tentang rute, slot, jam loading, atau wilayah tujuan.';
  }

  var stopwords = ['pukul','berapa','jam','arah','tujuan','wilayah','loading','di','ke','yang','ada','untuk','dari','slot','rute','kapan','mulai','etd','start','jadwal','dengan','apa','siapa','mana','saya','ingin','tolong','cek','lihat','info','informasi','tentang','seputar','dashboard','v5'];
  var words = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function(w) {
    return w.length >= 3 && stopwords.indexOf(w) === -1;
  });

  var matches = [];
  if (words.length > 0) {
    matches = schedule.filter(function(item) {
      var route = item.route.toLowerCase();
      return words.some(function(w) { return route.indexOf(w) !== -1; });
    });
  }

  if (matches.length > 0) {
    if (q.includes('slot') || q.includes('berapa slot')) {
      var slots = matches.map(function(i) { return i.slot; });
      var uniqueSlots = slots.filter(function(v, i, a) { return a.indexOf(v) === i; });
      var resS = 'Ditemukan <b>' + matches.length + '</b> jadwal terkait:<br>';
      matches.forEach(function(i) {
        var st = getStatus(i);
        resS += '- Slot <b>' + i.slot + '</b> | ' + i.route + '<br>&nbsp;&nbsp;Start <b>' + i.start + '</b> - ETD <b>' + i.etd + '</b> | ' + st.label + '<br>';
      });
      resS += '<br>Slot yang dipakai: <b>' + uniqueSlots.join(', ') + '</b>';
      return resS;
    }

    if (q.includes('pukul') || q.includes('jam') || q.includes('kapan') || q.includes('waktu') || q.includes('mulai') || q.includes('etd')) {
      var resT = 'Jadwal loading terkait:<br>';
      matches.forEach(function(i) {
        var st = getStatus(i);
        var diff = parseTime(i.start) - now;
        var cd = formatCountdown(diff);
        resT += '- <b>' + i.route + '</b><br>&nbsp;&nbsp;Slot <b>' + i.slot + '</b> | Start <b>' + i.start + '</b> | ETD <b>' + i.etd + '</b> | ' + st.label + ' (' + cd + ')<br>';
      });
      return resT;
    }

    var resM = 'Ditemukan <b>' + matches.length + '</b> jadwal:<br>';
    matches.forEach(function(i) {
      var st = getStatus(i);
      resM += '- <b>' + i.route + '</b><br>&nbsp;&nbsp;Slot <b>' + i.slot + '</b> | Start <b>' + i.start + '</b> - ETD <b>' + i.etd + '</b> | ' + st.label + '<br>';
    });
    return resM;
  }

  if (q.includes('daftar') || q.includes('semua rute') || q.includes('semua hub') || q.includes('list')) {
    var resL = 'Daftar ' + schedule.length + ' jadwal hari ini:<br>';
    schedule.slice(0, 15).forEach(function(i, idx) {
      resL += (idx+1) + '. Slot ' + i.slot + ' | ' + i.start + ' | ' + i.route.substring(0, 50) + (i.route.length > 50 ? '...' : '') + '<br>';
    });
    if (schedule.length > 15) resL += '... dan ' + (schedule.length - 15) + ' rute lainnya.';
    return resL;
  }

  return 'Saya bisa menjawab pertanyaan seputar Dashboard V5, contoh:<br>' +
    '- "Pukul berapa loading ke Padang Sidempuan?"<br>' +
    '- "Berapa slot arah Beringin?"<br>' +
    '- "Rute Saipar slot berapa?"<br>' +
    '- "Loading sekarang?" / "Ringkasan"<br>' +
    '- "Kapan Tarutung mulai loading?"<br>' +
    '- Nama hub/wilayah (Sipirok, Balige, Natal, dll)<br><br>' +
    'Silakan tanya lebih spesifik!';
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
