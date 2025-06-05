// Test script to verify cosmic settings functionality
console.log('🧪 Testing cosmic settings functionality...');

// Test 1: Check if cosmic-settings.css is loaded
function testCSSLoaded() {
    const styles = document.styleSheets;
    let cosmicStylesFound = false;
    
    for (let i = 0; i < styles.length; i++) {
        try {
            const href = styles[i].href;
            if (href && href.includes('cosmic-settings.css')) {
                cosmicStylesFound = true;
                break;
            }
        } catch (e) {
            // Cross-origin or other errors, skip
        }
    }
    
    console.log('✅ CSS Test:', cosmicStylesFound ? 'cosmic-settings.css loaded' : '❌ cosmic-settings.css not found');
    return cosmicStylesFound;
}

// Test 2: Check if DOM elements exist
function testDOMElements() {
    const elements = {
        settingsBtn: document.getElementById('settingsBtn'),
        settingsModal: document.getElementById('settingsModalOverlay'),
        stellarSliders: document.querySelectorAll('.stellar-slider'),
        stellarTracks: document.querySelectorAll('.stellar-track'),
        cosmicPreviews: document.querySelectorAll('.cosmic-preview-section')
    };
    
    console.log('🔍 DOM Elements Check:');
    Object.entries(elements).forEach(([name, element]) => {
        const exists = element && (element.length ? element.length > 0 : true);
        console.log(exists ? '✅' : '❌', `${name}:`, exists ? 'Found' : 'Missing');
    });
    
    return elements;
}

// Test 3: Check if animations are defined
function testAnimations() {
    const animationNames = ['cosmicScan', 'statShimmer', 'cosmicBorderFlow'];
    const results = {};
    
    animationNames.forEach(name => {
        const testEl = document.createElement('div');
        testEl.style.animation = `${name} 1s linear`;
        document.body.appendChild(testEl);
        
        const computedStyle = window.getComputedStyle(testEl);
        const hasAnimation = computedStyle.animationName === name;
        
        document.body.removeChild(testEl);
        
        results[name] = hasAnimation;
        console.log(hasAnimation ? '✅' : '❌', `Animation ${name}:`, hasAnimation ? 'Defined' : 'Missing');
    });
    
    return results;
}

// Test 4: Test settings button click
function testSettingsButton() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModalOverlay');
    
    if (!settingsBtn || !settingsModal) {
        console.log('❌ Settings Button Test: Elements missing');
        return false;
    }
    
    // Simulate click
    const clickEvent = new MouseEvent('click', { bubbles: true });
    settingsBtn.dispatchEvent(clickEvent);
    
    // Check if modal opens
    setTimeout(() => {
        const isActive = settingsModal.classList.contains('active');
        console.log(isActive ? '✅' : '❌', 'Settings Modal:', isActive ? 'Opens correctly' : 'Does not open');
        
        if (isActive) {
            // Test particle background creation
            setTimeout(() => {
                const particleCanvas = settingsModal.querySelector('.settings-particles');
                console.log(particleCanvas ? '✅' : '❌', 'Particle Background:', particleCanvas ? 'Created' : 'Missing');
                
                // Close modal
                const closeBtn = document.getElementById('closeSettingsBtn');
                if (closeBtn) {
                    closeBtn.click();
                }
            }, 1000);
        }
    }, 200);
    
    return true;
}

// Run tests
function runTests() {
    console.log('🧪 Starting Cosmic Settings Tests...');
    
    testCSSLoaded();
    testDOMElements();
    testAnimations();
    
    // Wait a bit then test button functionality
    setTimeout(() => {
        testSettingsButton();
    }, 1000);
}

// Export for manual testing
window.runCosmicTests = runTests;

// Auto-run if not in test mode
if (!window.location.href.includes('test-')) {
    setTimeout(runTests, 2000);
}

console.log('🧪 Cosmic settings test script loaded. Run window.runCosmicTests() to test manually.');
