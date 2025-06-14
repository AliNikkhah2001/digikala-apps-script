

/**
 * Testbench for _formatPersianNumber_
 * ───────────────────────────────────
 *  • Covers sub-1 000 values, 0, large numbers, numeric strings,
 *    and edge cases (null / undefined / '').
 *  • Uses Logger.log for simple reporting plus an assert helper.
 */
/**  Simple ES5 testbench for _formatPersianNumber_  */
Logger.log(_formatPersianNumber_(88));   // should log ۸۸
function test_formatPersianNumber() {

  // expected Persian strings (thousands sep = '٬')
  var cases = [
    { input: 0,           expect: '۰' },
    { input: 5,           expect: '۵' },
    { input: 88,          expect: '۸۸' },
    { input: 999,         expect: '۹۹۹' },
    { input: 1000,        expect: '۱٬۰۰۰' },
    { input: 73456,       expect: '۷۳٬۴۵۶' },
    { input: 3792,        expect: '۳٬۷۹۲' },
    { input: 2587986,     expect: '۲٬۵۸۷٬۹۸۶' },
    { input: '292',       expect: '۲۹۲' },          // string
    { input: '8750',      expect: '۸٬۷۵۰' },        // string
    { input: null,        expect: '' },
    { input: undefined,   expect: '' },
    { input: '',          expect: '' }
  ];

  var fails = 0;
  for (var i = 0; i < cases.length; i++) {
    var val = cases[i].input;
    var exp = cases[i].expect;
    var out = _formatPersianNumber_(val);

    Logger.log('#%02d | in: %-10s → out: %-12s | expect: %-12s %s',
               i, JSON.stringify(val), out, exp,
               (out === exp ? '✓' : '✗'));

    if (out !== exp) fails++;
  }

  if (fails) {
    throw new Error(fails + ' test case(s) failed');
  } else {
    Logger.log('ALL tests passed ✔');
  }
}

/* Helper assert; not strictly necessary but handy for more tests */
function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Assertion failed'}\n   expected: ${expected}\n   actual:   ${actual}`);
  }
}
function debugTransferScan() {
  const c   = cfg();
  const ss  = SpreadsheetApp.getActive();
  const raw = ss.getSheetByName(c.RAWDB_SHEET);
  if (!raw) { Logger.log('RAWDB not found'); return; }

  const maxCol = Math.max(c.STATUS_COL_IDX, c.RAWDB_PARTNER_COL,
                          c.RAWDB_SERVICE_COL, c.TICKET_COL_IDX);
  const data = (raw.getLastRow() > 1)
             ? raw.getRange(2,1,raw.getLastRow()-1,maxCol).getValues()
             : [];
  Logger.log(`Total data rows: ${data.length}`);

  const norm = s => s.toString().replace(/[\u200c\u200f]/g,'').trim();
  let statusOk=0, svcOk=0, wkrOk=0, pass=0;

  const svcSet = new Set(ss.getSheetByName(c.SERVICE_CACHE_SHEET)
                     .getRange('B:B').getValues().flat().filter(String));
  const wkrSet = new Set(ss.getSheetByName(c.WORKER_CACHE_SHEET)
                     .getRange('B:B').getValues().flat().filter(String));

  data.forEach(row=>{
    const status = norm(row[c.STATUS_COL_IDX-1]);
    const svc    = row[c.RAWDB_SERVICE_COL-1];
    const wkr    = row[c.RAWDB_PARTNER_COL-1];

    if (status === 'تایید') statusOk++;
    if (svcSet.has(svc))    svcOk++;
    if (wkrSet.has(wkr))    wkrOk++;
    if (status === 'تایید' && svcSet.has(svc) && wkrSet.has(wkr)) pass++;
  });

  Logger.log(`Status == تایید .......... ${statusOk}`);
  Logger.log(`Service in cache ........ ${svcOk}`);
  Logger.log(`Partner in cache ........ ${wkrOk}`);
  Logger.log(`Rows passing all gates .. ${pass}`);
}








