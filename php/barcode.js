var gsheet;
var dialog;
$(document).ready(function(){
    gsheet = new GSheet("gsheet.prop.json");
    $("#addb").on("click", function(){
        barcodeDialog();
    });
    $(document).bind('keypress', function(e){
       if ( e.keyCode == 13 ) {
         $("button.ui-button:first:enabled").click();
         return false;
       }
    });
    
    dialog = $( "#dialog-form" ).dialog({
      autoOpen: false,
      height: 600,
      width: 700,
      modal: true,
      buttons: {
        "Add Barcode": function() {
          addBarcode($("#barcode").val());
          $("#barcode").val("");
        },
        "Done": function() {
          dialog.dialog( "close" );
          $("#gsheetdiv").show();
        }
      },
    });
    $("#barcode").on("keyup", function(){valBarcode()});
    $("#barcode").on("change", function(){valBarcode()});
    barcodeDialog();
    $("#gsheetdiv").hide();
    
    var s = $("#test").val();
    if (s != "" && s!= null) {
        //load test barcodes if set
        addCodes(s);        
    } else if ('barcodes' in localStorage) {
        //load autosave barcodes
        if (localStorage.barcodes != "" && localStorage.barcodes != null) {
            var cnt = localStorage.barcodes.split(",").length;
            var msg = $("<div>A list of <b>"+cnt+"</b> barcodes exist from a prior session<br/>Click <b>OK</b> to load them.<br/>Click <b>CANCEL</b> to start with an empty list.</div>");
            mydialog("Add Autosave Barcodes?", msg, function() {
                addCodes(localStorage.barcodes);}
            );            
        }
   }
    
    $("#exportGsheet").on("click", function(){
        var cnt = $("tr.datarow").length;
        if (cnt == 0) {
            var msg = $("<div>There is no data to export.  Please scan some barcodes</div>");
            mydialog("No data available", msg, function() {
                barcodeDialog();
            });
            return;
        }
        gsheet.gsheet($("#restable tr"), makeSpreadsheetName(), gsheet.props.folderid);
        var cnt = $("tr.datarow").length;
        var msg = $("<div>Please confirm that <b>"+cnt+"</b> barcodes were successfully exported and saved to Google sheets.Click <b>OK</b> delete those barcodes from this page.</div>");
        mydialog("Clear Barcode Table?", msg, function() {
            $("tr.datarow").remove();
            autosave();
            barcodeDialog();
        });
    });
    $("button.lastbutt").on("click", function() {
        $("tr.datarow:first").removeClass("PULL").removeClass("PASS").removeClass("FAIL").addClass($(this).attr("status"));
        $("tr.datarow:first td.status").text($(this).attr("status"));
        var v = $(this).hasClass("reset") ? $(this).attr("status_msg") : $("tr.datarow:first td.status_msg").text() + "; " + $(this).attr("status_msg");
        $("tr.datarow:first td.status_msg").text(v);
        $("tr.datarow:first").removeClass("META").addClass($(this).attr("status"));
    });
});

function barcodeDialog() {
    $("#bcCall").text($("tr.datarow:first td.call_number").text());
    $("#bcTitle").text($("tr.datarow:first td.title").text());
    $("#bcVol").text($("tr.datarow:first td.volume").text());
    $("#lbreset").attr("status", $("tr.datarow:first td.status").text());
    $("#lbreset").attr("status_msg", $("tr.datarow:first td.status_msg").text());
    $("#gsheetdiv").hide();
    dialog.dialog( "open" );    
}

function makeSpreadsheetName() {
    $("td.call_number").removeClass("has_val");
    $("td.call_number").each(function(){
        if ($(this).text() != "") $(this).addClass("has_val");
    });
    var start = $("tr.datarow td.call_number.has_val:first").text();
    start = (start == "") ? "NA" : start;
    var end = $("tr.datarow td.call_number.has_val:last").text();
    end = (end == "") ? "NA" : end;
    $("td.call_number").removeClass("has_val");
    return end + "--" + start;
}

