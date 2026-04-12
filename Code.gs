/**
 * BUILDING EXPENSE & REVENUE TRACKER - SPA VERSION
 */

// ==================== CONFIGURATION ====================

const CONFIG = {
  SPREADSHEET_ID: "16JedxawJhiSd2cp-lwZpj6TE9MOZcTMH92ycb0FoYqo",
  PARENT_FOLDER_ID: "1GCCcDpimO9zwP3VbzpFKTdhsQ3kAy6_W",
  LOGS_SHEET_NAME: "logs",
  SORTED_LOGS_SHEET: "sortedLog",
  
  MASTER_PASSWORD_KEY: 'MASTER_PASSWORD',
  
  BEGINNING_BALANCE: 50000,
  
  EXPENSE_CATEGORIES: {
    "Maintenance": ["Plumber", "Painting", "Electrical", "HVAC", "Cleaning", "Security", "Other"],
    "Innovation": ["Landscape", "Entrance", "Lighting", "Parking", "Gym", "Pool", "Other"],
    "Utilities": ["Water", "Electricity", "Gas", "Internet", "Waste", "Other"],
    "Insurance": ["Property", "Liability", "Other"],
    "Taxes": ["Property Tax", "Income Tax", "Other"],
    "Administrative": ["Legal", "Accounting", "Management", "Other"]
  },
  
  REVENUE_CATEGORIES: ["Rent", "Parking", "Laundry", "Storage", "Late Fees", "Security Deposit", "Other", "Monthly Debt"],
  
  MONTHLY_DEBT_CATEGORY: "Monthly Debt",
  
  TOTAL_TENANTS: 20,
  TENANT_PREFIX: "",
  
  // yy-mmm format for Google Sheets
  MONTHS: ["26-Jan", "26-Feb", "26-Mar", "26-Apr", "26-May", "26-Jun",
           "26-Jul", "26-Aug", "26-Sep", "26-Oct", "26-Nov", "26-Dec"],
  
  WELCOME_MESSAGE: "Welcome to Building Finance Tracker.",
  MAX_ATTACHMENTS: 10,
  MAX_FILE_SIZE_MB: 10,
  ATTACHMENT_FOLDER_NAME: "Transaction Attachments",
  
  SESSION_DURATION: 600 // 10 minutes in seconds
};

const FOLDER_ID_KEY = 'ATTACHMENT_FOLDER_ID';
const CACHE_PREFIX = 'session_';
const EDITOR_PASSWORDS_KEY = 'EDITOR_PASSWORDS';
const VIEWER_PASSWORDS_KEY = 'VIEWER_PASSWORDS';

// ==================== PASSWORD FUNCTIONS ====================

function getMasterPassword() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(CONFIG.MASTER_PASSWORD_KEY) || 'admin';
}

function getEditorPasswords() {
  const props = PropertiesService.getScriptProperties();
  const passwords = props.getProperty(EDITOR_PASSWORDS_KEY);
  return passwords ? JSON.parse(passwords) : [];
}

function getViewerPasswords() {
  const props = PropertiesService.getScriptProperties();
  const passwords = props.getProperty(VIEWER_PASSWORDS_KEY);
  return passwords ? JSON.parse(passwords) : {};
}

function saveEditorPasswords(passwordsArray) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(EDITOR_PASSWORDS_KEY, JSON.stringify(passwordsArray));
}

function saveViewerPasswords(passwordsObject) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(VIEWER_PASSWORDS_KEY, JSON.stringify(passwordsObject));
}

// ==================== WEB APP ====================

function doGet(e) {
  initializeSpreadsheet();
  
  const page = e.parameter.page || 'login';
  
  switch(page) {
    case 'app':
      // Main SPA shell - serves App.html
      return renderHtml('App', { config: CONFIG });
      
    case 'admin':
      return renderHtml('PasswordManager', { config: CONFIG, error: '' });
      
    case 'login':
    default:
      return renderHtml('Login', { config: CONFIG, error: '' });
  }
}

