# Productivity Spaceship

A 3D cosmic productivity application featuring immersive space environments and visual effects that respond to your work patterns.

## Features

- **Pomodoro Timer**: Focus sessions with cosmic visual feedback
- **Task Management**: Create, complete, and track your tasks
- **3D Space Environment**: Interactive galaxy with black hole physics
- **Visual Effects**: Responsive animations based on productivity
- **Theme System**: Light, dark, and auto themes
- **Ambient Sounds**: Space-themed background audio
- **Mobile Responsive**: Works on desktop and mobile devices

## Quick Start

1. **Local Development**:
   ```bash
   python3 -m http.server 3000
   # Open http://localhost:3000
   ```

2. **Usage**:
   - Start a focus session to see immersive effects
   - Add and complete tasks for visual celebrations
   - Adjust settings for personalized experience
   - Switch between Home, Focus, and Ambient modes

## Project Structure

```
productivity-spaceship/
├── index.html              # Main application
├── css/                    # Stylesheets
│   ├── style.css          # Base styles
│   ├── themes.css         # Theme system
│   ├── components.css     # UI components
│   ├── responsive.css     # Mobile styles
│   └── cosmic-settings.css # Settings modal
├── js/                     # JavaScript modules
│   ├── app.js             # Application entry point
│   ├── state.js           # State management
│   ├── scene3d.js         # 3D scene setup
│   ├── blackhole.js       # Black hole physics
│   ├── camera-effects.js  # Camera animations
│   ├── ui-effects.js      # UI visual effects
│   ├── galaxy.js          # Space objects
│   ├── timer.js           # Pomodoro timer
│   ├── tasks.js           # Task management
│   ├── sounds.js          # Audio controls
│   ├── cosmic-settings.js # Settings management
│   ├── navigation.js      # Mode switching
│   ├── utils.js           # Utility functions
│   └── themes.js          # Theme switching
├── DOCUMENTATION.md        # Detailed project documentation
├── API.md                 # API reference
└── DEVELOPMENT.md         # Development guidelines
```

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **3D Graphics**: Three.js for WebGL rendering
- **Physics**: Custom black hole and particle systems
- **Architecture**: Modular ES6 modules
- **Responsive**: Mobile-first CSS design

## Browser Requirements

- Modern browser with WebGL support
- ES6 module support
- Web Audio API (for sounds)
- Local storage (for settings)

## Documentation

- **[DOCUMENTATION.md](DOCUMENTATION.md)**: Complete project overview and user guide
- **[API.md](API.md)**: Detailed API reference for all modules
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: Development setup and contribution guidelines

## License

This project is open source and available under the MIT License.
