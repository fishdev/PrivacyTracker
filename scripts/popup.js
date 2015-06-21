var current = "";
var history = "";
var options = "";
var help = "";
var about = "";

var background = chrome.extension.getBackgroundPage();
var ExtensionData;
var ExtensionDataName = background.ExtensionDataName;
var TrackerData;
var TrackerDataName = background.TrackerDataName;
var BlockedData;
var BlockedDataName = background.BlockedDataName;
var HistoryData;
var HistoryDataName = background.HistoryDataName;
var PTOptions;
var PTOptionsName = "PrivacyOptions";
var WebsiteURLs = background.WebsiteURLs;
var WebsiteComps = background.WebsiteComps;
var WebsiteCats = background.WebsiteCats;
var showTutorial = background.showTutorial;
var TrackingHeaders = {};
var TrackingHeaderArray;
var AdvertisingHeaders = {};
var AdvertisingHeaderArray;
var SocialHeaders = {};
var SocialHeaderArray;
var MainHeaders = {};
var MainHeaderArray;
var ImageHeaders = {};
var ImageHeaderArray;
var ScriptHeaders = {};
var ScriptHeaderArray;
var StylesheetHeaders = {};
var StylesheetHeaderArray;
var SortedTrackers = {};
var CurrentTab;
var CurrentPage;
var originalHTML;

function getGoing() {
  // Check Internet connection
  if(navigator.onLine) {
    // Start displaying page
    originalHTML = document.body.innerHTML;
    getStarted();
  } else {
    // Display error message
    document.body.style.padding = 10;
    document.body.innerHTML = "<div id='error'><span class='title'><b>No Internet</b></span><img class='icon' src='../images/error.png' align=right><br /><br /><span class='message'>You're not connected to the Internet. Please check your network connection and try again.<br /><br /><button id='tryagainnetwork'>Try Again</button></span></div><img class='loadericon' src='../images/loading.gif'>";
    document.getElementById("tryagainnetwork").addEventListener("click", getGoing, false);
    console.log("No Internet connection.");
  }
}

function getStarted() {
  // Get current tab data
  chrome.tabs.getSelected(null, function(tab) {
    CurrentTab = tab;
    CurrentPage = background.getWebsiteData(background.getDomain(CurrentTab.url));
  });

  // Get extension, blocked, and history data
  chrome.storage.local.get(ExtensionDataName, function(r) {
    ExtensionData = r[ExtensionDataName];
  });
  chrome.storage.local.get(TrackerDataName, function(r) {
    TrackerData = r[TrackerDataName];
  });
  chrome.storage.local.get(BlockedDataName, function(r) {
    BlockedData = r[BlockedDataName];
  });
  chrome.storage.local.get(HistoryDataName, function(r) {
    HistoryData = r[HistoryDataName];
  });

  // Get options
  chrome.storage.sync.get(PTOptionsName, function(r) {
    PTOptions = r["PrivacyOptions"];
      
    // Check and log data
    if(ExtensionData!=null && HistoryData!=null && BlockedData!=null && TrackerData!=null && WebsiteURLs!=null && WebsiteComps!=null && WebsiteCats!=null && PTOptions!=null) {
      console.log("All data fetched successfully!");

      // Get headers
      getHeaders();

      // Get data for each header category
      TrackingHeaderArray = showHeaders(TrackingHeaders, "to external tracking services.", "There are no external websites tracking your visit to this page.", "tracking");
      AdvertisingHeaderArray = showHeaders(AdvertisingHeaders, "for this page's ads.", "This page doesn't have ads from external sites.", "advertising");
      SocialHeaderArray = showHeaders(SocialHeaders, "to social networks.", "This page doesn't have any connected social networks.", "social");
      MainHeaderArray = showHeaders(MainHeaders, "to external websites for this page's main content.", "This page doesn't get its main content from any external sources.", "contentmain");
      ImageHeaderArray = showHeaders(ImageHeaders, "to external websites for this page's images.", "This page doesn't get its images from any external sources.", "contentimages");
      ScriptHeaderArray = showHeaders(ScriptHeaders, "to external websites for this page's scripts.", "This page doesn't get its scripts content from any external sources.", "contentscripts");
      StylesheetHeaderArray = showHeaders(StylesheetHeaders, "to external websites for this page's layout.", "This page doesn't get its layout from any external sources.", "contentstylesheets");

      // Display page
      document.body.style.padding = 0;
      switchCurrent();
    } else {
      // Display error message
      document.body.style.padding = 10;
      document.body.style.height = 400;
      document.body.style.backgroundColor =  "#000000";
      document.body.innerHTML = "<div id='error'><span class='title'><b>Oops!</b></span><br /><br /><span class='message'>Something just went seriously wrong. If this happens again, please try reinstalling PrivacyTracker.</span></div><img class='loadericon' src='../images/error.gif'>";
    }
  });
}

window.addEventListener("load", bindWindow, false);

function bindWindow() {
	// Bind tabs and links
  document.getElementById("tab-current").addEventListener("click", switchCurrent, false);
  document.getElementById("tab-overview").addEventListener("click", switchOverview, false);

  document.getElementById("link-help").addEventListener("click", switchHelp, false);
  document.getElementById("link-options").addEventListener("click", switchOptions, false);
  document.getElementById("link-about").addEventListener("click", switchAbout, false);

  getGoing();
}

function switchCurrent() {
  document.getElementById("tab-current").className = "tab-active";
  if(PTOptions.log) {
	  document.getElementById("tab-history").addEventListener("click", switchHistory, false);
	  document.getElementById("tab-history").className = "tab";
  } else if(document.getElementById("tab-history")!=null) {
  	document.getElementById("tab-history").parentNode.removeChild(document.getElementById("tab-history"));
	}
  document.getElementById("tab-overview").className = "tab";
  document.getElementById("link-help").className = "";
  document.getElementById("link-options").className = "";
  document.getElementById("link-about").className = "";
  showCurrent();
}

function showCurrent() {
  if(HistoryData.length==0 || ExtensionData.length==0) {
    document.body.style.padding = 10;
    document.body.style.height = 400;
    document.body.style.backgroundColor = "#262626";
    document.body.innerHTML = "<div id='error'><span class='title'><b>Just A Moment...</b></span><br /><br /><span class='message'>We're still setting things up for you. Please keep browsing and try again after you visit another page.</span></div><img class='loadericon' src='../images/loading.gif'>";
  } else {
    showList();
  }
}

function switchHistory() {
  document.getElementById("tab-current").className = "tab";
  if(PTOptions.log) {
	  document.getElementById("tab-history").className = "tab-active";
  }
  document.getElementById("tab-overview").className = "tab";
  document.getElementById("link-help").className = "";
  document.getElementById("link-options").className = "";
  document.getElementById("link-about").className = "";
  showHistory();
}

function showHistory() {
  if(HistoryData.length==0) {
    document.body.style.padding = 10;
    document.body.style.height = 400;
    document.body.style.backgroundColor = "#262626";
    document.body.innerHTML = "<div id='error'><span class='title'><b>Just A Moment...</b></span><br /><br /><span class='message'>We're still setting things up for you. Please keep browsing and try again after you visit another page.</span></div><img class='loadericon' src='../images/loading.gif'>";
  } else if(!PTOptions.log) {
    var historyHTML = "<div id='history'><span id='title-history' class='title'>Browsing History</span><br />You've Disabled This</div><div id='scroller'><div style='padding: 10px; font-size: 11pt;'>You've disabled logging the pages you visit. You won't be able to view the trackers for each page in your browsing history until you enable history logging in Options.</div></div>";

    // Display historyHTML
    document.getElementById("content").innerHTML = historyHTML;
    document.getElementById("scroller").style.height = "450px";
  } else {
    var startWeekday = parseWeekday(HistoryData[HistoryData.length-1].weekday);
    var startMonth = parseMonth(HistoryData[HistoryData.length-1].month);
    var startDay = HistoryData[HistoryData.length-1].day;
    var startYear = HistoryData[HistoryData.length-1].year;

    var historyHTML = "<div id='history'><span id='title-history' class='title'>Browsing History</span><br />Since " + startWeekday + ", " + startMonth + " " + startDay + ", " + startYear + ".</div><div id='scroller'>";

    for(i=HistoryData.length-1; i>=0; i--) {
      var pageUrl = HistoryData[i].url;
      var pageTitle = HistoryData[i].title;
      var pageIcon = HistoryData[i].icon;
      var pageMinute = HistoryData[i].minute;
      var pageHour = HistoryData[i].hour;
      var pageTime = "AM";
      var pageDay = HistoryData[i].day;
      var pageWeekday = parseWeekday(HistoryData[i].weekday);
      var pageMonth = parseMonth(HistoryData[i].month);
      var pageYear = HistoryData[i].year;

      if(pageHour>12) {
        pageHour = pageHour - 12;
        pageTime = "PM";
      }

      if(pageUrl.length>53) {
        pageUrl = pageUrl.substring(0, 50) + "...";
      }
      if(pageTitle.length>38) {
        pageTitle = pageTitle.substring(0, 35) + "...";
      }
	  if(pageIcon=="" || pageIcon==null) {
	    pageIcon = "../images/page.png";
      }

      historyHTML += "<div id='history" + i + "' class='history'><div class='arrow'>&#8594</div><img class='icon' src='" + pageIcon + "' align=left></img><span class='title'>" + pageTitle + "</span><br />" + pageUrl + "<br />" + "Viewed on " + pageWeekday + ", " + pageMonth + " " + pageDay + ", " + pageYear + " at " + pageHour + ":" + pageMinute + " " + pageTime + "</div>";
    }

    historyHTML += "<center>" + HistoryData.length + " item";
    if(HistoryData.length>1 || HistoryData.length==0) {
      historyHTML += "s";
    }
    historyHTML += " in history.</center></div>";

    // Display historyHTML
    document.getElementById("content").innerHTML = historyHTML;
    document.getElementById("scroller").style.height = "450px";

    // Bind history entries
    var historyitems = document.getElementsByClassName("history");
    for(j=0; j<historyitems.length; j++) {
      document.getElementById(historyitems[j].id).addEventListener("click", function() {
        chrome.tabs.update({url: HistoryData[this.id.substring(7)].url, selected: true});
        this.innerHTML = "Loading page...";
        chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
          if(changeInfo.status=="loading") {
            window.close();
          }
        });
      }, false);
    }
  }
}

