# PowerShell script to install Python system-wide during application installation
# This script downloads and installs Python 3.11 with pip and adds it to PATH

param(
    [string]$RequirementsFile = ""
)

Write-Host "=== CSVGen Pro Python Installation ===" -ForegroundColor Green
Write-Host "Installing Python 3.11 system-wide..." -ForegroundColor Yellow

# Configuration
$PythonVersion = "3.11.9"
$TempDir = Join-Path $env:TEMP "csvgen-python-installer"
$Architecture = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "win32" }
$InstallerUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-$Architecture.exe"
$InstallerPath = Join-Path $TempDir "python-installer.exe"

# Create temp directory
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

# Function to check if Python 3.11 is installed
function Test-PythonInstallation {
    try {
        $pythonVersion = & python --version 2>&1
        if ($pythonVersion -match "Python 3\.11") {
            Write-Host "✅ Python 3.11 is already installed: $pythonVersion" -ForegroundColor Green
            return $true
        }

        # Try python3 command as well
        $python3Version = & python3 --version 2>&1
        if ($python3Version -match "Python 3\.11") {
            Write-Host "✅ Python 3.11 is already installed: $python3Version" -ForegroundColor Green
            return $true
        }

        return $false
    }
    catch {
        return $false
    }
}

# Function to download file with progress
function Download-File {
    param(
        [string]$Url,
        [string]$OutputPath
    )

    try {
        Write-Host "Downloading Python installer..." -ForegroundColor Yellow
        Write-Host "URL: $Url" -ForegroundColor Gray

        # Use System.Net.WebClient for better progress reporting
        $webClient = New-Object System.Net.WebClient

        # Register progress event
        Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -Action {
            $Global:DownloadProgress = $Event.SourceEventArgs.ProgressPercentage
            Write-Progress -Activity "Downloading Python Installer" -Status "Progress: $($Event.SourceEventArgs.ProgressPercentage)%" -PercentComplete $Event.SourceEventArgs.ProgressPercentage
        } | Out-Null

        # Download the file
        $webClient.DownloadFile($Url, $OutputPath)

        # Clean up event
        Get-EventSubscriber | Unregister-Event
        $webClient.Dispose()

        Write-Progress -Activity "Downloading Python Installer" -Completed
        Write-Host "✅ Download completed: $OutputPath" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to install Python
function Install-Python {
    param([string]$InstallerPath)

    Write-Host "Installing Python with the following options:" -ForegroundColor Yellow
    Write-Host "  - Install for all users" -ForegroundColor Gray
    Write-Host "  - Add to PATH" -ForegroundColor Gray
    Write-Host "  - Include pip" -ForegroundColor Gray
    Write-Host "  - Include development headers" -ForegroundColor Gray

    $installArgs = @(
        "/quiet",
        "InstallAllUsers=1",
        "PrependPath=1",
        "Include_test=0",
        "Include_doc=0",
        "Include_dev=1",
        "Include_pip=1",
        "Include_tcltk=0",
        "SimpleInstall=1"
    )

    try {
        Write-Host "Running installer..." -ForegroundColor Yellow
        $process = Start-Process -FilePath $InstallerPath -ArgumentList $installArgs -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0) {
            Write-Host "✅ Python installation completed successfully" -ForegroundColor Green

            # Wait for PATH to update
            Write-Host "Waiting for PATH to update..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10

            # Refresh environment variables
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")

            return $true
        }
        else {
            Write-Host "❌ Python installation failed with exit code: $($process.ExitCode)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Failed to run Python installer: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to install Python packages
function Install-Requirements {
    param([string]$RequirementsFile)

    if (-not $RequirementsFile -or -not (Test-Path $RequirementsFile)) {
        Write-Host "No requirements file specified or found, skipping package installation" -ForegroundColor Yellow
        return $true
    }

    Write-Host "Installing Python packages from requirements.txt..." -ForegroundColor Yellow

    try {
        # Upgrade pip first
        Write-Host "Upgrading pip..." -ForegroundColor Gray
        & python -m pip install --upgrade pip

        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️ Pip upgrade failed, continuing anyway..." -ForegroundColor Yellow
        }

        # Install requirements
        Write-Host "Installing packages from: $RequirementsFile" -ForegroundColor Gray
        & pip install -r $RequirementsFile

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Python packages installed successfully" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "❌ Package installation failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Failed to install requirements: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main installation process
try {
    # Check if Python is already installed
    if (Test-PythonInstallation) {
        Write-Host "Python 3.11 is already available" -ForegroundColor Green

        # Still try to install requirements if specified
        if ($RequirementsFile) {
            Install-Requirements -RequirementsFile $RequirementsFile
        }

        Write-Host "✅ Python setup completed" -ForegroundColor Green
        exit 0
    }

    Write-Host "Python 3.11 not found, downloading and installing..." -ForegroundColor Yellow

    # Download Python installer
    if (-not (Download-File -Url $InstallerUrl -OutputPath $InstallerPath)) {
        Write-Host "❌ Failed to download Python installer" -ForegroundColor Red
        exit 1
    }

    # Install Python
    if (-not (Install-Python -InstallerPath $InstallerPath)) {
        Write-Host "❌ Failed to install Python" -ForegroundColor Red
        exit 1
    }

    # Verify installation
    if (Test-PythonInstallation) {
        Write-Host "✅ Python installation verified" -ForegroundColor Green

        # Install requirements if specified
        if ($RequirementsFile) {
            Install-Requirements -RequirementsFile $RequirementsFile
        }

        Write-Host "🎉 Python setup completed successfully!" -ForegroundColor Green
        Write-Host "Python 3.11 is now available system-wide and added to PATH" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Python installation verification failed" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    # Clean up
    if (Test-Path $InstallerPath) {
        Remove-Item $InstallerPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

exit 0
