@echo off
REM Local KoS Java server launcher (Windows host).
REM Cocos client connects to ws://localhost:8080/ws/game once this is up.
REM
REM Usage: double-click or `cmd /c run-local.bat`

setlocal
set "JAVA_HOME=D:\Program Files (x86)\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0"

if not exist "target\king-of-survive-server-1.0.0-SNAPSHOT.jar" (
  echo [run-local] jar missing, run `mvn package` first or use Maven goal.
  pause
  exit /b 1
)

echo [run-local] Starting on http://localhost:8080  (WS: ws://localhost:8080/ws/game)
"%JAVA_HOME%\bin\java.exe" -jar target\king-of-survive-server-1.0.0-SNAPSHOT.jar
endlocal
