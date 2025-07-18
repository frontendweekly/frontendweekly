#!/usr/bin/env zx

import { validateOpenAI } from './llm-processor.mjs';
import { analyzeWritingStyle } from './style-analyzer.mjs';

console.log('🧪 Testing Enhanced LLM Curation System...\n');

// Test 1: Style Analysis
console.log('1️⃣ Testing Style Analysis...');
try {
  const analysis = analyzeWritingStyle(5);
  console.log(`✅ Style analysis successful:`);
  console.log(`   - Total articles analyzed: ${analysis.totalArticles}`);
  console.log(`   - MUSTREAD: ${analysis.categories.MUSTREAD}`);
  console.log(`   - FEATURED: ${analysis.categories.FEATURED}`);
  console.log(`   - INBRIEF: ${analysis.categories.INBRIEF}`);
  console.log(`   - Technical terms found: ${analysis.technicalTerms.length}`);
} catch (error) {
  console.log(`❌ Style analysis failed: ${error.message}`);
}

// Test 2: OpenAI API
console.log('\n2️⃣ Testing OpenAI API...');
try {
  const isValid = await validateOpenAI();
  if (isValid) {
    console.log('✅ OpenAI API is working correctly');
  } else {
    console.log('❌ OpenAI API validation failed');
  }
} catch (error) {
  console.log(`❌ OpenAI API test failed: ${error.message}`);
}

// Test 3: Enhanced System Components
console.log('\n3️⃣ Testing Enhanced System Components...');
try {
  // Test if the LLM script can be imported
  const { getNextVol, getNextWednesday, extractURL } = await import('./llm-curation.mjs');

  console.log('✅ LLM script components loaded successfully');
console.log(`   - Next volume: ${getNextVol()}`);
console.log(`   - Next Wednesday: ${getNextWednesday()}`);

// Test URL extraction
const testUrl = extractURL('This is a description with https://example.com/article in it');
console.log(`   - URL extraction: ${testUrl}`);

} catch (error) {
console.log(`❌ LLM system test failed: ${error.message}`);
}

console.log('\n🎉 LLM system test completed!');
console.log('\nTo use the LLM system:');
console.log('1. Add your OpenAI API key to .env');
console.log('2. Install Playwright: npx playwright install chromium');
console.log('3. Run: npm run post:llm');
console.log('\nThe LLM system builds on your existing workflow and adds AI-powered Japanese content generation!');