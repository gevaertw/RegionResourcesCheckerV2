# purpose of the application
- a Web page to inform the customer of the azure services that are available in a region.


# how it would work
- By dooing an API call to the azure resource manager one can list the available service providers in a region
- Another API call might be required to list all available VM SKUs
- For that the application needs a connection to an Azure subscrition and read it out


# Architecture
GUI -> Middle Tier -> Storage
## Gui
- The gui is a static website that runs in a container app, it reads the data from the storage account and shows it to the end user in a user friendly way
- Use a single CSS to controll layout.  Use layout, colours and fonts that look like the ones Microsoft uses
- clearly mention that the application is not an official Microsoft Page and that the info is provided as-is in the header
- As recource providers have up to 4 levels of depth, they are displayed in a kind of drill down way, where te end user is able to drill down by colapsing / expanding the resource provider in the GUI.  This also provides grouping based on the leveldepth
- A resource provider part that is not available, regardles of the level has is striked trough.
- The gui has the option to only show available resource providers, again regardles of the position in the tree, do this by an iphone style checkbox (slider button) in the header
- Use a dropdown selector to select the region in the gui
- show a colapse / expand all buton
- Add a search field so the user can enter the resource hes looking for.  When something is fond, that part of the tree is expanded

## Midle Tier
- The middle tier is a container app job that reads out the subscription every hour
- It runs in a different container than the GUI
- Each region is another container app job, the region name is a parameter for the container ap job
- start with 2 regions, Belgium Central and Denmark, make sure it is easy to add regions later on, this shoul be in a parameter file

## Storage
- Data is stored is stored on a storage account in json format
- Each region is stored in a different file
- Resouce providers have up to 4 levels of depth, this can be resembled in the json structure

# Security bounderies
- The gui is accessible without any authentication, its a public site
- The other components are not publicly available, the storage account does not have public endpoints, it only accepts connections from both container apps so use a vnet and private endpoints
- Only use service principles for authentication against azure
- You cannot use access kets or sas tokens on the storage account
- All secrets are stored in a Premium keyvault 

# Code Boundaries
- All application code is written in node.js
- Gui is written in react
- Container apps are linux containers, not windows

# Deployment
- All azure deployment code is written as IAC using Bicep
- Make sure the application, both the infrastructure as the application can be deployed using a simple prompt
- Make sure that if there are no infra changes, the infra deployment is not triggered, its a waste of time
- Store all parameters required for deployment in a project parameters.json file, keep secrets in a secrets.json file
- Container images are stored in a ACR

# rework 01
currently the GUI looks ok but the information is not displyed right:
- Do not mention if providers are registered or not, its not relevant and its bound to a subscription
- The buton to show only available only works on the first level, it should work in the entire tree
- The search bar is low quality, results are crap, add a decent search component

# rework 01.1 - GUI improvements
- the search now shows amount of matches but does not apply the filter, it simply highlights.  Add a button to apply filter, when that button is clicked only the filtered items are displayed (always show the branch to the root)
- also on the search when highlighting a result the color to mark it must be different, the light yellow is low contrast with the white page background
- In general the gui is a bit old fashoned and unatractive, make it more apealing
- Use similar coulour shemes as Microsoft
- Make sure that everything is readable an good contrast, the current yellow and white are not good contrast
- when entering something in the search bar, the filter buttom apears below the search bar.  It should be right next to the search bar and always available.
- the current colapse / expand buttons are also white only, make nice buttons
- add a footer with the text "Vibecoded with love (heart emoticon) and github copilot"

- add a button expand 1 level.  The buton is placed left to the expand all button it will expand 1 level
- You added a footer with the text "Vibecoded with love (heart emoticon) and github copilot"  the love should not have been there, only the heart
- Add a line in the footer that states that the app only shows regional services, global services like frontdoor are not shown
- Move the +1 level to the right of the expand all button, then add a Collapse 1 Level button next to it, that button will colapse 1 level.  the button order is now : "Expand All", "Expand 1 Level", "Collapse 1 level", "Collapse All" (use this naming)
- The triangle icons that expand each line are very small, double the size
- update the GUI default view : available only, 1 level expanded
- 

# rework 01.2.0 - Data quality
- there are some meaningless sub resources in the tree, the are (take these string literaly) "operations", "locations" and "usages".  Filter those out of the results, also filter out resources on the levels lower than these

# Add VM lists
we are gooing to add VMs to the app 
- We will be dooing this on a new page, so the top menu should have a button to switch between resources and VMs
- Use exactly the same look and feel as for the resources
- Put the VM data in separated json files on the storage account, again separated by region
- Group VMs by Family, inside the group order by subtype
- For each subtype list all available sizes, the amount of Zones the type is available, and finaly the capabilities 

- Group VMs by Family, inside the group order by core count