function addCodes(s){
    var testCodes = s.split(",");
    for(i=0; i<testCodes.length; i++) {
        addBarcode(testCodes[i]);
    }    
}

function delrow(cell) {
  $(cell).parents("tr").remove();
  autosave();
}

function addBarcode(barcode) {
    if (barcode == null || barcode == "") return;
    //if (!isValidBarcode(barcode)) return;
    if (isDuplicateBarcode(barcode)) return;
    var tr = $("<tr class='datarow new'/>");
    tr.attr("barcode",barcode);
    //http://www.w3schools.com/w3css/w3css_icons.asp
    var td = $("<td class='noexport action'><button onclick='javascript:delrow(this);'><i class='material-icons'>delete</i></button></td>");
    tr.append(td);
    td = $("<th class='barcode'>" + barcode + "</th>");
    tr.append(td);
    tr.append($("<td class='location_code'/>"));
    tr.append($("<td class='call_number'/>"));
    tr.append($("<td class='volume'/>"));
    tr.append($("<td class='title'/>"));
    tr.append($("<td class='status_code'/>"));
    tr.append($("<td class='due_date'/>"));
    tr.append($("<td class='icode2'/>"));
    tr.append($("<td class='is_suppressed'/>"));
    tr.append($("<td class='record_num'/>"));
    tr.append($("<td class='status'/>"));
    tr.append($("<td class='status_msg'/>"));
    tr.append($("<td class='timestamp'/>"));
    $("#restable tr.header").after(tr);
    autosave();
    processCodes();
}

function autosave() {
    var arr = [];
    $("th.barcode").each(function() {
        arr.push($(this).text());
    });
    localStorage.barcodes=arr.reverse().join(",");    
}

function processCodes() {
    if ($("#restable tr.processing").length > 0) return;
    var tr = $("#restable tr.new:last");
    if (tr.length == 0) return;
    tr.removeClass("new").addClass("processing");
    var barcode = tr.attr("barcode");

    if (!isValidBarcode(barcode)) {
        var stat = tr.find("td.status");
        stat.text("FAIL");
        tr.find("td.status_msg").text("Invalid item barcode");
        tr.addClass(stat.text());
        tr.removeClass("processing");
        processCodes();
        barcodeDialog();
        return;
    }
    $.getJSON("barcodeReportData.php?barcode="+barcode, function(data){
        var resbarcode = data["barcode"];
        var tr = $("#restable tr[barcode="+resbarcode+"]");
        for(key in data) {
            var val = data[key] == null ? "" : data[key];
            tr.find("td."+key).text(val);
        }
        tr.addClass(tr.find("td.status").text());
        tr.removeClass("processing");
        processCodes();
        barcodeDialog();
    });
}

function isValidBarcode(barcode) {
    return /^[0-9]{14,14}$/.test(barcode);
}

function isDuplicateBarcode(barcode) {
    return ($("tr[barcode="+barcode+"]").length > 0)
}

function valBarcode() {
    var bc = $("#barcode");
    var msg = $("#message");
    msg.text("");

    bc.addClass("ui-state-error");    
    $("button.ui-button:first").attr("disabled", true);
    
    var v = bc.val();
    if (v == null || v == "") {
        msg.text("Barcode cannot be empty");
    } else if (!isValidBarcode(v)) {
        msg.text("Enter a 14 digit barcode");
    } else if (isDuplicateBarcode(v)) {
        msg.text("Duplicate barcode");
    } else {
        msg.text("Barcode appears to be valid");
        bc.removeClass("ui-state-error");    
        $("button.ui-button:first").attr("disabled", false);
    }
}

function mydialog(title, mymessage, func) {
  $("#dialog-msg").html(mymessage);
  $("#dialog-msg").dialog({
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    title: title,
    buttons: {
      OK: function() {
        $( this ).dialog( "close" );
        func();
      },
      Cancel: function() {
        $( this ).dialog( "close" );
      }
    }
  });
}
