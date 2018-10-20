/*
    WazzApp, (c) 2018 Ralfoide.

    This work is licensed under the terms of the MIT license.  
    For a copy, see LICENSE.txt or <https://opensource.org/licenses/MIT>.
*/

"use strict";

var wazzAccessToken = "";
var wazzRefreshToken = "";
var wazzUserEmail = "";
var wazzUserPasswd = "";
var wazzSavePasswd = true;
var wazzDevices = [];
var wazzDeviceSort = [];
var wazzAlarms = [];
var wazzNextTs = 0;
var wazzGuid = "";
var wazzBaseUrl = "https://api.wyzecam.com:8443/";
var wazzSC = "a9ecb0f8ea7b4da2b6ab56542403d769";
var wazzSV = {
    "set_app_info" :               { path: "app/system/set_app_info",               sv: "664331bda40b47349498e57df18d1e80" },
    "login" :                      { path: "app/user/login",                        sv: "da29dd58efe4407a90aa69ced5134e0b" },
    "refresh_token" :              { path: "app/user/refresh_token",                sv: "c8ef4bf8db3142aa8896c9e86151d47e" },
    "use_app" :                    { path: "app/user/use_app",                      sv: "39ce68b146884ba997aa30b9d2861313" },
    "get_device_list" :            { path: "app/device/get_device_list",            sv: "f70047319e884e83a952cd30bc349bdc" },
    "get_app_config_list" :        { path: "app/system/get_app_config_list",        sv: "bc5ec86775114e4fa2820b73cd1cc708" },
    "get_provider_list" :          { path: "app/v2/auto/get_provider_list",         sv: "e3fb1d84a20840119d63f83989c2434a" },
    "get_auto_list" :              { path: "app/v2/auto/get_auto_list",             sv: "367afccc32b1431c9f583d94394079a2" },
    "get_alarm_info_list" :        { path: "app/device/get_alarm_info_list",        sv: "49411c69553a49b6b3f3dfda9709f7ae" },
    "upload_device_connect_info" : { path: "app/device/upload_device_connect_info", sv: "22dd7b8b2335467db1c588e760c7c3d5" },
};


function wazzInit() {
    console.log("@@ init");
    wazzLoadLogin();
    wazzGuid = genGUID();
    $("#wazz-btn-signin").click(wazzSignIn);    
}

function wazzLoadLogin() {
    if (typeof(Storage) != undefined) {
        var email  = localStorage.getItem("wazz-input-email");
        var passwd = localStorage.getItem("wazz-input-passwd");
        var check  = localStorage.getItem("wazz-remember-signin");
        if (email != undefined)  {
            $("#wazz-input-email").val(email);
        }
        if (passwd != undefined && wazzSavePasswd)  {
            $("#wazz-input-passwd").val(passwd);
        }
        if (check != undefined) {
            $("#wazz-remember-signin").prop("checked", check == "true");
        }
    }
}

function wazzSaveLogin() {
    if (typeof(Storage) != undefined) {
        var email  = $("#wazz-input-email").val().trim();
        var passwd = $("#wazz-input-passwd").val().trim();
        var check  = $("#wazz-remember-signin").prop("checked");
        if (check) {
            localStorage.setItem("wazz-input-email",  email);
            if (wazzSavePasswd) localStorage.setItem("wazz-input-passwd", passwd);
        } else {
            localStorage.setItem("wazz-input-email",  "");
            if (wazzSavePasswd) localStorage.setItem("wazz-input-passwd", "");
        }
        localStorage.setItem("wazz-remember-signin", check.toString());
    }
}

// From https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function genGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
}

function wazzNowMs() {
    var datetime = new Date();
    return datetime.getTime();
}

function wazzFormatMs(ts) {
    var d = new Date(ts);
    return d.toLocaleString();
}

function wazzStartOfDayMs(ts) {
    var d = new Date(ts);
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    return d.getTime();
}

