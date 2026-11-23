@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Garajim - Tek Tus Commit, Derle ve Yukle

rem Tek tus: Git commit/push, GitHub Actions derlemesi, APK indir, telefona ve Watch7'ye kur.
set "SOURCE_DIR=%~dp0"
if "%SOURCE_DIR:~-1%"=="\" set "SOURCE_DIR=%SOURCE_DIR:~0,-1%"
set "CONFIG_DIR=%APPDATA%\Garajim-OneClick"
set "CONFIG_FILE=%CONFIG_DIR%\devices.ini"
set "DOWNLOAD_ROOT=%LOCALAPPDATA%\Garajim-OneClick\artifacts"
set "PHONE_SERIAL="
set "WATCH_SERIAL="
set "ADB="
set "NO_CHANGES=0"
set "RUN_ID="
set "PRE_RUN_ID="
set "PHONE_APK="
set "WEAR_APK="

 echo.
echo ============================================================
echo GARAJIM - TEK TUS: COMMIT + ACTIONS + APK KURULUMU
echo ============================================================
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo HATA: Git bulunamadi. Git for Windows: https://git-scm.com/download/win
  goto :FAIL
)
where gh.exe >nul 2>&1
if errorlevel 1 (
  echo HATA: GitHub CLI bulunamadi. Kur: https://cli.github.com/
  goto :FAIL
)
gh auth status >nul 2>&1
if errorlevel 1 (
  echo GitHub girisi bulunamadi; bir defalik giris aciliyor...
  gh auth login
  if errorlevel 1 goto :FAIL
)
gh auth setup-git >nul 2>&1

rem ADB'yi bilinen konumlarda ara.
if exist "%SOURCE_DIR%\platform-tools\adb.exe" set "ADB=%SOURCE_DIR%\platform-tools\adb.exe"
if not defined ADB if exist "%USERPROFILE%\Desktop\platform-tools\adb.exe" set "ADB=%USERPROFILE%\Desktop\platform-tools\adb.exe"
if not defined ADB for /f "delims=" %%A in ('where adb.exe 2^>nul') do if not defined ADB set "ADB=%%A"
if not defined ADB (
  echo HATA: adb.exe bulunamadi. Platform-Tools: https://developer.android.com/tools/releases/platform-tools
  goto :FAIL
)

rem Kaynagin zaten git deposu olup olmadigini flag ile belirle; errorlevel degiskenine sonradan guvenme.
set "SOURCE_IS_REPO="
for /f "delims=" %%D in ('git -C "%SOURCE_DIR%" rev-parse --show-toplevel 2^>nul') do (
  set "SOURCE_IS_REPO=1"
  set "REPO_DIR=%%D"
)
if defined SOURCE_IS_REPO (
  echo Yerel Git deposu bulundu: !REPO_DIR!
) else (
  if not exist "%SOURCE_DIR%\package.json" (
    echo HATA: BAT'i tek basina Indirilenler klasorunden calistirma.
    echo Tam proje ZIP'ini cikarip icindeki BAT'i calistir.
    goto :FAIL
  )
  if not exist "%SOURCE_DIR%\.github\workflows\build-apk.yml" (
    echo HATA: Bu klasorde Garajim kaynak projesi bulunamadi.
    echo Tam proje ZIP'ini cikarip icindeki BAT'i calistir.
    goto :FAIL
  )
  set "REPO_DIR=%USERPROFILE%\Garajim-GitHub"
  echo Bu klasor Git deposu degil. GitHub depo URL'si bir kez sorulacak.
  set /p "REPO_URL=GitHub depo adresi (https://github.com/KULLANICI/DEPO.git): "
  if not defined REPO_URL goto :FAIL
  if not exist "!REPO_DIR!" (
    echo Depo klonlaniyor...
    git clone "!REPO_URL!" "!REPO_DIR!"
    if errorlevel 1 goto :FAIL
  ) else if not exist "!REPO_DIR!\.git" (
    echo HATA: !REPO_DIR! klasoru var ama Git deposu degil. Klasoru yeniden adlandirip tekrar dene.
    goto :FAIL
  ) else (
    echo Mevcut klon kullaniliyor: !REPO_DIR!
  )
  echo Proje dosyalari klonlanan depoya kopyalaniyor...
  robocopy "%SOURCE_DIR%" "!REPO_DIR!" /E /XD "%SOURCE_DIR%\.git" "%SOURCE_DIR%\node_modules" "%SOURCE_DIR%\android" "%SOURCE_DIR%\www" "%SOURCE_DIR%\platform-tools" "%SOURCE_DIR%\__pycache__" /XF "*.apk" "*.aab" "*.jks" "*.keystore" "*.p12" "*.pfx" "*.pem" "*.key" ".env" ".env.*" /NFL /NDL /NJH /NJS /NP
  if errorlevel 8 goto :FAIL
)
cd /d "!REPO_DIR!"
if errorlevel 1 goto :FAIL
if not exist ".github\workflows\build-apk.yml" (
  echo HATA: .github\workflows\build-apk.yml yok. Duzeltilmis proje dosyalarini kontrol et.
  goto :FAIL
)
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo HATA: origin uzak deposu ayarlanmamis.
  goto :FAIL
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not defined BRANCH (
  echo HATA: Git dal secili degil ^(detached HEAD^).
  goto :FAIL
)

