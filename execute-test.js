// Direct execution script to run the checkbox test and capture results
console.log('🔍 Executing direct checkbox layout test...');

// Function to run the test programmatically
function executeCheckboxTest() {
    // This simulates what happens when the "Run Quick Test" button is clicked
    
    console.log('🚀 Starting checkbox layout investigation...');
    
    // Check if we have access to the required functions
    if (typeof window.toggleTask === 'undefined') {
        console.error('❌ toggleTask function not available');
        return;
    }
    
    if (typeof window.state === 'undefined') {
        console.error('❌ state object not available');
        return;
    }
    
    // Clear existing tasks
    window.state.tasks = [];
    
    // Add a test task
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.value = 'Direct Test Task';
        window.addTask();
        console.log('✅ Test task added');
        console.log('📊 Current tasks:', window.state.tasks);
        
        if (window.state.tasks.length === 0) {
            console.error('❌ Failed to add task');
            return;
        }
        
        // Get container measurements
        const container = document.querySelector('.container');
        if (!container) {
            console.error('❌ Container not found');
            return;
        }
        
        const beforeRect = container.getBoundingClientRect();
        const beforeClasses = container.className;
        
        console.log('📏 BEFORE TOGGLE:');
        console.log('  Container dimensions:', Math.round(beforeRect.width) + 'x' + Math.round(beforeRect.height));
        console.log('  Container classes:', beforeClasses);
        console.log('  Container position:', Math.round(beforeRect.top) + ',' + Math.round(beforeRect.left));
        
        // Get task ID
        const taskId = window.state.tasks[0].id;
        console.log('🎯 Task ID to toggle:', taskId);
        
        // Set up mutation observer to catch class changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    console.log('🔄 CLASS CHANGE DETECTED:');
                    console.log('  Element:', mutation.target.tagName + (mutation.target.className ? '.' + mutation.target.className : ''));
                    console.log('  Old classes:', mutation.oldValue || 'none');
                    console.log('  New classes:', mutation.target.className || 'none');
                }
                
                if (mutation.type === 'childList') {
                    console.log('🔄 DOM STRUCTURE CHANGE:');
                    console.log('  Added nodes:', mutation.addedNodes.length);
                    console.log('  Removed nodes:', mutation.removedNodes.length);
                }
            });
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeOldValue: true,
            subtree: true,
            childList: true,
            attributeFilter: ['class', 'style']
        });
        
        // Execute the toggle
        console.log('☑️ EXECUTING CHECKBOX TOGGLE...');
        window.toggleTask(taskId);
        
        // Check immediate changes
        setTimeout(() => {
            const afterRect = container.getBoundingClientRect();
            const afterClasses = container.className;
            
            console.log('📏 AFTER TOGGLE (50ms later):');
            console.log('  Container dimensions:', Math.round(afterRect.width) + 'x' + Math.round(afterRect.height));
            console.log('  Container classes:', afterClasses);
            console.log('  Container position:', Math.round(afterRect.top) + ',' + Math.round(afterRect.left));
            
            // Calculate changes
            const widthChange = Math.abs(beforeRect.width - afterRect.width);
            const heightChange = Math.abs(beforeRect.height - afterRect.height);
            const topChange = Math.abs(beforeRect.top - afterRect.top);
            const leftChange = Math.abs(beforeRect.left - afterRect.left);
            
            console.log('📊 LAYOUT CHANGES:');
            console.log('  Width change:', widthChange.toFixed(2) + 'px');
            console.log('  Height change:', heightChange.toFixed(2) + 'px');
            console.log('  Top position change:', topChange.toFixed(2) + 'px');
            console.log('  Left position change:', leftChange.toFixed(2) + 'px');
            console.log('  Classes changed:', beforeClasses !== afterClasses);
            
            // Identify specific issues
            if (widthChange > 1) {
                console.warn('🚨 ISSUE: Container width changed significantly!');
            }
            if (heightChange > 1) {
                console.warn('🚨 ISSUE: Container height changed significantly!');
            }
            if (topChange > 1 || leftChange > 1) {
                console.warn('🚨 ISSUE: Container position shifted!');
            }
            if (beforeClasses !== afterClasses) {
                console.warn('🚨 ISSUE: Container classes changed!');
                console.warn('  Before:', beforeClasses);
                console.warn('  After:', afterClasses);
            }
            
            // Continue monitoring for 2 more seconds
            let monitorCount = 0;
            const monitorInterval = setInterval(() => {
                monitorCount++;
                const currentRect = container.getBoundingClientRect();
                const currentClasses = container.className;
                
                const currentWidthChange = Math.abs(beforeRect.width - currentRect.width);
                const currentHeightChange = Math.abs(beforeRect.height - currentRect.height);
                const currentTopChange = Math.abs(beforeRect.top - currentRect.top);
                const currentLeftChange = Math.abs(beforeRect.left - currentRect.left);
                
                if (currentWidthChange > 1 || currentHeightChange > 1 || currentTopChange > 1 || currentLeftChange > 1 || beforeClasses !== currentClasses) {
                    console.log(`🔄 LAYOUT CHANGE at ${monitorCount * 100}ms:`);
                    console.log('  Dimensions:', Math.round(currentRect.width) + 'x' + Math.round(currentRect.height));
                    console.log('  Position:', Math.round(currentRect.top) + ',' + Math.round(currentRect.left));
                    console.log('  Classes:', currentClasses);
                }
                
                if (monitorCount >= 20) { // 2 seconds
                    clearInterval(monitorInterval);
                    observer.disconnect();
                    console.log('🏁 CHECKBOX LAYOUT TEST COMPLETED');
                }
            }, 100);
            
        }, 50);
        
    } else {
        console.error('❌ Task input not found');
    }
}

// Execute the test
executeCheckboxTest();
