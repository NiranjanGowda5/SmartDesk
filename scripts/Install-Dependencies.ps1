. "$PSScriptRoot/Common.ps1"
Initialize-Configuration
Initialize-Java
try { $mvn = Find-Maven } catch {
    $version = '3.9.16'
    $base = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$version/apache-maven-$version-bin.zip"
    $zip = Join-Path $ToolsPath "maven-$version.zip"
    Invoke-WebRequest -UseBasicParsing $base -OutFile $zip
    $expected = (Invoke-RestMethod "$base.sha512").Trim()
    if ((Get-FileHash $zip -Algorithm SHA512).Hash -ne $expected) { throw 'Maven archive checksum mismatch.' }
    Expand-Archive -LiteralPath $zip -DestinationPath $ToolsPath -Force
    $mvn = Find-Maven
}
Invoke-Checked $mvn @("-Dmaven.repo.local=$ToolsPath/m2",'-f',"$ProjectRoot/backend/pom.xml",'verify')
Push-Location "$ProjectRoot/frontend"
try {
    $install = if (Test-Path package-lock.json) { 'ci' } else { 'install' }
    Invoke-Checked 'npm.cmd' @($install,'--cache',"$ToolsPath/npm-cache")
    Invoke-Checked 'npm.cmd' @('run','build')
} finally { Pop-Location }
