; Custom installer script for CSVGen Pro
; This script installs Python system-wide during application installation

!macro customInstall
  ; Create a temporary directory for Python installation
  SetOutPath "$TEMP\csvgen-python-installer"

  ; Extract the PowerShell installer script and requirements
  File "${BUILD_RESOURCES_DIR}\install-python.ps1"
  File "${BUILD_RESOURCES_DIR}\..\requirements.txt"

  ; Show installation progress
  DetailPrint "Installing Python 3.11 runtime and dependencies..."
  DetailPrint "This may take a few minutes depending on your internet connection..."

  ; Run the PowerShell script to install Python
  nsExec::ExecToLog 'powershell.exe -ExecutionPolicy Bypass -File "$TEMP\csvgen-python-installer\install-python.ps1" -RequirementsFile "$TEMP\csvgen-python-installer\requirements.txt"'
  Pop $0 ; Exit code

  ; Check if installation was successful
  ${If} $0 == 0
    DetailPrint "✅ Python installation completed successfully"
    DetailPrint "Python 3.11 is now available system-wide"
  ${Else}
    DetailPrint "⚠️ Python installation failed with code $0"
    DetailPrint "The application will use embedded Python as fallback"
  ${EndIf}

  ; Clean up temporary files
  Delete "$TEMP\csvgen-python-installer\install-python.ps1"
  Delete "$TEMP\csvgen-python-installer\requirements.txt"
  RMDir "$TEMP\csvgen-python-installer"
!macroend

!macro customUnInstall
  ; Optional: Remove Python if it was installed by our application
  ; For safety, we won't auto-remove Python as user might be using it for other applications
  DetailPrint "CSVGen Pro has been uninstalled. Python runtime remains on your system."
!macroend

!macro customHeader
  ; Show custom installation message
  !define MUI_TEXT_INSTALLING_TITLE "Installing CSVGen Pro with Python Runtime"
  !define MUI_TEXT_INSTALLING_SUBTITLE "Please wait while CSVGen Pro and Python runtime are being installed..."
!macroend

; Check system requirements for Python installation
!macro preInit
  ; Check if PowerShell is available (should be on all modern Windows systems)
  ClearErrors
  nsExec::ExecToStack 'powershell.exe -Command "Write-Host PowerShell Available"'
  Pop $0 ; Exit code

  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "PowerShell is required for Python installation. Please ensure PowerShell is available on your system."
    ; Don't abort - continue with installation, Python will use embedded mode
  ${EndIf}
!macroend
