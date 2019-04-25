/*
    Wyze Web Interface, (c) 2018 Ralfoide.
    A demonstration Wyze web client interface.

    This work is licensed under the terms of the MIT license.  
    For a copy, see LICENSE.txt or <https://opensource.org/licenses/MIT>.
*/

"use strict";

var wyzewebAccessToken = "";
var wyzewebRefreshToken = "";
var wyzewebUserEmail = "";
var wyzewebUserPasswd = "";
var wyzewebSavePasswd = false; // do not enable. Let browsers save password if feature is wanted.
var wyzewebDevices = [];
var wyzewebDeviceSort = [];
var wyzewebAlarms = [];
var wyzewebEndTs = 0;
var wyzewebBeginTs = 0;
var wyzewebLastViewTs = []
var wyzewebGuid = "";
var wyzewebFailures = 0;
const wyzewebOneDayMs = 24*3600*1000;
const wyzewebBaseUrl = "https://api.wyzecam.com:8443/";
const wyzewebSC = "a9ecb0f8ea7b4da2b6ab56542403d769";
const wyzewebSV = {
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


function wyzewebInit() {
    console.log("@@ init");
    wyzewebLoadLogin();
    wyzewebGuid = uuid.v1();
    $("#wyzeweb-btn-signin").click(wyzewebSignIn);    
}

function wyzewebLoadLogin() {
    if (typeof(Storage) != undefined) {
        var email  = localStorage.getItem("wyzeweb-input-email");
        var passwd = localStorage.getItem("wyzeweb-input-passwd");
        var check  = localStorage.getItem("wyzeweb-remember-signin");
        if (email != undefined)  {
            $("#wyzeweb-input-email").val(email);
        }
        if (passwd != undefined && wyzewebSavePasswd)  {
            $("#wyzeweb-input-passwd").val(passwd);
        }
        if (check != undefined) {
            $("#wyzeweb-remember-signin").prop("checked", check == "true");
        }
    }
}

function wyzewebSaveLogin() {
    if (typeof(Storage) != undefined) {
        var email  = $("#wyzeweb-input-email").val().trim();
        var passwd = $("#wyzeweb-input-passwd").val().trim();
        var check  = $("#wyzeweb-remember-signin").prop("checked");
        if (check) {
            localStorage.setItem("wyzeweb-input-email",  email);
            if (wyzewebSavePasswd) localStorage.setItem("wyzeweb-input-passwd", passwd);
        } else {
            localStorage.setItem("wyzeweb-input-email",  "");
            if (wyzewebSavePasswd) localStorage.setItem("wyzeweb-input-passwd", "");
        }
        localStorage.setItem("wyzeweb-remember-signin", check.toString());
    }
}

function wyzewebNowMs() {
    return moment().valueOf();
}

function wyzewebFormatMs(ts) {
    var d = new Date(ts);
    return d.toLocaleString();
}

function wyzewebTimeFromMs(ts) {
    return moment(ts).fromNow();
}

function wyzewebStartOfDayMs(ts) {
    var d = new Date(ts);
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    return d.getTime();
}

function wyzewebJsonRequestPromise(req, reqData) {
    return new Promise((resolve, reject) => {
        console.log("@@ SV request: " + req);
        var sv = wyzewebSV[req];
        if (sv == undefined) {
            console.log("@@ invalid SV request: " + req);
            reject({msg: "Invalid SV request " + req});
            return;
        }

        var url = wyzewebBaseUrl + sv.path;

        var jsonData = {
            "access_token": wyzewebAccessToken,
            "app_name": "com.hualai",
            "app_ver": "com.hualai___1.5.44",
            "app_version": "1.5.44",
            "phone_id": wyzewebGuid,
            "sc": wyzewebSC,
            "sv": sv.sv,
            "ts": wyzewebNowMs(),
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
            2001 = access token error
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
            success: (result, status, xhr) => {
                console.log("@@ req: " + req + ", success: " + result.code + ", " + result.msg);
                // [DEBUG] alert("result: " + result.code + " " + result.msg + " " + JSON.stringify(result.data));
                if (result.code >= 1000) {
                    wyzewebFailures += 1;
                    reject(result);
                } else {
                    wyzewebFailures = 0;
                    resolve(result.data);
                }
            },
            error: (xhr, status, error) => {
                console.log("@@ req: " + req + ", error: " + status.code + ", " + status.msg + ", " + error);
                reject(status);
            }
        }); // end ajax
    }); // end promise
}

function wyzewebSignIn() {
    console.log("@@ wyzewebSignIn");

    var email = $("#wyzeweb-input-email").val().trim();
    var passwd = $("#wyzeweb-input-passwd").val().trim();

    if (email == "" || passwd == "") {
        alert("Please fill both email and password.");
        return;
    }

    wyzewebSaveLogin();

    wyzewebUserEmail = email;
    wyzewebUserPasswd = md5(md5(passwd));

    wyzewebSetAppInfoPromise()
    .then(data => wyzewebUserLoginPromise())
    .then(data => wyzewebUseAppPromise())
    .then(data => wyzewebGetDeviceListPromise())
    .then(data => wyzewebGetAlarmInfoListPromise())
    .catch(error => {
        console.log("@@ login KO: " + JSON.stringify(error));
    });
}

