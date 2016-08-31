/*
Author: Terry Brady, Georgetown University Libraries

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

See http://techdocs.iii.com/sierradna/

*/
var START=2;
var HEADS = [["Barcode","Location Code","Call Number","Volume","Title","Status Code","Due Date","icode2","Is Suppressed (Bib)","Record Num","Status","Status Message"]];
var RUNNING=false;
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
//Set to actual script path
var URL="https:.../barcodeApi.php";
var BATCH_MAX=50;
var BATCH_GAP=15;


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

function init() {
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ssheet.getActiveSheet();
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
  var heads = sheet.getRange(1,1,1,HEADS[0].length);
  heads.setValues(HEADS);
  heads.setBackground("yellow"); 
  heads.setFontWeight("bold");
  var data = sheet.getRange(2,1,sheet.getMaxRows(),HEADS[0].length);
  data.setNumberFormat("@STRING@");
  data.setBackground("#EEEEEE");
  var all = sheet.getRange(1,1,sheet.getMaxRows(),HEADS[0].length);
  all.setWrap(true);
  ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  UrlFetchApp.fetch(URL);
  var trig = ScriptApp.getProjectTriggers();
  if (trig.length == 0) {
    ScriptApp.newTrigger("onChange").forSpreadsheet(ssheet).onChange().create();
  }
}


function rerun() {
  Logger.log("Rerun");
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  Logger.log("LOCK: "+lock.hasLock());
  updateBatches(makeUpdateBatches(getRerunUpdates()), true);
  lock.releaseLock();
}

function retry() {
  Logger.log("Retry");
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  Logger.log("LOCK: "+lock.hasLock());
  updateBatches(makeUpdateBatches(getRetryUpdates()), true);
  lock.releaseLock();
}

function duplicateSpreadsheet() {
  var formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH:mm");
  var ssheet = SpreadsheetApp.getActiveSpreadsheet();
  var newFile = DriveApp.getFileById(ssheet.getId()).makeCopy("Inventory."+formattedDate);
  var nsheet = SpreadsheetApp.open(newFile);
  nsheet.getActiveSheet().clear();
}

function onChange(){
  Logger.log("On Change "+Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'"));
  var lock = LockService.getScriptLock();
  lock.waitLock(5);
  if (!lock.hasLock()) return;
  updateBatches(makeUpdateBatches(getEditUpdates()), true);
  lock.releaseLock();
}

function onEdit(e){
  var range = e.range;
  Logger.log("On Edit " + range.getRow()+":"+range.getColumn());
  if (range.getLastColumn() > 1) return;
  if (range.getColumn() == 1 && range.getRow() > 1) {
    for(var i=1; i<=range.getHeight(); i++) {
      var cell = range.getCell(i, COL_BARCODE);
      markValidBarcode(cell);
    }
  }
}

function markValidBarcode(cell) {
  if (validBarcode(cell)){
    cell.setNote(cell.getRow());
  }
}

function validBarcode(cell) {
  var val = cell.getValue();
  if (emptyBarcodeVal(val)) {
  } else if (validBarcodeVal(val)) {
    return true;
  } else {
    showColumnVal(cell, COL_STATUS, "FAIL");
    showColumnVal(cell, COL_STATUS_MSG, "Invalid Barcode");
  }
  return false;
}

function emptyBarcodeVal(val) {
  if (val == null) return true;
  if (val == "") return true;
  return false;
}

function validBarcodeVal(val) {
  return /^[0-9]{14,14}$/.test(val);
}


function run() {
    getData(SpreadsheetApp.getActiveSheet().getRange(1, COL_BARCODE));
}

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

function updateBatches(batches, clearNotes) {
  if (batches.length == 0) return;
  for(var i=0; i<batches.length; i++) {
    if (i > 0) Utilities.sleep(2500);
    var label = " #" + (i+1) + " of " + batches.length + " batches";
    updateBatch(batches[i], clearNotes, label);
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("Batch Update Complete")
}

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

function setDataColumn(datarow, col, respitem, field) {
  datarow[col -1] = respitem[field] == undefined ? "" : respitem[field];
}