function wazzJsonRequestPromise(req, reqData) {
    return new Promise(function (resolve, reject) {
        console.log("@@ SV request: " + req);
        var sv = wazzSV[req];
        if (sv == undefined) {
            console.log("@@ invalid SV request: " + req);
            reject(Error("Invalid SV request " + req));
            return;
        }

        var url = wazzBaseUrl + sv.path;

        var jsonData = {
            "access_token": wazzAccessToken,
            "app_name": "com.hualai",
            "app_ver": "com.hualai___1.5.44",
            "app_version": "1.5.44",
            "phone_id": wazzGuid,
            "sc": wazzSC,
            "sv": sv.sv,
            "ts": wazzNowMs(),
        };

        /* Result is always JSON in the form:
           {code: "1002"
            data: {}
            msg: "http method is error"
            ts: epoch}

            1 = success (no msg, has actual data)
            1002 = http method is error
            1003 = content type is error
            1006 = etc.
        */

        if (reqData != undefined) {
            $.extend(jsonData, reqData);
        }
        
        // [DEBUG] console.log("@@ req: " + url + " " + JSON.stringify(jsonData));

        $.ajax({
            url: url,
            method: "POST",
            data: JSON.stringify(jsonData),
            dataType: "json",
            contentType: "application/json",
            success: function(result, status, xhr) {
                console.log("@@ req: " + req + ", success: " + result.code + ", " + result.msg);
                // alert("result: " + result.code + " " + result.msg + " " + JSON.stringify(result.data));
                if (result.code >= 1000) {
                    reject(Error("Code " + result.code + ": " + result.msg));
                } else {
                    resolve(result.data);
                }
            },
            error: function(xhr, status, error) {
                console.log("@@ req: " + req + ", error: " + status.code + ", " + status.msg + ", " + error);
                reject(Error("Code " + status.code + ": " + status.msg));
            }
        }); // end ajax
    }); // end promise
}

function wazzSignIn() {
    console.log("@@ wazzSignIn");

    var email = $("#wazz-input-email").val().trim();
    var passwd = $("#wazz-input-passwd").val().trim();

    if (email == "" || passwd == "") {
        alert("Please fill both email and password.");
        return;
    }

    wazzSaveLogin();

    wazzUserEmail = email;
    wazzUserPasswd = md5(md5(passwd));

    wazzSetAppInfoPromise()
    .then(data => wazzUserLoginPromise())
    .then(loginData => {
        wazzAccessToken = loginData.access_token;
        wazzRefreshToken = loginData.refresh_token;
    })
    .then(data => wazzUseAppPromise())
    .then(data => wazzGetDeviceListPromise())
    .then(deviceData => {
        wazzDevices = deviceData.device_info_list;
        wazzDeviceSort = deviceData.device_sort_list;
        displayDevices();
    })
    .then(data => wazzGetAlarmInfoListPromise())
    .then(alarmData => {
        wazzAlarms = alarmData.alarm_info_list;
        displayAlarms();
    })
    .catch(error => {
        console.log("@@ login KO: " + error);
    });
}

function wazzSetAppInfoPromise() {
    return wazzJsonRequestPromise(
        "set_app_info",
        {
            "android_push_type": 2,
            "app_num": "4YC155Pe1spGXM7WAGK0NQ==",
            "language": "en",
            "latitude": 0,
            "longitude": 0,
            "phone_model": "N5X_Android",
            "push_token": "debug",
            "system_type": 2,
            "system_ver": "Android_25",
            "timezone_city": "America/Los_Angeles",
        }
    );    
}

function wazzUserLoginPromise() {
    return wazzJsonRequestPromise(
        "login",
        {
            "password": wazzUserPasswd,
            "user_name": wazzUserEmail,        
        }
    );
}

function wazzUseAppPromise() {
    return wazzJsonRequestPromise("use_app");
}

function wazzGetDeviceListPromise() {
    return wazzJsonRequestPromise("get_device_list");
}

function wazzGetAlarmInfoListPromise(begin_time_ms, end_time_ms, device_mac, nums) {
    if (end_time_ms == undefined) {
        end_time_ms = wazzNowMs();
    }
    if (begin_time_ms == undefined) {
        begin_time_ms = end_time_ms - 24*3600*1000;
    }
    if (device_mac == undefined) {
        device_mac = "";
    }
    if (nums == undefined) {
        nums = 20;
    }
    console.log("@@ alarm list: begin= " + wazzFormatMs(begin_time_ms) + ", end=" + wazzFormatMs(end_time_ms));
    wazzNextTs = begin_time_ms;
    return wazzJsonRequestPromise(
        "get_alarm_info_list",
        {
            "begin_time": begin_time_ms,
            "end_time": end_time_ms,
            "device_mac": device_mac,
            "nums": nums,
            "order_by": 2,        
        }
    );
}

function wazzUploadDeviceConnectInfoPromise(connect_result, connect_ts, device_mac) {
    return wazzJsonRequestPromise(
        "upload_device_connect_info",
        {
            "connect_result": connect_result,
            "connect_ts": connect_ts,
            "device_mac": "device_mac",   
        });
}

