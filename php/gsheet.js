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

