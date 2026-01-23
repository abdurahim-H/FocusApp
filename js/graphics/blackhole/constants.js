// constants.js - Black Hole Physics Constants
// Shared constants used across all black hole modules

export const SCHWARZSCHILD_RADIUS = 6.0;
export const PHOTON_SPHERE_RADIUS = SCHWARZSCHILD_RADIUS * 1.5; // 1.5 Rs where photons orbit
export const ISCO_RADIUS = SCHWARZSCHILD_RADIUS * 3.0; // Innermost Stable Circular Orbit
export const DISK_OUTER_RADIUS = SCHWARZSCHILD_RADIUS * 8.0;
export const DISK_INNER_EDGE = ISCO_RADIUS;