function doPost(e) {
  try {
    const action = e.parameter.action;
    
    switch(action) {
      case 'login':
        return handleLogin(e.parameter.password);
      case 'validateToken':
        return validateToken(e.parameter.token);
      case 'getFormTemplate':
        return getFormTemplate(e.parameter.form, e.parameter.token);
      case 'submitExpense':
        const expenseData = JSON.parse(decodeURIComponent(e.parameter.data));
        return submitExpense(expenseData);
      case 'submitRevenue':
        const revenueData = JSON.parse(decodeURIComponent(e.parameter.data));
        return submitRevenue(revenueData);
      case 'verifyMasterPassword':
        return verifyMasterPassword(e.parameter.password);
      case 'addEditorPassword':
        return addEditorPassword(e.parameter.password);
      case 'removeEditorPassword':
        return removeEditorPassword(e.parameter.password);
      case 'addViewerPassword':
        return addViewerPassword(e.parameter.unit, e.parameter.password);
      case 'removeViewerPassword':
        return removeViewerPassword(e.parameter.unit);
      case 'changeMasterPassword':
        return changeMasterPassword(e.parameter.currentPassword, e.parameter.newPassword);
      default:
        return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// ==================== AUTHENTICATION (SPA) ====================

function handleLogin(password) {
  // Check master password
  if (password === getMasterPassword()) {
    const token = createSession('admin', password);
    return jsonResponse({ 
      success: true, 
      token: token,
      role: 'admin'
    });
  }
  
  // Check editor passwords
  const editorPasswords = getEditorPasswords();
  if (editorPasswords.includes(password)) {
    const token = createSession('editor', password);
    return jsonResponse({ 
      success: true, 
      token: token,
      role: 'editor'
    });
  }
  
  // Check viewer passwords
  const viewerPasswords = getViewerPasswords();
  for (let [unit, pwd] of Object.entries(viewerPasswords)) {
    if (pwd === password) {
      const token = createSession('viewer', password, unit);
      return jsonResponse({ 
        success: true, 
        token: token,
        role: 'viewer',
        tenant: unit
      });
    }
  }
  
  return jsonResponse({ success: false, error: 'Invalid password' });
}

function createSession(type, password, tenant) {
  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  const sessionData = {
    type: type,
    password: password,
    tenant: tenant || null,
    created: new Date().getTime()
  };
  cache.put(CACHE_PREFIX + token, JSON.stringify(sessionData), CONFIG.SESSION_DURATION);
  return token;
}

function validateToken(token) {
  if (!token) return jsonResponse({ valid: false, error: 'No token' });
  
  const cache = CacheService.getScriptCache();
  const data = cache.get(CACHE_PREFIX + token);
  
  if (!data) return jsonResponse({ valid: false, error: 'Session expired' });
  
  const session = JSON.parse(data);
  
  // Refresh session on activity
  cache.put(CACHE_PREFIX + token, data, CONFIG.SESSION_DURATION);
  
  return jsonResponse({
    valid: true,
    role: session.type,
    tenant: session.tenant || null
  });
}

function getSession(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const data = cache.get(CACHE_PREFIX + token);
  if (!data) return null;
  return JSON.parse(data);
}

function verifyMasterPassword(password) {
  if (password === getMasterPassword()) {
    const token = createSession('admin', password);
    return jsonResponse({
      success: true,
      token: token,
      editorPasswords: getEditorPasswords(),
      viewerPasswords: getViewerPasswords()
    });
  }
  return jsonResponse({ success: false, error: 'Invalid master password' });
}

// ==================== FORM TEMPLATES (SPA) ====================

function getFormTemplate(form, token) {
  const session = getSession(token);
  
  if (!session) {
    return jsonResponse({ success: false, error: 'Session expired' });
  }
  
  // Check permissions
  if (form === 'expense' || form === 'revenue') {
    if (session.type !== 'admin' && session.type !== 'editor') {
      return jsonResponse({ success: false, error: 'Access denied' });
    }
  }
  
  // Return template content
  let templateName;
  switch(form) {
    case 'dashboard': templateName = 'Dashboard'; break;
    case 'expense': templateName = 'ExpenseForm'; break;
    case 'revenue': templateName = 'RevenueForm'; break;
    default: return jsonResponse({ success: false, error: 'Unknown form' });
  }
  
  try {
    const template = HtmlService.createTemplateFromFile(templateName);
    
    // Pass config both as object (for template <?= ?> tags) and as JSON string (for JS)
    template.config = CONFIG;
    template.configJson = JSON.stringify(CONFIG);
    template.userPassword = session.password || '';
    template.tenant = session.tenant || '';
    template.scriptUrl = ScriptApp.getService().getUrl();
    
    const content = template.evaluate().getContent();
    return jsonResponse({ success: true, html: content });
  } catch (e) {
    console.error('Template error:', e);
    return jsonResponse({ success: false, error: 'Template error: ' + e.toString() });
  }
}

// ==================== PASSWORD MANAGEMENT ====================

function addEditorPassword(newPassword) {
  if (!newPassword || newPassword.length < 1) {
    return jsonResponse({ success: false, error: 'Password required' });
  }
  
  const passwords = getEditorPasswords();
  if (passwords.includes(newPassword)) {
    return jsonResponse({ success: false, error: 'Password already exists' });
  }
  
  passwords.push(newPassword);
  saveEditorPasswords(passwords);
  
  return jsonResponse({ 
    success: true, 
    message: 'Editor password added',
    passwords: passwords 
  });
}

function removeEditorPassword(passwordToRemove) {
  let passwords = getEditorPasswords();
  passwords = passwords.filter(p => p !== passwordToRemove);
  saveEditorPasswords(passwords);
  
  return jsonResponse({ 
    success: true, 
    message: 'Editor password removed',
    passwords: passwords 
  });
}

function addViewerPassword(unit, password) {
  if (!unit || !password) {
    return jsonResponse({ success: false, error: 'Unit and password required' });
  }
  
  const passwords = getViewerPasswords();
  passwords[unit] = password;
  saveViewerPasswords(passwords);
  
  return jsonResponse({ 
    success: true, 
    message: 'Viewer password added for ' + unit,
    passwords: passwords 
  });
}

function removeViewerPassword(unit) {
  const passwords = getViewerPasswords();
  delete passwords[unit];
  saveViewerPasswords(passwords);
  
  return jsonResponse({ 
    success: true, 
    message: 'Viewer password removed for ' + unit,
    passwords: passwords 
  });
}

function changeMasterPassword(currentPassword, newPassword) {
  if (currentPassword !== getMasterPassword()) {
    return jsonResponse({ success: false, error: 'Current password incorrect' });
  }
  
  if (!newPassword || newPassword.length < 2) {
    return jsonResponse({ success: false, error: 'New password too short' });
  }
  
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.MASTER_PASSWORD_KEY, newPassword);
  
  return jsonResponse({ success: true, message: 'Master password changed successfully' });
}

// ==================== HTML RENDERING ====================

function renderHtml(templateName, data) {
  const template = HtmlService.createTemplateFromFile(templateName);
  template.config = data.config;
  template.error = data.error || '';
  template.scriptUrl = ScriptApp.getService().getUrl();
  
  return template.evaluate()
    .setTitle('Building Finance Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== SPREADSHEET ====================

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    console.error('Error opening spreadsheet:', e);
    throw new Error('Cannot open spreadsheet. Check ID and permissions.');
  }
}

function initializeSpreadsheet() {
  const spreadsheet = getSpreadsheet();
  ensureAttachmentFolder();
  return spreadsheet;
}

function ensureAttachmentFolder() {
  try {
    const parentFolder = DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID);
    const folders = parentFolder.getFoldersByName(CONFIG.ATTACHMENT_FOLDER_NAME);
    
    if (folders.hasNext()) {
      const folder = folders.next();
      const props = PropertiesService.getScriptProperties();
      props.setProperty(FOLDER_ID_KEY, folder.getId());
      return folder.getId();
    }
    
    const newFolder = parentFolder.createFolder(CONFIG.ATTACHMENT_FOLDER_NAME);
    const props = PropertiesService.getScriptProperties();
    props.setProperty(FOLDER_ID_KEY, newFolder.getId());
    return newFolder.getId();
  } catch (e) {
    console.error('ensureAttachmentFolder error:', e);
    try {
      const folder = DriveApp.createFolder(CONFIG.ATTACHMENT_FOLDER_NAME);
      const props = PropertiesService.getScriptProperties();
      props.setProperty(FOLDER_ID_KEY, folder.getId());
      return folder.getId();
    } catch (e2) {
      console.error('Fallback folder creation failed:', e2);
      return null;
    }
  }
}

function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
}

