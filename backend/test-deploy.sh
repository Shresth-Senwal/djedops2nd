#!/bin/bash
# Quick test script for backend deployment

echo "🚀 Testing DjedOps Backend Deployment"
echo ""

# Check if backend is running
echo "1. Checking backend health..."
HEALTH=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
  echo "✓ Backend is running"
  echo "   Response: $HEALTH"
else
  echo "✗ Backend not running. Start with: cd backend && npm start"
  exit 1
fi

echo ""
echo "2. Testing deployment endpoint..."

# Test deployment
RESPONSE=$(curl -s -X POST http://localhost:3001/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "test_'$(date +%s)'",
    "name": "Test Workflow",
    "owner": "d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed",
    "workflow": {
      "nodes": [
        {
          "id": "trigger-1",
          "type": "trigger",
          "data": { "label": "Price Alert", "triggerType": "price_threshold" }
        },
        {
          "id": "action-1",
          "type": "action",
          "data": { "label": "Buy ETH", "actionType": "trade" }
        }
      ],
      "edges": [
        { "source": "trigger-1", "target": "action-1" }
      ]
    },
    "atomic_mode": true,
    "gas_speed": "fast"
  }')

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✓ Test complete!"
echo ""
echo "Next steps:"
echo "  1. Update COORDINATOR_CONTRACT_ADDRESS in backend/.env with real address"
echo "  2. Deploy backend to Render: see backend/README.md"
echo "  3. Update NEXT_PUBLIC_BACKEND_URL in frontend .env.local"
echo "  4. Test from frontend UI"
