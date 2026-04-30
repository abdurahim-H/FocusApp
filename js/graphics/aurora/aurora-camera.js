// aurora-camera.js — theme-specific camera framing.
//
// The default cinematic camera was designed for the Black Hole theme:
// orbits the origin at radius 65, looking inward at a single object.
// That puts the eye AMONG the aurora geometry instead of looking out
// at a landscape — every plane reads as flat because the camera is
// right next to it.
//
// Aurora Plain wants the eye low to the ground, looking outward toward
// distant mountains and aurora. We don't replace the camera object
// (other code holds references to it) — we just override its alpha /
// beta / radius / target every frame so the computed eye position lands
// at (0, 5, 0) and the look direction sweeps slowly across the horizon.
//
// Math: ArcRotateCamera computes
//   position = target + r * (cos α sin β, cos β, sin α sin β)
// To pin position at (0, 5, 0) and look in direction (cos yaw, 0, sin yaw),
// set β = π/2 (horizontal), α = π + yaw, and target = (r cos yaw, 5, r sin yaw).

import { getCamera } from '../scene/scene-manager.js';

const stash = {
    alpha: null,
    beta: null,
    radius: null,
    target: null,
    fov: null,
    minZ: null,
    maxZ: null,
    lowerRadiusLimit: null,
    upperRadiusLimit: null,
    lowerBetaLimit: null,
    upperBetaLimit: null,
};

let active = false;

export function createAuroraCamera() {
    const cam = getCamera();
    if (!cam) return;

    // Stash original camera settings so dispose() restores them.
    stash.alpha = cam.alpha;
    stash.beta = cam.beta;
    stash.radius = cam.radius;
    stash.target = cam.target.clone();
    stash.fov = cam.fov;
    stash.minZ = cam.minZ;
    stash.maxZ = cam.maxZ;
    stash.lowerRadiusLimit = cam.lowerRadiusLimit;
    stash.upperRadiusLimit = cam.upperRadiusLimit;
    stash.lowerBetaLimit = cam.lowerBetaLimit;
    stash.upperBetaLimit = cam.upperBetaLimit;

    // Aurora-specific framing.
    cam.fov = 1.05; // ~60° — landscape feel, captures mountains + sky
    cam.minZ = 0.1;
    cam.maxZ = 8000; // distant mountains + sky dome

    // Loosen limits so our overrides aren't clamped.
    cam.lowerRadiusLimit = 0.001;
    cam.upperRadiusLimit = 5000;
    cam.lowerBetaLimit = 0.001;
    cam.upperBetaLimit = Math.PI - 0.001;

    active = true;
}

export function updateAuroraCamera(elapsed) {
    if (!active) return;
    const cam = getCamera();
    if (!cam) return;

    // Slow yaw — full revolution every ~5 minutes.
    const yaw = elapsed * 0.021;

    // Camera math: with α = π + yaw and β = π/2 - downTilt,
    //   eye = target + r * (cos(α)*sin(β), cos(β), sin(α)*sin(β))
    //   eye = target + r * (-cos(yaw)*sin(β), sin(downTilt), -sin(yaw)*sin(β))
    // To pin eye at (0, eyeY, 0) and tilt the look slightly down so
    // near-terrain is visible:
    //   target.y = eyeY - r * sin(downTilt)
    //   target.x =  r * cos(yaw) * sin(β)
    //   target.z =  r * sin(yaw) * sin(β)
    // Tiny downTilt (~3°) ensures the foreground terrain reads as 3D
    // rather than a flat horizon strip.
    const radius = 50;
    // Subtle nose-down so the foreground reads as ground we're standing
    // ON, but most of the frame is sky + aurora + mountains.
    const downTilt = 0.025; // ~1.4° — barely perceptible tilt
    const sinB = Math.cos(downTilt); // sin(π/2 - downTilt) = cos(downTilt)
    const eyeY = 5;

    cam.alpha = Math.PI + yaw;
    cam.beta = Math.PI / 2 - downTilt;
    cam.radius = radius;
    cam.target.set(
        radius * Math.cos(yaw) * sinB,
        eyeY - radius * Math.sin(downTilt),
        radius * Math.sin(yaw) * sinB
    );
}

export function disposeAuroraCamera() {
    if (!active) return;
    const cam = getCamera();
    if (!cam) return;

    cam.alpha = stash.alpha;
    cam.beta = stash.beta;
    cam.radius = stash.radius;
    if (stash.target) cam.target.copyFrom(stash.target);
    cam.fov = stash.fov;
    cam.minZ = stash.minZ;
    cam.maxZ = stash.maxZ;
    cam.lowerRadiusLimit = stash.lowerRadiusLimit;
    cam.upperRadiusLimit = stash.upperRadiusLimit;
    cam.lowerBetaLimit = stash.lowerBetaLimit;
    cam.upperBetaLimit = stash.upperBetaLimit;

    active = false;
}
