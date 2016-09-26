# BarcodeInventory
Support barcode scanning inventory process using data from Sierra.

Results are exported to Google Sheets using a service provided in the following project: https://github.com/Georgetown-University-Libraries/PlainTextCSV_GoogleAppsScript

## Demonstration Video
This video demonstrates a barcode scanning inventory workflow developed by the Georgetown University Library.  

[![Demonstration Video](https://i.ytimg.com/vi/o_tthuoCVMk/hqdefault.jpg)](https://youtu.be/o_tthuoCVMk)

## Description
* Access Services student works will scan a shelf of books into a web page.
* The response from the PHP Service returns a status: PASS, FAIL, PULL that indicates the action the student worker will take with the item that was scanned.
* Student validates the Call Number, Title, and Volume on the book.  The student marks items with incorrect information.
* Items in error are pulled from shelves
* Scanning results are exported to Google Sheets.  Corrections are made into Sierra using these results.
* The table is cleared an a new scanning session is started. 

![](barcode2.jpg)

# BarcodeInventory (Google Sheets Version)
Support barcode inventory scanning into Google Sheets process using data from Sierra.

_This version of the process was abandoned due to poor performance._

See [GoogleSheets Code](gs/README.md)

## Credit
This project was inspired by a project from the University of Dayton Library: https://github.com/rayvoelker/2015RoeschLibraryInventory

***
[![Georgetown University Library IT Code Repositories](https://raw.githubusercontent.com/Georgetown-University-Libraries/georgetown-university-libraries.github.io/master/LIT-logo-small.png)Georgetown University Library IT Code Repositories](http://georgetown-university-libraries.github.io/)
