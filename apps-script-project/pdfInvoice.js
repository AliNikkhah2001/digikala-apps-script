/** 
 * Auto-Invoice Suite – Google Apps Script (فارسی + شمسی)
 * ---------------------------------------------------------------------------
 * 2025-06-12 | Tehran
 *
 * Δ Revision: Styling & Locale polishing (persian digits everywhere)
 * ---------------------------------------------------------------------------
 *   • Font sizes: default 14 px; first column & summary rows 16 px.
 *   • All numbers (counts, prices, dates) converted to Persian digits.
 *   • Center-aligned text in all generated sheets.
 *   • Each appended data row gets a 1-px black border.
 *   • Summation rows: bold + 16 px.
 *   • Pivot styling updated (bold borders, alternating shades, center).
 *   • External footers:
 *       – Single invoices: rows 1-2 from sheet 1nEIJ… (gid 1930259084)
 *       – Batched invoices: rows 1-10 from sheet 1bWlP… (gid 1771296527)
 * ---------------------------------------------------------------------------
 */


/* =========================================================================
 * UI – sidebar dialog
 * ========================================================================= */
function openInvoiceDialog(){
  const tpl=HtmlService.createTemplateFromFile('InvoiceDialog');
  tpl.pivot=JSON.stringify(SpreadsheetApp.getActive().getSheetByName('BatchedInvoice').getDataRange().getValues());
  SpreadsheetApp.getUi().showSidebar(tpl.evaluate().setTitle('Select Invoice Items').setWidth(1000));
}

/** cache keys: PAYLOAD, PRCODE, ORDER */
function prepareInvoiceBatch(payload, prCode){
  const cache = CacheService.getScriptCache();
  cache.put('PAYLOAD', JSON.stringify(payload), 3600);
  cache.put('PRCODE',  prCode,                3600);
  const order = [...new Set(payload.table.map(e=>e.person))];
  cache.put('ORDER',   JSON.stringify(order),  3600);
  return order.length;
}

function generateSingleWorkerPDF(idx){
  const cache = CacheService.getScriptCache();
  const payload = JSON.parse(cache.get('PAYLOAD'));
  const prCode  = cache.get('PRCODE');
  const order   = JSON.parse(cache.get('ORDER'));
  const person  = order[idx];

  const now  = new Date();
  const fa   = _formatJalaliDate_(now);
  const stem = 'PR'+prCode+'-'+Utilities.formatDate(now,'UTC','yyyyMMdd');
  const root = _ensureFolderNested_(['Digikala','AutoInvoice','Invoices','PR',prCode]);
  const total= payload.table.filter(t=>t.person===person)
                            .reduce(function(s,t){return s+(+t.value||0);},0);

  generateSingleWorkerInvoice(
      person,
      payload.table,
      prCode,
      total,
      fa,
      stem+'-'+Utilities.formatString('%02d', idx+1),
      root);
}




/* =========================================================================
 * Entry – user clicks «Generate Invoice»
 * ========================================================================= */
function processInvoiceSelection(payload){
  const {table,penalties,prCode}=payload;
  const now=new Date();
  const faDate=_formatJalaliDate_(now);
  const invoiceStem=`PR${prCode}-${Utilities.formatDate(now,'UTC','yyyyMMdd')}`;

  const order=[...new Set(table.map(e=>e.person))];
  const amounts=_getAmountsFromPivot_(order);
  const root=_ensureFolderNested_(['Digikala','AutoInvoice','Invoices',`PR`,prCode]);

  generateAllSingleWorkerInvoices(order,table,prCode,amounts,faDate,invoiceStem,root);
  showProgress(1, 3, '📄 Summary PDF');     // after createBatchedInvoicePdf

  createBatchedInvoicePdf(order,amounts,penalties,prCode,faDate,invoiceStem,root);
showProgress(2, 3, '📄 Pivot export');     // after generatePivotSnapshot

  generatePivotSnapshot(prCode,root);
  showProgress(3, 3, '✅ Finished');         // when everything is done
  //_moveInvoicedTasks_(table,prCode,invoiceStem,faDate);
}

