/* ===================================================================== *
 *  generateBatchedInvoice()                                             *
 *  - Creates / clears "BatchedInvoice" sheet in active file             *
 *  - Pivot-sums Warehouse:  count tasks per (partner, service)          *
 *  - Multiplies by price from ServiceList                               *
 *  - Writes two rows per partner: count + price                         *
 *  - Adds column totals, row totals, grand total                        *
 * ===================================================================== */
/* ===================================================================== *
 *  generateBatchedInvoice                                               *
 *  -------------------------------------------------------------------- *
 *  • Reads Warehouse sheet (worker-name col, service-name col, count col)
 *  • Uses ServiceList!M for unit price                                   *
 *  • Builds a two-row-per-worker pivot:  counts  +  price (count×unit)   *
 *  • Adds column totals, row totals, grand total                         *
 *  • Clones the template spreadsheet (INVOICE_TEMPLATE_FILE_ID) and      *
 *    writes values there, preserving all formats                        *
 * ===================================================================== */
/* ===================================================================== *
 *  generateBatchedInvoice  –  no-template version                       *
 * ===================================================================== */
/**
 * generateBatchedInvoice
 * • Reads Warehouse!K (order count), Warehouse!L (worker name), Warehouse service column
 * • Uses ServiceList!M as unit price
 * • Builds a two-row-per-worker pivot (counts + price)
 * • Appends per-service and grand totals
 * • Writes into (or creates) “BatchedInvoice” sheet in the current spreadsheet
 */
/**
 * generateBatchedInvoice
 * • Builds the pivot in “BatchedInvoice” (counts + price)
 * • Then styles:
 *   – First row & first column bold with gray background  
 *   – Uniform row height & column width for entire table
 */
/* =========================================================================
 * 3) Pivot rebuild & styling
 * ========================================================================= */
/* =========================================================================
 *  Pivot: helper to append unit-price row at bottom
 * ========================================================================= */
