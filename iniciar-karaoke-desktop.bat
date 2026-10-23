@echo off
title Pampo Karaoke Desktop
cd /d "%~dp0"
start "" npx electron electron/main.cjs
exit
