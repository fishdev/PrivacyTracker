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
var count = -2;
var DateInstalled;

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

// Create databases if this is the first run
if(count==-2) {
  createData(ExtensionDataName, [], "local");
  createData(TrackerDataName, {}, "local");
  createData(BlockedDataName, [], "local");
  createData(HistoryDataName, [], "local");
  createOptions("PrivacyOptions", {log: true, listdomains: false, listresources: false}, "sync");
  showTutorial = true;
  DateInstalled = new Date();
  console.log("Completed first-run setup.");
	count++;
}

// Get Extension, Tracker, Blocked, and History Data
chrome.storage.local.get(null, function(r) {
	// Save databases to corresponding variables
  ExtensionData = r[ExtensionDataName];
  TrackerData = r[TrackerDataName];
  BlockedData = r[BlockedDataName];
  HistoryData = r[HistoryDataName];
  
  // Import Chrome history if first-run
  if(count==-1) {
  	count++;
  	importHistory();
	}
});

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
	if(details.tabId!=-1) {			
		// Block header if user has blocked this tracker
		if(BlockedData.indexOf(getDomain(details.url))!=-1) {
			console.log("Request from " + getDomain(details.url) + " was blocked.");
			return {cancel: details.url.indexOf(details.url) != -1};
		}
	}
}, {urls: ["http://*/*", "https://*/*"]}, ["blocking"]);

chrome.webRequest.onCompleted.addListener(function(details) {
  if(details.tabId!=-1) {
		processHeader(details, count);
	}
}, {urls: ["http://*/*", "https://*/*"]});

function processHeader(details, usecount) {
	// Create tmpcount for HistoryData and ExtensionData entry IDs
	var tmpcount = usecount + "-" + details.tabId;

	// Check if new page is being loaded
	var yesNew = false;
	if(details.type=="main_frame") {
		if(ExtensionData[ExtensionData.length-1]!=null && ExtensionData[ExtensionData.length-1].type!="main_frame") {
			yesNew = true;
		} else if(ExtensionData[ExtensionData.length-1]==null || ExtensionData[ExtensionData.length-1]=="") {
			yesNew = true;
		}
	}

	// If yes:
	if(yesNew) {
		// Advance count and write to console
		console.log("Loading initiated: " + usecount + " -> " + (usecount+1));
		count++;
		tmpcount = count + "-" + details.tabId;

		// Get current date/time information
		var date = new Date();
		var minute = date.getMinutes();
		var hour = date.getHours();
		var day = date.getDate();
		var weekday = date.getDay();
		var month = date.getMonth();
		var year = date.getFullYear();

		// Push new history entry
		HistoryData.push({id: tmpcount, url: details.url, title: getWebsiteTitle(details.url), topics: getWebsiteTopic(details.url), icon: "http://www.google.com/s2/favicons?domain=" + getDomain(details.url), minute: ("0" + minute).slice(-2), hour: hour, day: day, weekday: weekday, month: month, year: year});

		// Save updated HistoryData
		pushData(HistoryDataName, HistoryData, "local", "History saved.");
	}

	// Push the header itself to ExtensionData
	ExtensionData.push({id: tmpcount, type: details.type, url: details.url});

	// Save updated ExtensionData
	pushData(ExtensionDataName, ExtensionData, "local");
  
	// Get history entry associated with this header	
	var historyEntry = getHistoryEntry(tmpcount.slice(tmpcount.indexOf("-") + 1))[0];

	// Get the human-readable name for this tracking company
	var trackerTitle = getTrackerTitle(getDomain(details.url), false);
	
	// Get the human-readable tracking name for this page
	if(historyEntry!=null && historyEntry!="") {
		var historyTitle = getTrackerTitle(getDomain(historyEntry.url));
	} else {
		var historyTitle = null;
	}

  // Check if this is a third-party tracker
  if(trackerTitle!=historyTitle) {
		// If so, check if tracker has already been recorded
		if(TrackerData[trackerTitle]=="" || TrackerData[trackerTitle]==null) {
			// If not, create a new entry in TrackerData
			TrackerData[trackerTitle] = {"domains": [], "websites": {"id": [], "domain": []}, "interests": []};
		}

		// Add the domain used for tracking from this company if necessary
		if(TrackerData[trackerTitle].domains.indexOf(getDomain(details.url))==-1) {
			TrackerData[trackerTitle].domains[TrackerData[trackerTitle].domains.length] = getDomain(details.url);
		}

		// Check if a historyEntry has been created for this page (should be true, but just in case)
		if(historyEntry!=null && historyEntry!="") {
			// If so, add this page as a tracked website
			var trackerIndex = TrackerData[trackerTitle].websites.domain.indexOf(getDomain(historyEntry.url));
			if(trackerIndex!=-1) {
				// Remove previous entry for tracked website if found
				TrackerData[trackerTitle].websites.domain.splice(trackerIndex, 1);
				TrackerData[trackerTitle].websites.id.splice(trackerIndex, 1);
			}
			TrackerData[trackerTitle].websites.id[TrackerData[trackerTitle].websites.id.length] = tmpcount;
			TrackerData[trackerTitle].websites.domain[TrackerData[trackerTitle].websites.domain.length] = getDomain(historyEntry.url);
	
			// Add tracked interest(s) for this page
			TrackerData[trackerTitle].interests.concat(historyEntry.topics);
		}

		// Save updated TrackerData
		pushData(TrackerDataName, TrackerData, "local");
	}
}

