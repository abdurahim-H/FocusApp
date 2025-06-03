# API Reference

## Core Modules

### state.js - Application State Management

Central state management for the entire application.

#### Exports
- `state` - Main application state object
- `appState` - Alias for backward compatibility

#### State Structure
```javascript
{
    mode: 'home',                    // Current application mode
    currentMode: 'home',             // Current mode for effects
    timerState: 'stopped',           // Timer status
    timer: {
        minutes: 25,                 // Current minutes
        seconds: 0,                  // Current seconds
        isRunning: false,            // Timer active status
        interval: null,              // Timer interval ID
        isBreak: false,              // Break mode flag
        pomodoroCount: 0,            // Completed sessions
        settings: {
            focusDuration: 25,       // Focus session length
            shortBreak: 5,           // Short break length
            longBreak: 15            // Long break length
        }
    },
    universe: {
        stars: 0,                    // Earned stars
        level: 1,                    // Current level
        focusMinutes: 0,             // Total focus time
        tasksCompleted: 0            // Completed tasks count
    },
    tasks: [],                       // Task list array
    sounds: {
        active: null,                // Active sound name
        audio: null                  // Audio element reference
    }
}
```

---

### timer.js - Pomodoro Timer System

Handles all timer-related functionality including Pomodoro sessions and breaks.

#### Functions

##### `updateTimerDisplay()`
Updates the timer display in the UI.
- **Parameters**: None
- **Returns**: void

##### `startTimer()`
Starts the Pomodoro timer and triggers visual effects.
- **Parameters**: None
- **Returns**: void
- **Side Effects**: 
  - Updates UI buttons
  - Triggers black hole effects
  - Starts timer interval

##### `pauseTimer()`
Pauses the current timer session.
- **Parameters**: None
- **Returns**: void

##### `resetTimer()`
Resets the timer to initial state.
- **Parameters**: None
- **Returns**: void

##### `skipSession()`
Skips the current session (break only).
- **Parameters**: None
- **Returns**: void

##### `updateUniverseStats()`
Updates the universe progression display.
- **Parameters**: None
- **Returns**: void

##### `showAchievement(title, description)`
Displays an achievement notification.
- **Parameters**:
  - `title` (string): Achievement title
  - `description` (string): Achievement description
- **Returns**: void

---

### tasks.js - Task Management System

Manages task creation, completion, and UI rendering.

#### Functions

##### `addTask()`
Adds a new task from the input field.
- **Parameters**: None
- **Returns**: void
- **Side Effects**: Updates task list and re-renders UI

##### `toggleTask(id)`
Toggles task completion status and triggers effects.
- **Parameters**:
  - `id` (number): Task ID
- **Returns**: void
- **Side Effects**: 
  - Updates universe stats
  - Triggers completion effects
  - Shows achievement

##### `deleteTask(id)`
Removes a task from the list.
- **Parameters**:
  - `id` (number): Task ID
- **Returns**: void

##### `renderTasks()`
Renders the complete task list in the UI.
- **Parameters**: None
- **Returns**: void

---

### blackhole.js - 3D Black Hole System

Creates and manages the physics-accurate black hole visualization.

#### Functions

##### `createEnhancedBlackHole()`
Initializes the complete black hole system.
- **Parameters**: None
- **Returns**: void
- **Side Effects**: Adds black hole to 3D scene

##### `triggerFocusIntensification()`
Intensifies black hole effects during focus sessions.
- **Parameters**: None
- **Returns**: void

##### `triggerTaskCompletionBurst()`
Creates burst effect when tasks are completed.
- **Parameters**: None
- **Returns**: void

##### `updateBlackHoleUniforms()`
Updates shader uniforms based on application state.
- **Parameters**: None
- **Returns**: void

#### Black Hole Components
- **Event Horizon**: Central dark sphere with gravitational distortion
- **Accretion Disk**: Rotating matter disk with realistic physics
- **Energy Particles**: Dynamic particle system around the black hole
- **Gravitational Waves**: Ripple effects in space-time

---

### camera-effects.js - Cinematic Camera System

Manages camera movements and cinematic effects.

#### Functions

##### `triggerFocusZoom()`
Zooms camera toward black hole during focus start.
- **Parameters**: None
- **Returns**: void

##### `triggerSessionCompleteZoom()`
Camera celebration effect for session completion.
- **Parameters**: None
- **Returns**: void

##### `approachBlackHole()`
Dramatic camera approach during break mode.
- **Parameters**: None
- **Returns**: void

##### `triggerTaskCompletionShake()`
Subtle camera shake for task completion.
- **Parameters**: None
- **Returns**: void

##### `triggerTimeDilationEffect()`
Special camera effect for productivity streaks.
- **Parameters**: None
- **Returns**: void

---

### ui-effects.js - User Interface Effects

Manages UI animations and visual feedback.

#### Functions

##### `triggerFocusIntensity()`
Intensifies UI during focus sessions.
- **Parameters**: None
- **Returns**: void

##### `triggerSessionCompleteUI()`
UI celebration for session completion.
- **Parameters**: None
- **Returns**: void

##### `triggerTaskCompletionUI(element)`
Task completion visual feedback.
- **Parameters**:
  - `element` (HTMLElement): Task element to animate
- **Returns**: void

##### `triggerBlackHoleApproachUI()`
UI effects for black hole approach.
- **Parameters**: None
- **Returns**: void

##### `triggerTimeDilationUI()`
Time dilation UI effects.
- **Parameters**: None
- **Returns**: void

