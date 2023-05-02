# Thread topology scanner
Scope of this software is to have a tool to analyze routers and children on a Thread network.

Software, written in python and pure js, connect to an OpenThread device with CLI[^1]  through serial port. Once connected
the software try to establish a connection between device and the network, once connection is done the device raise itself
as a router and send diagnostic request to the network.

## User interface
The UI is served as an html page with canvas. 
To open the UI, after starting the software, visit http://127.0.0.1:5001

**Please note UI is based on FLASK package and it is not meant to be published in production environments!!! Keep the link
in your local network! Publishing the webserver to the internet may result in security risks!**  

## ToDo:
- Python backend
  - [x] Populate nodes for children too
  - [ ] Implement the capability to use the Boarder router ot-ctl in some way
  - [ ] Set up a DB to manage the objects, actually we are writing a JSON file that is useful at the beginning but once node start to increase it can be slow
  - [ ] Separate UI thread and communication thread
  - [ ] Add an auto-refresh feature
  - [x] Make node expire - Node has a defult expiration time of 120s
  - [ ] Format python logging with date and time

- Frontend
  - [ ] Implement different layers like building floor to better represent the real device physical configuration
  - [ ] Implement the capability to use SVG as background
  - [ ] Implement PNG icons for devices based on the DB implemented in the backend
  - [ ] Remove expired nodes
  - [x] Shade node based on the last time the node was seen in a scan. This help to better see how "old" data is.



## References
The idea behind this software was taken from: https://www.nordicsemi.com/Products/Development-tools/nrf-thread-topology-monitor

[^1]: OpenThread CLI Reference: https://openthread.io/reference/cli/commands?hl=it