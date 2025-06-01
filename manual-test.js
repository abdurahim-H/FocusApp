// Manual test execution script to identify checkbox layout issues
// This script will be run in the browser console to execute the automated test

console.log('🔍 Starting manual checkbox layout investigation...');

// First, let's check the current state
console.log('📊 Initial state check:');
console.log('Tasks:', window.state?.tasks || 'State not available');
console.log('Container element:', document.querySelector('.container'));

// Add a task manually and measure
console.log('➕ Adding test task...');
const taskInput = document.getElementById('taskInput');
if (taskInput) {
    taskInput.value = 'Layout Investigation Test Task';
    
    // Measure before adding task
    const containerBefore = document.querySelector('.container');
    const rectBefore = containerBefore.getBoundingClientRect();
    console.log('📏 Container before adding task:', {
        width: rectBefore.width,
        height: rectBefore.height,
        classes: containerBefore.className
    });
    
    // Add the task
    if (window.addTask) {
        window.addTask();
        console.log('✅ Task added');
        
        // Measure after adding task
        setTimeout(() => {
            const rectAfter = containerBefore.getBoundingClientRect();
            console.log('📏 Container after adding task:', {
                width: rectAfter.width,
                height: rectAfter.height,
                classes: containerBefore.className
            });
            
            // Now toggle the checkbox
            console.log('☑️ Toggling checkbox...');
            const checkbox = document.querySelector('input[type="checkbox"]');
            if (checkbox) {
                const rectBeforeToggle = containerBefore.getBoundingClientRect();
                console.log('📏 Container before toggle:', {
                    width: rectBeforeToggle.width,
                    height: rectBeforeToggle.height,
                    classes: containerBefore.className
                });
                
                // Get task ID for proper toggle
                const taskElements = document.querySelectorAll('[data-task-id]');
                if (taskElements.length > 0) {
                    const taskId = taskElements[0].getAttribute('data-task-id');
                    console.log('🎯 Found task ID:', taskId);
                    
                    // Monitor for changes during toggle
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                                console.log('🔄 Class change detected on:', mutation.target.tagName, 
                                          'Old:', mutation.oldValue, 'New:', mutation.target.className);
                            }
                        });
                    });
                    
                    observer.observe(containerBefore, {
                        attributes: true,
                        attributeOldValue: true,
                        subtree: true
                    });
                    
                    // Execute the toggle
                    if (window.toggleTask) {
                        window.toggleTask(parseInt(taskId));
                        
                        // Monitor for layout changes over time
                        let checkCount = 0;
                        const monitorInterval = setInterval(() => {
                            checkCount++;
                            const currentRect = containerBefore.getBoundingClientRect();
                            console.log(`📏 Container at ${checkCount * 100}ms:`, {
                                width: currentRect.width,
                                height: currentRect.height,
                                classes: containerBefore.className
                            });
                            
                            if (checkCount >= 30) { // Monitor for 3 seconds
                                clearInterval(monitorInterval);
                                observer.disconnect();
                                console.log('🏁 Monitoring complete');
                            }
                        }, 100);
                    }
                }
            }
        }, 100);
    }
}
