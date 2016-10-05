<?php
/*
Retrieve inventory data from Sierra by barcode.

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
      "status_msg":    "Detailed message explaining the status field",
      "timestamp":     "Time scan was performed"
    }


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
include 'Sierra.php';

$SIERRA = new Sierra();

$barcode = isset($_GET["barcode"]) ? $_GET["barcode"] : "";
$sheetrow = isset($_GET["sheetrow"]) ? $_GET["sheetrow"] : "";

if ($barcode != "") {
  echo json_encode(showReport($SIERRA, $barcode, $sheetrow));  
} else {
  $search = file_get_contents('php://input');
  if ($search == null || $search == "") {
    echo json_encode(array("status" => "no input"));
    return;
  }
  $reqs = json_decode($search);
  $result = array();
  foreach($reqs as $req) {
    $result[] = showReport($SIERRA, $req->barcode, $req->row);
  }
  echo json_encode($result);  
}


function showReport($SIERRA, $barcode, $sheetrow) {  
    $sql = <<< HERE2
select 
  pe.index_entry as barcode,
  iv.record_num,
  iv.location_code,
  iv.item_status_code,
  iv.icode2,
  (select to_char(due_gmt,'YYYY-MM-DD') from sierra_view.checkout where item_record_id = iv.id),
  (select field_content from sierra_view.varfield_view where record_type_code = 'i' and varfield_type_code='v' and record_id=iv.id) as vol,
  br.is_suppressed as bib_suppress,  
  (select content from sierra_view.subfield_view where record_id=iv.id and marc_tag = '090' and record_type_code='i' and field_type_code='c' and tag='a' limit 1) as f090a,
  (select content from sierra_view.subfield_view where record_id=iv.id and marc_tag = '090' and record_type_code='i' and field_type_code='c' and tag='b' limit 1) as f090b,
  (select content from sierra_view.subfield_view where record_id=iv.id and marc_tag = '099' and record_type_code='i' and field_type_code='c' limit 1) as f099,
  (select content from sierra_view.subfield_view where record_id=iv.id and marc_tag is null and record_type_code='i' and field_type_code='c' and tag is null limit 1) as varc,
  (select content from sierra_view.subfield_view where record_id=iv.id and marc_tag is null and record_type_code='i' and field_type_code='c' and tag = 'b' limit 1) as varcb,
  bv.title,
  now()
from 
  sierra_view.phrase_entry pe 
inner join
  sierra_view.item_view iv
  on pe.record_id = iv.id
inner join
  sierra_view.bib_record_item_record_link bi
  on bi.item_record_id=iv.id
inner join
  sierra_view.bib_view bv
  on bv.id=bi.bib_record_id
inner join
  sierra_view.bib_record br
  on br.id=bi.bib_record_id
where 
  pe.index_tag || pe.index_entry = :barcode
HERE2;
	$arg = array(":barcode" => 'b' . $barcode);
	$resdata = array("barcode" => $barcode, "status_msg" => " ** Barcode Not Found", "status" => "NOT-FOUND");

	$dbh = $SIERRA->getPdoDb();
	if ($dbh == null) {
	    $resdata["status_msg"] = " ** No connection available.  Try again later";
	    $resdata["status"] = "FAIL";
	    return $resdata;
	}
	$stmt = $dbh->prepare($sql);
	$result = $stmt->execute($arg);
 	if (!$result) {
 	    $err = $dbh->errorInfo();
 	    $msg = (count($err) > 2) ? $err[2] : "No Details";
	    $resdata["status_msg"] = " ** SQL Error: " . $msg;
	    $resdata["status"] = "FAIL";
	    return $resdata;
 	}       
	$result = $stmt->fetchAll();
 	foreach ($result as $row) {
            
        $status = "PASS"; //PASS, PULL, FAIL, NA
        $status_msg = "Barcode Found. ";
        $recnum   = $row[1];
        $loc      = $row[2];
        $statcode = $row[3];
        $icode2   = $row[4];
        $due      = $row[5];
        $vol      = $row[6];
        $supp     = $row[7];
        
        $f090a    = $row[8];
        $f090b    = $row[9];
        $f099     = $row[10];
        $varc     = $row[11];
        $varcb    = $row[12];

        $title    = $row[13];
        $timest   = $row[14];

 	    $call_number = "-";
 	    if ($f090a != "" && $f090b != "") {
 	        $call_number = $f090a . " " . $f090b;
 	    } else if ($f090a != "" && $f090a != null) {
 	        $call_number = $f090a;
 	    } else if ($f099 != "" && $f099 != null) {
 	        $call_number = $f099;
 	    } else if ($varc != "" && $varc != null && $varcb != "" && $varcb != null) {
 	        $call_number = $varc . $varcb;
 	    } else if ($varc != "" && $varc != null) {
 	        $call_number = $varc;
 	    } else if ($varcb != "" && $varcb != null) {
 	        $call_number = $varcb;
        }
        
        if ($loc != "stx" && $loc != "stxpj" && $loc != "stxpl" && $loc != "ncstx" && $loc != "rf1st") {
          $status = ($status == "PASS") ? "PULL-LOC" : "PULL-MULT";
          $status_msg .= "Location is not stx, stxpj, stxpl, ncstx, or rf1st. ";             
        }

        if ($loc == "ncstx" || $loc == "rf1st") {
          if ($statcode != "-" && $statcode != "o") {
            $status = ($status == "PASS") ? "PULL-STAT" : "PULL-MULT";
            $status_msg .= "Loc ncstx/rf1st and Status Code is not '-' or 'o'. ";             
          }                  
        } else {
          if ($statcode != "-") {
            $status = ($status == "PASS") ? "PULL-STAT" : "PULL-MULT";
            $status_msg .= "Status Code is not '-'. ";             
          }      
        }

        if ($due != "") {
          $status = ($status == "PASS") ? "PULL-DUE" : "PULL-MULT";
          $status_msg .= "Item has a due date. ";             
        }

        if ($icode2 == "n") {
          $status = ($status == "PASS") ? "PULL-ICODE" : "PULL-MULT";
          $status_msg .= "Icode2 is 'n'. ";             
        }
        if ($supp != false) {
          $status = ($status == "PASS") ? "PULL-SUPP" : "PULL-MULT";
          $status_msg .= "Bib Suppress is true. ";             
        }
        
 	    $resdata = array(
 	      "sheetrow"         => $sheetrow,
 	      "barcode"          => $barcode,
 	      "record_num"       => $recnum,
 	      "location_code"    => $loc,
 	      "status_code"      => $statcode,
 	      "icode2"           => $icode2,
 	      "due_date"         => $due,
 	      "volume"           => $vol,
 	      "is_suppressed"    => $supp,
 	      "call_number"      => $call_number,
	      "title"            => $title,
	      "timestamp"        => $timest,
  	      "status"           => $status,  
  	      "status_msg"       => $status_msg,
 	    );
	}  
	return $resdata;
}
?>