/**
 * Opus Studio — 體驗課申請表單後端
 *
 * 做三件事：
 *   1. 把每一筆申請寫進 Google Sheet（含接洽狀態、進度、服務範圍等追蹤欄位）
 *   2. 自動從工作室的 Gmail 寄一封通知信給自己，回覆地址設成家長信箱
 *   3. 自動回一封確認信給家長
 *
 * 部署方式見同資料夾的 SETUP.md
 */

// ── 設定 ────────────────────────────────────────────────────────────
var SHEET_ID     = '';                          // 獨立專案必填：試算表網址中 /d/ 與 /edit 之間那串
                                                //（若程式是從試算表「擴充功能→Apps Script」建立的，留空即可）
var SHEET_NAME   = 'Enquiries';                 // 資料要寫進哪個工作表
var NOTIFY_TO    = 'opusstudio.nyc@gmail.com';  // 通知信寄給誰
var STUDIO_NAME  = 'Opus Studio';
var AUTO_REPLY   = true;                        // 是否自動回覆家長
var SETUP_TOKEN  = '';                          // 用網址觸發 setupSheet 的通行碼（部署版才填）
// ────────────────────────────────────────────────────────────────────

var FIELDS = [
  ['name',       'Student Name'],
  ['age',        'Student Age'],
  ['parent',     'Parent / Guardian'],
  ['email',      'Email'],
  ['phone',      'Phone'],
  ['instrument', 'Instrument'],
  ['lessonType', 'Lesson Type'],
  ['level',      'Current Level'],
  ['goals',      'Goals'],
  ['length',     'Lesson Length'],
  ['days',       'Preferred Days / Times'],
  ['start',      'Preferred Start Date'],
  ['notes',      'Notes']
];

// 給你自己在 Sheet 上手動維護的欄位。TASKS 是勾選框，進度欄會依勾選數自動算。
var TASKS    = ['已回覆', '已排時間', '體驗完成', '已報價', '已成交'];
var TRACKING = ['接洽狀態', '進度'].concat(TASKS)
               .concat(['服務範圍', '負責老師', '下次跟進日', '內部備註']);

var STATUS_OPTIONS = ['新進詢問', '已回覆', '已排體驗課', '體驗完成', '已成交', '未成交', '暫緩'];
var STATUS_COLORS  = {
  '新進詢問':  '#fdf0d5', '已回覆': '#e8f0fb', '已排體驗課': '#e6f4ea',
  '體驗完成':  '#d7ecdd', '已成交': '#c9e7d2', '未成交': '#f5e0dc', '暫緩': '#eeeeee'
};

// 欄位位置（1 起算）
function colStatus()   { return 2 + FIELDS.length; }          // 接洽狀態
function colProgress() { return colStatus() + 1; }             // 進度
function colTaskFirst(){ return colProgress() + 1; }           // 第一個勾選框
function colTaskLast() { return colTaskFirst() + TASKS.length - 1; }
function colScope()    { return colTaskLast() + 1; }           // 服務範圍
function a1(col) {
  var s = '';
  while (col > 0) { var m = (col - 1) % 26; s = String.fromCharCode(65 + m) + s; col = (col - m - 1) / 26; }
  return s;
}
/** 進度欄公式：依該列勾了幾項畫出進度條與百分比 */
function progressFormula(row) {
  var range = '$' + a1(colTaskFirst()) + row + ':$' + a1(colTaskLast()) + row;
  var n = 'COUNTIF(' + range + ',TRUE)';
  return '=REPT("█",' + n + ')&REPT("░",' + TASKS.length + '-' + n + ')&"  "&TEXT(' + n + '/' + TASKS.length + ',"0%")';
}
var SCOPE_OPTIONS  = ['Private Lesson', 'Online Lesson', 'Practice Coaching', 'Group Class', 'Chamber Music'];


