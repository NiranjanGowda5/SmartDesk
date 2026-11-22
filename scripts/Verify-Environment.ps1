. "$PSScriptRoot/Common.ps1"
Import-Configuration
Initialize-Java
$java = if ($env:JAVA_HOME) { "$env:JAVA_HOME/bin/javac.exe" } else { 'javac.exe' }
Invoke-Checked $java @('-version')
Invoke-Checked (Find-Maven) @('-version')
Invoke-Checked 'node.exe' @('--version')
Invoke-Checked 'npm.cmd' @('--version')
Invoke-Checked 'git.exe' @('--version')
try { Invoke-Checked "$(Find-MysqlBin)/mysql.exe" @('--version') } catch { Write-Warning $_.Exception.Message }
