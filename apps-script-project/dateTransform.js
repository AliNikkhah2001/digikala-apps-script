function writeTodayJalali() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var today = new Date();
  var g = Utilities.formatDate(today, "GMT", "yyyy/MM/dd").split("/");
  var gy = parseInt(g[0], 10);
  var gm = parseInt(g[1], 10);
  var gd = parseInt(g[2], 10);
  var g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  var jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  var gy2 = (gm > 2) ? (gy + 1) : gy;
  var days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm -1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days /1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days -1)/365);
    days = (days -1)%365;
  }
  var jm = (days < 186) ? 1 + Math.floor(days/31) : 7 + Math.floor((days -186)/30);
  var jd = 1 + ((days < 186) ? (days %31) : ((days -186)%30));
  var jalaliDate = jy + "/" + ("0"+jm).slice(-2) + "/" + ("0"+jd).slice(-2);
  sheet.getRange("O4").setValue(jalaliDate);
}
