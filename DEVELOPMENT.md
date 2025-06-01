# Development Guide

## Setup and Installation

### Prerequisites
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)
- Code editor (VS Code recommended)
- Local development server
- Basic knowledge of HTML5, CSS3, JavaScript ES6+, and Three.js

### Development Environment
```bash
# Clone the repository
git clone <repository-url>
cd cosmic-focus

# Start development server
python -m http.server 8000
# OR
npx serve .
# OR  
php -S localhost:8000

# Open browser
open http://localhost:8000
```

### Recommended VS Code Extensions
- **Live Server**: Real-time preview
- **Three.js Snippets**: Three.js code completion
- **Shader languages support**: GLSL syntax highlighting
- **CSS Peek**: CSS class navigation
- **Auto Rename Tag**: HTML tag synchronization

---

## Code Style and Standards

### JavaScript Standards
```javascript
// Use ES6+ features
import { module } from './module.js';
const { destructured } = object;
const arrowFunction = (param) => result;

// Consistent naming
const camelCaseVariables = true;
const CONSTANT_VALUES = 'UPPERCASE';
class PascalCaseClasses {}
function descriptiveActionNames() {}

// Modern async/await
async function loadData() {
    try {
        const data = await fetch('/api/data');
        return await data.json();
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}
```

### CSS Organization
```css
/* Component-based structure */
.component {
    /* Layout properties first */
    display: flex;
    position: relative;
    
    /* Box model */
    width: 100%;
    padding: 1rem;
    margin: 0.5rem;
    
    /* Visual properties */
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    
    /* Typography */
    font-size: 1rem;
    color: var(--text-primary);
    
    /* Transitions and animations */
    transition: all 0.3s ease;
}

/* BEM-like naming convention */
.component__element {}
.component--modifier {}
.component__element--modifier {}
```

### HTML Structure
```html
<!-- Semantic HTML5 elements -->
<main class="main-content">
    <section class="timer-section">
        <header class="timer-header">
            <h2 class="timer-title">Focus Session</h2>
        </header>
        
        <div class="timer-body">
            <!-- Timer content -->
        </div>
    </section>
</main>

<!-- Accessibility attributes -->
<button 
    class="btn btn-primary" 
    aria-label="Start focus session"
    role="button"
    tabindex="0"
>
    Start
</button>
```

---

## Architecture Patterns

### Module Pattern
Each feature is organized as an ES6 module with clear boundaries:

```javascript
// module.js
let privateVariable = 'hidden';

function privateFunction() {
    return 'internal';
}

export function publicFunction() {
    return privateFunction();
}

export const publicConstant = 'exposed';
```

### State Management
Centralized state with immutable updates:

```javascript
// state.js
export const state = {
    timer: { /* timer state */ },
    tasks: { /* task state */ },
    ui: { /* ui state */ }
};

// Don't mutate state directly
// state.timer.isRunning = true; // ❌ Bad

// Use update functions instead
export function updateTimerState(updates) {
    Object.assign(state.timer, updates); // ✅ Good
}
```

### Event-Driven Communication
```javascript
// Producer
function notifyTimerStart() {
    document.dispatchEvent(new CustomEvent('timer:start', {
        detail: { duration: state.timer.duration }
    }));
}

// Consumer  
document.addEventListener('timer:start', (event) => {
    triggerVisualEffects(event.detail.duration);
});
```

---

## Adding New Features

### 1. Create New Module
```javascript
// js/new-feature.js
import { state } from './state.js';

let featureInitialized = false;

export function initNewFeature() {
    if (featureInitialized) return;
    
    setupEventListeners();
    initializeUI();
    
    featureInitialized = true;
    console.log('New feature initialized');
}

function setupEventListeners() {
    // Add event listeners
}

function initializeUI() {
    // Setup UI elements
}

export function publicAPIMethod() {
    // Exported functionality
}
```

### 2. Add to Main App
```javascript
// js/app.js
import { initNewFeature } from './new-feature.js';

async function initializeApp() {
    // ... existing initialization
    
    // Add new feature
    initNewFeature();
}
```

### 3. Add CSS Styles
```css
/* css/components.css */
.new-feature {
    /* Component styles */
}

.new-feature__element {
    /* Element styles */
}

.new-feature--active {
    /* State modifier */
}
```

### 4. Update HTML (if needed)
```html
<!-- Add new UI elements -->
<div class="new-feature" id="newFeature">
    <div class="new-feature__content">
        <!-- Feature content -->
    </div>
</div>
```

---

## 3D Development Guidelines

