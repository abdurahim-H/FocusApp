# Cosmic Focus - 3D Productivity Universe

## Overview

Cosmic Focus is a stunning 3D productivity application featuring physics-accurate black hole visualizations with dramatic visual effects that respond to user productivity. Built with Three.js and modern web technologies, it transforms the traditional Pomodoro technique into an immersive cosmic experience.

## 🌟 Features

### Core Functionality
- **Pomodoro Timer**: 25-minute focus sessions with 5-minute breaks
- **Task Management**: Add, complete, and track tasks with visual celebrations
- **3D Black Hole**: Physics-accurate visualization that responds to productivity
- **Ambient Sounds**: Space, rain, ocean, and forest soundscapes
- **Theme System**: Light, dark, and auto themes with smooth transitions
- **Cosmic Settings**: Enhanced settings panel with particle effects

### Visual Effects
- **Black Hole Physics**: Realistic gravitational lensing and accretion disk
- **Camera Effects**: Cinematic zooms and focus transitions
- **Particle Systems**: Dynamic particle effects throughout the interface
- **UI Animations**: Smooth transitions and cosmic-themed interactions
- **Time Dilation**: Visual effects that respond to productivity streaks

## 📁 Project Structure

```
cosmic-focus/
├── index.html              # Main HTML structure
├── README.md               # Project overview
├── DOCUMENTATION.md        # This file
├── css/
│   ├── style.css           # Base styles and layout
│   ├── themes.css          # Theme system (light/dark/auto)
│   ├── components.css      # UI component styles
│   ├── cosmic-settings.css # Enhanced settings panel styles
│   └── responsive.css      # Mobile responsive design
└── js/
    ├── app.js              # Main application initialization
    ├── state.js            # Centralized state management
    ├── scene3d.js          # 3D scene setup and management
    ├── blackhole.js        # Black hole physics and effects
    ├── camera-effects.js   # Cinematic camera animations
    ├── timer.js            # Pomodoro timer functionality
    ├── tasks.js            # Task management system
    ├── sounds.js           # Ambient sound management
    ├── navigation.js       # Mode switching and navigation
    ├── settings.js         # Settings persistence and management
    ├── cosmic-settings.js  # Enhanced cosmic settings panel
    ├── ui-effects.js       # UI animation and effect system
    ├── galaxy.js           # Galaxy background effects
    └── cleanup.js          # Resource management and cleanup
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Local web server (for development)

### Installation
1. Clone or download the project
2. Serve the files using a local web server
3. Open `index.html` in your browser

### Development Server
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

## 🎮 Usage

### Navigation
- **Home**: Welcome screen with current time and greeting
- **Focus**: Pomodoro timer with task management
- **Ambient**: Breathing exercises and ambient sounds

### Focus Mode
1. **Start Timer**: Click "Start Focus" to begin a 25-minute session
2. **Add Tasks**: Use the task input to add items to your todo list
3. **Complete Tasks**: Check off tasks to trigger cosmic celebrations
4. **Take Breaks**: Automatic break notifications after focus sessions

### Settings
- **Theme**: Choose between light, dark, or auto themes
- **Focus Duration**: Customize session length (default: 25 minutes)
- **Sound Volume**: Adjust ambient sound levels
- **Greeting**: Personalize your welcome message

## 🏗️ Architecture

### State Management
The application uses a centralized state object (`state.js`) that manages:
- Timer state and settings
- Task list and completion status
- Universe progression (stars, level, focus time)
- Sound preferences
- Current mode and theme

### Module System
Each feature is organized into ES6 modules with clear responsibilities:
- **Core Modules**: Handle fundamental functionality
- **Effect Modules**: Manage visual and audio effects
- **UI Modules**: Handle user interface interactions

### 3D Rendering
- **Three.js**: WebGL-based 3D rendering
- **Shader Materials**: Custom shaders for black hole effects
- **Particle Systems**: Dynamic particle generation and animation
- **Camera Controls**: Smooth camera movements and transitions

## 🎨 Themes

### Theme System
- **Light Theme**: Clean, bright interface for daytime use
- **Dark Theme**: Rich, cosmic interface for low-light environments
- **Auto Theme**: Automatically switches based on system preferences

### CSS Variables
All themes use CSS custom properties for consistent styling:
```css
:root {
  --bg-primary: /* Background color */
  --text-primary: /* Primary text color */
  --accent-color: /* Accent color for highlights */
  --glass-bg: /* Glass morphism backgrounds */
}
```

## ⚡ Performance

### Optimization Strategies
- **Resource Cleanup**: Automatic cleanup of intervals and animation frames
- **Efficient Rendering**: Optimized 3D scene updates
- **Lazy Loading**: Modules loaded as needed
- **Memory Management**: Proper disposal of Three.js objects

### Browser Compatibility
- **Modern Browsers**: Chrome 60+, Firefox 60+, Safari 12+, Edge 79+
- **WebGL Support**: Required for 3D effects
- **ES6 Modules**: Native module support required

## 🛠️ Development

### Adding New Features
1. Create a new module in the `js/` directory
2. Import required dependencies
3. Export public functions
4. Import and initialize in `app.js`

### Modifying Visual Effects
- **Black Hole**: Edit `blackhole.js` for physics and rendering
- **Camera**: Modify `camera-effects.js` for cinematic movements
- **UI Effects**: Update `ui-effects.js` for interface animations

### Customizing Themes
1. Add new theme variables to `themes.css`
2. Update theme switching logic in `settings.js`
3. Test across all components

## 🔧 Configuration

### Timer Settings
```javascript
// Default timer configuration
timer: {
    settings: {
        focusDuration: 25,    // Focus session length (minutes)
        shortBreak: 5,        // Short break length (minutes)
        longBreak: 15         // Long break length (minutes)
    }
}
```

### Visual Effects
```javascript
// Black hole configuration
const blackHoleConfig = {
    radius: 3,              // Event horizon radius
    intensity: 1.0,         // Effect intensity
    particleCount: 1000     // Particle system density
};
```

## 🐛 Troubleshooting

### Common Issues
1. **3D Scene Not Loading**: Check WebGL support and console errors
2. **Performance Issues**: Reduce particle counts in `blackhole.js`
3. **Sound Not Playing**: Check browser autoplay policies
4. **Theme Not Switching**: Clear localStorage and refresh

### Debug Mode
Enable console logging by setting:
```javascript
window.DEBUG = true;
```

## 🤝 Contributing

### Code Style
- Use ES6+ features and modules
- Follow consistent naming conventions
- Add comments for complex algorithms
- Test across different browsers

### Pull Request Guidelines
1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request with clear description

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Three.js**: 3D graphics library
- **Modern Web APIs**: LocalStorage, RequestAnimationFrame, etc.
- **CSS Grid & Flexbox**: Layout systems
- **WebGL**: Hardware-accelerated graphics

---

**Built with ❤️ for productivity and cosmic wonder**
