
/* ===================================================================== *
 *  openReport  –  sidebar listing RAWDB rows whose                      *
 *               • service name not in _SERVICE_CACHE                    *
 *               • partner name not in _WORKER_CACHE                     *
 * ===================================================================== */
function openReport() {
  const c  = cfg();
  const ss = SpreadsheetApp.getActive();
  const raw = ss.getSheetByName(c.RAWDB_SHEET);
  if (!raw) { SpreadsheetApp.getUi().alert('RAWDB sheet not found'); return; }

  /* cache look-up sets */
  const svcSet = new Set(
      ss.getSheetByName(c.SERVICE_CACHE_SHEET)
        .getRange('B:B').getValues().flat().filter(String));
  const wkrSet = new Set(
      ss.getSheetByName(c.WORKER_CACHE_SHEET)
        .getRange('B:B').getValues().flat().filter(String));

  /* scan RAWDB */
  const maxCol = Math.max(c.RAWDB_SERVICE_COL, c.RAWDB_PARTNER_COL);
  const rows = raw.getRange(2, 1, raw.getLastRow()-1, maxCol).getValues();

  const issues = [];   // [rowNumber , service , partner , problemText]
  rows.forEach((r,i)=>{
    const svc = r[c.RAWDB_SERVICE_COL-1];
    const wkr = r[c.RAWDB_PARTNER_COL-1];
    const probs = [];
    if (svc && !svcSet.has(svc)) probs.push('service');
    if (wkr && !wkrSet.has(wkr)) probs.push('partner');
    if (probs.length) issues.push([i+2, svc, wkr, probs.join(' & ')]);
  });

  /* pass data via meta tag */
  const html = HtmlService.createHtmlOutputFromFile('Report')
               .setTitle('RAWDB Consistency Report')
               .setWidth(600)
               .addMetaTag('data', JSON.stringify(issues));
  SpreadsheetApp.getUi().showSidebar(html);
}
