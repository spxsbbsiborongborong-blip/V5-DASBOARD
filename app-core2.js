function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filters button').forEach(function(b) {
    b.classList.toggle('btn-active', b.dataset.filter === f);
  });
  renderTable();
}
function setSearch(val) {
  searchQuery = (val || '').trim().toLowerCase();
  renderTable();
}
function clearSearch() {
  searchQuery = '';
  var inp = document.getElementById('searchRoute');
  if (inp) inp.value = '';
  renderTable();
}
function requestNotifPermission() {
  if (!('Notification' in window)) {
    addMsg('Browser tidak mendukung notifikasi.');
    return;
  }
  if (Notification.permission === 'granted') {
    addMsg('[OK] Notifikasi browser sudah aktif.');
    updateNotifBtn();
    return;
  }
  if (Notification.permission === 'denied') {
    addMsg('Notifikasi diblokir. Aktifkan di pengaturan browser.');
    return;
  }
  Notification.requestPermission().then(function(p) {
    if (p === 'granted') {
      addMsg('[OK] Notifikasi browser diaktifkan. Anda akan menerima alarm <=30 menit dan mulai loading.');
      sendBrowserNotif('SPX Dashboard V5', 'Notifikasi aktif. Alarm loading siap.');
    } else {
      addMsg('Izin notifikasi ditolak.');
    }
    updateNotifBtn();
  });
}
function updateNotifBtn() {
  var btn = document.getElementById('btnNotif');
  if (!btn) return;
  if (!('Notification' in window)) {
    btn.textContent = 'Notif N/A';
    return;
  }
  if (Notification.permission === 'granted') {
    btn.textContent = 'Notif ON';
    btn.classList.add('btn-success');
    btn.classList.remove('btn-ghost');
  } else {
    btn.textContent = 'Aktifkan Notif';
    btn.classList.remove('btn-success');
  }
}
function sendBrowserNotif(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    var n = new Notification(title, {
      body: body,
      icon: 'icon-192.png',
      badge: 'icon-72.png',
      tag: 'spx-alarm-' + Date.now(),
      requireInteraction: true
    });
    n.onclick = function() {
      window.focus();
      n.close();
    };
    setTimeout(function() { try { n.close(); } catch(e) {} }, 20000);
  } catch (e) {}
}
function updateClock() {
  var now = getNowDate();
  document.getElementById('clock').textContent = now.toLocaleTimeString('id-ID', { hour12: false });
  document.getElementById('dateStr').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function speak(text, force) {
  if (!voiceEnabled && !force) return;
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ' '));
  u.lang = 'id-ID';
  u.rate = 0.95;
  var voices = speechSynthesis.getVoices();
  var idVoice = voices.find(function(v) { return v.lang.indexOf('id') === 0; });
  if (idVoice) u.voice = idVoice;
  speechSynthesis.speak(u);
}
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  localStorage.setItem('voiceEnabled', voiceEnabled ? 'true' : 'false');
  var label = document.getElementById('voiceLabel');
  var dot = document.getElementById('voiceDot');
  if (label) label.textContent = voiceEnabled ? 'Suara ON' : 'Suara OFF';
  if (dot) dot.classList.toggle('on', voiceEnabled);
  if (voiceEnabled) speak('Suara alarm diaktifkan.', true);
}
function loadVoicePref() {
  voiceEnabled = localStorage.getItem('voiceEnabled') === 'true';
  var label = document.getElementById('voiceLabel');
  var dot = document.getElementById('voiceDot');
  if (label) label.textContent = voiceEnabled ? 'Suara ON' : 'Suara OFF';
  if (dot) dot.classList.toggle('on', voiceEnabled);
}
var THEME_KEY = 'siborong_theme_v1';
function setTheme(theme) {
  theme = theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  var sel = document.getElementById('themeSelect');
  if (sel) sel.value = theme;
}
function loadTheme() {
  setTheme(localStorage.getItem(THEME_KEY) || 'dark');
}
function testVoice() {
  speak('Ini adalah tes suara alarm. Sistem dashboard Siborong Borong siap digunakan.', true);
}
function checkAlarms() {
  var now = nowMinutes();
  var notifOn = ('Notification' in window) && Notification.permission === 'granted';
  schedule.forEach(function(item, idx) {
    var start = parseTime(item.start);
    var etd = parseTime(item.etd);
    var diffStart = start - now;
    var key30 = '30-' + idx + '-' + item.start;
    var keyStart = 'start-' + idx + '-' + item.start;
    if (diffStart <= 30 && diffStart > 0 && !alertedKeys.has(key30)) {
      alertedKeys.add(key30);
      var msg = 'Perhatian. Rute ' + item.route + ', slot ' + item.slot + ', akan mulai loading dalam ' + diffStart + ' menit, pukul ' + item.start + '.';
      showBanner(msg);
      if (voiceEnabled) speak(msg);
      if (notifOn) sendBrowserNotif('<=30 menit | Slot ' + item.slot, item.route + ' mulai pukul ' + item.start + ' (dalam ' + diffStart + ' menit)');
    }
    if (now >= start && now <= etd && !alertedKeys.has(keyStart)) {
      alertedKeys.add(keyStart);
      var msg2 = 'Alarm loading. Rute ' + item.route + ', slot ' + item.slot + ', mulai loading sekarang pukul ' + item.start + '.';
      showBanner(msg2);
      if (voiceEnabled) speak(msg2);
      if (notifOn) sendBrowserNotif('LOADING | Slot ' + item.slot, item.route + ' mulai loading pukul ' + item.start);
    }
  });
}
function showBanner(text) {
  var banner = document.getElementById('alarmBanner');
  banner.textContent = '[Alarm] ' + text;
  banner.classList.add('show');
  setTimeout(function() { banner.classList.remove('show'); }, 12000);
}
function speakSummary() {
  var loadingList = [], soonList = [];
  schedule.forEach(function(item) {
    var s = getStatus(item);
    if (s.key === 'loading') loadingList.push(item);
    if (s.key === 'soon') soonList.push(item);
  });
  var text = 'Ringkasan status loading Siborong Borong. ';
  if (loadingList.length) text += 'Sedang loading ada ' + loadingList.length + ' rute. ';
  else text += 'Tidak ada yang sedang loading. ';
  if (soonList.length) text += 'Akan loading dalam 30 menit ada ' + soonList.length + ' rute. ';
  speak(text, true);
}
function addMsg(text, isUser) {
  var box = document.getElementById('chatMessages');
  var div = document.createElement('div');
  div.className = 'msg ' + (isUser ? 'msg-user' : 'msg-ai');
  if (!isUser) div.innerHTML = '<div class="sender">Agen AI</div>' + text;
  else div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function askAI(q) {
  document.getElementById('chatInput').value = q;
  sendChat();
}
function sendChat() {
  var input = document.getElementById('chatInput');
  var q = input.value.trim();
  if (!q) return;
  addMsg(q, true);
  input.value = '';
  setTimeout(function() {
    var answer = processAI(q.toLowerCase());
    addMsg(answer);
    if (voiceEnabled) speak(answer.replace(/<[^>]+>/g, ''));
  }, 400);
}
