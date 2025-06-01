// Investigation logging script
// Add this script to track DOM changes when checkbox is toggled

console.log('🔍 Starting layout investigation...');

// Function to log all DOM elements and their classes
function logElementStates(prefix) {
    console.log(`\n${prefix} DOM STATE:`);
    
    // Log main container
    const container = document.querySelector('.container');
    if (container) {
        console.log(`Container classes: ${container.className}`);
        console.log(`Container style: ${container.getAttribute('style') || 'none'}`);
    }
    
    // Log body attributes
    console.log(`Body classes: ${document.body.className}`);
    console.log(`Body data-theme: ${document.body.getAttribute('data-theme')}`);
    console.log(`Body style: ${document.body.getAttribute('style') || 'none'}`);
    
    // Log all task items
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach((item, index) => {
        console.log(`Task ${index} classes: ${item.className}`);
        console.log(`Task ${index} data-task-id: ${item.getAttribute('data-task-id')}`);
    });
    
    // Log any elements with effect classes
    const effectElements = document.querySelectorAll('[class*="glow"], [class*="celebration"], [class*="cosmic"], [class*="focus"], [class*="burst"]');
    if (effectElements.length > 0) {
        console.log(`Elements with effect classes:`);
        effectElements.forEach((el, index) => {
            console.log(`  Effect ${index}: ${el.tagName}.${el.className}`);
        });
    }
    
    // Log CSS custom properties
    const rootStyles = getComputedStyle(document.documentElement);
    const timeScale = rootStyles.getPropertyValue('--time-scale');
    const redshift = rootStyles.getPropertyValue('--redshift-intensity');
    if (timeScale) console.log(`CSS --time-scale: ${timeScale}`);
    if (redshift) console.log(`CSS --redshift-intensity: ${redshift}`);
}

// Override the toggleTask function to add logging
const originalToggleTask = window.toggleTask;
window.toggleTask = function(id) {
    console.log(`\n🎯 CHECKBOX TOGGLED FOR TASK ID: ${id}`);
    
    logElementStates('BEFORE TOGGLE');
    
    // Call the original function
    originalToggleTask(id);
    
    // Log immediately after
    setTimeout(() => {
        logElementStates('IMMEDIATELY AFTER TOGGLE');
    }, 0);
    
    // Log after a delay to catch any delayed effects
    setTimeout(() => {
        logElementStates('1 SECOND AFTER TOGGLE');
    }, 1000);
    
    setTimeout(() => {
        logElementStates('3 SECONDS AFTER TOGGLE');
    }, 3000);
};

console.log('🔍 Investigation logging setup complete');
