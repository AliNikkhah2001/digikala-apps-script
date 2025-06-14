
// === BEGIN WAREHOUSE MODULE ================================================
/*  ▄█  Warehouse transfer layer
    -------------------------------------------------------------------------
    1. openTransferDialog()  -> sidebar listing all RAWDB rows whose
         - AE = "تایید"
         - service + partner valid        (cache lookup)
       Candidate rows are split into
         A) ticket NOT YET in Warehouse  (auto-selected & greyed)
         B) ticket already present       (user can Accept / Reject)
    2. User checks boxes, types password, clicks Transfer.
    3. Server‐side transferRows(selectedRows, pwHash)
         - verifies SHA-256 matches constant PW_HASH
         - re-validates row indices
         - copies data to WAREHOUSE sheet
         - deletes from RAWDB (descending order)
         - logs accepted tickets to TRANSFER_LOG sheet
---------------------------------------------------------------------------- */



/* ------------------------------------------------------------------ *
 *  Build candidate list                                               *
 *  – rows in RAWDB where                                              *
 *      • status  (AE) = "تایید"                                       *
 *      • service & partner valid                                      *
 *  – duplicate flag is true if:                                       *
 *      a) ticket already in Warehouse OR                              *
 *      b) ticket appears ≥2 times within RAWDB                        *
 * ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ *
 *  Build candidate list                                               *
 *  – rows in RAWDB where                                              *
 *      • status  (AE) = "تایید"                                       *
 *      • service & partner valid                                      *
 *  – duplicate flag is true if:                                       *
 *      a) ticket already in Warehouse OR                              *
 *      b) ticket appears ≥2 times within RAWDB                        *
 * ------------------------------------------------------------------ */


 /* ── Entry-point menu hook ─────────────────────────────────────────────── */
function openTransferDialog() {
  const tpl  = HtmlService.createTemplateFromFile('Transfer');
  tpl.candidates = JSON.stringify(buildTransferCandidates_());
  SpreadsheetApp.getUi()
    .showSidebar(tpl.evaluate().setTitle('Transfer to Warehouse').setWidth(520));
}

function buildTransferCandidates_() {
  const c   = cfg();
  const ss  = SpreadsheetApp.getActive();  
  const raw = ss.getSheetByName(c.RAWDB_SHEET);
  const wh   = (c.WAREHOUSE_FILE_ID
                 ? SpreadsheetApp.openById(c.WAREHOUSE_FILE_ID)
                 : ss).getSheetByName(c.WAREHOUSE_SHEET);

  /* tickets that already exist in Warehouse */
  const whTickets = new Set(
      safeCol_(wh, 2, c.TICKET_COL_IDX, wh.getLastRow() - 1)
        .map(String));

  /* lookup sets for service / partner validity */
  const svcSet = new Set(ss.getSheetByName(c.SERVICE_CACHE_SHEET)
                     .getRange('B:B').getValues().flat().filter(String));
  const wkrSet = new Set(ss.getSheetByName(c.WORKER_CACHE_SHEET)
                     .getRange('B:B').getValues().flat().filter(String));

  /* read RAWDB data block */
  const maxCol = Math.max(c.STATUS_COL_IDX, c.RAWDB_PARTNER_COL,
                          c.RAWDB_SERVICE_COL, c.TICKET_COL_IDX);
  const lastRow = raw.getLastRow();
  if (lastRow <= 1) return [];               // no data rows

  const data = raw.getRange(2, 1, lastRow - 1, maxCol).getValues();

  /* first pass: collect candidates and build frequency map */
  const ticketFreq = Object.create(null);
  const cand = [];

  data.forEach((row, i) => {
    const status  = (row[c.STATUS_COL_IDX - 1] || '')
                      .toString().replace(/[\u200c\u200f]/g, '').trim();
    if (status !== 'تایید') return;

    const ticket  = String(row[c.TICKET_COL_IDX - 1] || '').trim();
    const service = row[c.RAWDB_SERVICE_COL - 1];
    const partner = row[c.RAWDB_PARTNER_COL - 1];

    if (!ticket)        return;              // empty ticket → skip
    if (!svcSet.has(service))  return;       // invalid service
    if (!wkrSet.has(partner))  return;       // invalid partner

    cand.push({ idx: i + 2, ticket, service, partner });  // real row#
    ticketFreq[ticket] = (ticketFreq[ticket] || 0) + 1;
  });

  /* second pass: mark duplicates */
  cand.forEach(obj => {
    const dupInRaw = ticketFreq[obj.ticket] > 1;
    const dupInWh  = whTickets.has(obj.ticket);
    obj.duplicate  = dupInRaw || dupInWh;
  });

  return cand;
}
/* ── Server call: transfer selected rows --------------------------------- */
/**
 * payload = { rows:[rowIdx,…] , dupRows:[rowIdx,…] , pwHash:'' }
 *  - If dupRows.length === 0  → password check skipped, no log.
 *  - Only dupRows are written to TRANSFER_LOG.
 */
/**
 * payload = { rows:[rowIdx,…], dupRows:[rowIdx,…], pwHash:'' }
 * Progress is written to CacheService (0-100).
 * Only duplicate rows require password and are logged.
 */
function transferRows(payload) {
  const { rows, dupRows, pwHash } = payload;
  const needPw = dupRows.length > 0;
  const c = cfg();

  const key   = _transferProgKey();
  const cache = CacheService.getUserCache();
  cache.put(key, '0');                        // reset bar

  try {
    if (needPw && pwHash !== c.PW_HASH)
      throw new Error('Wrong password');

    const ss   = SpreadsheetApp.getActive();
    const raw  = ss.getSheetByName(c.RAWDB_SHEET);
    const wh   = (c.WAREHOUSE_FILE_ID
                 ? SpreadsheetApp.openById(c.WAREHOUSE_FILE_ID)
                 : ss).getSheetByName(c.WAREHOUSE_SHEET);
    const log  = dupRows.length
                 ? (ss.getSheetByName(c.TRANSFER_LOG_SHEET)
                    || ss.insertSheet(c.TRANSFER_LOG_SHEET))
                 : null;

    /* load existing tickets in warehouse once */
    const whTickets = new Set(
        safeCol_(wh, 2, c.TICKET_COL_IDX, wh.getLastRow()-1).map(String));

    /* sort descending so deleteRow is safe */
    rows.sort((a,b)=>b-a);

    const moved = [];
    const total = rows.length;

    rows.forEach((rn,idx)=>{
      const row = raw.getRange(rn, 1, 1, raw.getLastColumn()).getValues()[0];
      const ticket = String(row[c.TICKET_COL_IDX-1]||'');
      if (!ticket || whTickets.has(ticket)) return;   // skip true dup

      moved.push(row);
      whTickets.add(ticket);

      if (dupRows.includes(rn) && log)
        log.appendRow([new Date(), ticket, Session.getEffectiveUser().getEmail()]);

      raw.deleteRow(rn);

      if (idx % 5 === 0) {                     // update every 5 rows
        const pct = Math.round(((idx+1)/total)*100);
        cache.put(key, String(pct));
      }
    });

    if (moved.length)
      wh.getRange(wh.getLastRow()+1,1,moved.length,moved[0].length)
        .setValues(moved);

    cache.put(key, '100');
    return moved.length;                       // success
  } catch(e){
    cache.put(key, '-1');                      // signal failure
    throw e;                                   // bubble up to client
  }
}
// === END WAREHOUSE MODULE =================================================





