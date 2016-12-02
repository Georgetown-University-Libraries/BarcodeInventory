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
### Step 1: Scanning
- Student Worker Opens Barcode Scanning Tool (PHP and JavaScript)
- Scans Book with a Barcode Scanner
 - Barcode Is Sent to a Web Service (AJAX)
 - Barcode Lookup Occurs in ILS (PHP and PostgreSQL via Sierra DNA)
 - Catalog Data Is Returned 
- Catalog Data Added to Inventory Table
 - Title, Call Number and Volume Display in Large Text

#HSLIDE
### Step 2: Evaluate Item
- **Status Error?** (item has due date, unexpected location, etc)
 - Pull Item, Add Color Coded Status Note
 - Send to Access Services
- **Title, Call Number or Volume Error?**
 - Student worker clicks a button to set an error condition
 - Item is pulled from the shelf and a color coded note is added to the item
 - Item will be sent to Metadata Servies to Resolve

#HSLIDE
### Step 3: Evaluate Item Shelf Sequence
- Normalize Call Number (JS function)
 - ILS Normalization is Unreliable
- Compare normalized call number with prior item 
- Sort Error?
 - Re-shelf if appropriate
 
#HSLIDE
### Step 4: Complete Scanning Session
- Click Link to Save Work 
 - POST inventory as CSV (AJAX)
 - Parse CSV & Create Google Sheet (Google App Script)
  - Name using first/last call numbers
  - Create table cells
   - Turn off auto-correct and formatting
   - Add CSV data 
  - Return spreadsheet link in a new tab

#HSLIDE
### Step 5: Evaluation and Bulk Update
- Concatentate inventories and open in Google Sheets (PHP)
- Group items by error condition or location (Google Apps Script Add-On)
 - Generate Sierra (ILS) "Create Lists" 
 - Bulk Correct ILS records
 
#HSLIDE
### Other Notes
- The inventory session is also saved to the browser database in case the user accidentally navigates away from the page
- A bulk data entry process is allowed if scans ever take place offline

#HSLIDE
# Demonstration
[![Demonstration Video - Starts After Overview 2:00](https://i.ytimg.com/vi/5X_QiX-E7aI/hqdefault.jpg)](https://youtu.be/5X_QiX-E7aI?t=121)

_Open this in a new tab, the slideshow tool has trouble opening this link -- or use the embedded video below_

#VSLIDE
![Full Video](https://www.youtube.com/embed/5X_QiX-E7aI)

#HSLIDE
### Project Inspiration
- Project was inspired by a project at University of Dayton Library 
 - That project allowed a user to scan into Google Sheets
 - Barcode lookups were performed in batches rather than item by item
 - Used a similar query method with Sierra DNA
- U Dayton Shared Code
 - Optimized Sierra DNA Query
 - Call Number Normalization
 
#HSLIDE
### Development Process
- Iterative process working with Access Services Staff
- Google Sheets version was too slow to allow Title/Call Number/Volume Validation
- Opportunity for experimentation
 - Call Number Sorting Added Later
 - The Google Sheets Add-On Was a Learning Opportunity
  
#HSLIDE
### Challenges
- Did not want to re-create the ILS 
 - Data persists only in the ILS
 - Inventory files, if retained, will be managed by Access Services
- The need to concatentate and analyze files led us to also save inventory files to a server
- Some duplicated uploads of inventory files

#HSLIDE
### Conclusion
- Process is underway and going well
- Great Collaboration
- Great Learning
- Will Re-use Many Components in the Future
- Code is on GitHub
 - PHP Barcode Lookup
 - HTML & Client JavaScript
 - Google Apps Add-On
