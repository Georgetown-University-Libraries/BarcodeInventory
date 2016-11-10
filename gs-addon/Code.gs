var COUNT_HEADROW = 1;
var COL_STATUS  = "Status";
var COL_LOC     = "Location Code";
var COL_RECNUM  = "Record Num";
var COL_BARCODE = "Barcode";
var COL_DUP     = "Duplicate";

/**
 * @OnlyCurrentDoc
 *
 * The above comment directs Apps Script to limit the scope of file
 * access for this add-on. It specifies that this add-on will only
 * attempt to read or modify the files in which the add-on is used,
 * and not all of the user's files. The authorization request message
 * presented to users will reflect this limited scope.
 */
 
/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = SpreadsheetApp.getActiveSheet();
  if (getCol(COL_DUP) == 0) {
    sheet.insertColumnAfter(2);
    sheet.getRange(1, 3).setValue(COL_DUP);
  }
  var menus = [];
  menus.push({name: "Analyze Inventory Stats", functionName: "showSidebar"});
  menus.push({name: "Mark Duplicates", functionName: "markDups"});
  ssheet.addMenu("LIT Tools", menus);
}

/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar() {
  var t = HtmlService.createTemplateFromFile('Sidebar');
  t.statdata = getData(COL_STATUS);
  t.locdata  = getData(COL_LOC);
  t.dupdata  = getData(COL_DUP);
  var ui = t.evaluate().setTitle('Inventory Tools');
  SpreadsheetApp.getUi().showSidebar(ui);
}

function getCol(colname) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var col = 0;
  for (var i=1; i<sheet.getLastColumn(); i++) {
    if (sheet.getRange(1, i, 1, 1).getValue() == colname){
      col = i;
      break;
    }
  }
  return col;
}


function getColRange(col) {
  var sheet = SpreadsheetApp.getActiveSheet();
  return sheet.getRange(COUNT_HEADROW+1, getCol(col), sheet.getLastRow()-COUNT_HEADROW);
}

function getColVals(col) {
  return getColRange(col).getValues();
}

function getData(col) {
  var coldata = getColVals(col);
  return getSortedList(countData(coldata));
}

function countData(coldata) {
  var data = {};
  for(var i=0; i<coldata.length; i++) {
    var val = coldata[i][0];
    if (val == null || val == "") continue;
    if (val in data) {
      data[val]++;
    } else {
      data[val] = 1;
    }
  }
  return data;
}

function getSortedList(data) {
  var arr = [];
  for(var k in data) {
    arr[arr.length] = {"key": k, "count": data[k]};
  }  
  
  arr = arr.sort(function(a,b) {
    if (a.count < b.count) return -1;
    if (a.count > b.count) return 1;
    return 0;
  }).reverse();
  return arr;
}

function getRecnumValues(col, key) {
  var data = "";
  var keycol = getColVals(col);
  var reccol  = getColVals(COL_RECNUM);
  for(var i=0; i<keycol.length; i++) {
    var val = keycol[i][0];
    if (val != key) continue;
    var rval = reccol[i][0];
    if (rval == null || rval == "") continue;
    data += "i" + rval + "\n";
  }
  return (data == "") ? "No Data" : data;
}

function markDups() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var dupcol = getCol(COL_DUP);
  var dupdata = [];
  var barcol    = getColVals(COL_BARCODE);
  var barcounts = countData(barcol);
  var dupfirst = {};
  for(var i=0; i<barcol.length; i++) {
    var r         = i + COUNT_HEADROW + 1;
    var k         = barcol[i][0];
    var cnt       = barcounts[k];
    dupdata[i]    = [];
    if (cnt == 1) {
      dupdata[i][0] = "Unique"; 
    } else if (k in dupfirst) {
      dupdata[i][0] = "Dup"; 
    } else {
      dupdata[i][0] = "Dup First"; 
      dupfirst[k] = true;
    }  
  }
  getColRange(COL_DUP).setValues(dupdata);
  showSidebar();
}
