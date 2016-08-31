# BarcodeInventory
Support barcode scanning inventory process using data from Sierra

## Description
* Access Services student works will scan a shelf of books in order into a Google Sheet containing Google Apps Script code.
* The Google Sheet has a trigger that marks the new barcode with a comment (onEdit function)
* A trigger fires (onChange) that looks for barcodes to be validated
* A call is made to a PHP web service that looks up barcode data using Sierra DNA
* The response from the PHP Service returns a status: PASS, FAIL, PULL that indicates the action the student worker will take with the item that was scanned.

![](barcode.jpg)

## Credit
This project was inspired by a project from the University of Dayton Library: https://github.com/rayvoelker/2015RoeschLibraryInventory
