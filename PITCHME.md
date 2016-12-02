#HSLIDE
##A Single Page Web App to Inventory 900,000 Books!

### Terry Brady
### Georgetown University Library

- https://github.com/terrywbrady/info

#HSLIDE
![Lauinger Library Stacks](presentation-files/stacks.jpg)

### An inventory of 900,000 items in our stacks will take place before a library system (ILS) migration

#HSLIDE
### Possible actions on these 900,000 items
- No action required
- Re-shelve item - out of sequence
- Send to Metadata Services Staff for Correction
- Send to Access Services Staff for Correction

#HSLIDE
# Action Legend
![Action Legend with the Tool](presentation-files/legend.jpg)

#HSLIDE
# Step 1: Scanning
- Student Worker Opens Barcode Scanning Tool (PHP and JavaScript)
- Student Worker Scans Books with a Barcode Scanner
 - Barcode Is Sent to a Web Service (AJAX)
 - Barcode Lookup Occurs in ILS (PHP and PostgreSQL via Sierra DNA)
 - Catalog Data Is Returned 
- Web Page Refreshes with Catalog Data for the Last Item Scanned
 - Title, Call Number and Volume Display in Large Text

#HSLIDE
# Step 2: Evaluate Item
- If an error condition is retuned (item has due date, unexpected location, etc)
 - Item is pulled from shelf and a color coded note is added to the item
 - Item will be sent to Access Services to Resolve
- Student worker manually compares the Title, Call Number and Volume
 - Student worker clicks a button to set an error condition
 - Item is pulled from the shelf and a color coded note is added to the item
 - Item will be sent to Metadata Servies to Resolve
 
#HSLIDE
# Step 3

#HSLIDE
![Video](https://www.youtube.com/embed/5X_QiX-E7aI?start=2m)