/** 表單 POST 進來的入口 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // 蜜罐：真人不會看到這個欄位，有值代表是機器人。假裝成功，安靜丟掉。
    if (data.website) return json({ ok: true });

    if (!data.name || !data.email) return json({ ok: false, error: 'missing required fields' });

    appendRow(data);
    notifyStudio(data);
    if (AUTO_REPLY) replyToEnquirer(data);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/**
 * 用瀏覽器直接開這個網址時的健康檢查。
 * 加上 ?setup=<SETUP_TOKEN> 可以重新整理工作表格式，
 * 免得每次都要在編輯器裡跟函式選單搏鬥。
 */
function doGet(e) {
  if (SETUP_TOKEN && e && e.parameter && e.parameter.setup === SETUP_TOKEN) {
    return json({ ok: true, result: setupSheet() });
  }
  if (SETUP_TOKEN && e && e.parameter && e.parameter.reset === SETUP_TOKEN) {
    return json({ ok: true, result: resetData() });
  }
  return json({ ok: true, service: 'Opus Studio trial lesson form', time: new Date().toISOString() });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}


/** 寫入試算表 */
function appendRow(data) {
  var sheet = getSheet();
  var row = [new Date()];
  FIELDS.forEach(function (f) { row.push(data[f[0]] || ''); });
  row.push(STATUS_OPTIONS[0]);                 // 接洽狀態預設「新進詢問」
  for (var i = 1; i < TRACKING.length; i++) row.push('');
  sheet.appendRow(row);

  applyRowWidgets(sheet, sheet.getLastRow(), 1);
}

/** 依時間戳記欄判斷真正的最後一列資料（不受公式殘留影響） */
function lastDataRow(sheet) {
  var values = sheet.getRange(1, 1, sheet.getMaxRows(), 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) if (values[i][0] !== '') return i + 1;
  return 1;
}

/** 在指定列數鋪上勾選框與進度公式 */
function applyRowWidgets(sheet, startRow, numRows) {
  if (numRows < 1) return;
  sheet.getRange(startRow, colTaskFirst(), numRows, TASKS.length)
       .insertCheckboxes().setHorizontalAlignment('center');
  var formulas = [];
  for (var r = startRow; r < startRow + numRows; r++) formulas.push([progressFormula(r)]);
  sheet.getRange(startRow, colProgress(), numRows, 1).setFormulas(formulas);
}

/** 取得試算表：優先用 SHEET_ID，沒設就用綁定的那份 */
function book() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet() {
  var ss = book();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(SHEET_NAME); writeHeaders(sheet); }
  if (sheet.getLastRow() === 0) writeHeaders(sheet);
  return sheet;
}


/** 通知信給工作室，回覆地址設成家長，按「回覆」就直接回給對方 */
function notifyStudio(data) {
  var lines = FIELDS
    .filter(function (f) { return data[f[0]]; })
    .map(function (f) { return f[1] + '：' + data[f[0]]; });

  var body = '收到一筆新的體驗課申請。\n\n'
           + lines.join('\n')
           + '\n\n直接回覆這封信就會寄到 ' + data.email + '。'
           + '\n試算表：' + book().getUrl();

  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: '【體驗課申請】' + data.name + (data.instrument ? ' — ' + data.instrument : ''),
    body: body,
    replyTo: data.email,
    name: STUDIO_NAME + ' Website'
  });
}


/** 自動回覆家長 */
function replyToEnquirer(data) {
  var who = data.parent || data.name;
  var body = 'Dear ' + who + ',\n\n'
    + 'Thank you for your interest in ' + STUDIO_NAME + '. '
    + 'We have received your trial lesson request and will be in touch shortly to arrange a time.\n\n'
    + 'Here is a summary of what you sent us:\n\n'
    + FIELDS.filter(function (f) { return data[f[0]]; })
            .map(function (f) { return '  ' + f[1] + ': ' + data[f[0]]; }).join('\n')
    + '\n\nPlease note that submitting this form does not confirm a lesson time. '
    + 'Your trial lesson will be confirmed once you receive a scheduling confirmation from us.\n\n'
    + 'Warm regards,\n' + STUDIO_NAME + '\n' + NOTIFY_TO;

  MailApp.sendEmail({
    to: data.email,
    subject: STUDIO_NAME + ' — We received your trial lesson request',
    body: body,
    name: STUDIO_NAME,
    replyTo: NOTIFY_TO
  });
}


