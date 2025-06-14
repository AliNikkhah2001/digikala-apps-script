# Digikala Apps Script Project

This repository contains Google Apps Script code for Digikala operations, including inventory management, invoice generation, and reporting functionality.

## Project Overview

**Script ID**: `1Z2VpxJ3QrfjVEvEV7za1yckZTVfcOtohNm1rIyRdq7wjfgyxilcfFeYx`

## Files Structure

### Core Scripts
- `config.js` - Configuration settings and constants
- `helpers.js` - Utility functions and common helpers
- `menu.js` - Google Sheets menu customization
- `dateTransform.js` - Date manipulation utilities
- `debug.js` - Debugging and logging functions

### Main Functionality
- `warehouse.js` - Warehouse management operations
- `sync.js` - Data synchronization functions
- `pivot.js` - Pivot table operations
- `pdfInvoice.js` - PDF invoice generation
- `openReport.js` - Report generation and opening
- `settings.js` - Application settings management
- `Audit.js` - Audit trail and logging

### UI Components
- `Settings.html` - Settings dialog interface
- `Report.html` - Report display interface
- `Progress.html` - Progress indicator interface
- `Transfer.html` - Transfer operations interface
- `InvoiceDialog.html` - Invoice dialog interface

### Configuration
- `appsscript.json` - Apps Script project configuration
- `.clasp.json` - Clasp deployment configuration

## Development Setup

### Prerequisites
1. Install Node.js and npm
2. Install clasp globally:
   ```bash
   npm install -g @google/clasp
   ```
3. Login to Google Apps Script:
   ```bash
   clasp login
   ```

### Development Workflow

1. **Pull latest changes from Apps Script**:
   ```bash
   clasp pull
   ```

2. **Make your changes locally**
   - Edit the JavaScript and HTML files
   - Test your changes

3. **Push changes to Apps Script**:
   ```bash
   clasp push
   ```

4. **Version control**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

## Key Features

- **Inventory Management**: Track and manage warehouse inventory
- **Invoice Generation**: Create PDF invoices automatically
- **Data Synchronization**: Sync data between different sources
- **Reporting**: Generate various business reports
- **Audit Trail**: Track changes and operations
- **Progress Tracking**: Monitor long-running operations

## Usage

1. Open the associated Google Sheet
2. Use the custom menu items to access different functions
3. Configure settings through the Settings dialog
4. Generate reports and invoices as needed

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Notes

- Always test changes in a development environment first
- Use `clasp push --watch` for continuous development
- Check the Apps Script editor for runtime errors
- Monitor execution transcript for debugging