rem Git kimligi eksikse GitHub kullanici adindan doldur.
for /f "delims=" %%N in ('git config user.name') do set "GIT_NAME=%%N"
if not defined GIT_NAME (
  for /f "delims=" %%U in ('gh api user --jq .login 2^>nul') do set "GH_LOGIN=%%U"
  if not defined GH_LOGIN set "GH_LOGIN=Garajim Developer"
  git config user.name "!GH_LOGIN!"
)
for /f "delims=" %%E in ('git config user.email') do set "GIT_EMAIL=%%E"
if not defined GIT_EMAIL (
  if not defined GH_LOGIN for /f "delims=" %%U in ('gh api user --jq .login 2^>nul') do set "GH_LOGIN=%%U"
  if not defined GH_LOGIN (
    echo HATA: Git e-posta adresi ayarlanamadi. git config user.email komutuyla ayarla.
    goto :FAIL
  )
  git config user.email "!GH_LOGIN!@users.noreply.github.com"
)

rem Telefon ve saat baglantisini derlemeden once kontrol et.
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%" >nul 2>&1
if exist "%CONFIG_FILE%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%CONFIG_FILE%") do (
    if /i "%%A"=="PHONE_SERIAL" set "PHONE_SERIAL=%%B"
    if /i "%%A"=="WATCH_SERIAL" set "WATCH_SERIAL=%%B"
  )
)
echo.
echo --- ADB cihaz listesi ---
"!ADB!" devices
if not defined PHONE_SERIAL set /p "PHONE_SERIAL=Listeden TELEFON seri numarasini yapistir: "
if not defined WATCH_SERIAL set /p "WATCH_SERIAL=Listeden WATCH7 seri numarasini yapistir: "
if not defined PHONE_SERIAL goto :FAIL
if not defined WATCH_SERIAL goto :FAIL

set "DEVICE_STATE="
for /f "delims=" %%S in ('"!ADB!" -s "!PHONE_SERIAL!" get-state 2^>nul') do set "DEVICE_STATE=%%S"
if /i not "!DEVICE_STATE!"=="device" (
  echo Telefon kayitli seri numarasiyla bagli degil. Telefonu USB ile bagla; USB hata ayiklamaya izin ver.
  "!ADB!" devices
  set /p "PHONE_SERIAL=Guncel telefon seri numarasini gir: "
  set "DEVICE_STATE="
  for /f "delims=" %%S in ('"!ADB!" -s "!PHONE_SERIAL!" get-state 2^>nul') do set "DEVICE_STATE=%%S"
  if /i not "!DEVICE_STATE!"=="device" (
    echo HATA: Telefon ADB baglantisi hazir degil.
    goto :FAIL
  )
)
set "DEVICE_STATE="
for /f "delims=" %%S in ('"!ADB!" -s "!WATCH_SERIAL!" get-state 2^>nul') do set "DEVICE_STATE=%%S"
if /i not "!DEVICE_STATE!"=="device" (
  echo Watch7 bagli degil. Saatte Wireless debugging ana ekranini ac.
  set /p "WATCH_ADDR=Saatin IP:PORT degeri (iptal icin bos birak): "
  if not defined WATCH_ADDR goto :FAIL
  "!ADB!" connect "!WATCH_ADDR!"
  "!ADB!" devices
  set /p "WATCH_SERIAL=Listeden Watch7'nin guncel seri numarasini gir: "
  set "DEVICE_STATE="
  for /f "delims=" %%S in ('"!ADB!" -s "!WATCH_SERIAL!" get-state 2^>nul') do set "DEVICE_STATE=%%S"
  if /i not "!DEVICE_STATE!"=="device" (
    echo HATA: Watch7 ADB baglantisi hazir degil.
    goto :FAIL
  )
)
(
  echo PHONE_SERIAL=!PHONE_SERIAL!
  echo WATCH_SERIAL=!WATCH_SERIAL!
) > "%CONFIG_FILE%"