/**
 * 只需要跑一次：建立工作表、標題列、凍結、欄寬與下拉選單。
 * 在編輯器上方選這個函式再按「執行」。
 */
function setupSheet() {
  var ss = book();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  writeHeaders(sheet);

  var lastCol = 1 + FIELDS.length + TRACKING.length;
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  sheet.setColumnWidth(1, 150);                       // 時間戳記
  for (var c = 2; c <= 1 + FIELDS.length; c++) sheet.setColumnWidth(c, 150);
  for (var c2 = 2 + FIELDS.length; c2 <= lastCol; c2++) sheet.setColumnWidth(c2, 130);

  applyDropdown(sheet, colStatus(), STATUS_OPTIONS);
  applyDropdown(sheet, colScope(),  SCOPE_OPTIONS);
  applyStatusColors(sheet);

  sheet.setColumnWidth(colProgress(), 150);
  for (var t = colTaskFirst(); t <= colTaskLast(); t++) sheet.setColumnWidth(t, 90);
  sheet.getRange(1, colTaskFirst(), 1, TASKS.length).setHorizontalAlignment('center');

  // 勾選框與進度公式只鋪在「真的有資料」的列。
  // 千萬不要預先鋪滿：appendRow 是接在最後一列有內容的下面，
  // 預鋪公式會讓新資料被丟到 500 列之外。
  var last = lastDataRow(sheet);
  if (last >= 2) applyRowWidgets(sheet, 2, last - 1);

  // 資料底下若有殘留的公式或勾選框，清掉
  var maxRow = sheet.getMaxRows();
  if (maxRow > last) {
    sheet.getRange(last + 1, colProgress(), maxRow - last, TASKS.length + 1)
         .clearContent().clearDataValidations();
  }

  Logger.log('工作表「' + SHEET_NAME + '」已建立完成：' + ss.getUrl());
  return '工作表「' + SHEET_NAME + '」已建立完成。';
}

/** 清空所有資料列（保留標題），然後重建格式。測試完要洗掉資料時用。 */
function resetData() {
  var sheet = getSheet();
  var maxRow = sheet.getMaxRows();
  if (maxRow > 1) sheet.getRange(2, 1, maxRow - 1, sheet.getMaxColumns())
                       .clearContent().clearDataValidations();
  setupSheet();
  return '資料已清空，格式已重建。';
}

function writeHeaders(sheet) {
  var headers = ['時間戳記'].concat(FIELDS.map(function (f) { return f[1]; })).concat(TRACKING);
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers])
       .setFontWeight('bold')
       .setBackground('#f5f1e9')
       .setFontColor('#3a352d');
  // 追蹤欄位換個底色，跟表單原始資料區分開
  sheet.getRange(1, 2 + FIELDS.length, 1, TRACKING.length).setBackground('#e8dcc2');
}

/** 接洽狀態依內容自動上色，一眼看出每列走到哪 */
function applyStatusColors(sheet) {
  var col = a1(colStatus());
  var range = sheet.getRange(2, colStatus(), 500, 1);
  var rules = sheet.getConditionalFormatRules().filter(function (r) {
    return r.getRanges().every(function (g) { return g.getColumn() !== colStatus(); });
  });
  STATUS_OPTIONS.forEach(function (opt) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(opt)
      .setBackground(STATUS_COLORS[opt])
      .setRanges([range]).build());
  });
  sheet.setConditionalFormatRules(rules);
}

function applyDropdown(sheet, col, options) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, col, 1000, 1).setDataValidation(rule);
}
