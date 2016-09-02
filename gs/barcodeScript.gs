/*
Author: Terry Brady, Georgetown University Libraries
Public Repo: https://github.com/Georgetown-University-Libraries/BarcodeInventory

This code supports a barcode scanning inventory process.  This process will identify scanned books that must be pulled from the stacks to update information in Sierra.

Scanned data will be persisted in Google Spreadsheets that are shared by the scanning team

Pre-requisites
- Google Apps 
- A master Google Sheet containing (1)this script (2)custom format rules
- A web service (accessible to Google Servers) that will supply additional data about scanned items from Sierra
  A PHP version of this service is distributed with this repository
  
  Web Service Endpoints
    GET           : Returns a single JSON representation of a barcoded item
      ?barcode=x    barcode to query
      &sheetrow=x   row number of the barcode to query
      
    POST          : Returns an array of JSON representations of barcoded items
      payload       A JSON array of objects to query (containing fields barcode and row)
                    [
                      {"row": 2, "barcode": "11111111111111"},
                      {"row": 5, "barcode": "22222222222222"}
                    ]
      
    JSON Structure for a barcoded item
    {
      "sheetrow":      "the row number passed in with the barcode",
      "barcode":       "barcode of the item queried", 
      "location_code": "stack location",
      "call_number":   "item call number",
      "volume":        "item volume",
      "title":         "item title",
      "status_code":   "item status code",
      "due_date":      "item due date (if checked out according to Sierra)",
      "icode2":        "icode2",
      "is_suppressed": "bib is suppressed in Sierra",
      "record_num":    "Sierra record number",
      "status":        "Summary status for the item based on local implementation rules",
      "status_msg":     "Detailed message explaining the status field"
    }
  
Challenges
- The process must force new users of a spreadsheet to authorize the services used by the script
- The script code must be replicated to any new spreadsheets.  Therefore, all spreadsheet instances must be created by duplicating the master spreadsheet.
- Google Script
  - The onEdit() function indicates which cells were edited
  - The onEdit() function cannot call out to external Google Services or external URL's
  - The onChange() function is queued up and runs after onEdit.
  - The onChange() function may call external services
  - The onChange() function does not pass a parameter, so the scope of the change is not identified
  - In order to trigger service calls for new barcodes, the onEdit() function adds a note to a modified cell.  
    The onChange() looks for the notes to trigger further processing

----------------------------------------------------------------------------------------------------------------------------------------------
License information is contained below.

Copyright (c) 2016, Georgetown University Libraries All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer. 
in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials 
provided with the distribution. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, 
BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. 
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) 
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

/*
Common Variables
--------------------------------------------------------------------
*/
//starting row
var START=2;
var HEADS = [["Barcode","Location Code","Call Number","Volume","Title","Status Code","Due Date","icode2","Is Suppressed (Bib)","Record Num","Status","Status Message"]];

var COL_BARCODE    = 1;
var COL_LOC        = 2;
var COL_CALLNO     = 3;
var COL_VOL        = 4;
var COL_TITLE      = 5;
var COL_SCODE      = 6;
var COL_DUE        = 7;
var COL_ICODE      = 8;
var COL_SUPP       = 9;
var COL_RECNUM     = 10;
var COL_STATUS     = 11;
var COL_STATUS_MSG = 12;
var COL_MAX        = 12;

var BATCH_MAX=50;
var BATCH_GAP=15;

//The following rule may be institution specific
var REGEX_BARCODE = /^[0-9]{14,14}$/;


//Set institution specific config in Config.gs
//var URL="https://<your-server>/barcodeApi.php";

//On Spreadsheet Open, add menu items 
//If the scripts are not yet authorized, Google Sheets may quietly fail when calling unauthorized services
//If a new user runs the init() function, it should trigger the authorization prompt.
function onOpen(e) {
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var menus = [];
  menus.push({name: "Initialize Sheet", functionName: "init"});
  menus.push({name: "Retry Incomplete Barcodes", functionName: "retry"});
  menus.push({name: "Rerun All Barcodes", functionName: "rerun"});
  menus.push({name: "Duplicate (Create New Inventory Sheet)", functionName: "duplicateSpreadsheet"});
  ssheet.addMenu("Barcode", menus);
  init();
}

//Initialze the spreadsheet for user with the barcode tool
function init() {
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ssheet.getActiveSheet();

  //Set Column Widths
  sheet.setColumnWidth(COL_BARCODE, 120)
       .setColumnWidth(2, 60)
       .setColumnWidth(3, 200)
       .setColumnWidth(4, 60)
       .setColumnWidth(5, 300)
       .setColumnWidth(6, 60)
       .setColumnWidth(7, 80)
       .setColumnWidth(8, 60)
       .setColumnWidth(9, 60)
       .setColumnWidth(10, 80)
       .setColumnWidth(COL_STATUS, 60)
       .setColumnWidth(COL_STATUS_MSG, 400);

  //Set Column Headers
  var heads = sheet.getRange(1,1,1,HEADS[0].length);
  heads.setValues(HEADS);
  heads.setBackground("yellow"); 
  heads.setFontWeight("bold");

  //Turn off all data validation/auto-correct for all cells in the spreadsheet by marking the fields as TEXT
  var data = sheet.getRange(2,1,sheet.getMaxRows(),HEADS[0].length);
  data.setNumberFormat("@STRING@");
  data.setBackground("#EEEEEE");
  var all = sheet.getRange(1,1,sheet.getMaxRows(),HEADS[0].length);
  all.setWrap(true);
  
  //Force the Google Apps Authorization Prompt to run for new users
  ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  UrlFetchApp.fetch(URL);
  
  //Add an onChange trigger for the spreadsheet
  var trig = ScriptApp.getProjectTriggers();
  if (trig.length == 0) {
    ScriptApp.newTrigger("onChange").forSpreadsheet(ssheet).onChange().create();
  }
}

