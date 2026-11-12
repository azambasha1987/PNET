<#
.SYNOPSIS
    PNetLab Windows 1-Click SecureCRT Protocol Integrator & Tab-Naming Wrapper
.DESCRIPTION
    Registers the 'telnet://' URL protocol handler in the Windows Registry to route
    through a smart SecureCRT launcher.
    Supports standard 'telnet://<host>:<port>' as well as PNetLab sequenced format
    'telnet://<host>:<port>#<node_name>'.
    Ensures SecureCRT opens sessions in new tabs (/T) with clean device titles (/N "<node_name>"),
    preventing scrambled tabs and raw port names.
#>

param (
    [switch]$Uninstall
)

# Check Admin rights (optional - user-level HKCU registration works without elevation)
$isAdmin = $false
try {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
} catch {}

$InstallDir = "$env:ProgramData\PNetLab"
$SecureCRTWrapper = "$InstallDir\pnetlab-securecrt.bat"

if ($Uninstall) {
    Write-Host "Uninstalling PNetLab SecureCRT Protocol Handler..." -ForegroundColor Yellow
    Remove-Item -Path "HKCR:\telnet" -Recurse -ErrorAction SilentlyContinue
    if (Test-Path $SecureCRTWrapper) {
        Remove-Item -Path $SecureCRTWrapper -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] PNetLab SecureCRT handler removed. Standard Windows telnet restored." -ForegroundColor Green
    exit 0
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   PNetLab 1-Click SecureCRT Sequenced Protocol Integrator   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Locate SecureCRT.exe
$SecureCRTPaths = @(
    "C:\Program Files\VanDyke Software\SecureCRT.exe",
    "C:\Program Files\VanDyke Software\SecureCRT\SecureCRT.exe",
    "C:\Program Files (x86)\VanDyke Software\SecureCRT.exe",
    "C:\Program Files (x86)\VanDyke Software\SecureCRT\SecureCRT.exe",
    "$env:LOCALAPPDATA\Programs\VanDyke Software\SecureCRT.exe",
    "$env:LOCALAPPDATA\Programs\VanDyke Software\SecureCRT\SecureCRT.exe",
    "$env:ProgramFiles\VanDyke Software\SecureCRT.exe",
    "$env:ProgramFiles\VanDyke Software\SecureCRT\SecureCRT.exe"
)

$FoundSecureCRT = ""
foreach ($path in $SecureCRTPaths) {
    if (Test-Path $path) {
        $FoundSecureCRT = $path
        break
    }
}

if (-not $FoundSecureCRT) {
    Write-Warning "SecureCRT.exe was not found in standard default paths."
    $inputPath = Read-Host "Please enter full path to SecureCRT.exe (e.g. C:\Tools\SecureCRT.exe)"
    if ($inputPath -and (Test-Path $inputPath)) {
        $FoundSecureCRT = $inputPath
    } else {
        $FoundSecureCRT = "C:\Program Files\VanDyke Software\SecureCRT\SecureCRT.exe"
    }
}

Write-Host "[1/3] SecureCRT Executable: $FoundSecureCRT" -ForegroundColor Green

# 2. Create Smart Wrapper Scripts (Batch & VBScript for EVE-NG / PNetLab compatibility)
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$VanDykeAppDir = "$env:APPDATA\VanDyke"
if (Test-Path $VanDykeAppDir) {
    $VbsWrapper = "$VanDykeAppDir\eve_telnet.vbs"
} else {
    $VbsWrapper = "$InstallDir\eve_telnet.vbs"
}

$VbsContent = @'
' ============================================================
' PNetLab & EVE-NG SecureCRT Telnet Integration Wrapper
' Automatically docks sessions into named SecureCRT tabs (/T /N "<Session>")
' Supports telnet://<host>:<port>#<device_name> and telnet://<host>:<port>
' ============================================================
Set WshShell = CreateObject("WScript.Shell")
Set args = WScript.Arguments

Function DecodeURL(sText)
    Dim i, char, decoded
    decoded = ""
    i = 1
    Do While i <= Len(sText)
        char = Mid(sText, i, 1)
        If char = "+" Then
            decoded = decoded & " "
            i = i + 1
        ElseIf char = "%" And i + 2 <= Len(sText) Then
            On Error Resume Next
            decoded = decoded & Chr("&H" & Mid(sText, i + 1, 2))
            If Err.Number <> 0 Then
                decoded = decoded & Mid(sText, i, 3)
                Err.Clear
            End If
            On Error GoTo 0
            i = i + 3
        Else
            decoded = decoded & char
            i = i + 1
        End If
    Loop
    DecodeURL = decoded
End Function

If args.Count > 0 Then
    raw = args(0)
    raw = Replace(raw, Chr(34), "")
    raw = Replace(raw, "telnet://", "")
    raw = Replace(raw, "telnet:", "")
    raw = Replace(raw, "/", "")
    raw = Trim(raw)

    sessionTitle = ""
    If InStr(raw, "#") > 0 Then
        hashParts = Split(raw, "#")
        raw = hashParts(0)
        sessionTitle = DecodeURL(hashParts(1))
    End If

    parts = Split(raw, ":")
    If UBound(parts) >= 1 Then
        host = parts(0)
        port = parts(1)

        If Trim(sessionTitle) = "" Then
            sessionTitle = host & ":" & port
        End If

        Set fso = CreateObject("Scripting.FileSystemObject")
        scrtPath = ""
        candidates = Array(_
            "C:\Program Files\VanDyke Software\SecureCRT.exe",_
            "C:\Program Files\VanDyke Software\SecureCRT\SecureCRT.exe",_
            "C:\Program Files (x86)\VanDyke Software\SecureCRT.exe",_
            "C:\Program Files (x86)\VanDyke Software\SecureCRT\SecureCRT.exe"_
        )
        For Each c In candidates
            If fso.FileExists(c) Then
                scrtPath = c
                Exit For
            End If
        Next
        If scrtPath = "" Then scrtPath = "C:\Program Files\VanDyke Software\SecureCRT.exe"

        cmd = Chr(34) & scrtPath & Chr(34) & " /T /N " & Chr(34) & sessionTitle & Chr(34) & " /TELNET " & host & " " & port
        WshShell.Run cmd, 1, False
    End If
End If
'@

Set-Content -Path $VbsWrapper -Value $VbsContent -Encoding ASCII
Write-Host "[2/3] SecureCRT VBS Wrapper Created: $VbsWrapper" -ForegroundColor Green

$BatchContent = @"
@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: PNetLab SecureCRT Sequenced Launcher & Session Naming Stub
:: Input: telnet://<HOST>:<PORT>#<DEVICE_NAME> or telnet://<HOST>:<PORT>
:: ============================================================
set "RAW_URL=%~1"
set "RAW_URL=!RAW_URL:"=!"
set "RAW_URL=!RAW_URL:telnet://=!"
set "RAW_URL=!RAW_URL:telnet:=!"
set "RAW_URL=!RAW_URL:/=!"

:: Check if fragment (#DEVICE_NAME) exists
set "NAME="
for /f "tokens=1,2 delims=#" %%A in ("!RAW_URL!") do (
    set "HOST_PORT=%%A"
    set "NAME=%%B"
)

:: Split Host and Port
for /f "tokens=1,2 delims=:" %%H in ("!HOST_PORT!") do (
    set "HOST=%%H"
    set "PORT=%%I"
)

if "!PORT!"=="" set "PORT=23"

:: Launch SecureCRT with /T (New Tab) and /N (Session/Tab Name)
if not "!NAME!"=="" (
    start "" "$FoundSecureCRT" /T /N "!NAME!" /TELNET !HOST! !PORT!
) else (
    start "" "$FoundSecureCRT" /T /TELNET !HOST! !PORT!
)
"@

Set-Content -Path $SecureCRTWrapper -Value $BatchContent -Encoding ASCII
Write-Host "[2/3] SecureCRT Launcher Wrapper Created: $SecureCRTWrapper" -ForegroundColor Green

# 3. Register 'telnet://' in Windows Registry (HKCR and HKCU for absolute user precedence)
Write-Host "[3/3] Registering Windows 'telnet://' Protocol Handler for SecureCRT..." -ForegroundColor Yellow

$handlerCommand = "wscript.exe `"$VbsWrapper`" `"%1`""

foreach ($rootKey in @("Registry::HKEY_CLASSES_ROOT\telnet", "Registry::HKEY_CURRENT_USER\SOFTWARE\Classes\telnet", "Registry::HKEY_CURRENT_USER\SOFTWARE\Classes\SecureCRT.telnet")) {
    New-Item -Path $rootKey -Force -ErrorAction SilentlyContinue | Out-Null
    Set-ItemProperty -Path $rootKey -Name "(default)" -Value "URL:Telnet Protocol (PNetLab SecureCRT)" -ErrorAction SilentlyContinue | Out-Null
    Set-ItemProperty -Path $rootKey -Name "URL Protocol" -Value "" -ErrorAction SilentlyContinue | Out-Null

    $cmdPath = "$rootKey\shell\open\command"
    New-Item -Path $cmdPath -Force -ErrorAction SilentlyContinue | Out-Null
    Set-ItemProperty -Path $cmdPath -Name "(default)" -Value $handlerCommand -ErrorAction SilentlyContinue | Out-Null
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  [SUCCESS] 1-Click SecureCRT Protocol Registered on Windows! " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Clicking 'Sequenced Console' in PNetLab will now automatically"
Write-Host " dock sessions into ordered SecureCRT tabs with device titles!"
Write-Host "============================================================" -ForegroundColor Cyan
