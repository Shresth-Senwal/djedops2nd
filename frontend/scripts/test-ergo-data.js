/**
 * Test Script for Ergo Blockchain Data Integration
 * 
 * Purpose:
 * Verify that all new API endpoints are working correctly and returning expected data.
 * 
 * Usage:
 * node scripts/test-ergo-data.js
 * 
 * Requirements:
 * - Development server running (npm run dev)
 * - Internet connection for external APIs
 */

const BASE_URL = 'http://localhost:3000';

/**
 * Test helper function
 */
async function testEndpoint(name, url, expectedKeys) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📡 URL: ${url}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`❌ FAILED: HTTP ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log(`📦 Data:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    
    // Validate expected keys
    if (expectedKeys) {
      const missingKeys = expectedKeys.filter(key => !(key in data));
      if (missingKeys.length > 0) {
        console.warn(`⚠️  Missing keys: ${missingKeys.join(', ')}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Ergo Blockchain Data Integration Test Suite              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const tests = [
    {
      name: 'Oracle Price (ERG/USD)',
      url: `${BASE_URL}/api/djed?endpoint=oracle/price`,
      expectedKeys: ['price', 'timestamp']
    },
    {
      name: 'Network Info',
      url: `${BASE_URL}/api/djed?endpoint=info`,
      expectedKeys: ['version', 'supply']
    },
    {
      name: 'Recent Blocks',
      url: `${BASE_URL}/api/djed?endpoint=blocks?limit=5`,
      expectedKeys: ['items', 'total']
    },
    {
      name: 'Djed Protocol State (Synthetic)',
      url: `${BASE_URL}/api/djed?endpoint=djed/state`,
      expectedKeys: ['success', 'data']
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const passed = await testEndpoint(test.name, test.url, test.expectedKeys);
    results.push({ name: test.name, passed });
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log(`\n📊 Score: ${passCount}/${totalCount} tests passed`);
  
  if (passCount === totalCount) {
    console.log('🎉 All tests passed! Ergo blockchain integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check error messages above.');
  }
  
  process.exit(passCount === totalCount ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
