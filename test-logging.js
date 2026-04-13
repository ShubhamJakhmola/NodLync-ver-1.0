// Simple test script to verify logging works with your existing app_logs table
// Run this in your browser console or as a temporary component

import { logAppEvent } from './src/utils/appLogger';

// Test logging function
async function testLogging() {
  console.log('Testing logging system...');
  
  try {
    // Test 1: Create a basic log
    await logAppEvent({
      type: 'info',
      module: 'test-module',
      message: 'Test log entry at ' + new Date().toISOString(),
      projectId: 'test-project'
    });
    console.log('✅ Basic log created successfully');
    
    // Test 2: Create an error log
    await logAppEvent({
      type: 'error',
      module: 'test-module',
      message: 'Test error log entry',
      meta: { error: 'test error details' }
    });
    console.log('✅ Error log created successfully');
    
    // Test 3: Create a success log
    await logAppEvent({
      type: 'success',
      module: 'ai-playground',
      message: 'AI model execution completed',
      meta: { model: 'gpt-4', tokens: 150 }
    });
    console.log('✅ Success log created successfully');
    
    console.log('🎉 All tests passed! Check your Supabase app_logs table.');
    
  } catch (error) {
    console.error('❌ Logging test failed:', error);
  }
}

// Export the test function
export { testLogging };
