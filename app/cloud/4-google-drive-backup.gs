/* Life Dashboard: daily Google Drive backup, and the inbox that carries Claude's nightly suggestions into the app.
   script.google.com > New project > paste this whole file > set the four Script Properties > run "install" once. */
var BACKUP_FOLDER = 'Life Dashboard Backups';
var INBOX_FOLDER = 'Life Dashboard Inbox';
var KEEP = 30;

function props_() {
  var p = PropertiesService.getScriptProperties();
  var c = { url: p.getProperty('FUNCTION_URL'), key: p.getProperty('PUBLISHABLE_KEY'), secret: p.getProperty('APP_SECRET'), email: p.getProperty('EMAIL') };
  if (!c.url || !c.key || !c.secret || !c.email) throw new Error('Set FUNCTION_URL, PUBLISHABLE_KEY, APP_SECRET and EMAIL in Project Settings > Script Properties.');
  return c;
}
function call_(body) {
  var c = props_();
  body.email = c.email;
  var r = UrlFetchApp.fetch(c.url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { apikey: c.key, 'x-app-secret': c.secret }, payload: JSON.stringify(body) });
  if (r.getResponseCode() >= 300) throw new Error((body.action || 'request') + ' failed: ' + r.getContentText());
  var t = r.getContentText();
  return t ? JSON.parse(t) : null;
}
function folder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
function unflat_(fl) {
  var o = {}, k, i, p, c;
  for (k in fl) {
    if (k === '$del') continue;
    i = k.indexOf('\t');
    if (i < 0) { o[k] = fl[k]; continue; }
    p = k.slice(0, i); c = k.slice(i + 1);
    if (typeof o[p] !== 'object' || o[p] === null || Array.isArray(o[p])) o[p] = {};
    o[p][c] = fl[k];
  }
  return o;
}

/* Runs every night: one complete, importable copy of everything. */
function dailyBackup() {
  var c = props_(), rows = call_({ action: 'export' }) || [];
  var out = { app: 'life-dashboard', version: 2, exportedAt: new Date().toISOString(), records: {} }, n = 0;
  rows.forEach(function (r) {
    if (r.flat && r.flat['$del']) return;
    (out.records[r.col] = out.records[r.col] || {})[r.id] = unflat_(r.flat || {}); n++;
  });
  if (!n) throw new Error('The export came back empty, so no backup was written.');
  var name = 'life-dashboard-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd') + '.json';
  var f = folder_(BACKUP_FOLDER);
  var old = f.getFilesByName(name); while (old.hasNext()) old.next().setTrashed(true);
  f.createFile(name, JSON.stringify(out), 'application/json');
  var files = [], it = f.getFiles(); while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(KEEP).forEach(function (x) { x.setTrashed(true); });
  call_({ action: 'put', col: 'meta', id: 'backup', data: { at: Date.now(), file: name, records: n } });
}

/* Runs every 10 minutes: any suggestions file Claude left in the inbox goes to the app, where you approve or dismiss each item. */
function importProposals() {
  var c = props_(), f = folder_(INBOX_FOLDER), done = null, it = f.getFiles();
  while (it.hasNext()) {
    var file = it.next();
    if (!/\.json$/i.test(file.getName())) continue;
    var j;
    try { j = JSON.parse(file.getBlob().getDataAsString()); } catch (e) { continue; }
    if (!j || !Array.isArray(j.items)) continue;
    var id = String(j.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd')) + '-' + file.getId().slice(0, 6);
    call_({ action: 'put', col: 'proposals', id: id, data: { date: j.date || '', items: j.items, at: Date.now() } });
    if (!done) { var d = f.getFoldersByName('Processed'); done = d.hasNext() ? d.next() : f.createFolder('Processed'); }
    file.moveTo(done);
  }
}

/* Run this once by hand. It creates both folders and both schedules. */
function install() {
  props_(); folder_(BACKUP_FOLDER); folder_(INBOX_FOLDER);
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyBackup').timeBased().atHour(4).nearMinute(30).everyDays(1).inTimezone('Asia/Kolkata').create();
  ScriptApp.newTrigger('importProposals').timeBased().everyMinutes(10).create();
  dailyBackup();
}
