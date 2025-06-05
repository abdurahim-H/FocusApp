#!/bin/bash

echo "🌌 Cosmic Settings Animation Verification"
echo "=========================================="
echo ""

cd /workspaces/website

echo "1. 🔍 Checking for key animation keyframes in CSS..."
if grep -q "@keyframes cosmicScan" css/cosmic-settings.css; then
    echo "   ✅ cosmicScan animation found"
else
    echo "   ❌ cosmicScan animation missing"
fi

if grep -q "@keyframes statShimmer" css/cosmic-settings.css; then
    echo "   ✅ statShimmer animation found"
else
    echo "   ❌ statShimmer animation missing"
fi

if grep -q "@keyframes cosmicBorderFlow" css/cosmic-settings.css; then
    echo "   ✅ cosmicBorderFlow animation found"
else
    echo "   ❌ cosmicBorderFlow animation missing"
fi

echo ""
echo "2. 🎛️ Checking for stellar slider components..."
if grep -q "stellar-control-container" css/cosmic-settings.css; then
    echo "   ✅ Stellar control container styles found"
else
    echo "   ❌ Stellar control container styles missing"
fi

if grep -q "stellar-track" css/cosmic-settings.css; then
    echo "   ✅ Stellar track styles found"
else
    echo "   ❌ Stellar track styles missing"
fi

if grep -q "track-star" css/cosmic-settings.css; then
    echo "   ✅ Track star styles found"
else
    echo "   ❌ Track star styles missing"
fi

if grep -q "cosmic-thumb" css/cosmic-settings.css; then
    echo "   ✅ Cosmic thumb styles found"
else
    echo "   ❌ Cosmic thumb styles missing"
fi

echo ""
echo "3. 🌟 Checking for cosmic preview animation..."
if grep -q "preview-scanning-bar" css/cosmic-settings.css; then
    echo "   ✅ Preview scanning bar styles found"
else
    echo "   ❌ Preview scanning bar styles missing"
fi

if grep -q "animation.*cosmicScan" css/cosmic-settings.css; then
    echo "   ✅ CosmicScan animation applied"
else
    echo "   ❌ CosmicScan animation not applied"
fi

echo ""
echo "4. 🧠 Checking JavaScript initialization..."
if grep -q "initCosmicSettings" js/cosmic-settings.js; then
    echo "   ✅ initCosmicSettings function found"
else
    echo "   ❌ initCosmicSettings function missing"
fi

if grep -q "createParticleBackground" js/cosmic-settings.js; then
    echo "   ✅ createParticleBackground function found"
else
    echo "   ❌ createParticleBackground function missing"
fi

if grep -q "setupCosmicSettingsModal" js/cosmic-settings.js; then
    echo "   ✅ setupCosmicSettingsModal function found"
else
    echo "   ❌ setupCosmicSettingsModal function missing"
fi

echo ""
echo "5. 🔗 Checking HTML integration..."
if grep -q 'cosmic-settings.css' index.html; then
    echo "   ✅ Cosmic settings CSS linked in main page"
else
    echo "   ❌ Cosmic settings CSS not linked"
fi

if grep -q 'stellar-control-container' index.html; then
    echo "   ✅ Stellar control containers present in HTML"
else
    echo "   ❌ Stellar control containers missing from HTML"
fi

if grep -q 'cosmic-preview-section' index.html; then
    echo "   ✅ Cosmic preview section present in HTML"
else
    echo "   ❌ Cosmic preview section missing from HTML"
fi

echo ""
echo "6. 📊 File sizes and structure..."
echo "   CSS file size: $(wc -c < css/cosmic-settings.css) bytes"
echo "   JS file size: $(wc -c < js/cosmic-settings.js) bytes"
echo "   CSS lines: $(wc -l < css/cosmic-settings.css)"
echo "   JS lines: $(wc -l < js/cosmic-settings.js)"

echo ""
echo "🚀 Server Status:"
if pgrep -f "python3 -m http.server" > /dev/null; then
    echo "   ✅ Development server is running"
    echo "   🌐 Test URLs:"
    echo "      • Main app: http://localhost:8001/index.html"
    echo "      • Test suite: http://localhost:8001/test-main-cosmic.html"
    echo "      • Animation tests: http://localhost:8001/test-cosmic-animations.html"
else
    echo "   ❌ Development server not running"
fi

echo ""
echo "🌌 Cosmic Settings Status: READY FOR TESTING"
echo "=========================================="