function switchOverview() {
  document.getElementById("tab-current").className = "tab";
  if(PTOptions.log) {
	  document.getElementById("tab-history").className = "tab";
  }
  document.getElementById("tab-overview").className = "tab-active";
  document.getElementById("link-help").className = "";
  document.getElementById("link-options").className = "";
  document.getElementById("link-about").className = "";
  showOverview();
}

function showOverview() {
  if(HistoryData.length==0 || TrackerData.length==0) {
    document.body.style.padding = 10;
    document.body.style.height = 400;
    document.body.style.backgroundColor = "#262626";
    document.body.innerHTML = "<div id='error'><span class='title'><b>Just A Moment...</b></span><br /><br /><span class='message'>We're still setting things up for you. Please keep browsing and try again after you visit another page.</span></div><img class='loadericon' src='../images/loading.gif'>";
  } else {
    if(Object.keys(SortedTrackers).length==0) {
      // Get list of trackers
      getTrackers();
    }

    // Generate HTML from list of trackers
    var overviewHTML = "<div id='overview'><span id='title-overview' class='title'>" + Object.keys(SortedTrackers).length + " Website";
    if(Object.keys(SortedTrackers).length==1) {
      overviewHTML += " is ";
    } else {
      overviewHTML += "s are ";
    }
    overviewHTML += "Tracking You</span><br />Through " + HistoryData.length;
    if(HistoryData.length==1) {
      overviewHTML += " page ";
    } else {
      overviewHTML += " total pages ";
    }
    overviewHTML += "you've visited</div><div id='scroller'><span class='overviewtrackerlist'>";

    var k = 0;
    // Create listing for each tracker
    for(var tracker in SortedTrackers) {
      // Check tracker favicon
      var trackerfavicon = "http://www.google.com/s2/favicons?domain=" + SortedTrackers[tracker].domains[0];
      var trackerfaviconsize;
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', trackerfavicon, true);
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4) {
          if(xhr.status == 200) {
            trackerfaviconsize = xhr.getResponseHeader("Content-Length");
          }
        }
      };
      xhr.send(null);

      if(trackerfavicon=="" || trackerfavicon==null || trackerfaviconsize==726) {
        trackerfavicon = "../images/page.png";
      }

      // Check if first tracker to be displayed
      var topTracker = "";
      if(k==0) {
        topTracker = "-top"
        k++;
      }

      // Check if blocked
      var colorTracker = "";
      if(BlockedData.indexOf(SortedTrackers[tracker].domains[0])>-1) {
        colorTracker = " style='color: gray'";
      }

      // Add domain entry
      overviewHTML += "<div class='tracker" + topTracker + "' id='" + tracker + "-entry'><span" + colorTracker + "><img class='icon' src='" + trackerfavicon + "' align=left><b>" + tracker + "</b><br />";

      // Add other tracked pages
      overviewHTML += "Knows you visited " + SortedTrackers[tracker].trackedwebsites.length + " website";
      if(SortedTrackers[tracker].trackedwebsites.length>1) {
        overviewHTML += "s";
      }
      overviewHTML += "</span>"

      // Tidy up tracker entry
      overviewHTML += "<span id='" + tracker + "-entry-arrow' class='arrow-right-r'></span></div>";
    }
    
    if(Object.keys(SortedTrackers).length==0) {
		  overviewHTML += "<div class='checkcirclesurroundings'><center><div class='checkcircle'>&#x2713</div></center><br /><div class='leftofcheckcircle'>There aren't any websites other than the ones you've visited that are tracking you across the web and may analyze your personal information.&nbsp;&nbsp</div></div>";
	  }

    overviewHTML += "</span></div>";

    document.getElementById("content").innerHTML = overviewHTML;
    document.getElementById("scroller").style.height = "450px";

    // Bind tracker entries
    var trackeritems = document.getElementsByClassName("tracker");
    for(i=0; i<trackeritems.length; i++) {
      document.getElementById(trackeritems[i].id).addEventListener("click", function() {
        showTracker(this.id);
      }, false);
    }
    trackertitems = document.getElementsByClassName("tracker-top");
    for(i=0; i<trackertitems.length; i++) {
      document.getElementById(trackertitems[i].id).addEventListener("click", function() {
        showTracker(this.id);
      }, false);
    }
  }
}