function importHistory() {
	var chromeHistory;
	var pastcount = -1;
	var pasttab = 5555;
	var htmlrequest = new XMLHttpRequest();
	
	// Import last 100 page visits from Chrome history database
	chrome.history.search({text: ''}, function(data) {
	  chromeHistory = data;
	  console.log("Importing previous tracking data.");
	  tmphistory = [];
	  
	  // Go through history entries to get tracker information
	  for(var i=0; i<chromeHistory.length; i++) {
	  	tmpcount = pastcount + "-" + pasttab;
	    // Save history entry if necessary
	    var date = new Date(chromeHistory[i].lastVisitTime);
	    if(tmphistory.indexOf(getDomain(chromeHistory[i].url))==-1 && DateInstalled > date) {
	    	console.log("Processing past page: " + pastcount + " -> " + (pastcount-1));
	    	// Get history date/time information
				var minute = date.getMinutes();
				var hour = date.getHours();
				var day = date.getDate();
				var weekday = date.getDay();
				var month = date.getMonth();
				var year = date.getFullYear();
				
	    	HistoryData.push({id: tmpcount, url: chromeHistory[i].url, title: chromeHistory[i].title, topics: getWebsiteTopic(chromeHistory[i].url), icon: "http://www.google.com/s2/favicons?domain=" + getDomain(chromeHistory[i].url), minute: ("0" + minute).slice(-2), hour: hour, day: day, weekday: weekday, month: month, year: year});
	    	tmphistory[tmphistory.length] = getDomain(chromeHistory[i].url);
	    	
	    	// Save updated HistoryData
				pushData(HistoryDataName, HistoryData, "local", "History saved.");
	    	
	    	// Get HTML of page
				htmlrequest.open("GET", chromeHistory[i].url, false);
				htmlrequest.send();
				
				// Get all URLs included in HTML head
				var allurls = getURLs(htmlrequest.responseText);
				var linkurls = getLinks(htmlrequest.responseText);
				for(var j=0; j<linkurls.length; j++) {
					linkurls[j] = linkurls[j].slice(6);
					if(linkurls[j].indexOf("http://")==-1 && linkurls[j].indexOf("https://")==-1) {
						linkurls.splice(j, 1);
					}
				}
				var requesturls = allurls.filter(function(val) {
				 	return linkurls.indexOf(val) == -1;
				});
				
				// Get tracker title of history entry
				var pageTrackerTitle = getTrackerTitle(getDomain(chromeHistory[i].url));
				
				// Treat each URL as an HTTP header and process it
				for(var j=0; j<requesturls.length; j++) {
					if(getTrackerTitle(getDomain(requesturls[j]))!=pageTrackerTitle) {
						processHeader({url: requesturls[j], tabId: pasttab, type: "object"}, pastcount);
					}
				}
				
				// Reduce pastcount
				pastcount--;
    	}
  	}
	});
}

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

function getHistoryEntry(historyId) {
  var historyid;
  var historyindex;
	
  for(i=HistoryData.length-1; i>=0; i--) {
    if(HistoryData[i].id.slice(HistoryData[i].id.indexOf("-") + 1)==historyId) {
      historyid = HistoryData[i];
      historyindex = HistoryData[i].id;
      break;
    }
  }

  return [historyid, historyindex];
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

function getWebsiteTitle(websiteurl) {
	var decentrequest = new XMLHttpRequest();
	decentrequest.open("GET", "http://decenturl.com/api-title?u=" + websiteurl, false);
	decentrequest.send();
	return JSON.parse(decentrequest.response)[1];
}

function getDMOZ(domain) {
  // Call Enclout DMOZ API
	var encloutrequest = new XMLHttpRequest();
	encloutrequest.open("GET", "http://enclout.com/api/v1/dmoz/show.json?auth_token=e2zFHvVw12-mkof5Ja5x&url=" + domain, false);
	encloutrequest.send();
	var encloutxml = encloutrequest.responseText;
	var encloutrequestxml = JSON.parse(encloutxml);
	
	if(encloutxml=="" || encloutxml==null || encloutrequestxml["dmoz_categories"]==null || encloutrequestxml["dmoz_categories"]=="") {
		return;
	}
	
	// Parse highest-level category string
  if(encloutrequestxml["dmoz_categories"][0].Category!="NOT_FOUND") {
		var dmozcategory = encloutrequestxml["dmoz_categories"][0].Category;
		if(dmozcategory.indexOf(":") != -1) {
		  dmozcategory = dmozcategory.slice(dmozcategory.lastIndexOf(":") + 2)
  	}
		return dmozcategory;
	} else {
		return;
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
	  return;
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

	if(xml.nodeType == 1) {
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

function getURLs(text) {
  return text.match(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
}

function getLinks(text) {
	return text.match(/href="([^\'\"]+)/g);
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

function createData(name, inputdata, type) {
  pushData(name, inputdata, type, "Data created.");
}

function createOptions(name) {
  var data = {log: false, listdomains: false, listresources: false};
  pushData(name, data, "sync", "Options created.");
}
