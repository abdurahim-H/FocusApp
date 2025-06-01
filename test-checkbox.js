// Checkbox Investigation Test Script
// Run this in the browser console to test task completion

console.log('🔬 CHECKBOX INVESTIGATION TEST STARTING...');
console.log('==========================================');

// Add monitoring for all the effects
function monitorTaskCompletion() {
    console.log('🎯 Setting up task completion monitoring...');
    
    // Monitor DOM mutations
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                console.log('🔄 DOM Mutation detected:', mutation.target, mutation);
            }
            if (mutation.type === 'attributes') {
                console.log('🎨 Attribute change:', mutation.target, mutation.attributeName, mutation.target.getAttribute(mutation.attributeName));
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true
    });
    
    // Monitor animation events
    document.addEventListener('animationstart', (e) => {
        console.log('🎬 Animation started:', e.animationName, 'on', e.target);
    });
    
    document.addEventListener('animationend', (e) => {
        console.log('🎬 Animation ended:', e.animationName, 'on', e.target);
    });
    
    // Monitor class changes
    const originalAddClass = Element.prototype.classList.add;
    const originalRemoveClass = Element.prototype.classList.remove;
    
    Element.prototype.classList.add = function(...classes) {
        console.log('➕ Class added to', this, ':', classes);
        return originalAddClass.apply(this, classes);
    };
    
    Element.prototype.classList.remove = function(...classes) {
        console.log('➖ Class removed from', this, ':', classes);
        return originalRemoveClass.apply(this, classes);
    };
    
    console.log('✅ Monitoring setup complete!');
}

// Test function to add and complete a task
function testTaskCompletion() {
    console.log('🧪 STARTING TASK COMPLETION TEST...');
    console.log('==================================');
    
    // Navigate to focus mode first
    console.log('🎯 Switching to Focus mode...');
    const focusBtn = document.querySelector('[data-mode="focus"]');
    if (focusBtn) {
        focusBtn.click();
        console.log('✅ Focus mode activated');
    }
    
    setTimeout(() => {
        // Add a test task
        console.log('📝 Adding test task...');
        const taskInput = document.getElementById('taskInput');
        const addBtn = document.getElementById('addTaskBtn');
        
        if (taskInput && addBtn) {
            taskInput.value = 'Test Task for Investigation';
            addBtn.click();
            console.log('✅ Test task added');
            
            setTimeout(() => {
                // Find and click the checkbox
                console.log('🎯 Looking for checkbox...');
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                console.log('📋 Found checkboxes:', checkboxes.length);
                
                if (checkboxes.length > 0) {
                    const checkbox = checkboxes[checkboxes.length - 1]; // Get the last one (newest task)
                    console.log('✅ Target checkbox found:', checkbox);
                    
                    console.log('🎉 CLICKING CHECKBOX - EFFECTS SHOULD START NOW!');
                    console.log('================================================');
                    
                    checkbox.click();
                    
                    console.log('🔍 OBSERVING EFFECTS FOR 5 SECONDS...');
                    setTimeout(() => {
                        console.log('⏰ INVESTIGATION COMPLETE');
                        console.log('=========================');
                    }, 5000);
                } else {
                    console.error('❌ No checkbox found!');
                }
            }, 500);
        } else {
            console.error('❌ Task input or add button not found!');
        }
    }, 500);
}

// Set up monitoring and run test
monitorTaskCompletion();
setTimeout(testTaskCompletion, 1000);

console.log('📋 Instructions:');
console.log('1. Watch the console for detailed logging');
console.log('2. Observe all visual effects in the UI');
console.log('3. Check the browser DevTools for any errors');
console.log('4. The test will run automatically in 1 second');