function showTracker(trackerid) {
  var trackername = trackerid.substring(0, trackerid.lastIndexOf("-"));

  // Change arrow style and show details
  var trackerHTML = "";
  var trackerarrow = document.getElementById(trackerid + "-arrow").className;
  if(trackerarrow=="arrow-right-r") {
    // Shift arrow to down
    document.getElementById(trackerid + "-arrow").className = "arrow-down-r";

    // Gather information
    trackerHTML += "<div id='" + trackername + "-info' class='trackerinfo'>";

    // Add on-off switch
    trackerHTML += "<span id='" + trackername + "switchcontainer' class='switchcontainer'><div class='onoffswitch'><input type='checkbox' name='onoffswitch' class='onoffswitch-checkbox' id='" + trackername + "switch'";
    if(BlockedData.indexOf(SortedTrackers[trackername].domains[0])==-1) {
      trackerHTML += " checked";
    }
    trackerHTML += "><label class='onoffswitch-label' for='" + trackername + "switch'><span class='onoffswitch-inner'></span><span class='onoffswitch-switch'></span></label></div></span>";

    // Add tracker name
    var domaindata = background.getWebsiteData(SortedTrackers[trackername].domains[0]);
    var domainname = trackername;
    var domaindescription = null;
    if(domaindata.ALEXA.DMOZ!="" && domaindata.ALEXA.DMOZ!=null) {
      domainname = domaindata.ALEXA.DMOZ.SITE["@attributes"].TITLE;
      domaindescription = domaindata.ALEXA.DMOZ.SITE["@attributes"].DESC;
    }

    // Get user-centered data
    var domaintracked = SortedTrackers[trackername].trackedwebsites;
    var domaininterests = getTrackedInterests(trackername);

    // Generate HTML based on data
    if(domaintracked!="" && domaintracked!=null) {
      trackerHTML += domainname + " knows that you visited:<ul>";
      var overflowtrackerHTML = "";
      var overflowinterestHTML = "";
      for(i=0; i<domaintracked.length; i++) {
        var tmptrackerHTML = "";
        
        var today = new Date();
        var trackedHistoryEntry = background.historySearch(domaintracked[i]);
        tmptrackerHTML += "<li><b><span title='" + trackedHistoryEntry.url + "'>" + background.getDomain(trackedHistoryEntry.url) + "</span></b>, which you visited ";

        var pageTime = "AM";
        var pageHour = trackedHistoryEntry.hour
        if(pageHour>12) {
          pageHour = pageHour - 12;
          pageTime = "PM";
        }

        if(today.getDate()==trackedHistoryEntry.day && today.getMonth()==trackedHistoryEntry.month && today.getFullYear()==trackedHistoryEntry.year) {
          tmptrackerHTML += "earlier today";
        } else if(today.getDate()==(trackedHistoryEntry.day + 1) && today.getMonth()==trackedHistoryEntry.month && today.getFullYear()==trackedHistoryEntry.year) {
          tmptrackerHTML += "yesterday at " + pageHour + ":" + trackedHistoryEntry.minute + " " + pageTime;
        } else {
          tmptrackerHTML += "on " + parseWeekday(trackedHistoryEntry.weekday) + ", " + parseMonth(trackedHistoryEntry.month) + " " + trackedHistoryEntry.day + ", " + trackedHistoryEntry.year + " at " + pageHour + ":" + trackedHistoryEntry.minute + " " + pageTime;
        }

        tmptrackerHTML += "</li>";
        
        if(i < 5) {
          trackerHTML += tmptrackerHTML;
        } else {
          overflowtrackerHTML += tmptrackerHTML;
        }
      }
      
      if(domaintracked.length > 5) {
      	tmptrackerHTML += "<span id='" + domainname + "overflow'><li><a id='" + domainname + "showmore'><i>Show More...</i></a></li></span>";
    	}
    	
      trackerHTML += "</ul>";
    }
    if(domaininterests!="" && domaininterests!=null) {
    	var tmptrackerHTML;
    	
      trackerHTML += domainname + " probably knows that you're interested in:<ul>";
      for(i=0; i<domaininterests.length; i++) {
        trackerHTML += "<li>" + domaininterests[i] + "</li>";
              	
      	if(i < 5) {
          trackerHTML += tmptrackerHTML;
        } else {
          overflowinterestHTML += tmptrackerHTML;
        }
      }
      
      if(domaintracked.length > 5) {
      	tmptrackerHTML += "<span id='" + domainname + "overinterest'><li><a id='" + domainname + "interestmore'><i>Show More...</i></a></li></span>";
    	}
      
      trackerHTML += "</ul>";
    }
    if(PTOptions.listdomains) {
      trackerHTML += "The following domains are being used by " + domainname + " to track you on this page:<ul>";
      for(i=0; i<SortedTrackers[trackername].domains.length; i++) {
        trackerHTML += "<li>" + SortedTrackers[trackername].domains[i] + "</li>";
      }
      trackerHTML += "</ul>";
    }

    // Add description if possible
    for(k=0; k<SortedTrackers[trackername].domains.length; k++) {
      domaindata = background.getWebsiteData(SortedTrackers[trackername].domains[k]);
      if(domaindata.ALEXA.DMOZ!="" && domaindata.ALEXA.DMOZ!=null) {
        domaindescription = domaindata.ALEXA.DMOZ.SITE["@attributes"].DESC;
        trackerHTML += "<b>Description of " + domainname + "</b>: " + domaindescription + " ";
        break;
      } else if(k==(SortedTrackers[trackername].domains.length-1)) {
        domaindata = background.getWebsiteData(SortedTrackers[trackername].domains[0]);
      }
    }

    // Add country base if possible
    for(k=0; k<SortedTrackers[trackername].domains.length; k++) {
      domaindata = background.getWebsiteData(SortedTrackers[trackername].domains[k]);
      if(domaindata.ALEXA.SD!="" && domaindata.ALEXA.SD!=null) {
        if(domaindata.ALEXA.SD[1].COUNTRY!="" && domaindata.ALEXA.SD[1].COUNTRY!=null) {
          trackerHTML += "<b> " + domainname + " is based in " + domaindata.ALEXA.SD[1].COUNTRY["@attributes"].NAME + "</b> and is <b>ranked " + domaindata.ALEXA.SD[1].COUNTRY["@attributes"].RANK + "</b> in popularity in the country.";
          break;
        }
      } else if(k==(SortedTrackers[trackername].domains.length-1)) {
        domaindata = background.getWebsiteData(SortedTrackers[trackername].domains[0]);
      }
    }

    // Display expanded tracker details
    trackerHTML += "</div>";
    document.getElementById(trackerid).outerHTML += trackerHTML;

    // Bind domains for categories
    var trackeritems = document.getElementsByClassName("tracker");
    for(i=0; i<trackeritems.length; i++) {
      document.getElementById(trackeritems[i].id).addEventListener("click", function() {
        showTracker(this.id);
      }, false);
    }
    var trackertitems = document.getElementsByClassName("tracker-top");
    for(i=0; i<trackertitems.length; i++) {
      document.getElementById(trackertitems[i].id).addEventListener("click", function() {
        showTracker(this.id);
      }, false);
    }

    // Bind switch
    document.getElementById(trackername + "switch").addEventListener("click", function() {
      // Add or remove from blacklist of domains
      if(this.checked) {
        for(j=0; j<SortedTrackers[trackername].domains.length; j++) {
          removeA(BlockedData, SortedTrackers[trackername].domains[j]);
        }
      } else {
        for(j=0; j<SortedTrackers[trackername].domains.length; j++) {
          BlockedData[BlockedData.length] = SortedTrackers[trackername].domains[j];
        }
      }

      // Push new blacklist of domains
      background.pushData(BlockedDataName, BlockedData, "local", "Blocks saved.");
    }, false);
    
    // Bind overflow button for tracked websites if needed
    if(domaintracked.length > 5) {
      document.getElementById(domainname + "showmore").addEventListener("click", function() {
        document.getElementById(domainname + "overflow").innerHTML = overflowtrackerHTML;
      }, false);
    }
    
    // Bind overflow button for tracked interests if needed
    if(domaininterests.length > 5) {
    	 document.getElementById(domainname + "interestmore").addEventListener("click", function() {
        document.getElementById(domainname + "overinterest").innerHTML = overflowinterestHTML;
      }, false);
    }
  } else {
    document.getElementById(trackerid + "-arrow").className = "arrow-right-r";

    // Hide expanded tracker details
    var trackerinfotoremove = document.getElementById(trackername + "-info");
    trackerinfotoremove.parentNode.removeChild(trackerinfotoremove);
  }
}

function getTrackers() {  
  // Sort trackers by number of tracked websites
  var sortable = [];
  var currentTitle = background.getTrackerTitle(background.getDomain(CurrentTab.url, false));
  TrackerData = background.TrackerData;
  
  for(var tracker in TrackerData) {
  	// Ensure that the tracker is a third-party, not the current page itself
  	if(currentTitle!=tracker) {
	    sortable.push([tracker, TrackerData[tracker].websites.id.length]);
    }
  }
  sortable.sort(function(a, b) {return a[1] - b[1]});

  // Use sorted list to add trackers in order to final tracker list
  for(i=(sortable.length-1); i>=0; i--) {
    SortedTrackers[sortable[i][0]] = {domains: TrackerData[sortable[i][0]].domains, trackedwebsites: TrackerData[sortable[i][0]].websites.id};
  }
}

function parseWeekday(pageWeekday) {
  switch(pageWeekday) {
    case 0:
      pageWeekday = "Sunday";
      break;
    case 1:
      pageWeekday = "Monday";
      break;
    case 2:
      pageWeekday = "Tuesday";
      break;
    case 3:
      pageWeekday = "Wednesday";
      break;
    case 4:
      pageWeekay = "Thursday";
      break;
    case 5:
      pageWeekday = "Friday";
      break;
    case 6:
      pageWeekday = "Saturday";
      break;
    case 7:
      pageWeekday = "Sunday";
      break;
  }

  return pageWeekday;
}

function parseMonth(pageMonth) {
  switch(pageMonth) {
    case 0:
      pageMonth = "January";
      break;
    case 1:
      pageMonth = "February";
      break;
    case 2:
      pageMonth = "March";
      break;
    case 3:
      pageMonth = "April";
      break;
    case 4:
      pageMonth = "May";
      break;
    case 5:
      pageMonth = "June";
      break;
    case 6:
      pageMonth = "July";
      break;
    case 7:
      pageMonth = "August";
      break;
    case 8:
      pageMonth = "September";
      break;
    case 9:
      pageMonth = "October";
      break;
    case 10:
      pageMonth = "November";
      break;
    case 11:
      pageMonth = "December";
      break
  }

  return pageMonth;
}