//Force a rerun of all barcodes in the spreadsheet
function rerun() {
  Logger.log("Rerun");
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  Logger.log("LOCK: "+lock.hasLock());
  updateBatches(makeUpdateBatches(getRerunUpdates()), true);
  lock.releaseLock();
}

//Force a retry of all barcodes without returned data
function retry() {
  Logger.log("Retry");
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  Logger.log("LOCK: "+lock.hasLock());
  updateBatches(makeUpdateBatches(getRetryUpdates()), true);
  lock.releaseLock();
}

//Duplicate the spreadsheet for a new scanning session.  Provide a unique name for the new spreadsheet.
function duplicateSpreadsheet() {
  var formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH:mm");
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var newFile = DriveApp.getFileById(ssheet.getId()).makeCopy("Inventory."+formattedDate);
  var nsheet = SpreadsheetApp.open(newFile);
  nsheet.getActiveSheet().clear();
}

//This function is triggered after any cell is edited
//Look for changes that apply only to the barcode column
//Examine the text of each modified cell
//If the cell contains a valid barcode, add a note containing the row number of the cell
function onEdit(e){
  var range = e.range;
  Logger.log("On Edit " + range.getRow()+":"+range.getColumn());
  if (range.getLastColumn() > COL_BARCODE) return;
  if (range.getColumn() == COL_BARCODE && range.getRow() >= START) {
    for(var i=1; i<=range.getHeight(); i++) {
      var cell = range.getCell(i, COL_BARCODE);
      markValidBarcode(cell);
    }
  }
}

//This function is triggered after any cell is changed
//This function will also fire after server data has been updated into the spreadsheet
//Look for all barcode cells marked with a note
function onChange(){
  Logger.log("On Change "+Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'"));
  var lock = LockService.getScriptLock();
  lock.tryLock(5);
  if (!lock.hasLock()) return;
  updateBatches(makeUpdateBatches(getEditUpdates()), true);
  lock.releaseLock();
}

//Add a cell note if a barcode is valid
function markValidBarcode(cell) {
  if (validBarcode(cell)){
    cell.setNote(cell.getRow());
  }
}

//Validate the value of a barcode cell.  Returns boolean
function validBarcode(cell) {
  var val = cell.getValue();
  if (emptyBarcodeVal(val)) {
    var ssheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ssheet.getActiveSheet();
    sheet.getRange(cell.getRow(), COL_STATUS).setValue("");
    sheet.getRange(cell.getRow(), COL_STATUS_MSG).setValue("");
  } else if (validBarcodeVal(val)) {
    return true;
  } else {
    var ssheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ssheet.getActiveSheet();
    sheet.getRange(cell.getRow(), COL_STATUS).setValue("FAIL");
    sheet.getRange(cell.getRow(), COL_STATUS_MSG).setValue("Invalid Barcode");
  }
  return false;
}

//Check if a barcode value is empty.  Returns boolean
function emptyBarcodeVal(val) {
  if (val == null) return true;
  if (val == "") return true;
  return false;
}

//Check if a barcode value is valid.  Returns boolean
function validBarcodeVal(val) {
  return REGEX_BARCODE.test(val);
}

/*
  Find a set of barcode cells that have been recently updated
  
  Returns
    Object[] containing fields row and barcode
*/
function getEditUpdates() {
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ssheet.getActiveSheet();
  var range = sheet.getRange(START, COL_BARCODE, sheet.getLastRow()-START+1);
  var notes = range.getNotes();
  var data  = range.getValues();
  
  var updates = [];
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i][0];
    notes[i][0]="";
    if (note == null) continue;
    if (note == "") continue;
    var val = data[i][0];
    if (emptyBarcodeVal(val)) continue;
    if (!validBarcodeVal(val)) continue;
    updates.push({"row": i+START, "barcode": val});
  }
  return updates;
}

/*
  Find the list of all barcode cells whether or not they have been processed
  
  Returns
    Object[] containing fields row and barcode
*/
function getRerunUpdates() {
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ssheet.getActiveSheet();
  var range = sheet.getRange(START, COL_BARCODE, sheet.getLastRow()-START+1);
  var data  = range.getValues();
  
  var updates = [];
  for (var i = 0; i < data.length; i++) {
    var val = data[i][0];
    if (emptyBarcodeVal(val)) continue;
    if (!validBarcodeVal(val)) continue;
    updates.push({"row": i+START, "barcode": val});
  }
  return updates;
}

