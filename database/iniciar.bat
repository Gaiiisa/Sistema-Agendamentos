@echo off
REM Wrapper: duplo-clique aqui para subir MySQL + API.
REM Encaminha para iniciar.ps1 no mesmo diretorio.
powershell -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1"
pause