function switchView(type) {
  var viewHTML = "";
  viewHTML += "<div id='scroller'>";

  if(type=="category") {
    // Check for nothing
    if((TrackingHeaderArray.count + AdvertisingHeaderArray.count + MainHeaderArray.count + ImageHeaderArray.count + ScriptHeaderArray.count + StylesheetHeaderArray.count)==0) {
      viewHTML += "<div class='checkcirclesurroundings'><center><div class='checkcircle'>&#x2713</div></center><br /><div class='leftofcheckcircle'>There aren't any websites other than <b>" + background.getTrackerTitle(background.getDomain(CurrentTab.url)) + "</b> that know you visited this page and may analyze this information.&nbsp;&nbsp</div></div>";
    }

    // Add categories
    if(TrackingHeaderArray.count>0) {
      viewHTML += "<div id='trackers' class='sortitem'><span id='trackersarrow' class='arrow-right'></span>&nbsp<span class='sorttext'><span id='trackersnum' class='sortitemnum'>" + TrackingHeaderArray.count + "</span> Compan";
      if(TrackingHeaderArray.count==1) {
        viewHTML += "y is ";
      } else {
        viewHTML += "ies are ";
      }
      viewHTML += "analyzing your personal data</span></div>";
    }
    if(AdvertisingHeaderArray.count>0) {
      viewHTML += "<div id='advertising' class='sortitem'><span id='advertisingarrow' class='arrow-right'></span>&nbsp<span class='sorttext'><span id='advertisingnum' class='sortitemnum'>" + AdvertisingHeaderArray.count + "</span> Compan";
      if(AdvertisingHeaderArray.count==1) {
        viewHTML += "y is ";
      } else {
        viewHTML += "ies are ";
      }
      viewHTML += "displaying advertisments on this page</span></div>";
    }
    if(SocialHeaderArray.count>0) {
      viewHTML += "<div id='social' class='sortitem'><span id='socialarrow' class='arrow-right'></span>&nbsp<span class='sorttext'><span id='socialnum' class='sortitemnum'>" + SocialHeaderArray.count + "</span> Social network";
      if(SocialHeaderArray.count==1) {
        viewHTML += " is ";
      } else {
        viewHTML += "s are ";
      }
      viewHTML += "connected to this page</span></div>";
    }
    if((MainHeaderArray.count + ImageHeaderArray.count + ScriptHeaderArray.count + StylesheetHeaderArray.count)>0) {
      viewHTML += "<div id='pagecontent' class='sortitem'><span id='pagecontentarrow' class='arrow-right'></span>&nbsp<span class='sorttext'><span id='pagecontentnum' class='sortitemnum'>" + (MainHeaderArray.count + ImageHeaderArray.count + ScriptHeaderArray.count + StylesheetHeaderArray.count) + "</span> Website";
      if((MainHeaderArray.count + ImageHeaderArray.count + ScriptHeaderArray.count + StylesheetHeaderArray.count)==1) {
        viewHTML += " ";
      } else {
        viewHTML += "s ";
      }
      viewHTML += "allow";
      if((MainHeaderArray.count + ImageHeaderArray.count + ScriptHeaderArray.count + StylesheetHeaderArray.count)==1) {
        viewHTML += "s";
      }
      viewHTML += " this page to function properly</span></div>";
    }
  }

  viewHTML += "</div>";

  // Display view
  document.getElementById("container").innerHTML = viewHTML;
  document.getElementById("scroller").style.height = "487x";
  if(document.getElementById("trackers")!=null && document.getElementById("trackers")!="") {
    document.getElementById("trackers").style.borderTop = "none";
  }

  // Bind and color sort items
  var sortitems = document.getElementsByClassName("sortitem");
  for(i=0; i<sortitems.length; i++) {
    document.getElementById(sortitems[i].id).addEventListener("click", function() {
      showCurrentSort(this.id);
    }, false);
    colorSortNum(sortitems[i].id);
  }
	
  // Display tutorial if necessary
  if(showTutorial) {
  	// Show tutorial HTML
		var tutorialHTML = "<img src='../images/tutorial1.png' class='tutorial' id='tutorial1'></img>";
		document.body.innerHTML += tutorialHTML;
		
		// Run recursive function for next button
		switchTutorial(1);
		
		// Set showTutorial to false;
  	showTutorial = false;
  	background.showTutorial = false;
	}
}

function colorSortNum(categoryid) {
  var categoryheadersnum = document.getElementById(categoryid + "num").innerHTML;
  document.getElementById(categoryid + "num").style.fontWeight = "bold";

  var redintensity = (categoryheadersnum * 5) + 64;
  if(redintensity > 255) {
    redintensity = 255;
    document.getElementById(categoryid).style.fontWeight = "bold";
  }
  document.getElementById(categoryid).style.color = "rgb(" + redintensity + ", 0, 0)";
}

function showCurrentSort(sortid) {
  // Change arrow style and perform actions
  var sortitemarrow = document.getElementById(sortid + "arrow").className;
  if(sortitemarrow=="arrow-right") {
    document.getElementById(sortid + "arrow").className = "arrow-down";
    var sortHTML = "";

    // Perform actions per sort item
    switch(sortid) {
      // Tracking Services
      case "trackers":
        // Add trackers description
        sortHTML += "<div id='" + sortid + "info' class='sortinfo'><div class='textdescription'><div class='text'>These are the websites that are connected to this page for the sole purpose of gathering your usage activity and performing analytics on your data.</div></div>" + TrackingHeaderArray.html + "</div>";
        break;

      // Advertising
      case "advertising":
        // Add advertising description
        sortHTML += "<div id='" + sortid + "info' class='sortinfo'><div class='textdescription'><div class='text'>These companies are targeting ads at you through this page based on your activity across the web.</div></div>" + AdvertisingHeaderArray.html + "</div>";
        break;

      // Social
      case "social":
        // Add social description
        sortHTML += "<div id='" + sortid + "info' class='sortinfo'><div class='textdescription'><div class='text'>These are social networks connected to this page, often so you can like or follow this page.</div></div>" + SocialHeaderArray.html + "</div>";
        break;

      // Page Content
      case "pagecontent":
        // Check for nothing
        if((MainHeaders.length + ImageHeaders.length + ScriptHeaders.length + StylesheetHeaders.length)==0) {
          sortHTML += "<div class='checkcirclesurroundings'><div class='checkcircle'>&#x2713</div><div class='leftofcheckcircle'>This page has no external websites that make it work properly.&nbsp;&nbsp</div></div>";
        } else {
        // Add pagecontent description
          sortHTML += "<div id='" + sortid + "info' class='sortinfo'><div class='textdescription'><div class='text'>These websites know about your visit to this page because they provide content such as images, layout, and more that makes the page work properly.</div></div>";
        }

        // Add pagecontent categories
        if(MainHeaderArray.count>0) {
          sortHTML += "<div id='pagecontentmain' class='sortitem'><span id='pagecontentmainarrow' class='arrow-right'></span>&nbsp<span class='sorttext'><span id='pagecontentmainnum' class='sortitemnum'>" + MainHeaderArray.count + "</span> Website";
          if(MainHeaderArray.count==1) {
            sortHTML += " ";
          } else {
            sortHTML += "s ";
          }
          sortHTML += "provide"
          if(MainHeaderArray.count==1) {
            sortHTML += "s";
          }
          sortHTML += " main content<span class='sortitemnum'></span></span></div>";
        }
        if(ImageHeaderArray.count>0) {
          sortHTML += "<div id='pagecontentimages' class='sortitem'><span id='pagecontentimagesarrow' class='arrow-right'></span>&nbsp<span class='sorttext'><span id='pagecontentimagesnum' class='sortitemnum'>" + ImageHeaderArray.count + "</span> Website";
          if(ImageHeaderArray.count==1) {
            sortHTML += " ";
          } else {
            sortHTML += "s ";
          }
          sortHTML += "provide"
          if(ImageHeaderArray.count==1) {
            sortHTML += "s";
          }
          sortHTML += " images</span></div>";
        }
        if(ScriptHeaderArray.count>0) {
          sortHTML += "<div id='pagecontentscripts' class='sortitem'><span id='pagecontentscriptsarrow' class='arrow-right'></span>&nbsp<span class='sorttext'><span id='pagecontentscriptsnum' class='sortitemnum'>" + ScriptHeaderArray.count + "</span> Website";
          if(ScriptHeaderArray.count==1) {
            sortHTML += " ";
          } else {
            sortHTML += "s ";
          }
          sortHTML += "provide"
          if(ScriptHeaderArray.count==1) {
            sortHTML += "s";
          }
          sortHTML += " scripts</span></div>";
        }
        if(StylesheetHeaderArray.count>0) {
          sortHTML += "<div id='pagecontentstylesheets' class='sortitem'><span id='pagecontentstylesheetsarrow' class='arrow-right'></span>&nbsp<span class='sorttext'><span id='pagecontentstylesheetsnum' class='sortitemnum'>" + StylesheetHeaderArray.count + "</span> Website";
          if(StylesheetHeaderArray.count==1) {
            sortHTML += " ";
          } else {
            sortHTML += "s ";
          }
          sortHTML += "provide"
          if(StylesheetHeaderArray.count==1) {
            sortHTML += "s";
          }
          sortHTML += " page layout information</span></div></div>";
        }
        break;
      // Main Content
      case "pagecontentmain":
        sortHTML = "<div id='" + sortid + "info' class='sortinfo'>" + MainHeaderArray.html + "</div>";
        break;
      // Images
      case "pagecontentimages":
        sortHTML = "<div id='" + sortid + "info' class='sortinfo'>" + ImageHeaderArray.html + "</div>";
        break;
      // Scripts
      case "pagecontentscripts":
        sortHTML = "<div id='" + sortid + "info' class='sortinfo'>" + ScriptHeaderArray.html + "</div>";
        break;
      // Stylesheets
      case "pagecontentstylesheets":
        sortHTML = "<div id='" + sortid + "info' class='sortinfo'>" + StylesheetHeaderArray.html + "</div>";
        break;
    }

    // Display expanded information
    document.getElementById(sortid).outerHTML += sortHTML;

    // Remove top border of main content if applicable
    if(document.getElementById("pagecontentmain")!="" && document.getElementById("pagecontentmain")!=null) {
      document.getElementById("pagecontentmain").style.borderTop = "none";
    }

    // Bind and color sort items
    var sortitems = document.getElementsByClassName("sortitem");
    for(i=0; i<sortitems.length; i++) {
      document.getElementById(sortitems[i].id).addEventListener("click", function() {
        showCurrentSort(this.id);
      }, false);
      colorSortNum(sortitems[i].id);
    }

    // Bind domains for categories
    var trackeritems = document.getElementsByClassName("tracker");
    for(i=0; i<trackeritems.length; i++) {
      document.getElementById(trackeritems[i].id).addEventListener("click", function() {
        showCurrentTracker(this.id);
      }, false);
    }
    var trackertitems = document.getElementsByClassName("tracker-top");
    for(i=0; i<trackertitems.length; i++) {
      document.getElementById(trackertitems[i].id).addEventListener("click", function() {
        showCurrentTracker(this.id);
      }, false);
    }
  } else {
    document.getElementById(sortid + "arrow").className = "arrow-right";

    // Hide extended information
    var sortiteminfotoremove = document.getElementById(sortid + "info");
    sortiteminfotoremove.parentNode.removeChild(sortiteminfotoremove);
  }
}

