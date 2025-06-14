/**
 * Application menu builder
 */
function onOpen() {
  try {
    const menuItems = [
      {name: 'Snapshot ▸ Create backup', func: 'backupNow'},
      {name: 'Snapshot ▸ Restore backup', func: 'openRestoreDialog'},
      {name: 'Sync Reference Lists', func: 'syncAllReferenceTablesWithUi'},
      {name: 'Apply Dropdowns', func: 'applyDropdownValidation'},
      {name: 'Open Settings ▸', func: 'openSettings'},
      {name: 'Check Consistency ▸', func: 'openReport'},
      {name: 'Open Transfer Dialog ▸', func: 'openTransferDialog'},
      {name: 'Generate PivotTable', func: 'generateBatchedInvoice'},
      {name: 'Generate Invoices…', func: 'openInvoiceDialog'}
    ];
    
    const menu = SpreadsheetApp.getUi().createMenu('⚙️ Tools');
    menuItems.forEach(item => {
      menu.addItem(item.name, item.func);
    });
    menu.addToUi();
    
    AuditLog.log("Menu initialized");
  } catch (e) {
    Logger.log(`Menu setup failed: ${e}`);
  }
}