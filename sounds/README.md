# Ambient Sounds

This folder contains the ambient sound files for the Cosmic Focus app.

## Required Files:

- `rain.wav` - Rain/thunderstorm ambient sound ✅ (already present)
- `ocean.wav` - Ocean waves ambient sound 
- `forest.wav` - Forest/nature ambient sound
- `cafe.wav` - Cafe/coffee shop ambient sound

## Audio Specifications:

For best seamless looping experience:
- **Format**: WAV (preferred) or OGG
- **Duration**: 10-60 seconds (20-30s recommended)
- **Sample Rate**: 44.1kHz or 48kHz
- **Bit Depth**: 16-bit minimum
- **Loop Points**: Smooth crossfade at start/end

## File Size Guidelines:

- WAV files: ~1-5MB per file
- OGG files: ~200KB-1MB per file (compressed)

## Adding New Sounds:

1. Place audio files in this directory
2. Update the `ambientSounds` object in `/js/sounds.js`
3. Add corresponding button in `/index.html`
4. Update event listeners in `/js/sounds.js`

All files in this directory will automatically use the Web Audio API for seamless looping.
