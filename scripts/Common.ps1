$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$ToolsPath = Join-Path $ProjectRoot '.tools'
$Utf8Plain = New-Object System.Text.UTF8Encoding($false)

function New-RandomValue {
    $bytes = New-Object byte[] 36
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    [Convert]::ToBase64String($bytes)
}

function Import-Configuration {
    $inherited = @{}
    foreach ($v in Get-ChildItem Env:) { $inherited[$v.Name] = $true }
    foreach ($file in '.env.local','.env') {
        $p = Join-Path $ProjectRoot $file
        if (!(Test-Path -LiteralPath $p)) { continue }
        foreach ($line in [IO.File]::ReadAllLines($p)) {
            if ($line -match '^\s*([A-Za-z_][A-Za-z_0-9]*)=(.*)$' -and !$inherited.ContainsKey($matches[1])) {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim(), 'Process')
            }
        }
    }
}

function Initialize-Configuration {
    New-Item -Type Directory -Force -Path $ToolsPath | Out-Null
    Import-Configuration
    $local = Join-Path $ProjectRoot '.env.local'
    foreach ($key in 'JWT_SECRET','DEMO_PASSWORD') {
        if (![Environment]::GetEnvironmentVariable($key)) {
            $value = New-RandomValue
            [IO.File]::AppendAllLines($local, [string[]]@("$key=$value"), $Utf8Plain)
            [Environment]::SetEnvironmentVariable($key,$value,'Process')
        }
    }
}

function Find-Maven {
    foreach ($candidate in @("$env:MAVEN_HOME/bin/mvn.cmd","$env:M2_HOME/bin/mvn.cmd","$ToolsPath/apache-maven-3.9.16/bin/mvn.cmd")) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    $command = Get-Command mvn.cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
    foreach ($pattern in 'D:/IntelliJ IDEA */plugins/maven-plugin/lib/maven3/bin/mvn.cmd', "$env:ProgramFiles/JetBrains/IntelliJ IDEA */plugins/maven*/lib/maven3/bin/mvn.cmd") {
        $mvn = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($mvn) { return $mvn.FullName }
    }
    throw 'Maven 3.6.3+ was not found. Set MAVEN_HOME to an installed Maven distribution or install Maven with Install-Dependencies.ps1.'
}

function Initialize-Java {
    if ($env:JAVA_HOME -and (Test-Path -LiteralPath "$env:JAVA_HOME/bin/javac.exe")) { return }
    $jdks = @(Get-Item "$env:ProgramFiles/Java/jdk-*","$env:ProgramFiles/Eclipse Adoptium/jdk-*","$env:LOCALAPPDATA/Programs/Eclipse Adoptium/jdk-*" -ErrorAction SilentlyContinue)
    $jdk = $jdks | Where-Object { $_.Name -match '^jdk-21(?:[.-]|$)' } | Select-Object -First 1
    if (!$jdk) { $jdk = $jdks | Where-Object { $_.Name -match '^jdk-(2[1-5])(?:[.-]|$)' } | Select-Object -First 1 }
    if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}

function Find-MysqlBin {
    if (Test-Path -LiteralPath "$env:MYSQL_HOME/bin/mysql.exe") { return "$env:MYSQL_HOME/bin" }
    $client = Get-Command mysql.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($client) { return (Split-Path $client.Source) }
    $client = Get-Item "$env:ProgramFiles/MySQL/MySQL Server */bin/mysql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($client) { return $client.DirectoryName }
    throw 'Install MySQL Server or set MYSQL_HOME. The demo profile can run without MySQL.'
}

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program exited with code $LASTEXITCODE." }
}
