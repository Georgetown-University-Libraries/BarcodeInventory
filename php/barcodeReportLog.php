<?php
/*
Retrieve inventory data from Sierra by barcode.

  Web Service Endpoints
    GET           : Returns a concatenated file of all uploaded CSV files
      
    PUT           : Saves an individual CSV file
      payload       Line 1: filename to save
                    Line 2: username who uploaded the file
                    The remainder of the payload is the CSV content to write.

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

*/
$CONFIG = parse_ini_file ("barcode.prop");
$path = $CONFIG["path"];
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  $putdata = fopen("php://input", "r");
  $ssname = trim(fgets($putdata));
  $user = trim(fgets($putdata));
  
  $fname = preg_replace("/[^\da-z\-]/i","_", $ssname);
  $pathname = "$path/$fname." . date("Ymd_Hi") . ".csv";
  $fp = fopen($pathname, "w");

  $linenum = 0;
  /* Read the data 1 KB at a time
   and write to the file */
  while ($line = fgets($putdata, 5000)) {
  	if ($linenum == 0) {
  	  fwrite($fp, "File,LineNum,User");  
  	} else {
  	  fwrite($fp, '"' . $ssname . '",');
  	  fwrite($fp, $linenum);  	    
  	  fwrite($fp, ",");  	    
  	  fwrite($fp, $user);  	    
  	}
  	$linenum++;
  	fwrite($fp,",");
    fwrite($fp, $line);
  }
  /* Close the streams */
  fclose($fp);
  fclose($putdata);
} else {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename=barcode.csv');

  // create a file pointer connected to the output stream
  $output = fopen('php://output', 'w');

  $numfile = 0;
  if ($handle = opendir($path)) {
    while (false !== ($entry = readdir($handle))) {
      if ($entry != "." && $entry != "..") {
      	$file = fopen("$path/$entry", "r");
      	$firstline = fgets($file, 5000);
      	if ($numfile == 0) {
      	  fwrite($output, $firstline);
      	}
      	$numfile++;
        while ($line = fgets($file, 5000)) {
          fwrite($output, $line);
        } 
        fwrite($output, "\r\n");
        fclose($file);
      }
    }
    closedir($handle);
  }
  
  fclose($output);
}

?>