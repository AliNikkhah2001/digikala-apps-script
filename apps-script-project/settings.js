



/* ===================================================================== *
 *  openSettings  –  launches the sidebar with all editable constants    *
 * ===================================================================== */
/** Save settings + refresh cache + reapply dropdowns  (single call) */
function updateSettingsPipeline(obj) {
  const c = cfg();          // current config object
  c.save(obj);              // 1) persist
  refreshWorkerCache();     // 2) rebuild worker cache
  applyDropdownValidation();// 3) rebuild RAWDB dropdowns
  return 'ok';
}


 /** refresh local worker cache with current config  */
function refreshWorkerCache() {
  syncWorkerCache_(cfg());
}



function openSettings() {
  const tpl  = HtmlService.createTemplateFromFile('Settings'); // ← template
  const html = tpl.evaluate()                                  // ← evaluate tag
                .setWidth(380)
                .setTitle('Settings');
  SpreadsheetApp.getUi().showSidebar(html);
}
/* ========= remainder (ID generation, backup, etc.) unchanged ========= */
/* (… keep the rest of previously-supplied functions here)                */

/* progress-key helper */
function _progressKey(){
  const u=Session.getEffectiveUser().getEmail()||'anon';
  return 'SYNC_PROGRESS_'+u;
}
function getSyncProgress(){
  return +(CacheService.getUserCache().get(_progressKey())||'0');
}