function formatDateCairo(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return parts[1] + '/' + parts[2] + '/' + parts[0];
}

// Parse month string to Date object (first day of month)
// Storing as a Date ensures chronological sorting in pivots and filters
function parseMonthToFirstDay(monthStr) {
  if (!monthStr) return null;
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let monthIndex = -1;
  let year = 2026;
  
  // yy-mmm format (e.g., "26-Apr")
  if (/^\d{2}-[A-Za-z]{3}$/.test(monthStr)) {
    const parts = monthStr.split('-');
    year = 2000 + parseInt(parts[0]);
    monthIndex = monthNames.indexOf(parts[1]);
  }
  // mmm-yy format (e.g., "Apr-26")
  else if (/^[A-Za-z]{3}-\d{2}$/.test(monthStr)) {
    const parts = monthStr.split('-');
    monthIndex = monthNames.indexOf(parts[0]);
    year = 2000 + parseInt(parts[1]);
  }
  // mm-yy format (e.g., "04-26")
  else if (/^\d{2}-\d{2}$/.test(monthStr)) {
    const parts = monthStr.split('-');
    monthIndex = parseInt(parts[0]) - 1;
    year = 2000 + parseInt(parts[1]);
  }
  
  if (monthIndex >= 0 && monthIndex <= 11) {
    return new Date(year, monthIndex, 1);
  }
  
  return null;
}