function debugConfigAndIDs() {
  const c = cfg();
  Logger.log('--- Config dump ---');
  Object.entries(c).forEach(([k,v]) => {
    Logger.log(`${k}: ${v}`);
  });

  const toTest = [
    ['ServiceList', c.SERVICE_FILE_ID, c.SERVICE_SHEET_NAME],
    ['WorkerList',  c.WORKER_FILE_ID,  c.WORKER_SHEET_NAME],
    ['Warehouse',   c.WAREHOUSE_FILE_ID, c.WAREHOUSE_SHEET],
  ];
  toTest.forEach(([label, fileId, sheetName]) => {
    if (!fileId) {
      Logger.log(`${label}: fileId is empty`);
      return;
    }
    try {
      const ss = SpreadsheetApp.openById(fileId);
      const sheets = ss.getSheets().map(s=>s.getName());
      Logger.log(`${label} open OK; sheets: ${sheets.join(', ')}`);
      if (!ss.getSheetByName(sheetName)) {
        Logger.log(`  >> Sheet "${sheetName}" NOT found in ${label}`);
      } else {
        Logger.log(`  >> Sheet "${sheetName}" exists`);
      }
    } catch (e) {
      Logger.log(`${label} openById FAILED: ${e.message}`);
    }
  });
} 
function debugPivot1() {
  const c = cfg();

  // 1️⃣ Log the raw config values
  Logger.log('Config.SERVICE_NAME_COL_IDX:  ' + c.SERVICE_NAME_COL_IDX);
  Logger.log('Config.SERVICE_PRICE_COL_IDX: ' + c.SERVICE_PRICE_COL_IDX);

  // 2️⃣ Open ServiceList sheet and inspect its dimensions
  const svcSh = SpreadsheetApp.openById(c.SERVICE_FILE_ID)
                    .getSheetByName(c.SERVICE_SHEET_NAME);
  if (!svcSh) {
    Logger.log('ERROR: ServiceList sheet "' + c.SERVICE_SHEET_NAME + '" not found');
    return;
  }
  const lastRow = svcSh.getLastRow();
  Logger.log('ServiceList lastRow: ' + lastRow);

  // 3️⃣ Compute the number of columns we’re about to request
  const nameColIdx  = Number(c.SERVICE_NAME_COL_IDX)  || 0;
  const priceColIdx = Number(c.SERVICE_PRICE_COL_IDX) || 0;
  const numCols     = Math.max(nameColIdx, priceColIdx);
  Logger.log('Computed numCols = max(' + nameColIdx + ',' + priceColIdx + ') = ' + numCols);

  // 4️⃣ Sanity check
  if (numCols < 1) {
    Logger.log('ERROR: numCols < 1. Cannot call getRange with width ' + numCols);
    return;
  }
  if (lastRow < 2) {
    Logger.log('ERROR: Not enough rows in ServiceList (lastRow=' + lastRow + ')');
    return;
  }

  // 5️⃣ Finally, attempt the range read
  try {
    const vals = svcSh.getRange(2, 1, lastRow - 1, numCols).getValues();
    Logger.log('Successfully read priceRows: ' + vals.length + '×' + (vals[0]||[]).length);
  } catch (e) {
    Logger.log('Exception in getRange: ' + e.message);
  }
}
function debugPivot() {
  const c = cfg();
  const uiLog = [];

  // 1) Build priceMap
  const svcSh = SpreadsheetApp.openById(c.SERVICE_FILE_ID)
                    .getSheetByName(c.SERVICE_SHEET_NAME);
  const svcRows = svcSh.getRange(
    2, 1, svcSh.getLastRow()-1,
    Math.max(c.SERVICE_NAME_COL_IDX, c.SERVICE_PRICE_COL_IDX)
  ).getValues();
  const priceMap = {};
  svcRows.forEach(r => {
    const name = (r[c.SERVICE_NAME_COL_IDX-1]||'').toString().trim();
    const price = +r[c.SERVICE_PRICE_COL_IDX-1]||0;
    if (name) priceMap[name] = price;
  });
  uiLog.push(`priceMap keys (${Object.keys(priceMap).length}): ${Object.keys(priceMap).slice(0,5).join(', ')}${Object.keys(priceMap).length>5?'...':''}`);

  // 2) Read Warehouse
  const wh = SpreadsheetApp.getActive().getSheetByName(c.WAREHOUSE_SHEET);
  if (!wh) return Logger.log('WAREHOUSE sheet "'+c.WAREHOUSE_SHEET+'" not found');
  const nRows = wh.getLastRow()-1;
  uiLog.push(`Warehouse rows (excluding header): ${nRows}`);
  if (nRows <= 0) return Logger.log('No data rows in Warehouse.');

  const maxCol = Math.max(
    c.RAWDB_SERVICE_COL,
    c.WAREHOUSE_WORKER_COL_IDX,
    c.WAREHOUSE_COUNT_COL_IDX
  );
  const data = wh.getRange(2,1,nRows,maxCol).getValues();

  // 3) Aggregate services & workers
  const services = new Set(), workers = new Set(), tally = {};
  data.forEach(r=>{
    const svc = r[c.RAWDB_SERVICE_COL-1];
    const wkr = r[c.WAREHOUSE_WORKER_COL_IDX-1];
    const cnt = +r[c.WAREHOUSE_COUNT_COL_IDX-1]||0;
    if (!svc||!wkr||cnt===0) return;
    services.add(svc); workers.add(wkr);
    tally[wkr]=tally[wkr]||{};
    tally[wkr][svc]=(tally[wkr][svc]||0)+cnt;
  });
  uiLog.push(`Detected services: ${services.size}, workers: ${workers.size}`);
  Logger.log(uiLog.join('\n'));

  if (!services.size) return Logger.log('No services with counts > 0.');

  const svcArr = [...services].sort();
  const wkrArr = [...workers].sort();

  // 4) Build header and rows
  const header = ['نام پارتنر', ...svcArr, 'جمع تعداد', 'جمع مبلغ'];
  Logger.log(`Header length: ${header.length}`);
  Logger.log(`Header: ${JSON.stringify(header)}`);

  const table = [header];
  const colCnt = Array(svcArr.length).fill(0);
  const colPrice = Array(svcArr.length).fill(0);
  let grand=0;

  wkrArr.forEach(w=>{
    const cntCells=[], priceCells=[];
    let rowCnt=0, rowSum=0;
    svcArr.forEach((s,j)=>{
      const cnt = tally[w]?.[s]||0;
      const price = cnt * (priceMap[s]||0);
      cntCells.push(cnt||'');
      priceCells.push(price?price.toLocaleString():'');
      colCnt[j]+=cnt; colPrice[j]+=price;
      rowCnt+=cnt; rowSum+=price;
    });
    table.push([w, ...cntCells, rowCnt||'', rowSum?rowSum.toLocaleString():'']);
    table.push(['مبلغ', ...priceCells, '', '']);
    grand += rowSum;
  });
  table.push(['جمع سرویس', ...colCnt, '', '']);
  table.push(['جمع مبلغ', ...colPrice.map(v=>v?v.toLocaleString():''), '', grand?grand.toLocaleString():'']);

  // 5) Log each row length
  table.forEach((row, idx)=>{
    Logger.log(`Row ${idx} length: ${row.length}`);
  });

  Logger.log(`Total rows to write: ${table.length}`);
}


 


