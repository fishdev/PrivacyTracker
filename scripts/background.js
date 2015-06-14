var ExtensionDataName = "PrivacyHeaders";
var ExtensionData;
var TrackerDataName = "PrivacyTrackers";
var TrackerData;
var BlockedDataName = "PrivacyBlockers";
var BlockedData;
var HistoryDataName = "PrivacyHistory";
var HistoryData;
var CurrentTab;
var showTutorial;
var count = -1;

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // Clear cache
  chrome.browsingData.remove({
    "since": 0
  }, {
    "appcache": true,
    "cache": true
  }, function() {
    console.log("Proper loading ensured.");
  });

  // Do stuff if necessary
  if(tab.url.indexOf("http://") > -1 || tab.url.indexOf("https://") > -1) {
    if(changeInfo.status=="loading") {
      var tabUrl = tab.url;
      var tabTitle = tab.title;
      var tabIcon = tab.favIconUrl;

      // Create data if necessary
      if(count==-1) {
        createData(ExtensionDataName);
        createData(TrackerDataName);
        createData(BlockedDataName);
        createData(HistoryDataName);
        createOptions("PrivacyOptions");
        showTutorial = true;
      } else {
      	showTutorial = false;
      }

      // Advance tracker assignment count
      console.log("Loading initiated: " + count + " -> " + (count+1));
      count++;

      // Get extension, tracker, blocked, and history data
      chrome.storage.local.get(ExtensionDataName, function(r) {
        ExtensionData = r[ExtensionDataName];
        console.log("Data retrieved.");
      });
      chrome.storage.local.get(TrackerDataName, function(r) {
        TrackerData = r[TrackerDataName];
        console.log("Trackers retrieved.");
      });
      chrome.storage.local.get(BlockedDataName, function(r) {
        BlockedData = r[BlockedDataName];
        console.log("Blocks retrieved.");
      });
      chrome.storage.local.get(HistoryDataName, function(r) {
        HistoryData = r[HistoryDataName];
        console.log("History retrieved.");
      });

      // Record tracker details
      chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
        if(details.tabId!=-1) {
          console.log("Headers received: " + count);

          if(ExtensionData[count-1]!="" && ExtensionData[count-1]!=null) {
            if(details.url!=CurrentTab.url) {
              if(getDomain(details.url)!=getDomain(CurrentTab.url)) {
                if(TrackerData.indexOf(getDomain(details.url))==-1) {
                  TrackerData[TrackerData.length] = getDomain(details.url);
                }
                ExtensionData.push({id: count, tab: details.tabId, type: details.type, request: details.requestId, url: details.url, headers: details.requestHeaders, frameid: details.frameId, parentframeid: details.parentFrameId});
              }
            }
          } else {
            if(getDomain(details.url)!=getDomain(CurrentTab.url)) {
              if(TrackerData.indexOf(getDomain(details.url))==-1) {
                TrackerData[TrackerData.length] = getDomain(details.url);
              }
              ExtensionData.push({id: count, tab: details.tabId, type: details.type, request: details.requestId, url: details.url, headers: details.requestHeaders, frameid: details.frameId, parentframeid: details.parentFrameId});
            }
          }

          // Block header if necessary
          if(BlockedData.indexOf(getDomain(details.url))!=-1) {
            console.log("Request from " + getDomain(details.url) + " was blocked.");
            return {cancel: details.url.indexOf(details.url) != -1};
          }
        }
      }, {urls: ["<all_urls>"]}, ["blocking", "requestHeaders"]);

      // Push extension and tracker data
      pushData(TrackerDataName, TrackerData, "local", "Trackers saved.");
      pushData(ExtensionDataName, ExtensionData, "local", "Data saved.");

      // Save tab data
      CurrentTab = tab;
    } else if(changeInfo.status=="complete") {
      // Save tab data
      CurrentTab = tab;

      // Record page details
      var date = new Date();
      var minute = date.getMinutes();
      var hour = date.getHours();
      var day = date.getDate();
      var weekday = date.getDay();
      var month = date.getMonth();
      var year = date.getFullYear();

      HistoryData.push({id: count, tab: tabId, type: "history", url: tab.url, title: tab.title, icon: tab.favIconUrl, topics: getWebsiteTopic(tab.url), minute: ("0" + minute).slice(-2), hour: hour, day: day, weekday: weekday, month: month, year: year});
      console.log("Page saved: " + count);

      // Push history data
      pushData(HistoryDataName, HistoryData, "local", "History saved.");
    }
  }
});

