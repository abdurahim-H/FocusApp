// Test script to verify ambient mode functionality
// Run this in browser console on the main page

console.log('🎵 Testing Ambient Mode Functionality...');

// Test 1: Check if audio system is initialized
function testAudioInitialization() {
    console.log('\n1️⃣ Testing Audio Initialization...');
    
    if (window.loadedModules?.sounds?.initAudioSystem) {
        console.log('✅ initAudioSystem function available');
        return window.loadedModules.sounds.initAudioSystem();
    } else {
        console.log('❌ initAudioSystem function not found');
        return false;
    }
}

// Test 2: Check ambient buttons functionality
function testAmbientButtons() {
    console.log('\n2️⃣ Testing Ambient Buttons...');
    
    const buttons = ['rainBtn', 'oceanBtn', 'forestBtn', 'cafeBtn'];
    const results = {};
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            results[btnId] = {
                exists: true,
                hasEventListener: btn.onclick !== null || btn.addEventListener !== undefined
            };
            console.log(`✅ ${btnId} button found`);
        } else {
            results[btnId] = { exists: false };
            console.log(`❌ ${btnId} button not found`);
        }
    });
    
    return results;
}

// Test 3: Test sound delay by measuring click-to-audio time
async function testSoundDelay(soundType = 'rain') {
    console.log(`\n3️⃣ Testing Sound Delay for ${soundType}...`);
    
    const startTime = performance.now();
    
    try {
        if (window.loadedModules?.sounds?.toggleAmbientSound) {
            await window.loadedModules.sounds.toggleAmbientSound(soundType);
            const endTime = performance.now();
            const delay = Math.round(endTime - startTime);
            
            console.log(`⏱️ Sound activation delay: ${delay}ms`);
            
            if (delay < 100) {
                console.log('🚀 Excellent! Very fast response');
            } else if (delay < 500) {
                console.log('⚡ Good response time');
            } else {
                console.log('🐌 Slow response - may need optimization');
            }
            
            return delay;
        } else {
            console.log('❌ toggleAmbientSound function not available');
            return null;
        }
    } catch (error) {
        console.log(`❌ Error testing sound delay: ${error.message}`);
        return null;
    }
}

// Test 4: Check state management
function testStateManagement() {
    console.log('\n4️⃣ Testing State Management...');
    
    if (window.loadedModules?.state) {
        const state = window.loadedModules.state.state;
        console.log('📊 Current state:', state);
        
        if (state.sounds) {
            console.log('✅ Sound state exists');
            console.log('🔊 Active sounds:', state.sounds.active);
            console.log('💾 Loaded buffers:', Object.keys(state.sounds.buffers || {}));
            console.log('🎛️ Sound sources:', Object.keys(state.sounds.sources || {}));
        } else {
            console.log('❌ Sound state not found');
        }
        
        return state;
    } else {
        console.log('❌ State module not available');
        return null;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🎯 Running Complete Ambient Mode Test Suite...');
    console.log('=' .repeat(50));
    
    try {
        // Test 1: Audio initialization
        const initResult = await testAudioInitialization();
        
        // Wait a moment for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 2: Button functionality
        const buttonResults = testAmbientButtons();
        
        // Test 3: Sound delay
        const delayResult = await testSoundDelay('rain');
        
        // Test 4: State management
        const stateResult = testStateManagement();
        
        // Summary
        console.log('\n📋 TEST SUMMARY:');
        console.log('=' .repeat(30));
        console.log(`🔧 Audio Init: ${initResult ? '✅' : '❌'}`);
        console.log(`🎛️ Buttons: ${Object.values(buttonResults).every(r => r.exists) ? '✅' : '❌'}`);
        console.log(`⚡ Sound Delay: ${delayResult ? (delayResult < 500 ? '✅' : '⚠️') : '❌'} ${delayResult ? delayResult + 'ms' : 'N/A'}`);
        console.log(`📊 State: ${stateResult ? '✅' : '❌'}`);
        
        if (initResult && delayResult < 500) {
            console.log('\n🎉 SOUND DELAY FIXES ARE WORKING! 🎉');
        } else {
            console.log('\n⚠️ Some issues detected - check individual test results above');
        }
        
    } catch (error) {
        console.log(`❌ Test suite error: ${error.message}`);
    }
}

// Auto-run tests if page is loaded
if (document.readyState === 'complete') {
    runAllTests();
} else {
    window.addEventListener('load', runAllTests);
}

// Export functions for manual testing
window.ambientTests = {
    runAllTests,
    testAudioInitialization,
    testAmbientButtons,
    testSoundDelay,
    testStateManagement
};
