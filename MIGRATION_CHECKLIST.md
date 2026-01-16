# 🚀 Complete Migration Checklist: Three.js → Babylon.js + WebGPU

## 📋 **INVENTORY OF YOUR CURRENT CODEBASE**

---

## **SECTION A: FILES TO MIGRATE**

| # | File | Lines | Priority | Migration Complexity |
|---|------|-------|----------|---------------------|
| **A1** | `index.html` | 306 | 🔴 HIGH | Medium - Update import map & container |
| **A2** | `js/core/app.js` | 250 | 🔴 HIGH | Medium - Module loader changes |
| **A3** | `js/core/state.js` | 36 | 🟢 LOW | None - Pure JS, keep as-is |
| **A4** | `js/graphics/cosmic-scene-v2.js` | 362 | 🔴 HIGH | **FULL REWRITE** |
| **A5** | `js/graphics/blackhole-interstellar.js` | 523 | 🔴 HIGH | **FULL REWRITE** |
| **A6** | `js/graphics/cosmic-effects.js` | 244 | 🔴 HIGH | **FULL REWRITE** |
| **A7** | `js/features/timer.js` | 554 | 🟢 LOW | None - No 3D code |
| **A8** | `js/features/tasks.js` | 48 | 🟢 LOW | None - No 3D code |
| **A9** | `js/features/sounds.js` | 485 | 🟢 LOW | None - No 3D code |
| **A10** | `js/ui/navigation.js` | 89 | 🟢 LOW | None - No 3D code |
| **A11** | `js/ui/ui-effects.js` | 671 | 🟡 MEDIUM | Minor - CSS effects stay, 3D triggers update |
| **A12** | `js/utils/cleanup.js` | 321 | 🟡 MEDIUM | Update 3D cleanup logic |
| **A13** | `js/utils/notifications.js` | 335 | 🟢 LOW | None - No 3D code |

---

## **SECTION B: 3D GRAPHICS COMPONENTS TO REBUILD**

### **B1. SCENE SETUP** (from `cosmic-scene-v2.js`)

| Component | Three.js Current | Babylon.js Equivalent |
|-----------|-----------------|----------------------|
| Renderer | `THREE.WebGLRenderer` | `BABYLON.WebGPUEngine` |
| Scene | `THREE.Scene()` | `BABYLON.Scene(engine)` |
| Camera | `THREE.PerspectiveCamera` | `BABYLON.ArcRotateCamera` |
| Background | `scene.background = new THREE.Color()` | `scene.clearColor` |
| Fog | `THREE.FogExp2` | `scene.fogMode = BABYLON.Scene.FOGMODE_EXP2` |

### **B2. POST-PROCESSING** (from `cosmic-scene-v2.js`)

| Effect | Three.js Current | Babylon.js Equivalent |
|--------|-----------------|----------------------|
| Bloom | `UnrealBloomPass` | `BABYLON.BloomEffect` or `DefaultRenderingPipeline` |
| Chromatic Aberration | Custom ShaderPass | `BABYLON.ChromaticAberrationPostProcess` |
| FXAA | `FXAAShader` | `DefaultRenderingPipeline.fxaa` |
| Effect Composer | `EffectComposer` | `BABYLON.PostProcess` pipeline |

### **B3. STARFIELD** (from `cosmic-scene-v2.js`)

| Component | Details |
|-----------|---------|
| Particle Count | 30,000 stars |
| Attributes | position, color, size, phase |
| Shader | Custom vertex/fragment for twinkle |
| Babylon Approach | `BABYLON.SolidParticleSystem` or **WebGPU Compute Shaders** |

### **B4. BLACK HOLE SYSTEM** (from `blackhole-interstellar.js`)

| Component | Particle Count | Babylon Approach |
|-----------|---------------|------------------|
| Accretion Disk | 260,000 (20 layers × 13,000) | **GPU Compute Particles** |
| Polar Jets | 110,000 (55k × 2) | **GPU Compute Particles** |
| Gravitational Lensing | Custom vertex shader | **Node Material** or WGSL compute |
| Keplerian Orbits | In vertex shader | **Compute Shader** for physics |

**Current Shader Features to Port:**
- Gravitational lensing distortion
- Temperature-based color gradient (orange/red)
- Keplerian orbital velocity
- Distance-based soft blending
- HDR-aware color

### **B5. COSMIC EFFECTS** (from `cosmic-effects.js`)