/*
  Find a set of barcode cells that need to be rerun (data retrieval did not occur or data retrieval failed)
  
  Returns
    Object[] containing fields row and barcode
*/
function getRetryUpdates() {
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ssheet.getActiveSheet();
  var range = sheet.getRange(START, COL_BARCODE, sheet.getLastRow()-START+1);
  var data  = range.getValues();
  var stats = sheet.getRange(START, COL_STATUS, sheet.getLastRow()-START+1).getValues();
  
  var updates = [];
  for (var i = 0; i < data.length; i++) {
    var val = data[i][0];
    var stat = stats[i][0];
    if (emptyBarcodeVal(val)) continue;
    if (!validBarcodeVal(val)) continue;
    if (stat == "PULL") continue;
    if (stat == "PASS") continue;
    updates.push({"row": i+START, "barcode": val});
  }
  return updates;
}


/*
  Analyze a set of data retrieval updates to apply.  Break the updates into batches to be sent to the server for efficiency.
  Google Sheets advises applying changes to cells in batch mode.  This process looks for relative contiguous ranges of cells to update.
  
  Input - the full set of updates to apply
    Object[] containing fields row and barcode
  
  Returns - batches of updates to apply
    Object[][] containing fields row and barcode 
*/
function makeUpdateBatches(updates) {
  var batches = [];
  var lastindex = 0;
  var curbatch = null;
  for(var i=0; i<updates.length; i++) {
    var gap = i - lastindex;
    lastindex = i;
    if (curbatch == null) {
      curbatch = [];
      batches.push(curbatch);
    } else if (curbatch.length >= BATCH_MAX || gap >= BATCH_GAP) {
      curbatch = [];
      batches.push(curbatch);
    }  
    curbatch.push(updates[i]);
  }  
  return batches;
}

/*
  Process all batches of changes to apply.  Retrieve data from Sierra via a web service.  Update the relevant spreadsheet cells.
  
  Input - batches of updates to apply
    Object[][] containing fields row and barcode 
*/
function updateBatches(batches, clearNotes) {
  if (batches.length == 0) return;
  for(var i=0; i<batches.length; i++) {
    if (i > 0) Utilities.sleep(2500);
    var label = " #" + (i+1) + " of " + batches.length + " batches";
    updateBatch(batches[i], clearNotes, label);
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("Batch Update Complete")
}

/*
  Process a relatively contiguouse batch of changes to apply.  
  
  Input - batch of updates to apply
    Object[] containing fields row and barcode 
*/
function updateBatch(batch, clearNotes, label) {
  if (batch.length == 0) return;
  var firstRow = batch[0].row;
  var lastRow = batch[batch.length-1].row;
  var rowCount = lastRow - firstRow + 1;
  
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ssheet.getActiveSheet();
  ssheet.toast("Updating rows "+ firstRow + "-" + lastRow + label, "Update in progress")

  var options = {"method": "post",  "contentType" : "application/json", "payload":JSON.stringify(batch)};
  var resp = UrlFetchApp.fetch(URL, options);
  if (resp == null || resp == "") return;
  var respdata = JSON.parse(resp.getContentText());
  
  var range = sheet.getRange(firstRow, COL_BARCODE, rowCount, COL_MAX);
  var data = range.getValues();
 
  for(var i=0; i<respdata.length; i++) {
    var respitem = respdata[i];
    var row = respitem["sheetrow"];
    if (row == undefined) continue;
    var index = row - firstRow;
    if (index < 0 || index >= data.length) continue;
    var datarow = data[index];
    setDataColumn(datarow, COL_LOC,        respitem, "location_code");
    setDataColumn(datarow, COL_CALLNO,     respitem, "call_number");
    setDataColumn(datarow, COL_VOL,        respitem, "volume");
    setDataColumn(datarow, COL_TITLE,      respitem, "title");
    setDataColumn(datarow, COL_SCODE,      respitem, "status_code");
    setDataColumn(datarow, COL_DUE,        respitem, "due_date");
    setDataColumn(datarow, COL_ICODE,      respitem, "icode2");
    setDataColumn(datarow, COL_SUPP,       respitem, "is_suppressed");
    setDataColumn(datarow, COL_RECNUM,     respitem, "record_num");
    setDataColumn(datarow, COL_STATUS,     respitem, "status");
    setDataColumn(datarow, COL_STATUS_MSG, respitem, "status_msg");
  }
  range.setValues(data);
  
  if (clearNotes) {
    var notes = [];
    for(var i=0; i<rowCount; i++) {
      notes.push([""]);
    }
    sheet.getRange(firstRow, COL_BARCODE, rowCount).setNotes(notes);
  }
}

/*
  Update the in memory representation of a cell value
  
  Input 
    Object[] datarow   - Data for a row in the spreadsheet
    int      col       - Column number to update (spreadsheet column, starts at 1)
    Object   respitem  - JSON object returned from the web service
    String   field     - Field name wihtin the json object
*/
function setDataColumn(datarow, col, respitem, field) {
  datarow[col -1] = respitem[field] == undefined ? "" : respitem[field];
}