function showCurrentTracker(typedomain) {
  // Get category and URL (really just title) from typedomain
  var domainbaseurl = typedomain.substring(0, typedomain.lastIndexOf("-"));
  var domaincategory = typedomain.substring(typedomain.lastIndexOf("-") + 1, typedomain.length);

  // Get appropriate category headers with domains and URLs
  var headerstouse;
  switch(domaincategory) {
    case "tracking":
      headerstouse = TrackingHeaders;
      break;
    case "advertising":
      headerstouse = AdvertisingHeaders;
      break;
    case "social":
      headerstouse = SocialHeaders;
      break;
    case "contentmain":
      headerstouse = MainHeaders;
      break;
    case "contentimages":
      headerstouse = ImageHeaders;
      break;
    case "contentscripts":
      headerstouse = ScriptHeaders;
      break;
    case "contentstylesheets":
      headerstouse = StylesheetHeaders;
      break;
  }

  // Change arrow style and show details
  var trackerHTML = "";
  var trackerarrow = document.getElementById(typedomain + "-arrow").className;
  if(trackerarrow=="arrow-right-r") {
    // Shift arrow to down
    document.getElementById(typedomain + "-arrow").className = "arrow-down-r";

    // Gather information
    trackerHTML += "<div id='" + typedomain + "-info' class='trackerinfo'>";

    // Add on-off switch
    trackerHTML += "<span id='" + domainbaseurl + "switchcontainer' class='switchcontainer'><div class='onoffswitch'><input type='checkbox' name='onoffswitch' class='onoffswitch-checkbox' id='" + domainbaseurl + "switch'";
    if(BlockedData.indexOf(headerstouse[domainbaseurl].domains[0])==-1) {
      trackerHTML += " checked";
    }
    trackerHTML += "><label class='onoffswitch-label' for='" + domainbaseurl + "switch'><span class='onoffswitch-inner'></span><span class='onoffswitch-switch'></span></label></div></span>";

    // Add tracker name
    var domaindata = background.getWebsiteData(headerstouse[domainbaseurl].domains[0]);
    var domainname = domainbaseurl;
    var domaindescription = null;
    if(domaindata.ALEXA.DMOZ!="" && domaindata.ALEXA.DMOZ!=null) {
      domainname = domaindata.ALEXA.DMOZ.SITE["@attributes"].TITLE;
      domaindescription = domaindata.ALEXA.DMOZ.SITE["@attributes"].DESC;
    }

    // Get number of requests from domain
    var requestNumS = getRequestNum(headerstouse, domainbaseurl, "https:");
    var requestNumU = getRequestNum(headerstouse, domainbaseurl, "http:");
    var requestNumT = parseInt(requestNumS, 10) + parseInt(requestNumU, 10);

    // Add request and encryption information
    trackerHTML += requestNumT;
    if(requestNumU>0) {
      trackerHTML += " <b>unsecure</b>";
    }
    trackerHTML += " request";
    if(requestNumT>1) {
      trackerHTML += "s were";
    } else if(requestNumT==1) {
      trackerHTML += " was";
    }
    trackerHTML += " made to " + domainname + " ";

    // Add reason for tracking
    switch(domaincategory) {
      case "tracking":
        trackerHTML += "to collect your data on this page";
        break;
      case "advertising":
        trackerHTML += "for advertisments on this page";
        break;
      case "social":
        trackerHTML += "for social networking content on this page";
        break;
      case "contentmain":
        trackerHTML += "for main content on this page";
        break;
      case "contentimages":
        trackerHTML += "for images on this page";
        break;
      case "contentscripts":
        trackerHTML += "for scripts in this page";
        break;
      case "contentstylesheets":
        trackerHTML += "for the layout of this page";
        break;
    }
    trackerHTML += ", so " + domainname + " can track you.<br /><br />"

    // Add user-centered data
    var domaintracked = getTrackedWebsites(domainbaseurl);
    var domaininterests = getTrackedInterests(domainbaseurl);
    var domainresources = getTrackedResources(domainbaseurl, headerstouse);

    // Generate HTML based on data
    if(domaintracked!="" && domaintracked!=null) {
      trackerHTML += domainname + " also knows that you visited:<ul>";
      var overflowtrackerHTML = "";
      var overflowinterestHTML = "";
      for(i=0; i<domaintracked.length; i++) {
        var tmptrackerHTML = "";
        
        var today = new Date();
        var trackedWebsiteHistory = background.historySearch(domaintracked[i]);
        tmptrackerHTML += "<li><b><span title='" + trackedWebsiteHistory.url + "'>" + background.getDomain(trackedWebsiteHistory.url) + "</span></b>, which you visited ";
        var pageTime = "AM";
        var pageHour = trackedWebsiteHistory.hour
        if(pageHour>12) {
          pageHour = pageHour - 12;
          pageTime = "PM";
        }

        if(today.getDate()==trackedWebsiteHistory.day && today.getMonth()==trackedWebsiteHistory.month && today.getFullYear()==trackedWebsiteHistory.year) {
          tmptrackerHTML += "earlier today";
        } else if(today.getDate()==(trackedWebsiteHistory.day + 1) && today.getMonth()==trackedWebsiteHistory.month && today.getFullYear()==trackedWebsiteHistory.year) {
          tmptrackerHTML += "yesterday at " + pageHour + ":" + trackedWebsiteHistory.minute + " " + pageTime;
        } else {
          tmptrackerHTML += "on " + parseWeekday(trackedWebsiteHistory.weekday) + ", " + parseMonth(trackedWebsiteHistory.month) + " " + trackedWebsiteHistory.day + ", " + trackedWebsiteHistory.year + " at " + pageHour + ":" + trackedWebsiteHistory.minute + " " + pageTime;
        }

        tmptrackerHTML += "</li>";
        
        if(i < 5) {
          trackerHTML += tmptrackerHTML;
        } else {
          overflowtrackerHTML += tmptrackerHTML;
        }
      }
      
      if(domaintracked.length > 5) {
      	trackerHTML += "<span id='" + domainname + "overflow'><li><a id='" + domainname + "showmore'><i>Show More...</i></a></li></span>";
    	}
    	
      trackerHTML += "</ul>";
    }
    if(domaininterests!="" && domaininterests!=null) {
      var tmptrackerHTML;
    	
      trackerHTML += domainname + " probably knows that you're interested in:<ul>";
      for(i=0; i<domaininterests.length; i++) {
        trackerHTML += "<li>" + domaininterests[i] + "</li>";
              	
      	if(i < 5) {
          trackerHTML += tmptrackerHTML;
        } else {
          overflowinterestHTML += tmptrackerHTML;
        }
      }
      
      if(domaintracked.length > 5) {
      	tmptrackerHTML += "<span id='" + domainname + "overinterest'><li><a id='" + domainname + "interestmore'><i>Show More...</i></a></li></span>";
    	}
      
      trackerHTML += "</ul>";
    }
    if(PTOptions.listdomains) {
      trackerHTML += "The following domains are being used by " + domainname + " to track you on this page:<ul>";
      for(i=0; i<headerstouse[domainbaseurl].domains.length; i++) {
        trackerHTML += "<li>" + headerstouse[domainbaseurl].domains[i] + "</li>";
      }
      trackerHTML += "</ul>";
    }
    if(domainresources!="" && domainresources!=null && PTOptions.listresources) {
      trackerHTML += "For this page, " + domainname + " provides the following resources:<ul>";
      for(i=0; i<domainresources.length; i++) {
        trackerHTML += "<li>" + domainresources[i] + "</li>";
      }
      trackerHTML += "</ul>";
    }

    // Add description if possible
    for(k=0; k<headerstouse[domainbaseurl].domains.length; k++) {
      domaindata = background.getWebsiteData(headerstouse[domainbaseurl].domains[k]);
      if(domaindata.ALEXA.DMOZ!="" && domaindata.ALEXA.DMOZ!=null) {
        domaindescription = domaindata.ALEXA.DMOZ.SITE["@attributes"].DESC;
        trackerHTML += "<b>Description of " + domainname + "</b>: " + domaindescription + " ";
        break;
      } else if(k==(headerstouse[domainbaseurl].domains.length-1)) {
        domaindata = background.getWebsiteData(headerstouse[domainbaseurl].domains[0]);
      }
    }

    // Add country base if possible
    for(k=0; k<headerstouse[domainbaseurl].domains.length; k++) {
      domaindata = background.getWebsiteData(headerstouse[domainbaseurl].domains[k]);
      if(domaindata.ALEXA.SD!="" && domaindata.ALEXA.SD!=null) {
        if(domaindata.ALEXA.SD[1].COUNTRY!="" && domaindata.ALEXA.SD[1].COUNTRY!=null) {
          trackerHTML += "<b> " + domainname + " is based in " + domaindata.ALEXA.SD[1].COUNTRY["@attributes"].NAME + "</b> and is <b>ranked " + domaindata.ALEXA.SD[1].COUNTRY["@attributes"].RANK + "</b> in popularity in the country.";
          break;
        }
      } else if(k==(headerstouse[domainbaseurl].domains.length-1)) {
        domaindata = background.getWebsiteData(headerstouse[domainbaseurl].domains[0]);
      }
    }

    // Display expanded tracker details
    trackerHTML += "</div>";
    document.getElementById(typedomain).outerHTML += trackerHTML;

    // Bind domains for categories
    var trackeritems = document.getElementsByClassName("tracker");
    for(i=0; i<trackeritems.length; i++) {
      document.getElementById(trackeritems[i].id).addEventListener("click", function() {
        showCurrentTracker(this.id);
      }, false);
    }
    var trackertitems = document.getElementsByClassName("tracker-top");
    for(i=0; i<trackertitems.length; i++) {
      document.getElementById(trackertitems[i].id).addEventListener("click", function() {
        showCurrentTracker(this.id);
      }, false);
    }

    // Bind switch
    document.getElementById(domainbaseurl + "switch").addEventListener("click", function() {
      // Add or remove from blacklist of domains
      if(this.checked) {
        for(j=0; j<headerstouse[domainbaseurl].domains.length; j++) {
          removeA(BlockedData, headerstouse[domainbaseurl].domains[j]);
        }
      } else {
        // Check if content
        if(domaincategory.indexOf("content")>-1) {
          var confirmHTML = "Blocking this website might stop this page from working properly. Are you sure?<br /><button id='" + domainbaseurl + "confirmyes' class='confirmbutton'>Yes</button>&nbsp;<button id='" + domainbaseurl + "confirmno' class='confirmbutton'>No</button><br /><br />";

          document.getElementById(domainbaseurl + "switchcontainer").innerHTML = confirmHTML;
          document.getElementById(domainbaseurl + "switchcontainer").style.padding = "5px";

          document.getElementById(domainbaseurl + "confirmyes").addEventListener("click", function() {
            document.getElementById(domainbaseurl + "switchcontainer").innerHTML = "<span id='" + domainbaseurl + "switchcontainer' class='switchcontainer'><div class='onoffswitch'><input type='checkbox' name='onoffswitch' class='onoffswitch-checkbox' id='" + domainbaseurl + "switch'><label class='onoffswitch-label' for='" + domainbaseurl + "switch'><span class='onoffswitch-inner'></span><span class='onoffswitch-switch'></span></label></div></span>";
            document.getElementById(domainbaseurl + "switchcontainer").style.padding = "none";
            for(j=0; j<headerstouse[domainbaseurl].domains.length; j++) {
              BlockedData[BlockedData.length] = headerstouse[domainbaseurl].domains[j];
            }
          });
          document.getElementById(domainbaseurl + "confirmno").addEventListener("click", function() {
            document.getElementById(domainbaseurl + "switchcontainer").innerHTML = "<span id='" + domainbaseurl + "switchcontainer' class='switchcontainer'><div class='onoffswitch'><input type='checkbox' name='onoffswitch' class='onoffswitch-checkbox' id='" + domainbaseurl + "switch' checked><label class='onoffswitch-label' for='" + domainbaseurl + "switch'><span class='onoffswitch-inner'></span><span class='onoffswitch-switch'></span></label></div></span>";
            document.getElementById(domainbaseurl + "switchcontainer").style.padding = "none";
          });
        } else {
          for(j=0; j<headerstouse[domainbaseurl].domains.length; j++) {
            BlockedData[BlockedData.length] = headerstouse[domainbaseurl].domains[j];
          }
        }
      }

      // Push new blacklist of domains
      background.pushData(BlockedDataName, BlockedData, "local", "Blocks saved.");
    }, false);
    
    // Bind overflow button for tracked websites if needed
    if(domaintracked.length > 5) {
      document.getElementById(domainname + "showmore").addEventListener("click", function() {
        document.getElementById(domainname + "overflow").innerHTML = overflowtrackerHTML;
      }, false);
    }
    
    // Bind overflow button for tracked interests if needed
    if(domaininterests.length > 5) {
    	 document.getElementById(domainname + "interestmore").addEventListener("click", function() {
        document.getElementById(domainname + "overinterest").innerHTML = overflowinterestHTML;
      }, false);
    }
  } else {
    document.getElementById(typedomain + "-arrow").className = "arrow-right-r";

    // Hide expanded tracker details
    var trackerinfotoremove = document.getElementById(typedomain + "-info");
    trackerinfotoremove.parentNode.removeChild(trackerinfotoremove);
  }
}

