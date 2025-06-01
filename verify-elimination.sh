#!/bin/bash
# Yellow Ring Elimination Verification Script

echo "🔥 YELLOW RING ELIMINATION VERIFICATION"
echo "======================================="

echo ""
echo "✅ 1. Checking task completion trigger function..."
echo "   Location: js/tasks.js"
if grep -q "// triggerTaskCompletionBurst();" js/tasks.js; then
    echo "   ✅ DISABLED: triggerTaskCompletionBurst() is commented out"
else
    echo "   ❌ ERROR: triggerTaskCompletionBurst() is still active"
fi

echo ""
echo "✅ 2. Checking blackhole burst function safeguard..."
echo "   Location: js/blackhole.js"
if grep -q "return; // Early return to prevent execution" js/blackhole.js; then
    echo "   ✅ SAFEGUARDED: Early return prevents function execution"
else
    echo "   ❌ ERROR: Function is not safeguarded"
fi

echo ""
echo "✅ 3. Checking debug file..."
echo "   Location: js/tasks-debug.js"
if grep -q "DEBUG: Yellow ring burst effect DISABLED" js/tasks-debug.js; then
    echo "   ✅ DISABLED: Debug version also disabled"
else
    echo "   ❌ ERROR: Debug version still active"
fi

echo ""
echo "✅ 4. Verifying logging is in place..."
if grep -q "console.log.*DISABLED.*Yellow ring" js/tasks.js; then
    echo "   ✅ LOGGING: Console messages added for verification"
else
    echo "   ❌ ERROR: No logging found"
fi

echo ""
echo "✅ 5. Testing application accessibility..."
if curl -s -f http://localhost:8000 > /dev/null 2>&1; then
    echo "   ✅ SERVER: Application is accessible on localhost:8000"
else
    echo "   ❌ ERROR: Server not responding"
fi

echo ""
echo "🎯 ELIMINATION STATUS:"
echo "======================================="

# Count disabled instances
disabled_count=0
if grep -q "// triggerTaskCompletionBurst();" js/tasks.js; then
    ((disabled_count++))
fi
if grep -q "return; // Early return to prevent execution" js/blackhole.js; then
    ((disabled_count++))
fi
if grep -q "DEBUG: Yellow ring burst effect DISABLED" js/tasks-debug.js; then
    ((disabled_count++))
fi

if [ $disabled_count -eq 3 ]; then
    echo "🎉 SUCCESS: Yellow ring effect COMPLETELY ELIMINATED!"
    echo ""
    echo "📋 Changes Made:"
    echo "   1. Commented out triggerTaskCompletionBurst() call in tasks.js"
    echo "   2. Added early return in triggerTaskCompletionBurst() function"
    echo "   3. Disabled debug version in tasks-debug.js"
    echo "   4. Added console logging for verification"
    echo ""
    echo "🧪 To Test:"
    echo "   1. Open http://localhost:8000"
    echo "   2. Go to Focus mode"
    echo "   3. Add and complete a task"
    echo "   4. Verify NO yellow ring appears from black hole center"
    echo "   5. Check console for 'DISABLED' messages"
else
    echo "⚠️  WARNING: Elimination incomplete ($disabled_count/3 changes applied)"
fi

echo ""
echo "🔗 Test URLs:"
echo "   Main App: http://localhost:8000"
echo "   Test Page: http://localhost:8000/yellow-ring-elimination-test.html"