function getWebsiteTopic(websiteurl) {
  // Get DMOZ data from Enclout API and category from Alchemy API
  var websitedmoz = getDMOZ(getDomain(websiteurl));
  var websitecategory = getCategory(websiteurl);
  
  // Create array for two website topics
  var websitetopics = [];

  // Add DMOZ and Alchemy topics
  if(websitedmoz!="" && websitedmoz!=null) {
    websitetopics[websitetopics.length] = websitedmoz;
  }
  if(websitecategory!="" && websitecategory!=null) {
    websitetopics[websitetopics.length] = websitecategory;
  }
    
  // Return topic array
  if(websitetopics.length == 0) {
    return null;
  } else {
    return websitetopics;
  }
}

function getDMOZ(domain) {
  // Call Enclout DMOZ API
	var encloutrequest = new XMLHttpRequest();
	encloutrequest.open("GET", "https://www.enclout.com/api/v1/dmoz/show.xml?auth_token=e2zFHvVw12-mkof5Ja5x&url=" + domain, false);
	encloutrequest.send();
	var encloutxml = encloutrequest.responseXML;
	var encloutrequestxml = JSON.parse(encloutxml);
	
	// Get highest-level category
	var dmozcategory = encloutrequestxml.dmoz["dmoz-categories"]["dmoz-category"][0].Category["#text"];
	
	return dmozcategory;
}

function getCategory(url) {
	// Call Alchemy API
	var alchemyrequest = new XMLHttpRequest();
	alchemyrequest.open("GET", "http://access.alchemyapi.com/calls/url/URLGetCategory?apikey=27904d4e88b84fc703e3661c2bc1f64979245442&url=" + url, false);
	alchemyrequest.send();
	var alchemyxml = alchemyrequest.responseXML;
	var alchemyrequestxml = xmlToJson(alchemyxml);
	
	// Parse category string
	var alchemycategory = capitalizeFirstLetter(alchemyrequestxml.results.category["#text"]);
	
	return alchemycategory;
}

function getWebsiteData(domain) {
  // Get Alexa data
  var alexarequest = new XMLHttpRequest();
  alexarequest.open("GET", "http://data.alexa.com/data?cli=10&dat=snbamz&url=" + domain, false);
  alexarequest.send();
  var alexaxml = alexarequest.responseXML;
  var alexarequestxml = xmlToJson(alexaxml);

  return alexarequestxml;
}

function xmlToJson(xml) {
	// Create return object
	var obj = {};

	if (xml.nodeType == 1) {
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) {
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getDomain(url) {
  var hostName = getHostName(url);
  var domain = hostName;

  if (hostName != null) {
    var parts = hostName.split('.').reverse();
    if (parts != null && parts.length > 1) {
      domain = parts[1] + '.' + parts[0];
      if (hostName.toLowerCase().indexOf('.co.uk') != -1 && parts.length > 2) {
        domain = parts[2] + '.' + domain;
      }
    }
  }

  return domain;
}

function getHostName(url) {
  var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);

  if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
    return match[2];
  } else {
    return null;
  }
}

function pushData(name, value, type, message) {
  var obj = {};
  obj[name] = value;
  if(type=="local") {
    chrome.storage.local.set(obj, function() {
      console.log(message);
    });
  }
  if(type=="sync") {
    chrome.storage.sync.set(obj, function() {
      console.log(message);
    });
  }
}

function createData(name) {
  var data = [];
  pushData(name, data, "local", "Data created.");
}

function createOptions(name) {
  var data = {log: true, listdomains: false, listresources: false};
  pushData(name, data, "sync", "Options created.");
}
