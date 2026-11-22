param([switch]$ExistingServer,[string]$AdminUser='root',[string]$Server='127.0.0.1',[int]$Port=3306)
. "$PSScriptRoot/Common.ps1"
Initialize-Configuration
$bin = Find-MysqlBin
if ($ExistingServer) {
    Invoke-Checked "$bin/mysql.exe" @('--no-defaults','--protocol=tcp',"--host=$Server","--port=$Port","--user=$AdminUser",'--password','--execute=CREATE DATABASE IF NOT EXISTS smartdesk CHARACTER SET utf8mb4;')
    Write-Host 'The smartdesk schema is ready. Set DB_URL, DB_USER and DB_PASSWORD for an account with privileges on smartdesk.* in .env.'
    return
}

# Local-only installation: never operate on the system MySQL service or its data.
$Port = 33316
$data = Join-Path $ToolsPath 'mysql-data'
$initFile = Join-Path $ToolsPath 'mysql-first-start.sql'
$local = Join-Path $ProjectRoot '.env.local'
$marker = Join-Path $ToolsPath 'mysql-provisioned'
$ownUrl = "jdbc:mysql://127.0.0.1:$Port/smartdesk?allowPublicKeyRetrieval=true&sslMode=DISABLED"
if ($env:DB_URL -and $env:DB_URL -ne $ownUrl) {
    throw 'A different DB_URL is configured. Use -ExistingServer for that server, or clear the override before creating the isolated instance.'
}

function Test-LocalDb {
    if (!$env:DB_PASSWORD) { return $false }
    $clientIni = Join-Path $ToolsPath ("client-" + [Guid]::NewGuid() + ".cnf")
    try {
        [IO.File]::WriteAllLines($clientIni,@('[client]',"password=$env:DB_PASSWORD"),$Utf8Plain)
        & "$bin/mysql.exe" "--defaults-file=$clientIni" --protocol=tcp --host=127.0.0.1 "--port=$Port" --connect-timeout=1 --user=smartdesk_app --database=smartdesk --execute='SELECT 1' *> $null
        return $LASTEXITCODE -eq 0
    } catch { return $false } finally { Remove-Item -LiteralPath $clientIni -ErrorAction SilentlyContinue }
}
if (Test-LocalDb) { Write-Host "Project MySQL is ready on port $Port."; return }
if (!(Test-Path "$bin/mysqld.exe")) { throw 'The isolated database requires the MySQL Server binaries. Set MYSQL_HOME.' }
New-Item -ItemType Directory -Force -Path $data | Out-Null
$base = Split-Path $bin -Parent
if (!(Test-Path "$data/mysql")) {
    Invoke-Checked "$bin/mysqld.exe" @('--no-defaults','--initialize-insecure',"--basedir=$base","--datadir=$data","--log-error=$ToolsPath/mysql-init.log")
}

if (!(Test-Path $marker)) {
    if (!(Test-Path $initFile)) {
        $password = New-RandomValue
        $adminPassword = New-RandomValue
        $lines = @("ALTER USER 'root'@'localhost' IDENTIFIED BY '$adminPassword';",
            'CREATE DATABASE IF NOT EXISTS smartdesk CHARACTER SET utf8mb4;',
            "CREATE USER IF NOT EXISTS 'smartdesk_app'@'127.0.0.1' IDENTIFIED BY '$password';",
            "ALTER USER 'smartdesk_app'@'127.0.0.1' IDENTIFIED BY '$password';",
            "GRANT ALL PRIVILEGES ON smartdesk.* TO 'smartdesk_app'@'127.0.0.1';")
        [IO.File]::WriteAllLines($initFile,$lines,$Utf8Plain)
        [IO.File]::AppendAllLines($local,[string[]]@("DB_URL=$ownUrl",'DB_USER=smartdesk_app',"DB_PASSWORD=$password"),$Utf8Plain)
        $env:DB_PASSWORD = $password
    }
}
$argsLine = "--no-defaults --basedir=""$base"" --datadir=""$data"" --bind-address=127.0.0.1 --port=$Port --mysqlx=OFF --skip-name-resolve --log-error=""$ToolsPath/mysql-server.log"""
if (Test-Path $initFile) { $argsLine += " --init-file=""$initFile""" }
$p = Start-Process -FilePath "$bin/mysqld.exe" -ArgumentList $argsLine -WindowStyle Hidden -PassThru
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    if ($p.HasExited) { throw 'MySQL exited. See .tools/mysql-server.log.' }
    if (Test-LocalDb) {
        [IO.File]::WriteAllText($marker,'ready',$Utf8Plain)
        if (Test-Path $initFile) { Remove-Item -LiteralPath $initFile }
        Write-Host "Project MySQL is ready on 127.0.0.1:$Port. Start the app with -Database mysql."
        return
    }
}
throw 'The project MySQL service did not become ready. See .tools/mysql-server.log.'