function wazzLookupCamName(device_mac) {
    var len = wazzDevices.length;
    for (var i = 0; i < len; i++) {
        if (wazzDevices[i].mac == device_mac) {
            return wazzDevices[i].nickname;
        }
    }
    return device_mac;
}

function wazzDisplayAlarmsBeforeAsync(end_time_ms) {
    wazzGetAlarmInfoListPromise(undefined, end_time_ms - 1)
    .then(alarmData => {
        wazzAlarms = alarmData.alarm_info_list;
        displayAlarms();
    })
    .catch(error => {
        console.log("@@ login KO: " + error);
    });
}

// ---

function displayDevices() {
    var len = wazzDevices.length;
    $("#wazz-num-devices").html(len + " cameras available.");

    var body = $("#wazz-devices-body");
    body.empty();

    for (var i = 0; i < len; i++) {
        var entry = wazzDevices[i];

        var img = $("<img>").attr("src", entry.product_model_logo_url);

        var model = entry.product_type + " " + entry.product_model;
        var name = entry.nickname || entry.mac;
        var info = $("<span>").append(name).append( $("<br>") ).append( $("<span>").append(model) );

        var tr = $("<tr>");
        tr.append( $("<td>").attr("class", "wazz-devices-td-logo").append(img) );
        tr.append( $("<td>").attr("class", "wazz-devices-td-info").append(info) );
        body.append(tr);
    }
}

function displayAlarms() {
    var len = wazzAlarms.length;
    $("#wazz-num-alarms").html(len + " alarms available.");

    var body = $("#wazz-alarms-body");
    body.empty();

    for (var i = 0; i < len; i++) {
        var entry = wazzAlarms[i];
        let preview_link = entry.alarm_pic_url;
        let video_link = entry.alarm_video_url;
        let name = wazzLookupCamName(entry.device_mac);
        let timeTs = wazzFormatMs(entry.alarm_ts);
        wazzNextTs = entry.alarm_ts;

        var info = $("<span>").append(name).append($("<br>")).append( $("<span>").append(timeTs) );

        var video = $("<video>")
            .attr("width", "75%")
            .attr("controls", "")
            .attr("src", video_link)
            .append("Sorry, your browser doesn't support embedded videos.");
        // Note: instead of src attr, can use a source sub element:
        // video.append( $("<source>").attr("src", video_link).attr("type", "video/mp4") );

        var dl = $("<a>")
            .attr("href", video_link)
            .attr("title", "Click to download")
            .append("Download");
        var full = $("<a>")
            .attr("href", "#")
            .attr("title", "Play fullscreen")
            .click(e => displayFullscreen(name + " " + timeTs, video_link))
            .append("Play Full Size");
        info = info.append($("<br>")).append(dl).append($("<br>")).append(full);

        var tr = $("<tr>");
        tr.append( $("<td>").attr("class", "wazz-alarms-td-info").append(info) );
        tr.append( $("<td>").attr("class", "wazz-alarms-td-view").append(video) );
        body.append(tr);
    }

    let previous_end_ts = wazzNextTs;
    let previous_day_ts = wazzStartOfDayMs(wazzNextTs);
    
    var link_more = $("<a>")
        .attr("href", "#")
        .attr("title", "Load previous alarm videos")
        .click(e => wazzDisplayAlarmsBeforeAsync(previous_end_ts))
        .append("Load <b>previous</b> alarm videos");
    var link_more_text = " (before " + wazzFormatMs(previous_end_ts) + ")";
    var link_prev_day = $("<a>")
        .attr("href", "#")
        .attr("title", "Load previous alarm videos")
        .click(e => wazzDisplayAlarmsBeforeAsync(previous_day_ts))
        .append("Load <b>previous day</b> alarm videos");
    var tr = $("<tr>");
    tr.append( $("<td>").attr("class", "wazz-alarms-td-info").append("&nbsp;") );
    tr.append( $("<td>").attr("class", "wazz-alarms-td-view")
                        .append(link_more).append(link_more_text)
                        .append("<br>")
                        .append(link_prev_day));
    body.append(tr);

}

function displayFullscreen(info, video_link) {
    console.log("@@ Playing full screen [" + info + "]: " + video_link);
    var m = $("#wazz-fs-modal");
    m.modal("show");
    stopAllVideos();
    $("#wazz-fs-info").html(info);
    $("#wazz-fs-video").attr("src", video_link);
    m.on("hidden.bs.modal", e => stopAllVideos());
}

function stopAllVideos() {
    // stop *all* video players (not just this one)
    $("video").each(function () { this.pause() });
}

// ---

$(document).ready(wazzInit);