rem Mevcut Actions ID'sini kaydet; no-op / diger dal durumunda dispatch icin kullanilir.
set "PRE_RUN_ID="
for /f "delims=" %%R in ('gh run list --workflow build-apk.yml --branch "!BRANCH!" --limit 1 --json databaseId --jq ".[0].databaseId" 2^>nul') do set "PRE_RUN_ID=%%R"

echo.
echo --- Degisiklikleri GitHub'a commit/push et ---
git add -A
if errorlevel 1 goto :FAIL
set "STAGED_FILE=%TEMP%\garajim-staged-%RANDOM%.txt"
git diff --cached --name-only > "!STAGED_FILE!"
findstr /i /e /c:".jks" /c:".keystore" /c:".p12" /c:".pfx" /c:".pem" /c:".key" /c:".env" "!STAGED_FILE!" >nul
if not errorlevel 1 goto :BLOCK_SECRETS
findstr /i /c:".env." /c:"id_rsa" /c:"id_ed25519" /c:"secrets.json" "!STAGED_FILE!" >nul
if not errorlevel 1 goto :BLOCK_SECRETS

git diff --cached --quiet
if errorlevel 1 (
  set "NO_CHANGES=0"
  git commit -m "Garajim: mobile and Wear OS build"
  if errorlevel 1 goto :FAIL
) else (
  set "NO_CHANGES=1"
  echo Kaynak dosyalarda yeni degisiklik yok; ayni kaynak yeniden derlenecek.
)
git push -u origin "!BRANCH!"
if errorlevel 1 (
  echo HATA: GitHub'a push basarisiz. Yukaridaki Git mesajini kontrol et.
  goto :FAIL
)
for /f "delims=" %%C in ('git rev-parse HEAD') do set "COMMIT_SHA=%%C"

rem main/master dalindaki yeni commit push'u Actions'i otomatik baslatir.
rem Diger dallarda veya yeni commit yoksa workflow_dispatch kullanilir.
if /i "!BRANCH!"=="main" if "!NO_CHANGES!"=="0" goto :FIND_PUSH_RUN
if /i "!BRANCH!"=="master" if "!NO_CHANGES!"=="0" goto :FIND_PUSH_RUN

echo GitHub Actions manuel olarak baslatiliyor...
gh workflow run build-apk.yml --ref "!BRANCH!"
if errorlevel 1 (
  echo HATA: Workflow baslatilamadi. Actions etkin mi ve workflow default dalda mevcut mu kontrol et.
  goto :FAIL
)
set /a WAIT_COUNT=0
:WAIT_DISPATCH_RUN
set "RUN_ID="
for /f "delims=" %%R in ('gh run list --workflow build-apk.yml --branch "!BRANCH!" --limit 1 --json databaseId --jq ".[0].databaseId" 2^>nul') do set "RUN_ID=%%R"
if defined RUN_ID if /i not "!RUN_ID!"=="null" if not "!RUN_ID!"=="!PRE_RUN_ID!" goto :RUN_FOUND
if !WAIT_COUNT! GEQ 120 (
  echo HATA: Yeni Actions calismasi zamaninda gorunmedi.
  goto :FAIL
)
set /a WAIT_COUNT+=1
timeout /t 5 /nobreak >nul
goto :WAIT_DISPATCH_RUN

:FIND_PUSH_RUN
echo Push commit'i icin Actions calismasi bekleniyor: !COMMIT_SHA!
set /a WAIT_COUNT=0
:WAIT_PUSH_RUN
set "RUN_ID="
for /f "delims=" %%R in ('gh run list --workflow build-apk.yml --commit "!COMMIT_SHA!" --limit 1 --json databaseId --jq ".[0].databaseId" 2^>nul') do set "RUN_ID=%%R"
if defined RUN_ID if /i not "!RUN_ID!"=="null" goto :RUN_FOUND
if !WAIT_COUNT! GEQ 120 (
  echo HATA: Bu commit icin Actions calismasi bulunamadi.
  goto :FAIL
)
set /a WAIT_COUNT+=1
timeout /t 5 /nobreak >nul
goto :WAIT_PUSH_RUN