| Effect | Current Implementation | Babylon Approach |
|--------|----------------------|------------------|
| Shooting Stars (40) | `THREE.LineSegments` | `BABYLON.LinesSystem` or Trails |
| Nebula (150 particles) | `THREE.Points` + ShaderMaterial | `BABYLON.ParticleSystem` |
| Nebula Texture | Canvas gradient texture | Same or `BABYLON.DynamicTexture` |

---

## **SECTION C: NON-3D CODE (Keep As-Is)**

These modules have **NO Three.js dependencies** and will work unchanged:

| File | Function | Status |
|------|----------|--------|
| `js/core/state.js` | Global app state | ✅ No changes |
| `js/features/timer.js` | Pomodoro timer | ✅ No changes |
| `js/features/tasks.js` | Task management | ✅ No changes |
| `js/features/sounds.js` | Audio playback | ✅ No changes |
| `js/ui/navigation.js` | Mode switching | ✅ No changes |
| `js/utils/notifications.js` | Desktop alerts | ✅ No changes |

---

## **SECTION D: CSS FILES (Keep All)**

All CSS files are independent of 3D engine:

| File | Status |
|------|--------|
| `css/base/style.css` | ✅ Keep |
| `css/base/themes.css` | ✅ Keep |
| `css/base/responsive.css` | ✅ Keep |
| `css/components/apple-liquid-glass.css` | ✅ Keep |
| `css/components/components.css` | ✅ Keep |

---

## **SECTION E: ASSETS (Keep All)**

| Asset | Location | Status |
|-------|----------|--------|
| Sounds | `sounds/` (4 .wav files) | ✅ Keep |
| Favicon | `assets/file_03.svg` | ✅ Keep |

---

## 📝 **MIGRATION EXECUTION ORDER**

### **Phase 1: Foundation**
- [ ] Update `index.html` - Replace Three.js import map with Babylon.js
- [ ] Create new `js/graphics/babylon-engine.js` - Engine setup
- [ ] Update `js/core/app.js` - Change module import path

### **Phase 2: Basic Scene**
- [ ] Create `js/graphics/cosmic-scene-babylon.js` - Scene, camera, lights
- [ ] Add post-processing pipeline (bloom, chromatic aberration, FXAA)
- [ ] Port starfield with GPU particles

### **Phase 3: Black Hole (Core Visual)**
- [ ] Create `js/graphics/blackhole-babylon.js`
- [ ] Implement accretion disk with WebGPU compute shaders
- [ ] Port gravitational lensing shader to Node Material / WGSL
- [ ] Implement polar jets

### **Phase 4: Cosmic Effects**
- [ ] Create `js/graphics/cosmic-effects-babylon.js`
- [ ] Port shooting stars
- [ ] Port nebula background

### **Phase 5: Integration**
- [ ] Update `js/ui/ui-effects.js` - Connect to new 3D triggers
- [ ] Update `js/utils/cleanup.js` - Babylon disposal methods
- [ ] Test all interactions (timer → 3D effects)

### **Phase 6: Optimization**
- [ ] Profile WebGPU performance
- [ ] Add fallback to WebGL2 for unsupported browsers
- [ ] Final testing and polish

---

## 📊 **SUMMARY**

| Category | Files | Action |
|----------|-------|--------|
| **Full Rewrite** | 3 files | cosmic-scene-v2.js, blackhole-interstellar.js, cosmic-effects.js |
| **Partial Update** | 3 files | index.html, app.js, cleanup.js |
| **Minor Update** | 1 file | ui-effects.js |
| **No Changes** | 6 files | state.js, timer.js, tasks.js, sounds.js, navigation.js, notifications.js |
| **CSS (Keep)** | 5+ files | All CSS files |
| **Assets (Keep)** | 5 files | Sounds + favicon |

---

## 🔧 **TECHNOLOGY REFERENCES**

### Babylon.js Resources
- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [WebGPU Engine Setup](https://doc.babylonjs.com/setup/support/webGPU)
- [Compute Shaders](https://doc.babylonjs.com/features/featuresDeepDive/materials/shaders/computeShader)
- [Node Material Editor](https://nme.babylonjs.com/)
- [Particle Systems](https://doc.babylonjs.com/features/featuresDeepDive/particles/particle_system)

### WebGPU Resources
- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [WGSL Specification](https://www.w3.org/TR/WGSL/)

---

*Last Updated: January 12, 2026*
