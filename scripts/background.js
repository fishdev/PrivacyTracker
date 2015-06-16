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
var Websites;
var WebsiteURLs = [];
var WebsiteComps = [];
var WebsiteCats = [];
var count = 0;

// Load websites JSON
loadWebsites(function(response) {
  Websites = JSON.parse(response);

	// Restructure Websites
	for(domaincategory in Websites) {
		for(domaintitle in Websites[domaincategory]) {
		  for(domainurl in Websites[domaincategory][domaintitle]) {
		    for(domainsiteurl in Websites[domaincategory][domaintitle][domainurl]) {
		    	for(var i = 0; i<Websites[domaincategory][domaintitle][domainurl][domainsiteurl].length; i++) {
				    WebsiteURLs[WebsiteURLs.length] = Websites[domaincategory][domaintitle][domainurl][domainsiteurl][i];
				    WebsiteComps[WebsiteComps.length] = Object.keys(Websites[domaincategory][domaintitle]);
				    WebsiteCats[WebsiteCats.length] = domaincategory;
			    }
		    }
		  }
		}
	}
});

// Fire listener if page is loaded from cache or instant bar
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {  
  chrome.tabs.get(addedTabId, function(tab) {
    chrome.tabs.onUpdated.dispatch(addedTabId, {"status": "loading"}, tab);
    chrome.tabs.onUpdated.dispatch(addedTabId, {"status": "complete"}, tab);
  });
  
});

// Fire listener if page is loaded normally
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // Do stuff if necessary
  if(tab.url.indexOf("http://") == 0 || tab.url.indexOf("https://") == 0) {
    if(changeInfo.status=="loading") {
      var tabUrl = tab.url;
      var tabTitle = tab.title;
      var tabIcon = tab.favIconUrl;

      // Create data if necessary
      if(count==0) {
        createData(ExtensionDataName);
        createData(TrackerDataName);
        createData(BlockedDataName);
        createData(HistoryDataName);
        createOptions("PrivacyOptions");
        showTutorial = true;
        console.log("Completed first-run setup.");
      } else {
      	showTutorial = false;
      }

      // Begin loading the page and recording stuff
      console.log("Loading initiated: " + count + " -> " + (count+1));

      // Get extension, tracker, blocked, and history data
      chrome.storage.local.get(null, function(r) {
        ExtensionData = r[ExtensionDataName];
        TrackerData = r[TrackerDataName];
        BlockedData = r[BlockedDataName];
        HistoryData = r[HistoryDataName];
      });
      
      // Create tmpcount so that it can be modified to sync with HistoryData IDs after page loads
      var tmpcount = count;
      document.addEventListener("doneLoading", function(a) {
        tmpcount = parseInt(a.detail);
      });

      // Record tracker details
      chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
        if(details.tabId!=-1) {
          if(getDomain(details.url)!=getDomain(tab.url) && getTrackerTitle(getDomain(details.url), false)!=getTrackerTitle(getDomain(tab.url), false)) {
            if(TrackerData.indexOf(getDomain(details.url))==-1) {
              TrackerData[TrackerData.length] = getDomain(details.url);
            }
            ExtensionData.push({id: tmpcount, tab: details.tabId, type: details.type, request: details.requestId, url: details.url, headers: details.requestHeaders, frameid: details.frameId, parentframeid: details.parentFrameId});
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
    } else if(changeInfo.status=="complete") {
      console.log("Loading complete.");
      
      // Record page details
      var date = new Date();
      var minute = date.getMinutes();
      var hour = date.getHours();
      var day = date.getDate();
      var weekday = date.getDay();
      var month = date.getMonth();
      var year = date.getFullYear();
			
      HistoryData.push({id: count, tab: tabId, type: "history", url: tab.url, title: tab.title, icon: tab.favIconUrl, topics: getWebsiteTopic(tab.url), minute: ("0" + minute).slice(-2), hour: hour, day: day, weekday: weekday, month: month, year: year});

      // Push history data
      pushData(HistoryDataName, HistoryData, "local", "History saved.");
      
      // Save tab data
      CurrentTab = tab;
      
      // Trigger doneLoading event listener
      var doneLoadingEvent = new CustomEvent("doneLoading", {"detail": count.toString()})
      document.dispatchEvent(doneLoadingEvent);
      
      // Once loading is complete, advance the count
      // The placement of the count advancement is because advancing the count too early will cause some ExtensionData entries to have a different id from their corresponding HistoryData entry due to redirects when loading the page
      count++;
    }
  }
});