### Three.js Best Practices
```javascript
// Efficient geometry reuse
const sharedGeometry = new THREE.SphereGeometry(1, 32, 32);
const instances = [];

for (let i = 0; i < 100; i++) {
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(sharedGeometry, material);
    instances.push(mesh);
    scene.add(mesh);
}

// Proper cleanup
function dispose() {
    instances.forEach(mesh => {
        scene.remove(mesh);
        mesh.material.dispose();
    });
    sharedGeometry.dispose();
}
```

### Shader Development
```glsl
// Vertex Shader
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    pos.z += sin(time + position.x) * 0.1;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

```glsl
// Fragment Shader
uniform float time;
uniform vec3 color;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    float intensity = sin(time + vPosition.x * 10.0) * 0.5 + 0.5;
    vec3 finalColor = color * intensity;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
```

### Performance Optimization
```javascript
// Use object pooling for particles
class ParticlePool {
    constructor(size) {
        this.pool = [];
        this.active = [];
        
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createParticle());
        }
    }
    
    acquire() {
        const particle = this.pool.pop() || this.createParticle();
        this.active.push(particle);
        return particle;
    }
    
    release(particle) {
        const index = this.active.indexOf(particle);
        if (index > -1) {
            this.active.splice(index, 1);
            this.pool.push(particle);
        }
    }
}
```

---

## Testing Guidelines

### Manual Testing Checklist
- [ ] Timer starts and stops correctly
- [ ] Tasks can be added and completed
- [ ] Visual effects trigger appropriately  
- [ ] Sounds play at correct volumes
- [ ] Settings persist after reload
- [ ] Themes switch properly
- [ ] Responsive design works on mobile
- [ ] Performance is smooth (60fps)

### Browser Testing
Test across different browsers and devices:
- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **WebGL**: Verify 3D effects work correctly

### Performance Testing
```javascript
// Monitor frame rate
let lastTime = performance.now();
let frameCount = 0;

function measureFPS() {
    const currentTime = performance.now();
    frameCount++;
    
    if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        console.log(`FPS: ${fps}`);
        frameCount = 0;
        lastTime = currentTime;
    }
    
    requestAnimationFrame(measureFPS);
}
```

---

## Debugging Tips

### Console Debugging
```javascript
// Enable debug mode
window.DEBUG = true;

// Debug logging helper
function debugLog(category, message, data = null) {
    if (window.DEBUG) {
        console.log(`[${category}] ${message}`, data);
    }
}

// Usage
debugLog('TIMER', 'Starting focus session', { duration: 25 });
```

### Three.js Debugging
```javascript
// Wireframe mode for debugging geometry
material.wireframe = true;

// Show bounding boxes
const box = new THREE.BoxHelper(mesh, 0xffff00);
scene.add(box);

// Performance monitoring
const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
    stats.begin();
    
    // Render scene
    renderer.render(scene, camera);
    
    stats.end();
    requestAnimationFrame(animate);
}
```

### Common Issues
1. **Memory Leaks**: Always dispose of Three.js objects
2. **Performance**: Limit particle counts and polygon counts
3. **State Mutations**: Use state update functions
4. **Event Listeners**: Remove listeners on cleanup
5. **Async Errors**: Wrap async calls in try-catch

---

## Deployment

### Production Build
```bash
# Minify CSS
npx postcss css/*.css --use autoprefixer cssnano --dir dist/css/

# Minify JavaScript (optional)
npx terser js/*.js --compress --mangle --output dist/js/

# Optimize assets
npx imagemin images/* --out-dir=dist/images
```

### Performance Optimization
```html
<!-- Preload critical resources -->
<link rel="preload" href="css/style.css" as="style">
<link rel="preload" href="js/app.js" as="script">

<!-- Optimize loading -->
<script src="three.min.js" defer></script>
<script type="module" src="js/app.js"></script>
```

### Error Monitoring
```javascript
// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Send to error tracking service
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});
```

---

## Contributing

### Pull Request Process
1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request with detailed description

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] All functions are documented
- [ ] No console.log statements in production code
- [ ] Performance impact is considered
- [ ] Accessibility is maintained
- [ ] Browser compatibility is tested
- [ ] No breaking changes without discussion

### Issue Reporting
When reporting bugs, include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console error messages
- Screenshots (if relevant)

---

## Resources

### Documentation
- [Three.js Documentation](https://threejs.org/docs/)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)

### Tools
- [Three.js Editor](https://threejs.org/editor/)
- [Shader Toy](https://www.shadertoy.com/) - GLSL playground
- [WebGL Inspector](https://chrome.google.com/webstore/detail/webgl-inspector/ogkcjmbhnfmlnieloclggl)

### Learning Resources
- [Three.js Fundamentals](https://threejsfundamentals.org/)
- [Learn WebGL](https://learnopengl.com/)
- [The Book of Shaders](https://thebookofshaders.com/)
