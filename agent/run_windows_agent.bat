@echo off
cd /d "%~dp0"
py -m pip show psutil >nul 2>&1
if errorlevel 1 py -m pip install psutil
py laptop_agent.py
pause
