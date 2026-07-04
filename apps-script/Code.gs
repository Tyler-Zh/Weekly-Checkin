/**
 * WGS DSR Weekly Staging — Apps Script
 *
 * SETUP:
 * 1. Create Google Sheet "WGS DSR Weekly Staging"
 * 2. Import templates/SuMkC_Weekly.csv → tab "SuMkC_Weekly"
 * 3. Extensions → Apps Script → paste this file
 * 4. Set STAGING_SPREADSHEET_ID below (or use active spreadsheet)
 * 5. Run setupWeeklyTrigger() once
 *
 * v0: Manual Looker paste into SuMkC_Weekly (script only sets reporting_week + validates)
 * v1: Replace refreshFromLooker_() with Looker API / Connected Sheet pull
 */

const CONFIG = {
  SPREADSHEET_ID: '', // leave empty to use Script container (bound sheet)
  SUMKC_TAB: 'SuMkC_Weekly',
  SUPPLIER_TAB: 'Supplier_Weekly',
  WATCHLIST_TAB: 'Watchlist_Weekly',
  EXPECTED_WGS_SUMKCS: 9,
  DSR_SUMKCS: [
    'APS Decor - Home Accents',
    'APS Decor - Wall Accents',
    'APS Decor - Wall Art',
    'APS Decor - Seasonal Decor',
    'APS Decor - Outdoor Decor',
    'APS Softhome - Bedding',
    'APS Softhome - Window',
    'APS Softhome - Bath',
    'APS Rugs',
  ],
};

function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Run every Sunday 6pm — stamps reporting_week on rows missing it.
 * Replace body with Looker export when API access is ready.
 */
function weeklyRefresh() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.SUMKC_TAB);
  if (!sheet) {
    throw new Error('Missing tab: ' + CONFIG.SUMKC_TAB);
  }

  const weekEnding = getPriorSunday_();
  stampReportingWeek_(sheet, weekEnding);

  const validation = validateSuMkCData_(sheet);
  if (!validation.ok) {
    MailApp.sendEmail(
      Session.getActiveUser().getEmail(),
      '[WGS DSR Weekly] Data validation FAILED',
      validation.message +
        '\n\nFix SuMkC_Weekly before n8n runs Monday.\nDo NOT use monthly F&D GRS tracker.'
    );
    return;
  }

  // v1: refreshFromLooker_(sheet, weekEnding);

  MailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    '[WGS DSR Weekly] Staging sheet OK for week ' + weekEnding,
    validation.message
  );
}

function setupWeeklyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'weeklyRefresh') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('weeklyRefresh')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(18)
    .create();
}

function getPriorSunday_() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 7 : day;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - diff);
  return Utilities.formatDate(sunday, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function stampReportingWeek_(sheet, weekEnding) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  const headers = data[0];
  const weekCol = headers.indexOf('reporting_week');
  if (weekCol < 0) return;

  for (let r = 1; r < data.length; r++) {
    if (!data[r][weekCol]) {
      sheet.getRange(r + 1, weekCol + 1).setValue(weekEnding);
    }
  }
}

function validateSuMkCData_(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = function (name) {
    return headers.indexOf(name);
  };

  const iEntity = idx('entity_name');
  const iChannel = idx('channel');
  const iSegment = idx('segment_type');

  const wgs = new Set();
  const vertical = new Set();

  for (let r = 1; r < data.length; r++) {
    if (data[r][iSegment] !== 'sumkc') continue;
    const entity = data[r][iEntity];
    const channel = data[r][iChannel];
    if (channel === 'WGS_APS' && CONFIG.DSR_SUMKCS.indexOf(entity) >= 0) {
      wgs.add(entity);
    }
    if (channel === 'VERTICAL_STO') {
      vertical.add(entity);
    }
  }

  const missingWgs = CONFIG.DSR_SUMKCS.filter(function (s) {
    return wgs.has(s) === false;
  });

  const ok =
    missingWgs.length === 0 && wgs.size >= CONFIG.EXPECTED_WGS_SUMKCS && vertical.size >= CONFIG.EXPECTED_WGS_SUMKCS;

  let message =
    'WGS SuMkC rows: ' +
    wgs.size +
    '/' +
    CONFIG.EXPECTED_WGS_SUMKCS +
    '\nVertical benchmark rows: ' +
    vertical.size +
    '\n';
  if (missingWgs.length) {
    message += 'Missing WGS rows: ' + missingWgs.join(', ') + '\n';
  }

  return { ok: ok, message: message };
}

/**
 * v1 placeholder — connect to Looker scheduled export or GBQ.
 * Looker dashboards:
 *   - 18715 Weekly Category/Class Performance
 *   - 13199 Weekly Looker Report
 */
function refreshFromLooker_(sheet, weekEnding) {
  // TODO: Implement when Looker API or Connected Sheet URL is available.
  // 1. Fetch WGS_APS rows for 9 SuMkCs
  // 2. Fetch VERTICAL_STO benchmark rows (F&D marketing categories)
  // 3. clearSheetDataExceptHeaders_(sheet)
  // 4. appendRows_(sheet, mergedRows)
  throw new Error('Looker automation not configured — paste weekly data manually for v0');
}

function runValidationNow() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.SUMKC_TAB);
  const result = validateSuMkCData_(sheet);
  Logger.log(result.message);
  return result;
}
