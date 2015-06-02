var ExtensionDataName = "PrivacyHeaders";
var ExtensionData;
var TrackerDataName = "PrivacyTrackers";
var TrackerData;
var BlockedDataName = "PrivacyBlockers";
var BlockedData;
var HistoryDataName = "PrivacyHistory";
var HistoryData;
var CurrentTab;
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
  var websitedata = getWebsiteData(websiteurl);
  var websitetopics = [];
  
  if(websitedata.ALEXA.DMOZ!="" && websitedata.ALEXA.DMOZ!=null) {
    var websiterawtopic = websitedata.ALEXA.DMOZ.SITE.CATS.CAT[1]["@attributes"].TITLE;
    if(websiterawtopic.toLowerCase().indexOf("News")>-1) {
      websitetopics = websitetopics.concat(getArticleTitle(websiteurl));
    } else {
      websitetopics[0] = websiterawtopic.substring(0, websiterawtopic.indexOf("/"));
      websitetopics[1] = websiterawtopic.substring(websiterawtopic.lastIndexOf("/") + 1, websiterawtopic.length);
    }
    return websitetopics;
  } else {
    return null;
  }
}

function getWebsiteData(domain) {
  var alexarequest = new XMLHttpRequest();
  alexarequest.open("GET", "http://data.alexa.com/data?cli=10&dat=snbamz&url=" + domain, false);
  alexarequest.send();
  var alexaxml = alexarequest.responseXML;
  var alexarequestxml = xmlToJson(alexaxml);
  
  return alexarequestxml;
}

function getArticleTopic(url) {
  var readabilityrequest = new XMLHttpRequest();
  readabilityrequest.open("GET", "https://readability.com/api/content/v1/parser?url=" + url + "&token=d93995027780200c7756a5613c5fe2b2b29db0f6", false);
  readabilityrequest.send();
  var readabilityxml = readabilityrequest.responseText;
  var readabilityrequestxml = JSON.parse(readabilityxml);
  
  return readabilityrequestxml.title;
}

function wordFrequency(txt) {
  var wordArray = txt.split(/[ .?!,*'"]/);
  var newArray = [], wordObj;
  
  wordArray.forEach(function(word) {
    wordObj = newArray.filter(function(w) {
      return w.text == word;
    });
    
    if(wordObj.length) {
      wordObj[0].size += 1;
    } else {
      newArray.push({text: word, size: 1});
    }
  });
  
  return newArray;
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
