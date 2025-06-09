# Cosmic Focus

A stunning 3D productivity application featuring physics-accurate black hole visualizations and immersive cosmic environments that respond to your productivity patterns. Built with Babylon.js and modern web technologies.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://abdurahim-h.github.io/FocusApp/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/abdurahim-H/FocusApp)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## ✨ Features

- **🎯 Pomodoro Timer**: 25-minute focus sessions with cosmic visual feedback
- **📝 Task Management**: Create, complete, and track tasks with celebration effects
- **🕳️ 3D Black Hole**: Physics-accurate visualization with gravitational lensing
- **🎨 Visual Effects**: Dynamic animations that respond to productivity streaks
- **🎵 Ambient Sounds**: Multiple simultaneous soundscapes (rain, ocean, forest, cafe)
- **🧘 Meditation Mode**: Guided cosmic meditation with breathing exercises
- **🌙 Theme System**: Light, dark, and cosmos themes with auto-switching
- **📱 Mobile Responsive**: Optimized for desktop and mobile devices

## 🎮 Babylon.js 3D Engine

This application leverages **Babylon.js** for high-performance 3D graphics:

- **Advanced Shaders**: Custom GLSL shaders for realistic black hole effects
- **Particle Systems**: Millions of particles for cosmic dust and energy streams
- **Post-Processing**: Glow effects, depth of field, and gravitational lensing
- **Physics Simulation**: Realistic particle dynamics and gravitational effects
- **Performance Optimized**: Efficient memory management and resource tracking
- **WebGL 2.0**: Modern graphics pipeline for stunning visual fidelity

## 🚀 Quick Start

### Prerequisites
- Modern web browser with WebGL support
- Local web server (required for audio files)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/abdurahim-H/FocusApp.git
   cd FocusApp
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
3. **Meditation Mode**: Use guided breathing exercises and ambient sounds for relaxation
4. **Settings**: Customize timer durations, themes, and audio preferences

## 🏗️ Project Structure

```
FocusApp/
├── index.html              # Main HTML file
├── package.json            # Project configuration
├── LICENSE                 # MIT License
├── css/                    # Stylesheets
│   ├── style.css          # Core styles and layout
│   ├── themes.css         # Theme system
│   ├── components.css     # UI components
│   ├── responsive.css     # Mobile responsive styles
│   ├── cosmic-settings.css # Enhanced settings modal
│   ├── cosmic-meditation.css # Meditation mode styles
│   └── meditation-chamber.css # Meditation chamber UI
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
│   ├── meditation.js      # Meditation features
│   ├── cosmic-meditation.js # Advanced meditation mode
│   └── cleanup.js         # Resource management
├── sounds/                 # Audio assets
│   ├── rain_00.wav        # Rain ambient sound
│   ├── ocean_04.wav       # Ocean waves
│   ├── forest_00.wav      # Forest ambiance
│   └── crowd_0.wav        # Cafe ambiance
└── README.md              # This file
```

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **3D Graphics**: Babylon.js (WebGL)
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

### Meditation Features
Advanced meditation capabilities:
- Guided breathing exercises with visual cues
- Cosmic meditation chamber environment
- Customizable meditation timers
- Immersive 3D meditation experiences

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository: [https://github.com/abdurahim-H/FocusApp](https://github.com/abdurahim-H/FocusApp)
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Issues & Support

If you encounter any issues or have questions:
- Check the [Issues](https://github.com/abdurahim-H/FocusApp/issues) page
- Create a new issue if your problem isn't already reported
- Provide detailed information about your browser and the steps to reproduce the issue

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Babylon.js community for excellent 3D graphics library
- Web Audio API for seamless audio management
- Modern browser vendors for WebGL support
- Open source community for inspiration and tools

## 🌟 Star This Project

If you find Cosmic Focus helpful, please consider giving it a star on GitHub! ⭐

[⭐ Star on GitHub](https://github.com/abdurahim-H/FocusApp)

---

**Cosmic Focus** - Transform your productivity into a cosmic adventure! 🌌

Visit the live demo: [https://abdurahim-h.github.io/FocusApp/](https://abdurahim-h.github.io/FocusApp/)
