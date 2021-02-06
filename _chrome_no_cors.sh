#!/bin/bash

C=$(cygpath -u "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe")
"$C" --disable-web-security --user-data-dir=$(cygpath $TMP)/chrome-user-dir


