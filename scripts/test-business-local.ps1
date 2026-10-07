# Local integration smoke test. Creates clearly named local QA records; does not delete existing data.
# Requires PowerShell 7 and a running backend. Generates example PNG banners in outputs/business-test.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080'
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $projectRoot 'outputs/business-test'
New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null
$session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
function Call-Api($path,$method='GET',$body=$null,$form=$null) {
    $headers=@{}
    if ($method -ne 'GET') { $csrf=Invoke-RestMethod "$base/api/auth/csrf" -WebSession $session; $headers['X-XSRF-TOKEN']=$csrf.token }
    $arguments=@{Uri="$base$path";Method=$method;WebSession=$session;Headers=$headers}
    if ($null -ne $form) { $arguments.Form=$form }
    elseif ($null -ne $body) { $arguments.Body=($body|ConvertTo-Json -Depth 8);$arguments.ContentType='application/json; charset=utf-8' }
    Invoke-RestMethod @arguments
}
function Expect-Failure($label,$block,$code) {
    try { & $block | Out-Null; throw "FAIL: $label unexpectedly succeeded" }
    catch { if ([int]$_.Exception.Response.StatusCode -ne $code) { throw }; "PASS: $label ($code)" }
}
function Make-Banner($path,$width,$height) {
    Add-Type -AssemblyName System.Drawing
    if ([int]$width -le 0 -or [int]$height -le 0) {throw "Invalid test banner dimensions: $width x $height"}
    $bitmap=[System.Drawing.Bitmap]::new([int]$width,[int]$height);$graphics=[System.Drawing.Graphics]::FromImage($bitmap)
    try { $graphics.Clear([System.Drawing.Color]::FromArgb(23,36,61));$font=[System.Drawing.Font]::new('Arial',24)
      try { $graphics.DrawString('THE PULSE - BUSINESS TEST',$font,[System.Drawing.Brushes]::White,20,20);$bitmap.Save($path,[System.Drawing.Imaging.ImageFormat]::Png) } finally {$font.Dispose()}
    } finally {$graphics.Dispose();$bitmap.Dispose()}
}
$stamp=Get-Date -Format 'yyyyMMddHHmmss'
Call-Api '/api/auth/login' 'POST' @{login='business.demo';password='Demo@12345'} | Out-Null
$overview=Call-Api '/api/business/workspace'
if (!$overview.company.company_id) {throw 'Demo company is missing'}
'PASS: Business workspace is scoped and readable'
$c=$overview.company
Call-Api '/api/business/company' 'PUT' @{name=$c.company_name;taxCode=$c.tax_code;email=$c.email;phone=$c.phone;address=$c.address;billingAddress=$c.billing_address} | Out-Null
'PASS: Save company profile without changing seed values'
$contract=@($overview.contracts|Where-Object {$_.status -eq 'ACTIVE' -and $_.payment_status -eq 'PAID'})[0]
Expect-Failure 'Overlapping slot booking rejected' {Call-Api '/api/business/bookings' 'POST' @{slotId=$contract.slot_id;packageId=$contract.b2b_package_id;name="QA conflict $stamp";startDate=(Get-Date).AddDays(1).ToString('yyyy-MM-dd');endDate=(Get-Date).AddDays(2).ToString('yyyy-MM-dd')}} 409
$free=([datetime]$contract.end_at).Date.AddDays(2)
$createdBooking=Call-Api '/api/business/bookings' 'POST' @{slotId=$contract.slot_id;packageId=$contract.b2b_package_id;name="QA booking $stamp";startDate=$free.ToString('yyyy-MM-dd');endDate=$free.AddDays(2).ToString('yyyy-MM-dd')}
"PASS: Booking request persisted #$($createdBooking.id)"
$start=(Get-Date).AddDays(1);$end=$start.AddDays(3)
$campaignBody=@{contractId=$contract.contract_id;name="QA campaign $stamp";description='Local integration test - no auto-approval';startTime=$start.ToString('yyyy-MM-ddTHH:mm:ss');endTime=$end.ToString('yyyy-MM-ddTHH:mm:ss')}
$campaign=Call-Api '/api/business/campaigns' 'POST' $campaignBody
"PASS: Campaign draft persisted #$($campaign.id)"
$campaignBody.description='Local integration test - edited and persisted'
Call-Api "/api/business/campaigns/$($campaign.id)" 'PUT' $campaignBody | Out-Null
'PASS: Edit owned campaign draft'
Expect-Failure 'Submit without creative rejected' {Call-Api "/api/business/campaigns/$($campaign.id)/submit" 'POST'} 422
$allSlots=Call-Api '/api/advertising/slots'
$slot=$allSlots|Where-Object {$_.id -eq $contract.slot_id}|Select-Object -First 1
$png=Join-Path $assetRoot "$stamp-banner.png";Make-Banner $png $slot.width $slot.height
$wrongPng=Join-Path $assetRoot "$stamp-wrong-size.png";Make-Banner $wrongPng 100 100
Expect-Failure 'Wrong-sized banner rejected' {Call-Api "/api/business/campaigns/$($campaign.id)/creative" 'POST' $null @{file=Get-Item -LiteralPath $wrongPng;targetUrl='https://example.com/business-test'}} 422
$uploaded=Call-Api "/api/business/campaigns/$($campaign.id)/creative" 'POST' $null @{file=Get-Item -LiteralPath $png;targetUrl='https://example.com/business-test'}
"PASS: Banner uploaded with validated dimensions #$($uploaded.id)"
Call-Api "/api/business/campaigns/$($campaign.id)/submit" 'POST' | Out-Null
$readBack=Call-Api '/api/business/workspace'
$saved=@($readBack.campaigns|Where-Object {$_.campaign_id -eq $campaign.id})[0]
if ($saved.status -ne 'PENDING_REVIEW' -or $saved.creative_status -ne 'PENDING_REVIEW') {throw 'Submission not persisted'}
'PASS: Campaign and exact creative version persisted as pending review'
Expect-Failure 'Submitted campaign cannot be edited' {Call-Api "/api/business/campaigns/$($campaign.id)" 'PUT' $campaignBody} 422
Expect-Failure 'Foreign/missing campaign inaccessible' {Call-Api '/api/business/campaigns/99999999' 'PUT' $campaignBody} 422
Call-Api '/api/auth/logout' 'POST' | Out-Null
Call-Api '/api/auth/login' 'POST' @{login='reader.demo';password='Demo@12345'} | Out-Null
Expect-Failure 'Reader forbidden from Business workspace' {Call-Api '/api/business/workspace'} 403
Call-Api '/api/auth/logout' 'POST' | Out-Null
$username="qa.business.$stamp"
Call-Api '/api/auth/register' 'POST' @{username=$username;email="$username@example.local";password='Demo@12345';fullName='QA Business';accountType='BUSINESS'} | Out-Null
Call-Api '/api/auth/login' 'POST' @{login=$username;password='Demo@12345'} | Out-Null
$tax='8'+(Get-Random -Minimum 100000000 -Maximum 999999999)
Call-Api '/api/business/company' 'PUT' @{name="QA Company $stamp";taxCode=$tax;email="$username@example.local";phone='0901234567';address='QA local test address';billingAddress='QA local test address'} | Out-Null
'PASS: New Business can create company with existing session'
Expect-Failure 'Other company campaign cannot be edited' {Call-Api "/api/business/campaigns/$($campaign.id)" 'PUT' $campaignBody} 422
Expect-Failure 'Other company private creative cannot be read' {Call-Api "/api/media/creative/$($uploaded.id)"} 404
Expect-Failure 'Partnership submission without documents rejected' {Call-Api '/api/business/application/submit' 'POST'} 422
Expect-Failure 'Unapproved company cannot book' {Call-Api '/api/business/bookings' 'POST' @{slotId=$contract.slot_id;packageId=$contract.b2b_package_id;name='QA unapproved';startDate=$free.ToString('yyyy-MM-dd');endDate=$free.AddDays(2).ToString('yyyy-MM-dd')}} 422
Call-Api '/api/business/documents' 'POST' $null @{file=Get-Item -LiteralPath $png} | Out-Null
Call-Api '/api/business/application/submit' 'POST' | Out-Null
$application=Call-Api '/api/business/workspace'
if ($application.company.application_status -ne 'PENDING_REVIEW') {throw 'Application submission not persisted'}
'PASS: Legal-document upload and partnership submission persisted'
"QA account retained: $username (local demo password); test records are clearly named QA."