function switchTutorial(currentId) {
	// Bind tutoral elements
	var tutorial = document.getElementsByClassName("tutorial");
	for(i=0; i<tutorial.length; i++) {
    document.getElementById(tutorial[i].id).addEventListener("click", function() {
    	if(currentId < 7) {
		  	var nextId = parseInt(currentId) + 1;
		    var nextSrc = "../images/tutorial" + nextId;
			
				if(nextId==5 && (TrackingHeaderArray.count + AdvertisingHeaderArray.count + MainHeaderArray.count + ImageHeaderArray.count + ScriptHeaderArray.count + StylesheetHeaderArray.count)==0) {
					nextSrc += "-notrackers";
				} else if(nextId==5 && (TrackingHeaderArray.count + AdvertisingHeaderArray.count + MainHeaderArray.count + ImageHeaderArray.count + ScriptHeaderArray.count + StylesheetHeaderArray.count) > 0) {
					nextSrc +="-trackers";
				}
			
				nextSrc += ".png";
				this.src = nextSrc;
				switchTutorial(nextId);
			} else {
				this.parentNode.removeChild(this);
				bindWindow();
			}
		});
	}
}

function removeA(arr) {
  var what, a = arguments, L = a.length, ax;

  while(L > 1 && arr.length) {
    what = a[--L];
    while((ax= arr.indexOf(what)) !== -1) {
      arr.splice(ax, 1);
    }
  }

  return arr;
}

function getTrackedWebsites(trackername) {
	// Access TrackerData for tracked websites and reverse order so newest appear on top
  var trackedWebsites = TrackerData[trackername].websites.id;
  trackedWebsites.splice(TrackerData[trackername].websites.domain.indexOf(background.getDomain(CurrentTab.url)), 1);
  return trackedWebsites.reverse();
}

function getTrackedInterests(trackername) {
  // Access TrackerData for tracked interests
  var trackedinterests = TrackerData[trackername].interests;
  
  // Return list of interests sorted by frequency (descending) with duplicates removed
  return sortFreqDupRemove(trackedinterests);
}

function getDayDiff(today, date) {
  // Define dates
  var oneDay = 24*60*60*1000;
  var firstDate = date;
  var secondDate = today;

  // Find difference
  var diffDays = Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
  return diffDays;
}

function sortFreqDupRemove(array) {
  var frequency = {}, value;

  // Compute frequencies of each value
  for(var i = 0; i < array.length; i++) {
    value = array[i];
    if(value in frequency) {
      frequency[value]++;
    } else {
      frequency[value] = 1;
    }
  }

  // Make array from the frequency object to de-duplicate
  var uniques = [];
  for(value in frequency) {
    uniques.push(value);
  }

  // Sort the uniques array in descending order by frequency
  function compareFrequency(a, b) {
    return frequency[b] - frequency[a];
  }

  return uniques.sort(compareFrequency);
}

function getTrackedResources(trackerdomain, headerstouse) {
  return headerstouse[trackerdomain].urls;
}

function findOccurrences(array, value) {
  var i;
  var j;
  var count = 0;

  for (i = 0, j = array.length; i < j; i++) {
    (array[i] === value) && count++;
  }

  return count;
}

function getHeaders() {
  // Create variables
  var historyEntryId = background.getHistoryEntry(CurrentTab.id)[1];
  var currentTitle = background.getTrackerTitle(background.getDomain(CurrentTab.url, false));

  // Collect headers
  for(i=(ExtensionData.length-1); i>=0; i--) {
    if(ExtensionData[i].id==historyEntryId && background.getTrackerTitle(background.getDomain(ExtensionData[i].url), false) != currentTitle) {
      sortHeader(i);
    }

    // Check if headers are for a different history entry and stop and stop if so
    if(ExtensionData[i].id!=historyEntryId) {
      break;
    }
  }
  
  return;
}

