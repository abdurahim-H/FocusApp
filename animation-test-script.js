// Animation Restart Test Script
// Paste this into the browser console to test the animation restart functionality

console.log('🎭 Starting Animation Restart Tests...');

// Test 1: Check if cleanup system is initialized
function testCleanupInitialization() {
    console.log('\n1️⃣ Testing Cleanup System Initialization...');
    
    const hasActiveFrames = typeof activeAnimationFrames !== 'undefined';
    const hasTrackingFunction = typeof trackRequestAnimationFrame === 'function';
    const hasVisibilityHandler = document.onvisibilitychange !== null;
    
    console.log(`✓ Active animation frames tracking: ${hasActiveFrames ? '✅' : '❌'}`);
    console.log(`✓ Tracking function available: ${hasTrackingFunction ? '✅' : '❌'}`);
    console.log(`✓ Visibility change handler: ${hasVisibilityHandler ? '✅' : '❌'}`);
    
    return hasActiveFrames && hasTrackingFunction;
}

// Test 2: Check if restart functions are globally available
function testRestartFunctions() {
    console.log('\n2️⃣ Testing Global Restart Functions...');
    
    const hasScene3D = typeof window.scene3dAnimate === 'function';
    const hasMeditation = typeof window.restartMeditationAnimation === 'function';
    const hasCosmicSettings = typeof window.restartCosmicSettingsAnimations === 'function';
    
    console.log(`✓ Scene3D restart function: ${hasScene3D ? '✅' : '❌'}`);
    console.log(`✓ Meditation restart function: ${hasMeditation ? '✅' : '❌'}`);
    console.log(`✓ Cosmic Settings restart function: ${hasCosmicSettings ? '✅' : '❌'}`);
    
    return hasScene3D && hasMeditation && hasCosmicSettings;
}

// Test 3: Simulate tab hidden/visible cycle
function testTabVisibilitySimulation() {
    console.log('\n3️⃣ Testing Tab Visibility Simulation...');
    
    const initialFrameCount = activeAnimationFrames ? activeAnimationFrames.size : 0;
    console.log(`Initial animation frames: ${initialFrameCount}`);
    
    // Simulate tab hidden
    console.log('Simulating tab hidden...');
    Object.defineProperty(document, 'hidden', { value: true, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    
    setTimeout(() => {
        const pausedFrameCount = activeAnimationFrames ? activeAnimationFrames.size : 0;
        console.log(`Animation frames after pause: ${pausedFrameCount}`);
        
        // Simulate tab visible
        console.log('Simulating tab visible...');
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        
        setTimeout(() => {
            const resumedFrameCount = activeAnimationFrames ? activeAnimationFrames.size : 0;
            console.log(`Animation frames after resume: ${resumedFrameCount}`);
            console.log(`Resume successful: ${resumedFrameCount > pausedFrameCount ? '✅' : '❌'}`);
        }, 500);
    }, 500);
}

// Test 4: Check if tracked animation frames work properly
function testTrackedAnimationFrames() {
    console.log('\n4️⃣ Testing Tracked Animation Frames...');
    
    if (typeof trackRequestAnimationFrame !== 'function') {
        console.log('❌ trackRequestAnimationFrame not available');
        return false;
    }
    
    let testFrameId = null;
    let callbackExecuted = false;
    
    function testCallback() {
        callbackExecuted = true;
        console.log('✓ Test animation frame callback executed');
    }
    
    // Test normal operation
    testFrameId = trackRequestAnimationFrame(testCallback);
    console.log(`Test frame ID: ${testFrameId}`);
    
    setTimeout(() => {
        console.log(`Callback executed: ${callbackExecuted ? '✅' : '❌'}`);
        
        // Test paused operation
        if (typeof animationsPaused !== 'undefined') {
            console.log('Testing paused state...');
            // Force paused state
            animationsPaused = true;
            const pausedFrameId = trackRequestAnimationFrame(() => {
                console.log('❌ This should not execute when paused');
            });
            console.log(`Paused frame ID: ${pausedFrameId} (should be -1)`);
            console.log(`Paused state working: ${pausedFrameId === -1 ? '✅' : '❌'}`);
            
            // Reset paused state
            animationsPaused = false;
        }
    }, 100);
    
    return true;
}

// Test 5: Test cosmic settings animation restart
function testCosmicSettingsRestart() {
    console.log('\n5️⃣ Testing Cosmic Settings Animation Restart...');
    
    if (typeof window.restartCosmicSettingsAnimations !== 'function') {
        console.log('❌ Cosmic settings restart function not available');
        return false;
    }
    
    try {
        window.restartCosmicSettingsAnimations();
        console.log('✅ Cosmic settings restart function executed successfully');
        return true;
    } catch (error) {
        console.log(`❌ Error executing cosmic settings restart: ${error.message}`);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running Animation Restart Test Suite...\n');
    
    const results = {
        cleanup: testCleanupInitialization(),
        restartFunctions: testRestartFunctions(),
        cosmicSettings: testCosmicSettingsRestart(),
        trackedFrames: testTrackedAnimationFrames()
    };
    
    // Run visibility test (async)
    testTabVisibilitySimulation();
    
    setTimeout(() => {
        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        
        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
        });
        
        console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! Animation restart functionality is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Check the individual test results above.');
        }
    }, 2000);
}

// Auto-run if in main window
if (typeof window !== 'undefined') {
    runAllTests();
} else {
    console.log('Manual execution: call runAllTests() to start the test suite');
}