/* =========================================================================
 * Pivot helpers
 * ========================================================================= */
function _getAmountsFromPivot_(order){
  const bi=SpreadsheetApp.getActive().getSheetByName('BatchedInvoice');
  const rows=bi.getDataRange().getValues();
  const out={};
  for(let r=1;r<rows.length;r+=2){
    const name=rows[r][0];
    if(!order.includes(name)) continue;
    out[name]=+rows[r][rows[r].length-1].toString().replace(/,/g,'')||0;
  }
  return out;
}

/* =========================================================================
 * Common style util
 * ========================================================================= */
function _centerBorder_(rng){
  rng.setHorizontalAlignment('center')
     .setBorder(true,true,true,true,true,true,'black',SpreadsheetApp.BorderStyle.SOLID)
}

/* =========================================================================
 * 1) Single-worker invoices
 * ========================================================================= */
function generateAllSingleWorkerInvoices(order, table, prCode,
                                         amounts, faDate, stem, root) {

  var total = order.length;
  for (var i = 0; i < total; i++) {
    var worker = order[i];
    generateSingleWorkerInvoice(
      worker, table, prCode, amounts[worker] || 0, faDate,
      stem + '-' + Utilities.formatString('%02d', i + 1), root);

    showProgress(i + 1, total, '📄 Generating PDFs');  // <- progress toast
  }

  // optional final notification
  SpreadsheetApp.getActive().toast('✅ All ' + total + ' invoices generated',
                                   'Done', 5);
}