function sortHeader(i) {
  // Check for match in WebsiteURLs
  var index = WebsiteURLs.indexOf(background.getDomain(ExtensionData[i].url));
  if(index==-1) {
  	// If match not found
		ExtensionData[i].title = background.getDomain(ExtensionData[i].url);
		sortContentHeader(i);
		return;
	} else {
    // Match found, sort and add it
    ExtensionData[i].title = WebsiteComps[index].toString();
    switch(WebsiteCats[index]) {
      case "Tracking":
        if(TrackingHeaders[ExtensionData[i].title]==""  || TrackingHeaders[ExtensionData[i].title]==null) {
          TrackingHeaders[ExtensionData[i].title] = {domains: [], urls: [], count: 0};
        }
        if(TrackingHeaders[ExtensionData[i].title].domains.indexOf(background.getDomain(ExtensionData[i].url))==-1) {
          TrackingHeaders[ExtensionData[i].title].domains[TrackingHeaders[ExtensionData[i].title].domains.length] = background.getDomain(ExtensionData[i].url);
        }
        TrackingHeaders[ExtensionData[i].title].urls[TrackingHeaders[ExtensionData[i].title].urls.length] = ExtensionData[i].url;
        TrackingHeaders[ExtensionData[i].title].count++;
        break;
      case "Advertising":
        if(AdvertisingHeaders[ExtensionData[i].title]==""  || AdvertisingHeaders[ExtensionData[i].title]==null) {
          AdvertisingHeaders[ExtensionData[i].title] = {domains: [], urls: [], count: 0};
        }
        if(AdvertisingHeaders[ExtensionData[i].title].domains.indexOf(background.getDomain(ExtensionData[i].url))==-1) {
          AdvertisingHeaders[ExtensionData[i].title].domains[AdvertisingHeaders[ExtensionData[i].title].domains.length] = background.getDomain(ExtensionData[i].url);
        }
        AdvertisingHeaders[ExtensionData[i].title].urls[AdvertisingHeaders[ExtensionData[i].title].urls.length] = ExtensionData[i].url;
        AdvertisingHeaders[ExtensionData[i].title].count++;
        break;
      case "Social":
        if(SocialHeaders[ExtensionData[i].title]==""  || SocialHeaders[ExtensionData[i].title]==null) {
          SocialHeaders[ExtensionData[i].title] = {domains: [], urls: [], count: 0};
        }
        if(SocialHeaders[ExtensionData[i].title].domains.indexOf(background.getDomain(ExtensionData[i].url))==-1) {
          SocialHeaders[ExtensionData[i].title].domains[SocialHeaders[ExtensionData[i].title].domains.length] = background.getDomain(ExtensionData[i].url);
        }
        SocialHeaders[ExtensionData[i].title].urls[SocialHeaders[ExtensionData[i].title].urls.length] = ExtensionData[i].url;
        SocialHeaders[ExtensionData[i].title].count++;
        break;
      case "Content":
        sortContentHeader(i);
        break;
    }
    return;
  }
}

function sortContentHeader(i) {
  if(ExtensionData[i].type=="sub_frame" || ExtensionData[i].type=="object") {
    if(MainHeaders[ExtensionData[i].title]==""  || MainHeaders[ExtensionData[i].title]==null) {
      MainHeaders[ExtensionData[i].title] = {domains: [], urls: [], count: 0};
    }
    if(MainHeaders[ExtensionData[i].title].domains.indexOf(background.getDomain(ExtensionData[i].url))==-1) {
      MainHeaders[ExtensionData[i].title].domains[MainHeaders[ExtensionData[i].title].domains.length] = background.getDomain(ExtensionData[i].url);
    }
    MainHeaders[ExtensionData[i].title].urls[MainHeaders[ExtensionData[i].title].urls.length] = ExtensionData[i].url;
    MainHeaders[ExtensionData[i].title].count++;
  } else if(ExtensionData[i].type=="image") {
    if(ImageHeaders[ExtensionData[i].title]==""  || ImageHeaders[ExtensionData[i].title]==null) {
      ImageHeaders[ExtensionData[i].title] = {domains: [], urls: [], count: 0};
    }
    if(ImageHeaders[ExtensionData[i].title].domains.indexOf(background.getDomain(ExtensionData[i].url))==-1) {
      ImageHeaders[ExtensionData[i].title].domains[ImageHeaders[ExtensionData[i].title].domains.length] = background.getDomain(ExtensionData[i].url);
    }
    ImageHeaders[ExtensionData[i].title].urls[ImageHeaders[ExtensionData[i].title].urls.length] = ExtensionData[i].url;
    ImageHeaders[ExtensionData[i].title].count++;
  } else if(ExtensionData[i].type=="script") {
    if(ScriptHeaders[ExtensionData[i].title]==""  || ScriptHeaders[ExtensionData[i].title]==null) {
      ScriptHeaders[ExtensionData[i].title] = {domains: [], urls: [], count: 0};
    }
    if(ScriptHeaders[ExtensionData[i].title].domains.indexOf(background.getDomain(ExtensionData[i].url))==-1) {
      ScriptHeaders[ExtensionData[i].title].domains[ScriptHeaders[ExtensionData[i].title].domains.length] = background.getDomain(ExtensionData[i].url);
    }
    ScriptHeaders[ExtensionData[i].title].urls[ScriptHeaders[ExtensionData[i].title].urls.length] = ExtensionData[i].url;
    ScriptHeaders[ExtensionData[i].title].count++;
  } else if(ExtensionData[i].type="stylesheet") {
    if(StylesheetHeaders[ExtensionData[i].title]==""  || StylesheetHeaders[ExtensionData[i].title]==null) {
      StylesheetHeaders[ExtensionData[i].title] = {domains: [], urls: [], count: 0};
    }
    if(StylesheetHeaders[ExtensionData[i].title].domains.indexOf(background.getDomain(ExtensionData[i].url))==-1) {
      StylesheetHeaders[ExtensionData[i].title].domains[StylesheetHeaders[ExtensionData[i].title].domains.length] = background.getDomain(ExtensionData[i].url);
    }
    StylesheetHeaders[ExtensionData[i].title].urls[StylesheetHeaders[ExtensionData[i].title].urls.length] = ExtensionData[i].url;
    StylesheetHeaders[ExtensionData[i].title].count++;
  }
}

function showHeaders(inputheaders, headermessage, nonemessage, type) {
  var outputHTML = "";
  var outputCount = 0;
  if(Object.keys(inputheaders).length==0) {
    outputHTML = "&#x2713;&nbsp" + nonemessage;
  } else {
    // Count requests
    var requestcount = 0;
    for(domain in inputheaders) {
      requestcount = requestcount + inputheaders[domain].count;
    }

    // List domains
    var i = 0;
    for(domain in inputheaders) {
      // When to end
      if(domain=="length") {
        break;
      }

      // Check for top entry
      var topTracker = "";
      if(i==0) {
        topTracker += "-top";
        i++;
      }
			
      // Check for unsecure requests or blocked domain
      var requestNumU = getRequestNum(inputheaders, domain, "http:");
      var trackedwebsites = getTrackedWebsites(domain);
      var colorTracker = "";
      if(BlockedData.indexOf(inputheaders[domain].domains[0])>-1) {
        colorTracker = " style='color: gray'";
      } else if(requestNumU>0) {
        colorTracker = " style='color: #B40000'";
      }

      // Get domain information
      var headerdomain = domain;
      var headerdomainxml = background.getWebsiteData(headerdomain);

      // Check domain favicon
      var headerfavicon = "http://www.google.com/s2/favicons?domain=" + inputheaders[domain].domains[0];
      var headerfaviconsize;
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', headerfavicon, true);
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4) {
          if(xhr.status == 200) {
            headerfaviconsize = xhr.getResponseHeader("Content-Length");
          }
        }
      };
      xhr.send(null);

      if(headerfavicon=="" || headerfavicon==null || headerfaviconsize==726) {
        headerfavicon = "../images/page.png";
      }

      // Get domain title
      var headerdomaintitle = headerdomain;
      if(domain!=background.getDomain(inputheaders[domain].urls[0])) {
        headerdomaintitle = domain;
      } else {
        if(headerdomainxml.ALEXA.DMOZ!="" && headerdomainxml.ALEXA.DMOZ!=null) {
          headerdomaintitle = headerdomainxml.ALEXA.DMOZ.SITE["@attributes"].TITLE;
        }
      }

      // Add domain entry
      outputHTML += "<div class='tracker" + topTracker + "' id='" + headerdomain + "-" + type + "'><span" + colorTracker + "><img class='icon' src='" + headerfavicon + "' align=left><b>" + headerdomaintitle + "</b><br />";

      // Add other tracked pages
      if(trackedwebsites.length>0) {
        outputHTML += "Tracking " + trackedwebsites.length + " other website";
        if(trackedwebsites.length>1) {
          outputHTML += "s";
        }
      } else {
        outputHTML += "Just this page"
      }
      outputHTML += "</span>"

      // Tidy up domain entry
      outputHTML += "<span id='" + headerdomain + "-" + type + "-arrow' class='arrow-right-r'></span></div>";

      // Add to count of websites
      outputCount++;
    }
  }

  var outputArray = {html: outputHTML, count: outputCount};
  return outputArray;
}

