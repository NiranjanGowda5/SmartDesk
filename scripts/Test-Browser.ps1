. "$PSScriptRoot/Common.ps1"
Initialize-Configuration
Push-Location "$PSScriptRoot/browser"
try {
    if (!(Test-Path 'node_modules/playwright-core')) {
        Invoke-Checked 'npm.cmd' @('ci','--cache',"$ToolsPath/npm-cache")
    }
    Invoke-Checked 'node.exe' @('workflow.mjs')
} finally { Pop-Location }
