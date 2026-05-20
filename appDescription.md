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
- The other components are not publicly available, the storage account does not have public endpoints, it only accepts connections from both container apps
- Only use service principles for authentication against azure
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