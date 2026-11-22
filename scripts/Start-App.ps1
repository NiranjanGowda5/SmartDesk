param([ValidateSet('demo','mysql')][string]$Database)
. "$PSScriptRoot/Common.ps1"
Initialize-Configuration
if (!$Database) { $Database = if ($env:SPRING_PROFILES_ACTIVE -eq 'mysql') { 'mysql' } else { 'demo' } }
foreach ($port in 5173,8080) {
    $client = New-Object Net.Sockets.TcpClient
    try {
        if ($client.ConnectAsync('127.0.0.1',$port).Wait(300) -and $client.Connected) { throw "Port $port is in use. Stop the existing listener before launching." }
    } catch [System.AggregateException] { } finally { $client.Dispose() }
}
foreach ($service in 'Backend','Frontend') {
    $entry = Join-Path $PSScriptRoot "Start-$service.ps1"
    $additional = if ($service -eq 'Backend') { " -Database $Database" } else { '' }
    $p = Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File ""$entry""$additional" -WindowStyle Hidden -WorkingDirectory $ProjectRoot -RedirectStandardOutput "$ToolsPath/$service.out.log" -RedirectStandardError "$ToolsPath/$service.err.log" -PassThru
    Write-Host "$service process $($p.Id) started. Logs in .tools/$service.*.log"
}
Write-Host 'Frontend http://127.0.0.1:5173   API http://127.0.0.1:8080/api/me'
Write-Host 'Startup may take a minute. The API requires login.'
