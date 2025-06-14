/**
 * Centralized audit logging system
 * Stores logs in a dedicated "AuditLog" sheet
 */
const AuditLog = {
  SHEET_NAME: "_AUDIT_LOG",
  
  initSheet() {
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(this.SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(this.SHEET_NAME);
      sheet.appendRow(["Timestamp", "User", "Operation", "Details"]);
      sheet.deleteColumns(5, sheet.getMaxColumns() - 4);
      sheet.getRange("A1:D1").setFontWeight("bold");
    }
    return sheet;
  },
  
  log(operation, details = {}) {
    try {
      const sheet = this.initSheet();
      const timestamp = new Date();
      const user = Session.getEffectiveUser().getEmail();
      
      sheet.appendRow([
        timestamp,
        user,
        operation,
        JSON.stringify(details)
      ]);
      
      // Auto-resize columns
      sheet.autoResizeColumns(1, 4);
      
      Logger.log(`[Audit] ${operation} by ${user}`);
    } catch (e) {
      Logger.log(`Audit log failed: ${e}`);
    }
  }
};