function loadWebsites(callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
	xobj.open('GET', '../data/websites.json', true);
	xobj.onreadystatechange = function() {
    if(xobj.readyState==4 && xobj.status=="200") {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

function getTrackerTitle(i, fromPopup) {
  var urltouse = "";

  // Figure out which URL to compare based on i and fromPopup
  if(fromPopup) {
  	urltouse = getDomain(ExtensionData[i].url);
	} else {
		urltouse = i;
	}
  
  // Search in WebsiteURLs for match
  var index = WebsiteURLs.indexOf(urltouse);
  if(index==-1) {
  	// If no match found, return just the domain
    return urltouse;
  } else {
		// Check to make sure the history entry for this page is not the tracker in question (if from popup.js)
		// If true, ignore this header/tracker entirely
  	if(fromPopup) {
  		historyentryurl = getDomain(historySearch(ExtensionData[i].id).url);
  		if(urltouse==historyentryurl) {
  			return;
  		}
  	}
  	
  	// Otherwise, return the tracker company name
  	return WebsiteComps[index].toString();
 	}
}

function historySearch(searchID){
  for(var nodeIdx = 0; nodeIdx <= HistoryData.length-1; nodeIdx++) {
  	var currentNode = HistoryData[nodeIdx];
    var currentId = currentNode.id;
    var currentChildren = currentNode.children;
    if(currentId == searchID) {    
      return currentNode;
    }
  }
  return;
}

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
	encloutrequest.open("GET", "http://enclout.com/api/v1/dmoz/show.json?auth_token=e2zFHvVw12-mkof5Ja5x&url=" + domain, false);
	encloutrequest.open("GET", "http://dmoz-api.appspot.com/category?url=" + domain, false);
	encloutrequest.send();
	var encloutxml = encloutrequest.responseXML;
	if(encloutxml=="" || encloutxml==null) {
		return null;
	}
	var encloutrequestxml = xmlToJson(encloutxml);
	
	// Parse highest-level category string
  if(encloutrequestxml.dmoz!="" && encloutrequestxml.dmoz!=null && encloutrequestxml.dmoz["dmoz-categories"]["dmoz-category"][0]!="" && encloutrequestxml.dmoz["dmoz-categories"]["dmoz-category"][0]!=null) {
		var dmozcategory = encloutrequestxml.dmoz["dmoz-categories"]["dmoz-category"][0].Category["#text"];
		if(dmozcategory.indexOf(":") != -1) {
		  dmozcategory = dmozcategory.slice(dmozcategory.lastIndexOf(":") + 2)
  	}
		return dmozcategory;
	} else {
		return null;
  }
}

function getCategory(url) {
	// Call Alchemy API
	var alchemyrequest = new XMLHttpRequest();
	alchemyrequest.open("GET", "http://access.alchemyapi.com/calls/url/URLGetCategory?apikey=27904d4e88b84fc703e3661c2bc1f64979245442&url=" + url, false);
	alchemyrequest.send();
	var alchemyxml = alchemyrequest.responseXML;
	var alchemyrequestxml = xmlToJson(alchemyxml);
	
	// Parse category string
	if(alchemyrequestxml.results.category!="" && alchemyrequestxml.results.category!=null) {
		var alchemycategory = capitalizeFirstLetter(alchemyrequestxml.results.category["#text"]);
		if(alchemycategory.indexOf("_") != -1) {
			alchemycategory = alchemycategory.substring(0, alchemycategory.indexOf("_")) + " & " + alchemycategory.slice(alchemycategory.indexOf("_") + 1);
		}
		return alchemycategory;
	} else {
	  return null;
	}
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
    });
  }
  if(type=="sync") {
    chrome.storage.sync.set(obj, function() {
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
