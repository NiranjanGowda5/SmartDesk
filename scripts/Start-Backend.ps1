param([ValidateSet('demo','mysql')][string]$Database)
. "$PSScriptRoot/Common.ps1"
Initialize-Configuration
Initialize-Java
if (!$Database) {
    $Database = if ($env:SPRING_PROFILES_ACTIVE -eq 'mysql') { 'mysql' } else { 'demo' }
}
$env:SPRING_PROFILES_ACTIVE = $Database
if ($Database -eq 'mysql' -and $env:DB_URL -like 'jdbc:mysql://127.0.0.1:33316/smartdesk*' -and (Test-Path "$ToolsPath/mysql-provisioned")) {
    & "$PSScriptRoot/Setup-Database.ps1"
}
if ($Database -eq 'mysql' -and (!$env:DB_PASSWORD -or !$env:DB_USER -or !$env:DB_URL)) {
    throw 'Configure DB_URL, DB_USER and DB_PASSWORD or run Setup-Database.ps1 first.'
}
Push-Location "$ProjectRoot/backend"
try {
    $jar = Get-ChildItem './target/smartdesk-*.jar' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (!$jar) { throw 'The backend JAR is missing. Run Install-Dependencies.ps1 first.' }
    $java = if ($env:JAVA_HOME) { "$env:JAVA_HOME/bin/java.exe" } else { 'java.exe' }
    Invoke-Checked $java @('-jar',$jar.FullName)
} finally { Pop-Location }