function wyzewebSetAppInfoPromise() {
    return wyzewebJsonRequestPromise(
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

function wyzewebUserLoginPromise() {
    return wyzewebJsonRequestPromise(
        "login",
        {
            "password": wyzewebUserPasswd,
            "user_name": wyzewebUserEmail,        
        }
    ).then(loginData => {
        wyzewebAccessToken = loginData.access_token;
        wyzewebRefreshToken = loginData.refresh_token;
    });
}

function wyzewebRefreshTokenPromise() {
    return wyzewebJsonRequestPromise(
        "refresh_token",
        {
            "access_token": wyzewebAccessToken,
            "refresh_token": wyzewebRefreshToken,
        }
    ).then(data => {
        wyzewebAccessToken = data.access_token;
        wyzewebRefreshToken = data.refresh_token;
    });
}

function wyzewebUseAppPromise() {
    return wyzewebJsonRequestPromise("use_app");
}

function wyzewebGetDeviceListPromise() {
    return wyzewebJsonRequestPromise("get_device_list")
    .then(deviceData => {
        wyzewebDevices = deviceData.device_info_list;
        wyzewebDeviceSort = deviceData.device_sort_list;
        displayDevices();
    });
}

function wyzewebGetAlarmInfoListPromise(begin_time_ms, end_time_ms, device_mac, nums) {
    if (end_time_ms == undefined || end_time_ms == 0) {
        end_time_ms = wyzewebNowMs();
    }
    if (begin_time_ms == undefined || begin_time_ms >= end_time_ms) {
        begin_time_ms = end_time_ms - 24*3600*1000;
    }
    if (device_mac == undefined) {
        device_mac = "";
    }
    if (nums == undefined) {
        nums = 20;
    }
    console.log("@@ alarm list: begin= " + wyzewebFormatMs(begin_time_ms) + ", end=" + wyzewebFormatMs(end_time_ms));
    wyzewebEndTs = end_time_ms;
    wyzewebBeginTs = begin_time_ms;
    return wyzewebJsonRequestPromise(
        "get_alarm_info_list",
        {
            "begin_time": begin_time_ms,
            "end_time": end_time_ms,
            "device_mac": device_mac,
            "nums": nums,
            "order_by": 2,        
        }
    ).then(alarmData => {
        wyzewebAlarms = alarmData.alarm_info_list;
        displayAlarms();
    });
}

function wyzewebUploadDeviceConnectInfoPromise(connect_result, connect_ts, device_mac) {
    return wyzewebJsonRequestPromise(
        "upload_device_connect_info",
        {
            "connect_result": connect_result,
            "connect_ts": connect_ts,
            "device_mac": "device_mac",   
        });
}

function wyzewebLookupCamName(device_mac) {
    var len = wyzewebDevices.length;
    for (var i = 0; i < len; i++) {
        if (wyzewebDevices[i].mac == device_mac) {
            return wyzewebDevices[i].nickname;
        }
    }
    return device_mac;
}

function wyzewebUpdateAlarmsAsync(end_time_ms) {
    return wyzewebGetAlarmInfoListPromise(undefined, end_time_ms)
    .catch(error => {
        console.log("@@ login KO: " + JSON.stringify(error));
        if (error.code == 2001 && wyzewebFailures < 5) {
            return wyzewebRefreshTokenPromise()
            .then(data => wyzewebUpdateAlarmsAsync(end_time_ms))
            .catch(error => console.log("@@ login KO: " + JSON.stringify(error)));
        }
    });
}

// ---

function displayDevices() {
    var len = wyzewebDevices.length;
    $("#wyzeweb-num-devices").html(len + " cameras available.");

    var body = $("#wyzeweb-devices-body");
    body.empty();

    for (var i = 0; i < len; i++) {
        var entry = wyzewebDevices[i];

        var img = $("<img>").attr("src", entry.product_model_logo_url);

        var model = entry.product_type + " " + entry.product_model;
        var name = entry.nickname || entry.mac;
        var info = $("<span>").append(name).append( $("<br>") ).append( $("<span>").append(model) );

        var tr = $("<tr>");
        tr.append( $("<td>").attr("class", "wyzeweb-devices-td-logo").append(img) );
        tr.append( $("<td>").attr("class", "wyzeweb-devices-td-info").append(info) );
        body.append(tr);
    }
}

function displayAlarms() {
    var len = wyzewebAlarms.length;
    $("#wyzeweb-num-alarms").html(len + " alarms available.");

    var body = $("#wyzeweb-alarms-body");
    body.empty();

    for (var i = 0; i < len; i++) {
        var entry = wyzewebAlarms[i];
        let preview_link = entry.alarm_pic_url;
        let video_link = entry.alarm_video_url;
        let name = wyzewebLookupCamName(entry.device_mac);
        let timeTs = wyzewebFormatMs(entry.alarm_ts);
        var timeFromNow = wyzewebTimeFromMs(entry.alarm_ts);
        wyzewebBeginTs = entry.alarm_ts;

        var info = $("<span>")
            .append(name).append($("<br>"))
            .append( $("<span>").append(timeFromNow) ).append($("<br>"))
            .append( $("<span>").append(timeTs) );

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
        tr.append( $("<td>").attr("class", "wyzeweb-alarms-td-info").append(info) );
        tr.append( $("<td>").attr("class", "wyzeweb-alarms-td-view").append(video) );
        body.append(tr);
    }

    let previous_end_ts = wyzewebBeginTs;
    let previous_day_ts = wyzewebStartOfDayMs(wyzewebBeginTs);
    let next_day_ts = wyzewebStartOfDayMs(wyzewebBeginTs + wyzewebOneDayMs);

    var tr = $("<tr>");
    var btn_more = $("<button>")
        .attr("class", "btn btn-success wyzeweb-btn-action")
        .attr("href", "#")
        .attr("title", "View 20 previous alarm videos")
        .click(e => {
            $("html, body").animate(
                { scrollTop: $("#wyzeweb-alarm-actions").offset().top },
                "slow",
                "swing",
                /*completed*/ () => wyzewebUpdateAlarmsAsync(previous_end_ts - 1) );
        })
        .append("&lt; 20 PREVIOUS alarm videos");
    var btn_more_text = " (before " + wyzewebFormatMs(previous_end_ts) + ")";
    tr.append( $("<td>").attr("class", "wyzeweb-alarms-td-info").append("&nbsp;") );
    tr.append( $("<td>").attr("class", "wyzeweb-alarms-td-view")
                        .append(btn_more)
                        .append( $("<span>").append(btn_more_text) ) );
    body.append(tr);

    var tr = $("<tr>");
    var btn_refresh = $("<button>")
        .attr("class", "btn btn-info wyzeweb-btn-action")
        .attr("href", "#")
        .attr("title", "View latest alarm videos")
        .click(e => {
            wyzewebUpdateAlarmsAsync(0);
        })
        .append("View LATEST alarm videos");
    tr.append( $("<td>").attr("class", "wyzeweb-alarms-td-info").append("&nbsp;") );
    tr.append( $("<td>").attr("class", "wyzeweb-alarms-td-view")
                        .append(btn_refresh) );
    body.append(tr);

    var btn_prev_day = $("<button>")
        .attr("class", "btn btn-primary wyzeweb-btn-action")
        .attr("href", "#")
        .attr("title", "View previous day alarm videos")
        .click(e => {
            wyzewebUpdateAlarmsAsync(previous_day_ts - 1);
        })
        .append("&lt; PREVIOUS day");

    var btn_next_day = $("<button>")
        .attr("class", "btn btn-primary wyzeweb-btn-action")
        .attr("href", "#")
        .attr("title", "View next day alarm videos")
        .click(e => {
            wyzewebUpdateAlarmsAsync(next_day_ts - 1);
        })
        .append("NEXT day &gt;");

    var btn_prev2 = $("<button>")
        .attr("class", "btn btn-success wyzeweb-btn-action")
        .attr("href", "#")
        .attr("title", "View 20 previous alarm videos")
        .click(e => {
            wyzewebUpdateAlarmsAsync(previous_end_ts - 1);
        })
        .append("&lt; 20 PREVIOUS videos");

    var btn_next2 = $("<button>")
        .attr("class", "btn btn-success wyzeweb-btn-action")
        .attr("href", "#")
        .attr("title", "View 20 next alarm videos")
        .click(e => {
            wyzewebLastViewTs.shift(); // this is the ts we just loaded
            var ts = wyzewebLastViewTs.shift(); // this is the one before
            if (ts != undefined) {
                wyzewebUpdateAlarmsAsync(ts);
            }
        })
        .append("20 NEXT videos &gt;");
    if (wyzewebLastViewTs.length <= 1) {
        btn_next2.attr("disabled", "");
    }

    var span_top = $("#wyzeweb-alarm-actions");
    span_top
        .empty()
        .append(btn_refresh)
        .append(btn_prev_day)
        .append(btn_next_day)
        .append(btn_prev2)
        .append(btn_next2);
}

function displayFullscreen(info, video_link) {
    console.log("@@ Playing full screen [" + info + "]: " + video_link);
    var m = $("#wyzeweb-fs-modal");
    m.modal("show");
    stopAllVideos();
    $("#wyzeweb-fs-info").html(info);
    $("#wyzeweb-fs-video").attr("src", video_link);
    m.on("hidden.bs.modal", e => stopAllVideos());
}

function stopAllVideos() {
    // stop *all* video players (not just this one)
    $("video").each((index, video) => video.pause());
}

// ---

$(document).ready(wyzewebInit);
