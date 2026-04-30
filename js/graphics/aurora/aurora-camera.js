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
import { getBloomThreshold, setBloomThreshold } from '../postprocessing/pipeline.js';

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
    bloomThreshold: null,
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

    // Aurora-specific framing. Wide cinematic FOV (~80°) gives the
    // curtains and mountains a vast-landscape feel matching the
    // reference. Goes wider than Black Hole's 0.9 rad on purpose —
    // the aurora is meant to fill the upper half of frame.
    cam.fov = 1.4;
    cam.minZ = 0.1;
    cam.maxZ = 8000;

    // Loosen limits so our overrides aren't clamped.
    cam.lowerRadiusLimit = 0.001;
    cam.upperRadiusLimit = 5000;
    cam.lowerBetaLimit = 0.001;
    cam.upperBetaLimit = Math.PI - 0.001;

    // Aurora curtains are the primary glowing element — they
    // already render with additive blend, so the default bloom
    // threshold (0.65) catches every overlapping ribbon pixel and
    // smears it into white. Raise the threshold so only the
    // brightest streak peaks bloom; the body of the curtain glows
    // from the additive blend itself, no bloom needed.
    //
    // setupPostProcessing() runs AFTER the theme registry's
    // activateTheme() at boot, so the pipeline doesn't exist yet
    // when this init runs from init3D(). Defer the threshold tweak
    // to next-frame so by the time it lands, the pipeline is up.
    // (At runtime theme switches the pipeline already exists, so
    // requestAnimationFrame still works there too — just an extra
    // frame's delay before the threshold lifts.)
    stash.bloomThreshold = getBloomThreshold();
    requestAnimationFrame(() => {
        if (active) setBloomThreshold(0.95);
    });

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
    // Modest downward tilt — horizon lands a touch above mid-frame,
    // aurora fills the upper half, mountains and reflective ice
    // ground share the lower half. Matches the postcard composition
    // of the reference.
    const downTilt = 0.04;
    const sinB = Math.cos(downTilt);
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
    if (stash.bloomThreshold != null) setBloomThreshold(stash.bloomThreshold);

    active = false;
}
