/*
JavaScript Class to facilitate the upload of html data to a Google Sheet.

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
var GSheet = function(proppath) {
    var self = this;
    this.props = {service: "", folderid: ""};
    this.INSERTID = "#gsheetdiv";
    this.makeCsv = function(rows) {
        var itemdata = "";
        rows.each(function(rownum, row){
            itemdata += (rownum == 0) ? "" : "\r\n";
            $(row).find("td:not('.noexport'),th:not('.noexport')").each(function(colnum, col){
                itemdata += self.exportCol(colnum, col);
            });
        });
        return itemdata;
    }
    
    this.export = function(rows, anchor) {
        var itemdata = "data:text/csv;charset=utf-8," + this.makeCsv(rows);
        var encodedUri = encodeURI(itemdata);
        $(anchor).attr("href", encodedUri);        
    }

    this.gsheet = function(rows, name, folderid) {
        var form = $("<form/>");
        $(this.INSERTID).append(form);
        form.hide();
        form.attr("target", "_blank")
        form.attr("method", "POST");
        form.attr("action", this.props.service);
        var input = $("<textarea rows='10' cols='100'/>");
        input.attr("name","data");
        input.val(this.makeCsv(rows));
        form.append(input);
        input = $("<input type='text' name='name'/>");
        input.val(name);
        form.append(input);
        input = $("<input type='text' name='folderid'/>");
        input.val(folderid);
        form.append(input);
        input = $("<input type='submit'/>");
        form.append(input);
        form.submit();
    }

    //this is meant to be overridden for each report
    this.exportCol = function(colnum, col) {
        var data = "";
        data += (colnum == 0) ? "" : ",";
        data += self.exportCell(col);
        return data;
    }
    
    this.exportCell = function(col) {
        data = "\"";
        $(col).contents().each(function(i, node){
            if ($(node).is("hr")) {
                data += "||";
            } else {
                data += $(node).text().replace(/\n/g," ").replace(/"/g,"\"\"").replace(/\s/g," ");
                if ($(node).is("div:not(:last-child)")) {
                    data += "||";
                }
            }       
        });
        data += "\"";
        return data;
    }
    
    $.ajax({
        url: proppath,
        success: function(data, status, xhr){
            self.props = data;
        },
        error: function(xhr, status, err){
            alert(err);
        },
        dataType: "json",
    });
    
}