---

### sounds.js - Audio Management

Handles ambient sounds and audio effects.

#### Functions

##### `initSounds()`
Initializes the audio system.
- **Parameters**: None
- **Returns**: void

##### `playAmbientSound(soundName)`
Plays an ambient sound.
- **Parameters**:
  - `soundName` (string): Sound identifier ('rain', 'ocean', 'forest', 'space')
- **Returns**: void

##### `stopAmbientSound()`
Stops currently playing ambient sound.
- **Parameters**: None
- **Returns**: void

##### `setVolume(volume)`
Sets the audio volume.
- **Parameters**:
  - `volume` (number): Volume level (0-100)
- **Returns**: void

---

### navigation.js - Mode Management

Handles navigation between different application modes.

#### Functions

##### `initNavigation()`
Initializes navigation system and event listeners.
- **Parameters**: None
- **Returns**: void

##### `switchMode(mode)`
Switches to a different application mode.
- **Parameters**:
  - `mode` (string): Target mode ('home', 'focus', 'ambient')
- **Returns**: void

##### `updateNavButtons()`
Updates navigation button states.
- **Parameters**: None
- **Returns**: void

---

### settings.js - Settings Management

Manages application settings and persistence.

#### Functions

##### `loadSettings()`
Loads settings from localStorage.
- **Parameters**: None
- **Returns**: void

##### `saveSettings()`
Saves current settings to localStorage.
- **Parameters**: None
- **Returns**: void

##### `setupSettingsControls()`
Initializes settings UI controls.
- **Parameters**: None
- **Returns**: void

##### `setTheme(theme)`
Changes the application theme.
- **Parameters**:
  - `theme` (string): Theme name ('light', 'dark', 'auto')
- **Returns**: void

---

### cosmic-settings.js - Enhanced Settings Panel

Provides spectacular cosmic-themed settings interface.

#### Functions

##### `initCosmicSettings()`
Initializes the cosmic settings system.
- **Parameters**: None
- **Returns**: void

##### `setupCosmicSettingsModal()`
Sets up the enhanced settings modal with cosmic effects.
- **Parameters**: None
- **Returns**: void

##### `saveCosmicSettings()`
Saves settings with spectacular visual effects.
- **Parameters**: None
- **Returns**: void

---

### scene3d.js - 3D Scene Management

Sets up and manages the Three.js 3D scene.

#### Functions

##### `initScene()`
Initializes the Three.js scene, camera, and renderer.
- **Parameters**: None
- **Returns**: void

##### `setupLighting()`
Configures scene lighting.
- **Parameters**: None
- **Returns**: void

##### `startRenderLoop()`
Begins the animation render loop.
- **Parameters**: None
- **Returns**: void

##### `updateSceneBasedOnState()`
Updates 3D scene based on application state.
- **Parameters**: None
- **Returns**: void

#### Exports
- `scene` - Three.js scene object
- `camera` - Three.js camera object
- `renderer` - Three.js renderer object

---

### cleanup.js - Resource Management

Manages cleanup of intervals, animation frames, and Three.js resources.

#### Functions

##### `trackSetInterval(callback, delay)`
Tracked version of setInterval for automatic cleanup.
- **Parameters**:
  - `callback` (function): Function to execute
  - `delay` (number): Delay in milliseconds
- **Returns**: number - Interval ID

##### `trackRequestAnimationFrame(callback)`
Tracked version of requestAnimationFrame for automatic cleanup.
- **Parameters**:
  - `callback` (function): Animation callback
- **Returns**: number - Frame ID

##### `cleanupAll()`
Cleans up all tracked resources.
- **Parameters**: None
- **Returns**: void

---

## Event System

### Custom Events
The application uses custom events for loose coupling between modules:

- `timer:start` - Timer started
- `timer:pause` - Timer paused  
- `timer:complete` - Session completed
- `task:added` - New task added
- `task:completed` - Task marked complete
- `mode:changed` - Application mode changed
- `theme:changed` - Theme changed

### Event Usage
```javascript
// Dispatch custom event
document.dispatchEvent(new CustomEvent('timer:start', { 
    detail: { duration: 25 } 
}));

// Listen for custom event
document.addEventListener('timer:start', (event) => {
    console.log('Timer started with duration:', event.detail.duration);
});
```

---

## LocalStorage Schema

### Stored Settings
```javascript
{
    'fu_theme': 'auto',                    // Theme preference
    'fu_focusLength': 25,                  // Focus duration (minutes)
    'fu_soundVolume': 30,                  // Sound volume (0-100)
    'fu_greeting': 'Welcome to Your Universe!', // Custom greeting
    'fu_stats': {                          // User statistics
        totalFocusTime: 0,
        totalTasks: 0,
        currentStreak: 0
    }
}
```

---

## CSS Custom Properties

### Theme Variables
```css
:root {
    /* Colors */
    --bg-primary: #0a0a0a;
    --bg-secondary: #1a1a1a;
    --text-primary: #ffffff;
    --text-secondary: #cccccc;
    --accent-color: #6366f1;
    
    /* Glass Morphism */
    --bg-glass: rgba(255, 255, 255, 0.1);
    --border-glass: rgba(255, 255, 255, 0.2);
    
    /* Effects */
    --time-scale: 1;
    --redshift-intensity: 0;
    --particle-density: 1;
}
```

### Animation Variables
```css
:root {
    --animation-duration: 0.3s;
    --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
    --hover-scale: 1.05;
}
```
