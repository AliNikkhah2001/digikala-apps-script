/* =========================================================================
 * Locale helpers – Persian digits & Jalali calendar
 * ========================================================================= */
const _PERSIAN_DIGITS_ = { '0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹' };

function _toPersianDigits_(val) {
  return val.toString().replace(/[0-9]/g, d => _PERSIAN_DIGITS_[d]);
}
function _formatPersianNumber_(val) {
  /* Accepts number or numeric string and returns Persian-digit string
     with Persian thousands separators (٬). Logs every input → output. */
  if (val === undefined || val === null || val === '') {

    return '';
  }

  // English-locale string with commas
  var en = (typeof val === 'number' ? val : Number(val)).toLocaleString('en-US');

  // Replace separators and digits
  var out = en.replace(/,/g, '٬')               // thousands separator
              .replace(/\d/g, function (d) {    // digit substitution
                return _PERSIAN_DIGITS_[d];
              });

  //Logger.log('_formatPersianNumber_ | in: %s → out: %s', JSON.stringify(val), out);
  return out;
}
// Gregorian → Jalali (jalaali-js)
function _gregorianToJalali_(gy, gm, gd) {
  const g_d_m=[0,31,59,90,120,151,181,212,243,273,304,334];
  let jy=(gy<=1600)?0:979;
  gy-=(gy<=1600)?621:1600;
  const gy2=(gm>2)?(gy+1):gy;
  let days=365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)-80+gd+g_d_m[gm-1];
  jy+=33*Math.floor(days/12053); days%=12053;
  jy+=4*Math.floor(days/1461);   days%=1461;
  if(days>365){ jy+=Math.floor((days-1)/365); days=(days-1)%365; }
  const jm=(days<186)?1+Math.floor(days/31):7+Math.floor((days-186)/30);
  const jd=1+((days<186)?(days%31):((days-186)%30));
  return [jy,jm,jd];
}
function _formatJalaliDate_(d){
  const [y,m,da]=_gregorianToJalali_(d.getFullYear(),d.getMonth()+1,d.getDate());
  return _toPersianDigits_(`${y}/${String(m).padStart(2,'0')}/${String(da).padStart(2,'0')}`);
}

/* =======================================================================
 *  Progress utility – show a toast like “3 / 17 invoices (18 %)”
 *  Call after each PDF you finish.
 * ======================================================================= */
function showProgress(current, total, phase) {
  var pct = Math.round(100 * current / total);
  SpreadsheetApp.getActive()
    .toast(current + ' / ' + total + ' (' + pct + '%)', phase, 3); // 3-sec
}