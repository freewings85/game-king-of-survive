@echo off
REM Build Cocos web-mobile + publish to docs/ for GitHub Pages.
REM
REM Usage from Windows: double-click this file
REM Usage from WSL:     cmd.exe /C scripts\build-and-publish.bat
REM
REM Tester URL after this runs + GitHub Pages enabled on main/docs:
REM   https://freewings85.github.io/game-king-of-survive/

setlocal EnableDelayedExpansion

set "CC=C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe"
set "PROJ=E:\Documents\github\game-king-of-survive\cocos-v03-demo"
set "BUILD_OUT=%PROJ%\build"
set "REPO=E:\Documents\github\game-king-of-survive"
set "DOCS=%REPO%\docs"

if not exist "%CC%" (
  echo [error] CocosCreator not found at %CC%
  exit /b 1
)

echo === [1/4] Cocos CLI build web-mobile ===
REM Cocos 3.8.x emits non-zero exit on harmless metric errors even on successful
REM builds, so we ignore exitcode and just verify the output file lands.
"%CC%" --project "%PROJ%" --build "platform=web-mobile;debug=false;buildPath=%BUILD_OUT%"

if not exist "%BUILD_OUT%\web-mobile\index.html" (
  echo [error] build output missing: %BUILD_OUT%\web-mobile\index.html
  exit /b 1
)
echo [ok] build output present

echo === [2/4] mirror build/web-mobile -^> docs/ ===
if not exist "%DOCS%" mkdir "%DOCS%"
robocopy "%BUILD_OUT%\web-mobile" "%DOCS%" /MIR /NFL /NDL /NJH /NJS /NP
if errorlevel 8 (
  echo [error] robocopy failed.
  exit /b 1
)

REM /MIR deletes files not in source, including .nojekyll. Recreate so Pages
REM serves Cocos _virtual_*.js (Jekyll otherwise skips underscore files).
type nul > "%DOCS%\.nojekyll"

echo === [3/4] git add + commit ===
cd /d "%REPO%"
git add docs
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "build(web-mobile): refresh tester bundle"
  if errorlevel 1 (
    echo [error] git commit failed.
    exit /b 1
  )
) else (
  echo [info] no docs/ changes, skip commit.
)

echo === [4/4] git push origin main ===
git push origin main
if errorlevel 1 (
  echo [error] git push failed.
  exit /b 1
)

echo.
echo === DONE ===
echo Tester URL: https://freewings85.github.io/game-king-of-survive/
echo (First time only: enable GitHub Pages on https://github.com/freewings85/game-king-of-survive/settings/pages — Source: Deploy from a branch, Branch: main, Folder: /docs)

endlocal
