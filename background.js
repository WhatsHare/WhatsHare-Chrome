/*
 * background.js
 * Copyright (C) 2013 Michele Bonazza <emmepuntobi@gmail.com>
 *
 * This file is part of WhatsHare.
 *
 *   WhatsHare is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   WhatsHare is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with WhatsHare.  If not, see <http://www.gnu.org/licenses/>.
*/
function onLinkClick(info, tab) {
  var type = 'c';
  if (endsWith(info.menuItemId, 'WhatsApp'))
    type = 'w';
  if (info.selectionText) {
    if (type === 'w') {
      sendData(info.selectionText + ": " + info.linkUrl, type);
    } else {
      sendData(info.linkUrl, type);
    }
    trackClicks('linkWithSelection');
  } else {
    sendData(info.linkUrl, type);
    trackClicks('link');
  }
}

function onPageClick(info, tab) {
  var type = 'c';
  if (endsWith(info.menuItemId, 'WhatsApp'))
    type = 'w';
  if (type === 'w') {
    sendData(tab.title + ": " + info.pageUrl, type);
  } else {
    sendData(info.pageUrl, type);
  }
  trackClicks('pageURL');
}

function onSelectionClick(info, tab) {
  var type = 'c';
  if (endsWith(info.menuItemId, 'WhatsApp'))
    type = 'w';
  if (type === 'w') {
    sendData(" «" + info.selectionText + "» - " + info.pageUrl, type);
  } else {
    sendData(info.selectionText, type);
  }
  trackClicks('selection');
}

function onImageClick(info, tab) {
  var type = 'c';
  if (endsWith(info.menuItemId, 'WhatsApp'))
    type = 'w';
  sendData(info.srcUrl, type);
  trackClicks('imageURL');
}

function sendData(message, type) {
  storage.get('devices', function(items) {
    console.log('items is ' + items + ", devices is " + items.devices + ", first is " + items.devices[0]);
    id = [items.devices[0]['id']];
    assignedID = items.devices[0]['assignedID'];
    console.log("Sending: '" + message + "' as sender '" + assignedID + "' to id " + id);
    var sendRequest = {
      'registration_ids':id,
      'data': {'message':message, 'sender':assignedID, 'type':type}
    };
    console.log('request is ' + JSON.stringify(sendRequest));
    $.ajax({
      url: 'https://android.googleapis.com/gcm/send',
      type: 'POST',
      contentType: 'application/json',
      beforeSend: function(request) {
        request.setRequestHeader("Authorization", "key=Insert API Key");
      },
      data: JSON.stringify(sendRequest),
      timeout: 10000,
      success: function(json) {
        console.log("success: " + json.message);
        successNotification(items.devices[0]);
      },
      error: function(request, status, error) {
        console.log("error");
        errorNotification(items.devices[0]);
      }
    });
  });
}

function successNotification(device) {
  var notification = webkitNotifications.createNotification(
     'icon.png',
     chrome.i18n.getMessage('notificationSuccessTitle', device['name']),
     chrome.i18n.getMessage('notificationSuccessMessage')
    );
    notification.show();

  setTimeout(function(){
    notification.cancel();
  }, 4000);
}

function errorNotification(device) {
  var notification = webkitNotifications.createNotification(
     'alert.png',
     chrome.i18n.getMessage('notificationErrorTitle', device['name']),
     chrome.i18n.getMessage('notificationErrorMessage')
    );
    notification.show();

  setTimeout(function(){
    notification.cancel();
  }, 4000);
}

function onConfigureClick(info, tab) {
  chrome.tabs.create({'url': chrome.extension.getURL('qr.html')}, function(tab) {
    // Tab opened.
  });
}

function loadDevices(callback) {
  storage.get('devices', function(items) {
    callback(items.devices);
  });
}

function checkFirstInstall(callback) {
  storage.get('version', function(version) {
    callback(version['version'] === undefined);
    version = chrome.app.getDetails().version;
    storage.set({'version': version}, function() {
      console.log('version is ' + version);
    });
  });
}

function attachButtons(items) {
  // Create a link for each context type.
  currentDeviceID = [items[0]['id']];
  currentAssignedID = items[0]['assignedID'];
  console.log('current device: ' + currentDeviceID + ", assigned id: " + currentAssignedID);
  chrome.contextMenus.removeAll();
  var types = {"link":onLinkClick, "page":onPageClick, "selection":onSelectionClick, "image":onImageClick};
  var key, title;
  for (key in types) {
    if (types.hasOwnProperty(key)) {
      title = chrome.i18n.getMessage("rightClickPopup", [chrome.i18n.getMessage(key), ""]);
      chrome.contextMenus.create({"title": title, 'id': 'menu_' + key,"contexts":[key], "onclick": types[key]});
    }
  }
  chrome.contextMenus.create({"title": "WhatsApp", 'id': 'menu_separator', "type": "separator", "contexts": ["link", "page", "selection", "image"]});
  for (key in types) {
    if (types.hasOwnProperty(key)) {
      title = chrome.i18n.getMessage("rightClickPopup", [chrome.i18n.getMessage(key), chrome.i18n.getMessage('WhatsAppViaWhatsHare')]);
      chrome.contextMenus.create({"title": title, 'id': 'menu_' + key + '_WhatsApp', "contexts":[key], "onclick": types[key]});
    }
  }
  chrome.contextMenus.create({"title": "Configure", 'id': 'menu_separator_2', "type": "separator", "contexts": ["link", "page", "selection", "image"]});
  chrome.contextMenus.create({'title': chrome.i18n.getMessage("changePairedDevice"),
      'id': 'menu_change_device',
      'contexts':['link', 'page', 'selection', 'image'],
      'onclick': onConfigureClick});
}

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function clearStorage() {
  storage.clear(function(items) {
    console.log('data removed');
  });
}

function trackClicks(buttonID) {
  _gaq.push(['_trackEvent', buttonID, 'clicked']);
}

// set debugMode to true to see logs in chrome's console
var debugMode = false;

if (!debugMode) {
  console.log("WhatsHare's debug is disabled");
  console.log = function() {};
}

var storage = chrome.storage.sync;

checkFirstInstall(function(isFirstInstall) {
  if (isFirstInstall) {
    onConfigureClick(null, null);
  }
  loadDevices(function(items) {
    if (items) {
      attachButtons(items);
    } else {
      console.log('no devices!');
      chrome.contextMenus.create({'title': chrome.i18n.getMessage("configure"),
        'contexts':['link', 'page', 'selection', 'image'],
        'onclick': onConfigureClick});
    }
  });
});

// add a listener for the submit button
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (sender.tab) {
    attachButtons(message.devices);
  }
});

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-41868803-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