function _appendUnitPriceRow_(sheet, priceMap){
  const lastRow = sheet.getLastRow() + 1;
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const rowVals = headers.map((h,idx)=> idx===0 ? 'قیمت واحد' : (priceMap[h]!==undefined ? (priceMap[h]) : ''));
  sheet.getRange(lastRow,1,1,rowVals.length).setValues([rowVals]);
}
function _insertServicePriceRow_(sh, priceMap){
    //Logger.log(priceMap)
  // Append price row
  const lastRow = sh.getLastRow() + 1;
  const header  = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

  const row = header.map((col, idx) => {
    if (idx === 0) return 'قیمت واحد';          // label in first column
    const price = priceMap[col];                // lookup by service name
    return price !== undefined ? (price) : '';
  });

  sh.getRange(lastRow, 1, 1, row.length).setValues([row]);
}
function _stylePivotSheet_(sh){
  const r=sh.getLastRow(), c=sh.getLastColumn();
  sh.getRange(1,1,r,c).setHorizontalAlignment('center').setFontSize(14);
  sh.getRange(1,1,r,1).setFontSize(16);
  sh.getRange(1,c-1,1,2).setFontSize(16);
  sh.getRange(r-1,1,2,c).setFontSize(16);
  sh.getRange(1,1,r,c)
    .setBorder(true,true,true,true,true,true,'black',SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  for(let i=1;i<=r;i++){
    const bg=(Math.floor((i-1)/2)%2===0)?'#dbdbdb':'#f5f5f5';
    sh.getRange(i,1,1,c).setBackground(bg);
  }
}
function _convertNumbersToPersian_(sh){
  // Convert every ASCII digit in every cell to its Persian counterpart
  const rng  = sh.getDataRange();

  const vals = rng.getValues().map(row =>
    row.map(cell => {
      if (cell === '' || cell === null) return cell;          // leave blanks alone
      return  _formatPersianNumber_(String(cell));
    })
  );
  
  rng.setValues(vals);
}
/**
 * Loop over every cell of `sheet` and replace ASCII digits (0-9)
 * with Persian digits, using _formatPersianNumber_ for pure-numeric
 * cells and a regex for mixed-text cells.
 */
function localiseDigits(sheet) {
  var rng  = sheet.getDataRange();
  var vals = rng.getValues();

  for (var r = 0; r < vals.length; r++) {
    for (var c = 0; c < vals[r].length; c++) {
      var cell = vals[r][c];
      if (cell === '' || cell === null) continue;

      if (typeof cell === 'number') {
        vals[r][c] = _formatPersianNumber_(cell);   // full conversion
      } else {
        vals[r][c] = cell.toString().replace(/\d/g, function (d) {
          return _PERSIAN_DIGITS_[d];
        });
      }
    }
  }

  /* --- make the entire range plain-text so Persian digits stick --- */
  rng.setNumberFormat('@');      // “@” = plain text format
  rng.setValues(vals);
}
function generateBatchedInvoice() {
  const ss = SpreadsheetApp.getActive();
  const invSh = ss.getSheetByName('BatchedInvoice') || ss.insertSheet('BatchedInvoice');
  invSh.clear();
  const c = cfg();
  SpreadsheetApp.flush();

  // 1) Build price map
  const svcSh = SpreadsheetApp
    .openById(c.SERVICE_FILE_ID)
    .getSheetByName(c.SERVICE_SHEET_NAME);
  if (!svcSh) {
    SpreadsheetApp.getUi().alert('ServiceList sheet not found');
    return;
  }
  const svcData = svcSh.getRange(
      2, 1,
      svcSh.getLastRow() - 1,
      Math.max(c.SERVICE_NAME_COL_IDX, c.SERVICE_PRICE_COL_IDX)
    ).getValues();
  const priceMap = {};
  svcData.forEach(r => {
    const name  = (r[c.SERVICE_NAME_COL_IDX - 1] || '').toString().trim();
    const price = +r[c.SERVICE_PRICE_COL_IDX - 1] || 0;
    if (name) priceMap[name] = price;
  });

  // 2) Read Warehouse

  const wh = (c.WAREHOUSE_FILE_ID
                 ? SpreadsheetApp.openById(c.WAREHOUSE_FILE_ID)
                 : ss).getSheetByName(c.WAREHOUSE_SHEET);

  if (!wh) {
    SpreadsheetApp.getUi().alert('WAREHOUSE sheet not found');
    return;
  }
  const nRows = wh.getLastRow() - 1;
  if (nRows <= 0) {
    SpreadsheetApp.getUi().alert('WAREHOUSE is empty');
    return;
  }
  const maxCol = Math.max(
    c.RAWDB_SERVICE_COL,
    c.WAREHOUSE_WORKER_COL_IDX,
    c.WAREHOUSE_COUNT_COL_IDX
  );
  const whData = wh.getRange(2, 1, nRows, maxCol).getValues();

  // 3) Aggregate
  const services = new Set(), workers = new Set(), tally = {};
  whData.forEach(r => {
    const svc = r[c.RAWDB_SERVICE_COL - 1];
    const wkr = r[c.WAREHOUSE_WORKER_COL_IDX - 1];
    const cnt = +r[c.WAREHOUSE_COUNT_COL_IDX - 1] || 0;
    if (!svc || !wkr || cnt === 0) return;
    services.add(svc);
    workers.add(wkr);
    tally[wkr] = tally[wkr] || {};
    tally[wkr][svc] = (tally[wkr][svc] || 0) + cnt;
  });
  if (services.size === 0) {
    SpreadsheetApp.getUi().alert('No services with non-zero counts');
    return;
  }
  const svcArr = [...services].sort();
  const wkrArr = [...workers].sort();

  // 4) Build table array
  const header = ['نام پارتنر', ...svcArr, 'جمع تعداد', 'جمع مبلغ'];
  const table  = [header];
  const colCnt   = Array(svcArr.length).fill(0);
  const colPrice = Array(svcArr.length).fill(0);
  let grandTotal = 0;

  wkrArr.forEach(w => {
    let rowCnt = 0, rowSum = 0;
    const cntRow   = [];
    const priceRow = [];
    svcArr.forEach((svc, j) => {
      const ctn = tally[w]?.[svc] || 0;
      const prc = ctn * (priceMap[svc] || 0);
      cntRow.push(ctn ? (ctn) : '');
      priceRow.push(prc ? (prc) : '');
      colCnt[j]   += ctn;
      colPrice[j] += prc;
      rowCnt      += ctn;
      rowSum      += prc;
    });
    rowSumNum = rowSum;
    rowCnt = (rowCnt ? (rowCnt) : '');
    rowSum = (rowSum ? (rowSum) : '');

    table.push([w, ...cntRow, rowCnt || '', rowSum ? rowSum : '']);
    table.push(['مبلغ', ...priceRow, '', '']);
    grandTotal += rowSumNum;
  });
  // Totals
  table.push(['جمع سرویس', ...colCnt, '', '']);
  table.push(['جمع مبلغ',
              ...colPrice.map(v => v ? (v) : ''),
              '', grandTotal ?  (grandTotal) : '']);


  // 5) Write to sheet
  invSh.clear();
  invSh.getRange(1, 1, table.length, header.length).setValues(table);
  _appendUnitPriceRow_(invSh, priceMap);
  // 6) Styling
  const lastRow = table.length;
  const lastCol = header.length;
  const lightGray = '#FFFFFF';

  // Center all text
  invSh.getRange(1, 1, lastRow, lastCol)
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');

  // First row and first column bold + gray background
  invSh.getRange(1, 1, 1, lastCol)
       .setFontWeight('bold')
       .setBackground('#AAAAAA');
  invSh.getRange(1, 1, lastRow, 1)
       .setFontWeight('bold')
       .setBackground('#AAAAAA');

  // Last two columns tinted light gray
  invSh.getRange(1, lastCol - 1, lastRow, 2)
       .setBackground(lightGray);

  // Last two rows tinted light gray
  invSh.getRange(lastRow - 1, 1, 2, lastCol)
       .setBackground(lightGray);

  // Uniform sizing
  const rowHeight = 70;   // px
  const colWidth  = 150;  // px
  invSh.setRowHeights(1, lastRow, rowHeight);
  invSh.setColumnWidths(1, lastCol, colWidth);

  _stylePivotSheet_(invSh);
  //_convertNumbersToPersian_(invSh);
  /* write & style … */
  //localiseDigits(invSh);   

  SpreadsheetApp.getUi().alert('✅ Pivot Table styled and updated');
}