# Cosmic Focus

A stunning 3D productivity application featuring physics-accurate black hole visualizations and immersive cosmic environments that respond to your productivity patterns. Built with Three.js and modern web technologies.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://your-demo-url.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## ✨ Features

- **🎯 Pomodoro Timer**: 25-minute focus sessions with cosmic visual feedback
- **📝 Task Management**: Create, complete, and track tasks with celebration effects
- **🕳️ 3D Black Hole**: Physics-accurate visualization with gravitational lensing
- **🎨 Visual Effects**: Dynamic animations that respond to productivity streaks
- **🎵 Ambient Sounds**: Multiple simultaneous soundscapes (rain, ocean, forest, cafe)
- **🌙 Theme System**: Light, dark, and cosmos themes with auto-switching
- **📱 Mobile Responsive**: Optimized for desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- Modern web browser with WebGL support
- Local web server (required for audio files)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/cosmic-focus.git
   cd cosmic-focus
   ```

2. **Start a local server**:
   ```bash
   # Using Python
   python3 -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**:
   ```
   http://localhost:8000
   ```

## 🎮 Usage

1. **Focus Mode**: Start a 25-minute focus session and watch the black hole respond to your productivity
2. **Task Management**: Add tasks to track your progress and trigger visual celebrations
3. **Ambient Mode**: Use breathing exercises and ambient sounds for relaxation
4. **Settings**: Customize timer durations, themes, and audio preferences

## 🏗️ Project Structure

```
cosmic-focus/
├── index.html              # Main HTML file
├── css/                    # Stylesheets
│   ├── style.css          # Core styles and layout
│   ├── themes.css         # Theme system
│   ├── components.css     # UI components
│   ├── responsive.css     # Mobile responsive styles
│   └── cosmic-settings.css # Enhanced settings modal
├── js/                     # JavaScript modules
│   ├── app.js             # Application entry point
│   ├── state.js           # Centralized state management
│   ├── scene3d.js         # 3D scene initialization
│   ├── blackhole.js       # Black hole physics and shaders
│   ├── camera-effects.js  # Camera animations
│   ├── ui-effects.js      # UI visual effects
│   ├── galaxy.js          # Star field and space objects
│   ├── timer.js           # Pomodoro timer logic
│   ├── tasks.js           # Task management
│   ├── sounds.js          # Audio system
│   ├── settings.js        # Settings management
│   ├── cosmic-settings.js # Enhanced settings UI
│   ├── navigation.js      # Mode switching
│   └── cleanup.js         # Resource management
├── sounds/                 # Audio assets
│   ├── rain_00.wav
│   ├── ocean_04.wav
│   ├── forest_00.wav
│   └── crowd_0.wav        # Cafe ambiance
└── README.md

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **3D Graphics**: Three.js (WebGL)
- **Audio**: Web Audio API
- **Storage**: localStorage
- **Build Tools**: None (vanilla JavaScript for simplicity)

## 🎨 Key Features Explained

### Black Hole Physics
The centerpiece 3D black hole features:
- Realistic gravitational lensing effects
- Accretion disk with heat-based coloring
- Particle systems that respond to productivity
- Smooth camera movements and focus effects

### Audio System
Multi-layered ambient audio with:
- Pre-loaded buffers for instant playback
- Simultaneous multiple sound support
- Seamless looping without gaps
- Volume controls affecting all active sounds

### Theme System
Comprehensive theming including:
- Light, dark, and cosmic color schemes
- Auto theme switching based on time
- Smooth transitions between themes
- Consistent styling across all components

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Three.js community for excellent 3D graphics library
- Web Audio API for seamless audio management
- Modern browser vendors for WebGL support

---

**Cosmic Focus** - Transform your productivity into a cosmic adventure! 🌌
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