// ==================== SUBMISSION FUNCTIONS ====================

function submitExpense(data) {
  try {
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.LOGS_SHEET_NAME);
    
    if (!sheet) {
      return jsonResponse({ success: false, error: 'logs sheet not found' });
    }
    
    const timestamp = new Date();
    const userPassword = data.userPassword || 'Unknown';
    const formattedDate = formatDateCairo(data.date);
    
    let months = data.months;
    if (typeof months === 'string') {
      months = JSON.parse(months);
    }
    
    if (!months || months.length === 0) {
      return jsonResponse({ success: false, error: 'No months selected' });
    }
    
    const totalAmount = parseFloat(data.amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return jsonResponse({ success: false, error: 'Invalid amount' });
    }
    
    const amountPerMonth = totalAmount / months.length;
    const negativeAmount = -amountPerMonth;
    
    let attachmentUrls = [];
    let attachmentErrors = [];
    if (data.attachments && data.attachments.length > 0) {
      const result = processAttachmentsWithErrors(data.attachments, timestamp, data.category);
      attachmentUrls = result.links;
      attachmentErrors = result.errors;
    }
    const cleanNotes = sanitizeInput(data.notes);
    
    months.forEach(function(month) {
      const monthDate = parseMonthToFirstDay(month);
      
      const newRow = [
        timestamp,
        "Expense",
        formattedDate,
        data.category,
        data.subCategory,
        monthDate,
        "",
        negativeAmount,
        cleanNotes,
        "",   // placeholder for attachment cell
        userPassword
      ];
      sheet.appendRow(newRow);
      
      // Write attachment hyperlinks into column 10 (index 9) of the last row
      if (attachmentUrls.length > 0) {
        const lastRow = sheet.getLastRow();
        const cell = sheet.getRange(lastRow, 10);
        buildAttachmentRichText(cell, attachmentUrls);
      }
    });
    
    let message = 'Expense recorded: ' + months.length + ' month(s)';
    if (attachmentErrors.length > 0) {
      message += ' (' + attachmentErrors.length + ' file(s) failed to upload)';
    }
    
    return jsonResponse({ 
      success: true, 
      message: message,
      attachmentErrors: attachmentErrors
    });
    
  } catch (error) {
    console.error('submitExpense error:', error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function submitRevenue(data) {
  try {
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.LOGS_SHEET_NAME);
    
    if (!sheet) {
      return jsonResponse({ success: false, error: 'logs sheet not found' });
    }
    
    const timestamp = new Date();
    const userPassword = data.userPassword || 'Unknown';
    const formattedDate = formatDateCairo(data.date);
    
    let tenants = data.tenants;
    let months = data.months;
    
    if (typeof tenants === 'string') {
      tenants = JSON.parse(tenants);
    }
    if (typeof months === 'string') {
      months = JSON.parse(months);
    }
    
    if (!tenants || tenants.length === 0) {
      return jsonResponse({ success: false, error: 'No tenants selected' });
    }
    if (!months || months.length === 0) {
      return jsonResponse({ success: false, error: 'No months selected' });
    }
    
    const totalAmount = parseFloat(data.amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return jsonResponse({ success: false, error: 'Invalid amount' });
    }
    
    const totalCombinations = tenants.length * months.length;
    const amountPerEntry = totalAmount / totalCombinations;
    
    let attachmentUrls = [];
    let attachmentErrors = [];
    if (data.attachments && data.attachments.length > 0) {
      const result = processAttachmentsWithErrors(data.attachments, timestamp, data.category);
      attachmentUrls = result.links;
      attachmentErrors = result.errors;
    }
    const attachmentString = attachmentUrls.join(' | ');
    const cleanNotes = sanitizeInput(data.notes);
    
    tenants.forEach(function(tenant) {
      months.forEach(function(month) {
        const monthDate = parseMonthToFirstDay(month);
        
        const newRow = [
          timestamp,
          "Revenue",
          formattedDate,
          data.category,
          "",
          monthDate,
          tenant,
          amountPerEntry,
          cleanNotes,
          "",   // placeholder for attachment cell
          userPassword
        ];
        sheet.appendRow(newRow);
        
        // Write attachment hyperlinks into column 10 (index 9) of the last row
        if (attachmentUrls.length > 0) {
          const lastRow = sheet.getLastRow();
          const cell = sheet.getRange(lastRow, 10);
          buildAttachmentRichText(cell, attachmentUrls);
        }
      });
    });
    
    let message = 'Revenue recorded: ' + tenants.length + ' tenant(s) × ' + months.length + ' month(s)';
    if (attachmentErrors.length > 0) {
      message += ' (' + attachmentErrors.length + ' file(s) failed to upload)';
    }
    
    return jsonResponse({ 
      success: true, 
      message: message,
      attachmentErrors: attachmentErrors
    });
    
  } catch (error) {
    console.error('submitRevenue error:', error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function processAttachmentsWithErrors(attachments, timestamp, category) {
  const links = [];
  const errors = [];
  
  try {
    const parentFolder = DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID);
    let folder;
    
    const folders = parentFolder.getFoldersByName(CONFIG.ATTACHMENT_FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = parentFolder.createFolder(CONFIG.ATTACHMENT_FOLDER_NAME);
    }
    
    const dateStr = Utilities.formatDate(timestamp, 'Africa/Cairo', 'MM.dd.yy');
    
    attachments.forEach(function(fileData, index) {
      try {
        if (!fileData.data) {
          errors.push({file: fileData.name || 'Unknown', error: 'No data'});
          return;
        }
        
        const decoded = Utilities.base64Decode(fileData.data);
        const blob = Utilities.newBlob(decoded, fileData.type);
        
        const ext = fileData.name.match(/\.[^.]+$/) ? fileData.name.match(/\.[^.]+$/)[0] : '';
        const newName = dateStr + '_' + category + '_' + (index + 1) + ext;
        
        const file = folder.createFile(blob.setName(newName));
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        links.push(file.getUrl());
      } catch (e) {
        console.error('File upload error:', e);
        errors.push({file: fileData.name || 'Unknown', error: e.toString()});
      }
    });
  } catch (e) {
    console.error('Attachment processing error:', e);
    errors.push({file: 'General', error: e.toString()});
  }
  
  return {links: links, errors: errors};
}

// Build rich-text hyperlinks in a single cell, one per attachment
// e.g. "File 1 | File 2 | File 3" each word being a clickable link
function buildAttachmentRichText(cell, urls) {
  if (!urls || urls.length === 0) return;
  
  try {
    const separator = ' | ';
    let fullText = '';
    const runs = [];
    
    urls.forEach(function(url, idx) {
      const label = 'File ' + (idx + 1);
      const start = fullText.length;
      fullText += label;
      runs.push({ start: start, end: fullText.length, url: url });
      if (idx < urls.length - 1) fullText += separator;
    });
    
    const richText = SpreadsheetApp.newRichTextValue().setText(fullText);
    runs.forEach(function(run) {
      richText.setLinkUrl(run.start, run.end, run.url);
    });
    
    cell.setRichTextValue(richText.build());
  } catch (e) {
    // Fallback: write plain URLs separated by newlines
    cell.setValue(urls.join('\n'));
  }
}



function getDashboardData() {
  try {
    const spreadsheet = getSpreadsheet();
    const sortedSheet = spreadsheet.getSheetByName(CONFIG.SORTED_LOGS_SHEET);
    
    if (!sortedSheet) {
      return JSON.stringify({
        beginningBalance: CONFIG.BEGINNING_BALANCE.toFixed(2),
        revenueTotal: "0.00",
        expenseTotal: "0.00",
        currentBalance: CONFIG.BEGINNING_BALANCE.toFixed(2),
        matrixData: null,
        transactions: [],
        error: 'sortedLog sheet not found'
      });
    }
    
    const lastRow = sortedSheet.getLastRow();
    if (lastRow <= 1) {
      return JSON.stringify({
        beginningBalance: CONFIG.BEGINNING_BALANCE.toFixed(2),
        revenueTotal: "0.00",
        expenseTotal: "0.00",
        currentBalance: CONFIG.BEGINNING_BALANCE.toFixed(2),
        matrixData: { months: CONFIG.MONTHS, tenants: Array.from({length: 20}, (_, i) => String(i+1)), payments: {} },
        transactions: []
      });
    }
    
    const allData = sortedSheet.getRange(2, 1, lastRow - 1, 11).getValues();
    const transactions = allData.slice(0, 50);
    
    let revenueTotal = 0;
    let expenseTotal = 0;
    
    allData.forEach(function(row) {
      const type = row[1];
      const amount = parseFloat(row[7]) || 0;
      if (type === 'Revenue') revenueTotal += Math.abs(amount);
      if (type === 'Expense') expenseTotal += Math.abs(amount);
    });
    
    const matrixData = buildMatrixFromData(allData);
    
    return JSON.stringify({
      beginningBalance: CONFIG.BEGINNING_BALANCE.toFixed(2),
      revenueTotal: revenueTotal.toFixed(2),
      expenseTotal: expenseTotal.toFixed(2),
      currentBalance: (CONFIG.BEGINNING_BALANCE + revenueTotal - expenseTotal).toFixed(2),
      matrixData: matrixData,
      transactions: transactions
    });
    
  } catch (error) {
    console.error('getDashboardData error:', error);
    return JSON.stringify({
      beginningBalance: CONFIG.BEGINNING_BALANCE.toFixed(2),
      revenueTotal: "0.00",
      expenseTotal: "0.00",
      currentBalance: CONFIG.BEGINNING_BALANCE.toFixed(2),
      matrixData: null,
      transactions: [],
      error: error.toString()
    });
  }
}

function buildMatrixFromData(dataRows) {
  const result = {
    months: CONFIG.MONTHS,
    tenants: [],
    payments: {}
  };
  
  for (let i = 1; i <= CONFIG.TOTAL_TENANTS; i++) {
    result.tenants.push(String(i));
  }
  
  result.tenants.forEach(function(tenant) {
    CONFIG.MONTHS.forEach(function(month) {
      result.payments[tenant + '|' + month] = 'unpaid';
    });
  });
  
  if (!dataRows || dataRows.length === 0) return result;
  
  dataRows.forEach(function(row) {
    const type = row[1];
    const category = row[3];
    const monthRaw = row[5];
    const tenant = row[6];
    
    if (type === 'Revenue' && category === CONFIG.MONTHLY_DEBT_CATEGORY && tenant && monthRaw) {
      const tenantNum = String(tenant).trim();
      let monthStr = null;
      
      if (monthRaw instanceof Date) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mm = monthNames[monthRaw.getMonth()];
        const yy = String(monthRaw.getFullYear()).slice(-2);
        monthStr = yy + '-' + mm;
      }
      else if (typeof monthRaw === 'string' && /^\d{2}-[A-Za-z]{3}$/.test(monthRaw)) {
        monthStr = monthRaw;
      }
      else if (typeof monthRaw === 'string' && /^[A-Za-z]{3}-\d{2}$/.test(monthRaw)) {
        const parts = monthRaw.split('-');
        monthStr = parts[1] + '-' + parts[0];
      }
      else if (typeof monthRaw === 'string' && /^\d{2}-\d{2}$/.test(monthRaw)) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const parts = monthRaw.split('-');
        const mm = monthNames[parseInt(parts[0]) - 1];
        const yy = parts[1];
        monthStr = yy + '-' + mm;
      }
      
      if (monthStr) {
        const key = tenantNum + '|' + monthStr;
        result.payments[key] = 'paid';
      }
    }
  });
  
  return result;
}