function getRequestNum(headers, domain, protocol) {
  var requestCounter = 0;

  for(k=0; k<headers[domain].urls.length; k++) {
    if(new URL(headers[domain].urls[k]).protocol==protocol) {
      requestCounter++;
    }
  }

  return requestCounter;
}

function showList() {
  // Shorten and edit tab information
  if(CurrentTab.url.length>53) {
    CurrentTab.url = CurrentTab.url.substring(0, 50) + "...";
  }
  if(CurrentTab.title.length>38) {
    CurrentTab.title = CurrentTab.title.substring(0, 35) + "...";
  }
  if(CurrentTab.favIconUrl=="" || CurrentTab.favIconUrl==null) {
    CurrentTab.favIconUrl = "../images/page.png";
  }

  // Add tab information
  current = "<div id='current'><img id='icon-current' class='icon' src=" + CurrentTab.favIconUrl + " align=right></img><span id='title-current' class='title'>" + CurrentTab.title + "</span><br />" + CurrentTab.url + "</div>";

  // Add view switcher
  current += "<div id='container'></div>";

  // Display tab information and view switcher
  document.getElementById("content").innerHTML = current;

  // Display current view
  switchView("category");
}

function switchHelp() {
  document.getElementById("tab-current").className = "tab";
  if(PTOptions.log) {
	  document.getElementById("tab-history").className = "tab";
  }
  document.getElementById("tab-overview").className = "tab";
  document.getElementById("link-help").className = "selected";
  document.getElementById("link-options").className = "";
  document.getElementById("link-about").className = "";
  showHelp();
}

function showHelp() {
	// Show help information
  help = "<div id='container'><div id='scroller'><div id='elevenpt'>Whenever you visit a website, companies that you've most likely never heard of are secretly collecting your information. They build complex, hidden profiles about you based on your interests and often sell your personal data. This happens on pretty much every website that you visit, and there isn't much you can do about it. But with PrivacyTracker, you can find out exactly who's tracking you and easily prevent creepy companies from collecting your data.<br /><br />PrivacyTracker is really easy to use, but this section is available at any time in case you're having trouble. The best way to learn the basics, though, is to take a look at our tutorial.<br /><br /><button class='optionsbutton' id='showtutorial'>Show Tutorial</button><br /><br /><b>How Tracking Works</b><br />When you go to any webpage in your browser, things like images, text, and video are sent over the Internet to your computer through HTTP headers. For most sites, though, there are headers sent for scripts that are used to track you. These scripts report your activities on a webpage to the tracking company, which, based on the sites you visit, determines what you like/dislike, then shows you relevant ads on other websites. The problem is that this tracking is really creepy, and can result in serious problems like identity theft and phishing attacks. PrivacyTracker empowers you to keep your data safe and secure by analyzing the content of HTTP headers to display a list of trackers for each webpage, and blocks HTTP headers if you want. However, PrivacyTracker still can't control first-party tracking (when the website you're actually on tracks you, like Google when you're visiting google.com), which is unavoidable when you visit any page.<br /><br /><b>How to Use PrivacyTracker</b><br /><i>Current Page: </i>The tab that you see when you open PrivacyTracker shows you a list of the companies that know you visited the current page. The companies that track you are grouped into categories (which are color-coded: see below) based on why they're tracking you. Some trackers simply analyze and sell your data, while others might be displaying targeted ads on a website.<br /><br /><i>Color-Coded Headings: </i>There are up to four headings that you see when you open up PrivacyTracker, which group websites that track you into categories. They are each colored with a shade of red, which is indicative of the number of websites listed under the category. If the number is very high, the entire category heading will be bolded.<br /><br /><i>Information about Trackers: </i>Under each category is a list of websites and companies that are tracking you on a webpage. The name of the website is shown in bold, with other pages the tracker knows you visited below the name. If the name is shown in red, the tracker is unsecurely connected to the webpage, so your personal information is not protected and could be stolen. If the tracker name is gray, you've blocked the tracker. When you click on the tracker's name, you'll see more information about which sites they know you visited and what they've guessed you like. If you think it's super creepy and want them to stop tracking you, just hit the giant blue switch that says 'Tracking' (it will change to 'Blocking').<br /><br /><i>Overview: </i>The second tab at the top of the PrivacyTracker popup window shows you a list of every single company that has ever collected information about you. Just like in the Current Page tab, blocked trackers are shown in gray and you can click on the tracker's name for more information and the option to block the tracker<br /><br />If you need any other information, you can head to the <a class='about-link' id='http://fishdev.github.io/PrivacyTracker/'>PrivacyTracker website</a>.</div></div></div>";
  document.getElementById("content").innerHTML = help;
  document.getElementById("scroller").style.height = "487px";
  
  // Bind tutorial button
  document.getElementById("showtutorial").addEventListener("click", function() {
  	showTutorial = true;
  	document.body.innerHTML = originalHTML;
  	showCurrent();
	});
	
	// Bind links
  var aboutlinks = document.getElementsByClassName("about-link");
  for(j=0; j<aboutlinks.length; j++) {
    document.getElementById(aboutlinks[j].id).addEventListener("click", function() {
      chrome.tabs.update({url: this.id, selected: true});
      chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if(changeInfo.status=="loading") {
          window.close();
        }
      });
    }, false);
  }
}

function switchOptions() {
  document.getElementById("tab-current").className = "tab";
  if(PTOptions.log) {
	  document.getElementById("tab-history").className = "tab";
  }
  document.getElementById("tab-overview").className = "tab";
  document.getElementById("link-help").className = "";
  document.getElementById("link-options").className = "selected";
  document.getElementById("link-about").className = "";
  showOptions();
}

function showOptions() {
  options = "<div id='container'><div id='scroller'><div id='elevenpt'><form id='form-options'><span class='title'>PrivacyTracker Options</span><br /><br /><input type='checkbox' name='loghistory' value='valuehistory'";
  if(PTOptions.log) {
    options += " checked";
  }
  options += ">Show 'History' tab to view past pages you've visited</input><br /><button id='optionsclearhistory' class='optionsbutton'>Clear stored history</button><br /><br /><input type='checkbox' name='listresources' value='valueresources'";
  if(PTOptions.listresources) {
    options += " checked";
  }
  options += ">Show list of resources provided by each tracker</input><br /><input type='checkbox' name='listdomains' value='valuedomains'";
  if(PTOptions.listdomains) {
    options += " checked";
  }
  options += ">Show domains used by each tracker</input><br /><br /><div id='optionssubmit' class='optionsbutton'>Save</div></form></div></div></div>";

  document.getElementById("content").innerHTML = options;
  document.getElementById("scroller").style.height = "487px";

  document.getElementById("optionsclearhistory").addEventListener("click", function() {
    HistoryData.length = 0;
    pushData(HistoryDataName, HistoryData, "local", "History saved.");
  }, false);
  document.getElementById("optionssubmit").addEventListener("click", function() {
    var form = document.getElementById("form-options");

    if(form.loghistory.checked) {
      PTOptions.log = true;
    } else {
      PTOptions.log = false;
    }

    if(form.listdomains.checked) {
      PTOptions.listdomains = true;
    } else {
      PTOptions.listdomains = false;
    }

    if(form.listresources.checked) {
      PTOptions.listresources = true;
    } else {
      PTOptions.listresources = false;
    }

    background.pushData("PrivacyOptions", PTOptions, "sync", "Options saved.");
    document.getElementById("scroller").innerHTML += "Options saved.";
    switchCurrent();
  }, false);
}

function switchAbout() {
  document.getElementById("tab-current").className = "tab";
  if(PTOptions.log) {
	  document.getElementById("tab-history").className = "tab";
  }
  document.getElementById("tab-overview").className = "tab";
  document.getElementById("link-help").className = "";
  document.getElementById("link-options").className = "";
  document.getElementById("link-about").className = "selected";
  showAbout();
}

function showAbout() {
  about = "<div id='container'><div id='scroller'><div id='elevenpt'>PrivacyTracker is a browser plugin designed to simplify the process of managing web services that track you as you browse. It offers useful information regarding what these tracking companies know about you and allows you to disable services based on these facts.<br /><br />PrivacyTracker is a <a class='about-link' id='http://fishdev.github.io/'>FishDev</a> project. Designed to make life easier. Completely free and open. You can learn more about the development of PrivacyTracker, suggest changes, report bugs, or view the source code on the <a class='about-link' id='https://github.com/fishdev/PrivacyTracker/'>GitHub repository</a>.</div></div></div>";
  document.getElementById("content").innerHTML = about;
  document.getElementById("scroller").style.height = "487px";
  
  // Bind links
  var aboutlinks = document.getElementsByClassName("about-link");
  for(j=0; j<aboutlinks.length; j++) {
    document.getElementById(aboutlinks[j].id).addEventListener("click", function() {
      chrome.tabs.update({url: this.id, selected: true});
      chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if(changeInfo.status=="loading") {
          window.close();
        }
      });
    }, false);
  }
}
