# Development Guide

## Complete Development Workflow

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AliNikkhah2001/digikala-apps-script.git
   cd digikala-apps-script/apps-script-project
   ```

2. **Install dependencies**:
   ```bash
   npm install -g @google/clasp
   ```

3. **Login to Google Apps Script**:
   ```bash
   clasp login
   ```

### Daily Development Workflow

#### 1. Start Development Session
```bash
# Navigate to project
cd ~/Documents/Digikala/digikala-apps-script/apps-script-project

# Pull latest changes from both Git and Apps Script
git pull origin main
clasp pull

# Create a new branch for your feature
git checkout -b feature/your-feature-name
```

#### 2. Make Changes
- Edit `.js` files for Google Apps Script functions
- Edit `.html` files for user interfaces
- Test your changes locally

#### 3. Test Your Changes
```bash
# Push to Apps Script for testing
clasp push

# Open Apps Script editor to test
clasp open
```

#### 4. Monitor and Debug
- Check execution transcript in Apps Script editor
- Use `console.log()` statements in your code
- Test functions manually in the Apps Script editor

#### 5. Commit Your Changes
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add new inventory tracking feature

- Added function for tracking inventory levels
- Updated UI to show current stock
- Fixed bug in warehouse sync"

# Push to GitHub
git push origin feature/your-feature-name
```

#### 6. Deploy to Production
```bash
# Switch to main branch
git checkout main

# Merge your feature
git merge feature/your-feature-name

# Push final changes to Apps Script
clasp push

# Push to GitHub
git push origin main
```

### Viewing Changes in Google Sheets

1. **Find the associated Google Sheet**:
   - The Apps Script is bound to a specific Google Sheet
   - You can find the sheet by running: `clasp open --webapp` or `clasp open`

2. **Test your changes**:
   - Open the Google Sheet
   - Look for custom menu items (usually under "Extensions" or a custom menu)
   - Test the functions through the UI
   - Check for any error messages

3. **Monitor execution**:
   - Go to Apps Script editor
   - Check "Executions" tab for runtime logs
   - Look at "Logs" for console.log output

### Useful Clasp Commands

```bash
# Pull latest code from Apps Script
clasp pull

# Push local changes to Apps Script
clasp push

# Watch for changes and auto-push (development mode)
clasp push --watch

# Open Apps Script editor in browser
clasp open

# View project info
clasp list

# View project status
clasp status

# Create a new version/deployment
clasp deploy

# View project logs
clasp logs
```

### Best Practices

1. **Always pull before starting work**:
   ```bash
   clasp pull
   git pull origin main
   ```

2. **Test thoroughly before committing**:
   - Push to Apps Script and test manually
   - Check for errors in execution transcript
   - Test all affected functionality

3. **Use meaningful commit messages**:
   ```bash
   git commit -m "fix: resolve warehouse sync timeout issue
   
   - Increased timeout from 30s to 60s
   - Added retry logic for failed requests
   - Improved error logging"
   ```

4. **Keep branches focused**:
   - One feature per branch
   - Merge quickly to avoid conflicts
   - Delete merged branches

5. **Document your changes**:
   - Update README.md if needed
   - Add comments to complex functions
   - Update this guide if workflow changes

### Troubleshooting

- **Permission errors**: Run `clasp login` again
- **Script not found**: Check `.clasp.json` has correct script ID
- **Merge conflicts**: Resolve in IDE, then commit
- **Function not working**: Check Apps Script execution transcript
- **UI not updating**: Clear browser cache, refresh Google Sheet

