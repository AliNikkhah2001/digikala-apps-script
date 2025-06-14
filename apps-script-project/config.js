
class Config {
  constructor() {
    const doc = PropertiesService.getDocumentProperties().getProperties();
    Object.assign(this, Config.defaults, Config.cast_(doc));
  }
  save(obj) {
    const filtered = {};
    Object.keys(Config.defaults).forEach(k => {
      if (obj.hasOwnProperty(k)) filtered[k] = obj[k];
    });
    PropertiesService.getDocumentProperties().setProperties(filtered);
    Object.assign(this, Config.cast_(filtered));
  }
  static cast_(o) {
    const out = {};
    for (const [k,v] of Object.entries(o)) out[k] = /^\d+$/.test(v) ? +v : v;
    return out;
  }
}
Config.defaults = {
  /* -------- core sheet/file IDs -------- */
  RAWDB_SHEET:             'Partners',
  SERVICE_FILE_ID:        '15S1K6WPysm7-xIcBs1myP_F2deeHCRW5MENSSLDJvQE',
  WORKER_FILE_ID:         '1yYjRVD6Z7S9Zq-yV1h6F_DmJObiiWi1-rr8Jg4noCu4',
  SERVICE_SHEET_NAME:     'ServiceList',
  WORKER_SHEET_NAME:      'Workers',

  /* -------- column indices (1-based) -------- */
  SERVICE_NAME_COL_IDX:    2,
  SERVICE_PRICE_COL_IDX: 13 ,
  WORKER_NAME_COL_IDX:     2,
  SERVICE_ID_COL_IDX:      1,
  WORKER_ID_COL_IDX:       1,


  WORKER_NAME_COL:      3,   // column C
  WORKER_NATID_COL:    3,   // example → adjust to actual
  WORKER_PHONE_COL:    30,   // AD  = 30
  WORKER_ADDRESS_COL:  36,    // AJ  = 36



  /* -------- RAWDB columns -------- */
  RAWDB_SERVICE_COL:       10, // J
  RAWDB_PARTNER_COL:       12, // L
  RAWDB_SERVICE_ID_COL:    44, // AR
  RAWDB_PARTNER_ID_COL:    45, // AS

  /* -------- misc -------- */
  SERVICE_CACHE_SHEET:     '_SERVICE_CACHE',
  WORKER_CACHE_SHEET:      '_WORKER_CACHE',
  DROPDOWN_MAX_ROWS:       2000,
  ACTIVE_SERVICE_FILTERS: '[]',
  BACKUP_FOLDER_ID:       '1BtQYbuGSz4O3Qz9KsCd79CcPNws5qunK',
  MAX_BACKUP_COUNT:       10,

  WAREHOUSE_FILE_ID         : '1dFchMXH7DJUmVuXoTY5x1ey9IK_1UDpJuo6-jBAhTJU',  

  WAREHOUSE_COUNT_COL_IDX  : 11,   // K
WAREHOUSE_WORKER_COL_IDX : 12,   // L
};
/* ── CONFIG EXTENSIONS ─────────────────────────────────────────────────── */
Config.defaults = Object.assign({}, Config.defaults, {
  WAREHOUSE_SHEET        : 'WAREHOUSE',
  TRANSFER_LOG_SHEET     : '_TRANSFER_LOG',
  STATUS_COL_IDX         : 31,      // AE (تایید / لغو / نیاز به اصلاح)
  TICKET_COL_IDX         : 8,       // H
  PW_HASH                :          '1a1dc91c907325c69271ddf0c944bc72b05d9e5d36a7b0c'
                         +'83c2a12bb111a7cbb' // SHA-256("pass")
                             
});
