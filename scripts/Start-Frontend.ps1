. "$PSScriptRoot/Common.ps1"
Push-Location "$ProjectRoot/frontend"
try {
    if (!(Test-Path 'node_modules/vite')) { throw 'Run Install-Dependencies.ps1 first.' }
    Invoke-Checked 'npm.cmd' @('run','dev','--','--host','127.0.0.1','--port','5173','--strictPort')
} finally { Pop-Location }