function generateSingleWorkerInvoice(worker, table, prCode, amount,
                                     faDate, invoiceNo, root) {
  const tpl = '1P5xvjR0qz0xV7k3B4BMVGEZQiuN8vjOWkG8PRLCGUYE';

  const sh = SpreadsheetApp.openById(
               DriveApp.getFileById(tpl)
                       .makeCopy(`${prCode}-${worker}`, root).getId()
             ).getSheets()[0];

  /* ── helper ─────────────────────────────────────────────────────────── */
  const setM = function (rng, val) {
    if (rng.isPartOfMerge()) rng.getMergedRanges().forEach(function (m) { m.breakApart(); });
    rng.merge(); rng.getCell(1, 1).setValue(val);
  };

  /* ── header fields ──────────────────────────────────────────────────── */
  //setM(sh.getRange('C2:F2'), prCode);       // PR code
  setM(sh.getRange('L1:M1'), faDate);       // date
  setM(sh.getRange('L2:M2'), invoiceNo);    // invoice number (moved to row-3 to avoid clash)
  setM(sh.getRange('C4:H4'), worker);       // worker name

  /* ----- look-up national-ID, phone, address from Workers sheet -------- */
  var c = cfg();            // assume these indices exist
  var workersSS  = SpreadsheetApp.openById(c.WORKER_FILE_ID);
  var workersSh  = workersSS.getSheetByName(c.WORKER_SHEET_NAME);
  var workersDat = workersSh.getDataRange().getValues();

  var nid     = '';   // national ID
  var phone   = '';   // telephone
  var address = '';   // address

  for (var r = 1; r < workersDat.length; r++) {          // skip header
    if ((workersDat[r][c.WORKER_NAME_COL - 1] || '').toString().trim() === worker) {
      nid     = workersDat[r][c.WORKER_NATID_COL - 1]   || '';
      phone   = workersDat[r][c.WORKER_PHONE_COL - 1]   || '';
      address = workersDat[r][c.WORKER_ADDRESS_COL - 1] || '';
      break;
    }
  }

  setM(sh.getRange('L4:M4'), nid);          // national-ID
  setM(sh.getRange('B6:F6'), phone);        // phone (merged)
  setM(sh.getRange('A5:M5'), address);      // full-width address

  /* ── invoice body ───────────────────────────────────────────────────── */
  var tasks = table.filter(function (t) { return t.person === worker; });
  var row   = 14, total = 0;

  tasks.forEach(function (t, i) {
    sh.getRange('A' + row).setValue(_toPersianDigits_(i + 1));
    setM(sh.getRange('B' + row + ':C' + row), t.prNumber);
    setM(sh.getRange('D' + row + ':G' + row), t.taskName);
    sh.getRange('H' + row).setValue(_formatPersianNumber_(t.taskCount));
    sh.getRange('I' + row).setValue(t.unit);

    var val = +t.value || 0;
    total  += val;
    setM(sh.getRange('J' + row + ':K' + row), _formatPersianNumber_(val));

    _centerBorder_(sh.getRange('A' + row + ':K' + row));
    sh.getRange('A' + row + ':K' + row).setFontSize(14);
    row++;
  });

  /* total row */
  setM(sh.getRange('J' + row + ':K' + row), _formatPersianNumber_(total));
  sh.getRange('A' + row + ':K' + row).setFontWeight('bold').setFontSize(16);
  _centerBorder_(sh.getRange('A' + row + ':K' + row));

  /* external footer rows 1-2 */
  var footer = SpreadsheetApp.openById('1nEIJnSbxvZ817S8IXAD2LH6gJLGsCmzlmf4m6WQX6Bg')
                 .getSheets()[0].getRange('A1:M2').getValues();
  sh.getRange(row + 1, 1, footer.length, footer[0].length)
    .setValues(footer).setHorizontalAlignment('center').setFontSize(14);
  _centerBorder_(sh.getRange(row + 1, 1, footer.length, footer[0].length));

  /* sheet-wide tweaks */
  var lastR = sh.getLastRow(), lastC = sh.getLastColumn();
  sh.getRange(1, 1, lastR, lastC).setHorizontalAlignment('center').setFontSize(14);
  sh.getRange(1, 1, lastR, 1).setFontSize(16);

  SpreadsheetApp.flush();
  localiseDigits(sh);

  /* export PDF */
  root.createFile(
    sh.getParent().getAs('application/pdf')
      .setName(worker + '–' + prCode + '.pdf')
  );
}

/* =========================================================================
 * 2) Batched invoice
 * ========================================================================= */
