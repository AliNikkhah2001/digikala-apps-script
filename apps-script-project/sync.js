

/* ─── Progress helpers (per-user) ─────────────────────────────────── */
function _transferProgKey() {
  const user = Session.getEffectiveUser().getEmail() || 'anon';
  return 'TRANSFER_PROGRESS_' + user;
}
function getTransferProgress() {
  return +(CacheService.getUserCache().get(_transferProgKey()) || '0');
}

/**
 * Return a flat array of values or [] if the sheet section is empty.
 * rowCount may be zero; in that case nothing is read.
 */
function safeCol_(sh, row, col, rowCount) {
  if (rowCount <= 0) return [];
  return sh.getRange(row, col, rowCount, 1).getValues().flat();
}



/** Pull [ID , Name] rows from any external sheet                  */
function fetchRef_(fileId, sheetName, idCol, nameCol) {
  const sh = SpreadsheetApp.openById(fileId).getSheetByName(sheetName);
  if (!sh) throw new Error(`Sheet "${sheetName}" not found in file ${fileId}`);
  const last = sh.getLastRow();
  const ids   = sh.getRange(2, idCol,   last - 1, 1).getValues();
  const names = sh.getRange(2, nameCol, last - 1, 1).getValues();
  return names
        .map((n, i) => [ids[i][0], n[0]])
        .filter(r => r[0] !== '' && r[1] !== '');
}

/** Write array → a local hidden cache sheet                        */
function writeCache_(cacheSheetName, arr) {
  const sh = getOrCreate_(cacheSheetName);
  sh.clear();
  if (arr.length) sh.getRange(1, 1, arr.length, 2).setValues(arr);
  sh.hideSheet();
}

/** Create sheet if absent                                           */
function getOrCreate_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
/* --- global accessor --- */
function cfg(){ return new Config(); }
/* ===================================================================== *
 *  applyDropdownValidation                                              *
 *  - builds service / partner drop-downs in RAWDB                       *
 * ===================================================================== */
function applyDropdownValidation() {
  const c  = cfg();                                 // merged config
  const ss = SpreadsheetApp.getActive();
  const raw = ss.getSheetByName(c.RAWDB_SHEET);
  if (!raw) {
    SpreadsheetApp.getUi().alert(`Sheet "${c.RAWDB_SHEET}" not found`);
    return;
  }

  const svcCache = ss.getSheetByName(c.SERVICE_CACHE_SHEET);
  const wkrCache = ss.getSheetByName(c.WORKER_CACHE_SHEET);
  if (!svcCache || !wkrCache) {
    SpreadsheetApp.getUi().alert(
      'Local cache sheets missing.\nRun “Sync Reference Lists” first.');
    return;
  }

  // ----- build validation rule for services -----
  const svcRange = svcCache.getRange(1, 2, svcCache.getLastRow(), 1); // names col
  const svcRule = SpreadsheetApp.newDataValidation()
       .requireValueInRange(svcRange, true)
       .setHelpText('Choose a service from list')
       .setAllowInvalid(false)
       .build();

  // ----- for workers -----
  const wkrRange = wkrCache.getRange(1, 2, wkrCache.getLastRow(), 1);
  const wkrRule = SpreadsheetApp.newDataValidation()
       .requireValueInRange(wkrRange, true)
       .setHelpText('Choose a partner from list')
       .setAllowInvalid(false)
       .build();

  // ----- apply to RAWDB columns -----
  raw.getRange(2, c.RAWDB_SERVICE_COL, c.DROPDOWN_MAX_ROWS)
      .setDataValidation(svcRule);
  raw.getRange(2, c.RAWDB_PARTNER_COL, c.DROPDOWN_MAX_ROWS)
      .setDataValidation(wkrRule);

  SpreadsheetApp.getActive().toast('Dropdowns refreshed', 'RAWDB');
}

/* ================= sync tables ================= */
function syncAllReferenceTablesWithUi() {
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutputFromFile('Progress')
      .setTitle('Syncing …').setWidth(300));
  SpreadsheetApp.flush();
  Utilities.sleep(200);
  _syncWork_();  // heavy task
}

function _syncWork_(){
  const cache = CacheService.getUserCache(); const key=_progressKey();
  cache.put(key,'0');
  const c = cfg();
  cache.put(key,'5');   syncServiceCache_(c); cache.put(key,'50');
  syncWorkerCache_(c);  cache.put(key,'100');
}

function syncServiceCache_(c){
  const arr = fetchRef_(c.SERVICE_FILE_ID,c.SERVICE_SHEET_NAME,
                        c.SERVICE_ID_COL_IDX,c.SERVICE_NAME_COL_IDX);
  writeCache_(c.SERVICE_CACHE_SHEET,arr);
}
function syncWorkerCache_(c){
  const ss = SpreadsheetApp.openById(c.WORKER_FILE_ID);
  const sh = ss.getSheetByName(c.WORKER_SHEET_NAME);
  if(!sh) throw new Error('Workers sheet not found');

  const last = sh.getLastRow();
  const start=c.WORKER_CATEGORY_START_COL_IDX, end=c.WORKER_CATEGORY_END_COL_IDX;
  const header = sh.getRange(2,start,1,end-start+1).getValues()[0]
                 .map(h=>typeof h==='string'?h.trim():h);
  const active = JSON.parse(c.ACTIVE_SERVICE_FILTERS||'[]');
  const activeRelIdx = header
       .map((name,i)=>active.includes(name)?i:-1).filter(i=>i>=0);

  const names = sh.getRange(2, c.WORKER_NAME_COL_IDX, last-1,1).getValues();
  const ids   = sh.getRange(2, c.WORKER_ID_COL_IDX,   last-1,1).getValues();
  const flags = sh.getRange(2, start, last-1, end-start+1).getValues();

  const out=[];
  for(let r=0;r<names.length;r++){
    const name=names[r][0]; if(!name) continue;
    let pass=true;
    if(activeRelIdx.length){
      pass = activeRelIdx.some(rel => flags[r][rel]===true);
    }
    if(pass) out.push([ids[r][0],name]);
  }
  writeCache_(c.WORKER_CACHE_SHEET,out);
}

/* ===== helper for categories to sidebar ===== */
function getWorkerCategories(){
  const c=cfg();
  const sh=SpreadsheetApp.openById(c.WORKER_FILE_ID)
            .getSheetByName(c.WORKER_SHEET_NAME);
  if(!sh) return [];
  const start=c.WORKER_CATEGORY_START_COL_IDX,
        end  =c.WORKER_CATEGORY_END_COL_IDX;
  const header=sh.getRange(2,start,1,end-start+1).getValues()[0]
               .map(h=>typeof h==='string'?h.trim():h)
               .filter(Boolean);
  return header;
}