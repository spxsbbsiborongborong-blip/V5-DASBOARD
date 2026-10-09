function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filters button').forEach(function(b) {
    b.classList.toggle('btn-active', b.dataset.filter === f);
  });
  renderTable();
}
function updateClock() {
  var now = getNowDate();
  document.getElementById('clock').textContent = now.toLocaleTimeString('id-ID', { hour12: false });
  document.getElementById('dateStr').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function speak(text, force) {
  if (!voiceEnabled && !force) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'id-ID';
  utter.rate = 0.95;
  var voices = speechSynthesis.getVoices();
  var idVoice = voices.find(function(v) { return v.lang.indexOf('id') === 0; });
  if (idVoice) utter.voice = idVoice;
  speechSynthesis.speak(utter);
}
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  localStorage.setItem('siborong_voice_on', voiceEnabled ? '1' : '0');
  applyVoiceUI();
  if (voiceEnabled) speak('Alarm suara diaktifkan.', true);
}
function applyVoiceUI() {
  var dot = document.getElementById('voiceDot');
  var label = document.getElementById('voiceLabel');
  if (dot) dot.classList.toggle('on', voiceEnabled);
  if (label) label.textContent = voiceEnabled ? 'Suara ON' : 'Suara OFF';
}
function loadVoicePref() {
  voiceEnabled = localStorage.getItem('siborong_voice_on') === '1';
  applyVoiceUI();
}
var THEME_KEY = 'siborong_theme';
var THEME_COLORS = { dark: '#0f172a', light: '#f1f5f9', ocean: '#0c4a6e', forest: '#14532d', sunset: '#431407' };
function setTheme(name) {
  var theme = THEME_COLORS[name] ? name : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme] || '#0f172a');
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
  if (!voiceEnabled) return;
  var now = nowMinutes();
  schedule.forEach(function(item, idx) {
    var start = parseTime(item.start);
    var key30 = '30-' + idx;
    var keyStart = 'start-' + idx;
    if (start - now === 30 && !alertedKeys.has(key30)) {
      alertedKeys.add(key30);
      var msg = 'Perhatian. Rute ' + item.route + ', slot ' + item.slot + ', akan mulai loading dalam 30 menit, pukul ' + item.start + '.';
      showBanner(msg);
      speak(msg);
    }
    if (now === start && !alertedKeys.has(keyStart)) {
      alertedKeys.add(keyStart);
      var msg2 = 'Alarm loading. Rute ' + item.route + ', slot ' + item.slot + ', mulai loading sekarang pukul ' + item.start + '.';
      showBanner(msg2);
      speak(msg2);
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
