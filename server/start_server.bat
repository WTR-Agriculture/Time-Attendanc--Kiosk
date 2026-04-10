@echo off
cd /d "d:\WTR\Time-Attendanc- Kiosk\server"
call venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000