function createBatchedInvoicePdf(order,amounts,penalties,prCode,faDate,stem,root){
  const tpl='1P5rGJPHKwHGCKcwUgOClnnuZ-e9Trjh7_9mR1MA2wD4';
  const sh=SpreadsheetApp.openById(
             DriveApp.getFileById(tpl).makeCopy(`${prCode}`,root).getId()
           ).getSheets()[0];
  const setM=(r,v)=>{ if(r.isPartOfMerge()) r.getMergedRanges().forEach(m=>m.breakApart()); r.merge(); r.getCell(1,1).setValue(v); };

  setM(sh.getRange('C2:F2'),`PR ${prCode}`);
  setM(sh.getRange('H2:I2'),faDate);
  setM(sh.getRange('H3:I3'),stem);

  let row=18,total=0;
  order.forEach((name,i)=>{
    const amt=amounts[name]||0;
    sh.getRange(`A${row}`).setValue(_toPersianDigits_(i+1));
    setM(sh.getRange(`B${row}:E${row}`),name);
    sh.getRange(`G${row}`).setValue(faDate);
    sh.getRange(`I${row}`).setValue(_formatPersianNumber_(amt));
    _centerBorder_(sh.getRange(`A${row}:I${row}`));
    sh.getRange(`A${row}:I${row}`).setFontSize(14);
    total+=amt; row++;
  });

  const totalPenalty=Object.values(penalties).reduce((s,v)=>s+(+v||0),0);
  const net=total-totalPenalty;

  [['مجموع',total],['جریمه',totalPenalty],['قابل پرداخت',net]]
    .forEach((pair,idx)=>{
      const r=row+idx;
      sh.getRange(`H${r}`).setValue(pair[0]);
      sh.getRange(`I${r}`).setValue(_formatPersianNumber_(pair[1]));
      _centerBorder_(sh.getRange(`A${r}:I${r}`));
      sh.getRange(`A${r}:I${r}`).setFontWeight('bold').setFontSize(16);
    });

  /* external footer rows 1-10 */
  const ext=SpreadsheetApp.openById('1bWlPcOwIBLjE_T4mAP5bEu63fGL8f7ENSeDojs8COn4')
            .getSheets()[0].getRange('A1:I10').getValues();
  const start=row+3;
  sh.getRange(start,1,ext.length,ext[0].length)
    .setValues(ext).setHorizontalAlignment('center').setFontSize(14);
  _centerBorder_(sh.getRange(start,1,ext.length,ext[0].length));

  /* sheet-wide alignment / font */
  const lastR=sh.getLastRow(), lastC=sh.getLastColumn();
  sh.getRange(1,1,lastR,lastC).setHorizontalAlignment('center').setFontSize(14);
  sh.getRange(1,1,lastR,1).setFontSize(16);          // first column
  sh.getRange(1,lastC-1,1,2).setFontSize(16);        // first row last two cols
  sh.getRange(lastR-1,1,2,lastC).setFontSize(16);    // last two rows

  SpreadsheetApp.flush();
  localiseDigits(sh);   

  root.createFile(sh.getParent().getAs('application/pdf')
         .setName(`${prCode}.pdf`));
}



/* =========================================================================
 * 4) Pivot snapshot (sheet + PDF)
 * ========================================================================= */
function generatePivotSnapshot(prCode,root){
  const src=SpreadsheetApp.getActive();
  const p=src.getSheetByName('BatchedInvoice');
  localiseDigits(p);  
  if(!p) throw new Error('BatchedInvoice not found');
  const tmp=SpreadsheetApp.create(`Pivot-${prCode}`);
  const cp=p.copyTo(tmp).setName('Pivot');
  tmp.getSheets().forEach(s=>{ if(s.getSheetId()!==cp.getSheetId()) tmp.deleteSheet(s); });
  SpreadsheetApp.flush();
  localiseDigits(tmp);   
  root.createFile(tmp.getBlob().setName(`Pivot–${prCode}.pdf`));
}

/* =========================================================================
 * Warehouse / Drive helpers
 * ========================================================================= */
function _moveInvoicedTasks_(entries,prCode,invoiceNo,dateStr){
  const c=cfg();
  const whS=SpreadsheetApp.openById(c.WAREHOUSE_FILE_ID);
  const wh=whS.getSheetByName(c.WAREHOUSE_SHEET);
  const cache=whS.getSheetByName('Cache')||whS.insertSheet('Cache');

  const data=wh.getDataRange().getValues();
  const mv=[];
  entries.forEach(({person,service})=>{
    for(let r=1;r<data.length;r++){
      if(data[r][c.WAREHOUSE_WORKER_COL_IDX-1]===person &&
         data[r][c.RAWDB_SERVICE_COL-1]===service){
        mv.push([data[r],r+1]);
      }
    }
  });
  if(!mv.length) return;
  const out=mv.map(t=>[...t[0],prCode,dateStr,invoiceNo]);
  cache.getRange(cache.getLastRow()+1,1,out.length,out[0].length).setValues(out);
  mv.map(t=>t[1]).sort((a,b)=>b-a).forEach(r=>wh.deleteRow(r));
  generateBatchedInvoice();
}

/* Nested folder creator */
function _ensureFolderNested_(arr){
  let p=DriveApp.getRootFolder();
  arr.forEach(name=>{
    const f=p.getFoldersByName(name);
    p=f.hasNext()?f.next():p.createFolder(name);
  });
  return p;
}