:RUN_FOUND
echo.
echo GitHub Actions run ID: !RUN_ID!
echo Derleme bitene kadar bekleniyor...
gh run watch "!RUN_ID!" --exit-status
if errorlevel 1 (
  echo HATA: Actions derlemesi basarisiz. Basarisiz adimlar:
  gh run view "!RUN_ID!" --log-failed
  goto :FAIL
)

if exist "%DOWNLOAD_ROOT%\!RUN_ID!" rmdir /s /q "%DOWNLOAD_ROOT%\!RUN_ID%" >nul 2>&1
if not exist "%DOWNLOAD_ROOT%" mkdir "%DOWNLOAD_ROOT%" >nul 2>&1
mkdir "%DOWNLOAD_ROOT%\!RUN_ID!" >nul 2>&1
set "ART_DIR=%DOWNLOAD_ROOT%\!RUN_ID!"
echo Iki APK artifact'i indiriliyor...
gh run download "!RUN_ID!" --name "Garajim-Mobil-APK" --name "Garajim-WearOS-APK" --dir "!ART_DIR!"
if errorlevel 1 (
  echo HATA: APK artifact'lari indirilemedi.
  goto :FAIL
)
for /r "!ART_DIR!" %%F in (*.apk) do (
  echo %%~fF | findstr /i /c:"Garajim-Mobil-APK" >nul && set "PHONE_APK=%%~fF"
  echo %%~fF | findstr /i /c:"Garajim-WearOS-APK" >nul && set "WEAR_APK=%%~fF"
)
if not defined PHONE_APK (
  echo HATA: Garajim-Mobil-APK klasorunde APK bulunamadi.
  goto :FAIL
)
if not defined WEAR_APK (
  echo HATA: Garajim-WearOS-APK klasorunde APK bulunamadi.
  goto :FAIL
)

echo.
echo Telefon APK: !PHONE_APK!
echo Saat APK:    !WEAR_APK!
echo.
echo --- Telefon APK kuruluyor ---
"!ADB!" -s "!PHONE_SERIAL!" install -r "!PHONE_APK!"
if errorlevel 1 (
  echo.
  echo HATA: Telefon APK'si kurulamadi; eski telefon uygulamasi kaldirilmadi.
  echo INSTALL_FAILED_UPDATE_INCOMPATIBLE gorursen imza anahtari farkli olabilir.
  echo Telefon uygulamasini SILME. Once Garajim yedegini uygulama disina kaydet ve hatayi kontrol et.
  goto :FAIL
)

echo.
echo --- Saatte eski paket kontrol ediliyor ---
"!ADB!" -s "!WATCH_SERIAL!" shell pm list packages com.garajim.wear 2>nul | findstr /i /c:"package:com.garajim.wear" >nul
if not errorlevel 1 (
  echo Eski com.garajim.wear uygulamasi yalnizca saatten kaldiriliyor.
  "!ADB!" -s "!WATCH_SERIAL!" uninstall com.garajim.wear
  if errorlevel 1 goto :FAIL
)
echo --- Wear OS APK kuruluyor ---
"!ADB!" -s "!WATCH_SERIAL!" install -r "!WEAR_APK!"
if errorlevel 1 (
  echo HATA: Wear OS APK'si saate kurulamadi.
  goto :FAIL
)

echo.
echo ============================================================
echo BASARILI! Commit/push, Actions ve iki cihaz kurulumu tamamlandi.
echo Telefon: Garajim-Mobil-APK
echo Saat:    Garajim-WearOS-APK
echo Artifact'lar: !ART_DIR!
echo ============================================================
echo Watch7'de Garajim'i acip telefon baglantisini kontrol edebilirsin.
goto :END

:BLOCK_SECRETS
echo.
echo GUVENLIK DURDURMASI: Commit listesinde gizli anahtar veya ortam dosyasi olabilecek dosyalar var:
findstr /i /e /c:".jks" /c:".keystore" /c:".p12" /c:".pfx" /c:".pem" /c:".key" /c:".env" "!STAGED_FILE!"
findstr /i /c:".env." /c:"id_rsa" /c:"id_ed25519" /c:"secrets.json" "!STAGED_FILE!"
echo Bu dosyalari GitHub'a gonderme. Dosyalari disari al veya .gitignore'a ekle, sonra yeniden dene.
goto :FAIL

:FAIL
echo.
echo Islem durdu. Yukaridaki hata mesajini kontrol et.
echo Telefon uygulamasi otomatik olarak kaldirilmaz; verileri korumak icin silme yapma.
:END
echo.
pause
endlocal
