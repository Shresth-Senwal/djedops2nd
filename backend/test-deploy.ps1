# Quick Test Script for DjedOps Backend

Write-Host "🚀 Testing DjedOps Backend Deployment" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    Write-Host "✓ Backend is running" -ForegroundColor Green
    Write-Host "   Wallet: $($health.walletAddress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Backend not running. Start with: cd backend; npm start" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Testing deployment endpoint..." -ForegroundColor Yellow

# Test deployment
$body = @{
    workflow_id = "test_$(Get-Date -UFormat %s)"
    name = "Test Workflow"
    owner = "d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed"
    workflow = @{
        nodes = @(
            @{
                id = "trigger-1"
                type = "trigger"
                data = @{ label = "Price Alert"; triggerType = "price_threshold" }
            },
            @{
                id = "action-1"
                type = "action"
                data = @{ label = "Buy ETH"; actionType = "trade" }
            }
        )
        edges = @(
            @{ source = "trigger-1"; target = "action-1" }
        )
    }
    atomic_mode = $true
    gas_speed = "fast"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/deploy" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✓ Deployment successful!" -ForegroundColor Green
    Write-Host "   TX Hash: $($response.txHash)" -ForegroundColor Gray
    Write-Host "   Workflow ID: $($response.workflowId)" -ForegroundColor Gray
    Write-Host "   Contract: $($response.contractAddress)" -ForegroundColor Gray
    Write-Host "   Explorer: $($response.explorer)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update COORDINATOR_CONTRACT_ADDRESS in backend/.env with real address"
Write-Host "  2. Deploy backend to Render: see backend/README.md"
Write-Host "  3. Update NEXT_PUBLIC_BACKEND_URL in .env.local"
Write-Host "  4. Test from frontend UI"

