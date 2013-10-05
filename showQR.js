/*
 * showQR.js
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
var charMap = {'0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6,
'7':7, '8':8, '9':9, 'a':10, 'b':11, 'c':12, 'd':13, 'e':14,
'f':15, 'g':16, 'h':17, 'i':18, 'j':19, 'k':20, 'l':21, 'm':22,
'n':23, 'o':24, 'p':25, 'q':26, 'r':27, 's':28, 't':29, 'u':30,
'v':31, 'w':32, 'x':33, 'y':34, 'z':35, 'A':36, 'B':37, 'C':38,
'D':39, 'E':40, 'F':41, 'G':42, 'H':43, 'I':44, 'J':45, 'K':46,
'L':47, 'M':48, 'N':49, 'O':50, 'P':51, 'Q':52, 'R':53, 'S':54,
'T':55, 'U':56, 'V':57, 'W':58, 'X':59, 'Y':60, 'Z':61, '-':62,
'_':63};

var charList = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
'-', '_'];

var apiKey = "Insert API key";

function showQR(rand) {
    var randString = rand.join(' ') + ' Chrome Whatshare Extension';
    jQuery('#qrcode').qrcode(randString);
    console.log("random string is " + randString);
}

function interceptEnter() {
    jQuery('input[type=text]').on('keydown', function(e) {
        if (e.which == 13) {
            e.preventDefault();
            sendCode();
        }
    });
}

function localize() {
    jQuery('#calloutTitle').html(chrome.i18n.getMessage('calloutTitle'));
    jQuery('#calloutInstructions').html(chrome.i18n.getMessage('calloutInstructions'));
    jQuery('#instructions').prepend(chrome.i18n.getMessage('instructionsBefore'));
    jQuery('#instructions').append(chrome.i18n.getMessage('instructionsAfter'));

    jQuery("#codeField").attr('placeholder', chrome.i18n.getMessage('codeFieldMsg'));
    jQuery("#sendButton").attr('value', chrome.i18n.getMessage('sendButtonLabel'));

    jQuery("#result").html(chrome.i18n.getMessage('caseSensitiveMessage'));

    jQuery("#ready").html(chrome.i18n.getMessage('onPairingSuccess'));
}

function sendCode() {
    var url = jQuery('#codeField').val();
    re = /^[a-zA-Z0-9]{5}/;
    if (url.match(re)) {
        jQuery('#spinningwheel').show();
        jQuery('#ready').hide();
        var googl = 'https://www.googleapis.com/urlshortener/v1/url?key=' + apiKey + '&shortUrl=http://goo.gl/' + url;
        console.log("calling " + googl);
        var xhr = new XMLHttpRequest();
        xhr.open("GET", googl, true);
        xhr.onreadystatechange = function() {
            jQuery('#spinningwheel').hide();
            if (xhr.readyState == 4) {
                var response = JSON.parse(xhr.responseText);
                decodeID(response['longUrl'], function(error, device, id, assignedID) {
                    if (error) {
                        showError(error);
                    } else {
                        saveDevice(device, id, assignedID, function(paired) {
                            if (paired) {
                                showSuccess(chrome.i18n.getMessage('pairSuccess', device));
                                console.log('executing callback');
                                chrome.runtime.sendMessage({devices: [{'id': id, 'assignedID': assignedID}]}, function(response) {
                                    console.log(response);
                                });
                            } else {
                                showError(chrome.i18n.getMessage('pairFail', device));
                            }
                        });
                    }
                });
                var encoded = response['longUrl'];
                console.log("response is " + encoded);
            }
        };
        xhr.send();
    } else {
        showError(chrome.i18n.getMessage('invalidCode'));
    }
}

function showError(message) {
    jQuery('#result').css('color', '#ff0000');
    jQuery('#result').text(message);
}

function showSuccess(message) {
    jQuery('#result').css('color', '#42b300');
    jQuery('#result').text(message);
    jQuery('#ready').show();
    showDeviceStatus();
}

function loadDevices(callback) {
  chrome.storage.sync.get('devices', function(items) {
    callback(items.devices);
  });
}

function saveDevice(device, id, assignedID, callback) {
    chrome.storage.sync.set({'devices':[{'id':id, 'name':device, 'assignedID': assignedID}]}, function() {
        callback(chrome.runtime.lastError === undefined);
    });
}

function showDeviceStatus() {
    loadDevices(function(items) {
      if (items) {
        for (var i = 0; i < items.length; i++) {
            item = items[i];
            console.log(item['id'] + ' ' + item['name']);
            jQuery('#devices').html(chrome.i18n.getMessage('pairNew', item['name']));
        }
      } else {
        jQuery('#devices').text(chrome.i18n.getMessage('noPaired'));
      }
      devices = items;
    });
}

function decodeID(response, callback) {
    var error = chrome.i18n.getMessage('tryAgain');
    var device = null;
    var deviceID = null;
    var assignedID = null;
    if (response) {
        var parsed = response.match(/http:\/\/([^\/]+)\/(\d+)\?model\=([^&]+)&yourid=([a-zA-Z0-9\-\_]+)&id=([a-zA-Z0-9\-\_]+)/);
        if (parsed) {
            var domain = parsed[1];
            var sum = +parsed[2];
            var model = parsed[3];
            var assigned = parsed[4];
            var id = parsed[5];
            console.log('valid URL, domain=%s, sum=%d, model=%s, assigned=%s, id=%s', domain, sum, model, assigned, id);
            checksum(domain, function(check) {
                if (check == sum) {
                    decode(id, function(decodedID) {
                        console.log('retrieved ID is %s', decodedID);
                        deviceID = decodedID;
                        decode(assigned, function(decodedAssignedID) {
                            console.log('retrieved assigned ID is %s', decodedAssignedID);
                            assignedID = decodeURIComponent(decodedAssignedID);
                            device = decodeURIComponent(model);
                            error = null;
                        });
                    });
                }
            });
        }
    }
    callback(error, device, deviceID, assignedID);
}

function decode(encoded, callback) {
    var decoded = "";
    for (i = 0; i < encoded.length; i++) {
        var c = charMap[encoded.charAt(i)];
        var index = (c - rand[i % rand.length]) % charList.length;
        if (index < 0)
            index = charList.length + index;
        var d = charList[index];
        decoded = decoded + d;
    }
    callback(decoded);
}

function checksum(check, callback) {
    var sum = 0;
    for (i = 0; i < check.length; i++) {
        sum = sum + charMap[check.charAt(i)];
    }
    callback(sum);
}

// set debugMode to true to see logs in chrome's console
var debugMode = false;

if (!debugMode) {
  console.log("whatshare's debug is disabled");
  console.log = function() {};
}

var rand = [Math.floor(Math.random() * 127),
Math.floor(Math.random() * 127),
Math.floor(Math.random() * 127),
Math.floor(Math.random() * 127)];

document.querySelector('#sendButton').onclick = sendCode;
interceptEnter();
localize();
showQR(rand);
showDeviceStatus();
