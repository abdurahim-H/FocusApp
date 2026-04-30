// theme-registry.js
//
// Theme = a description of which scene modules should be live and what
// palette / post-fx tweaks apply on top. The registry is the single
// source of truth for "what does theme X look like" — scene-manager.js
// calls `getTheme(id)` to find the right one and walks its `modules`
// list to bring it up.
//
// Each module is an object with:
//   { id, init(ctx), dispose(), update?(elapsed, dt) }
//
// `init` receives the shared ctx { scene, camera, deviceProfile,
// blackholeMesh? } and may stash any handles it needs for dispose /
// update later. The blackhole module is special — its mesh is read
// back into ctx because sound-bodies orbits around it.
//
// Today: ONE theme registered (Black Hole) — the existing scene
// hard-coded into scene-manager. Adding more themes is a matter of
// adding new module bundles + palette overrides here. The runtime
// `setTheme(id)` infrastructure exists for the future swap; not used
// from any UI surface yet.

import { createBlackHole, disposeBlackHole, updateBlackHole } from '../blackhole/blackhole.js';
import {
    createCosmicMotes,
    disposeCosmicMotes,
    updateCosmicMotes,
} from '../environment/cosmic-motes.js';
import {
    createCosmicSkybox,
    disposeCosmicSkybox,
    updateCosmicSkybox,
} from '../environment/cosmic-skybox.js';
import {
    createEtherealPetals,
    disposeEtherealPetals,
    updateEtherealPetals,
} from '../environment/ethereal-petals.js';
import { createNebula, disposeNebula, updateNebula } from '../environment/nebula.js';
import {
    createShootingStars,
    disposeShootingStars,
    updateShootingStars,
} from '../environment/shooting-stars.js';
import { createStarGlows, disposeStarGlows, updateStarGlows } from '../environment/star-glows.js';
import { createStarField, disposeStarField, updateStarField } from '../environment/starfield.js';

/** Each named module wraps its raw create / update / dispose triple
 *  in the standard registry shape. ctx is passed through to create()
 *  in case the module needs scene / camera / device profile / mesh
 *  handles. */
const MODULES = {
    skybox: {
        id: 'skybox',
        init(ctx) {
            createCosmicSkybox(ctx.scene);
        },
        update(elapsed) {
            updateCosmicSkybox?.(elapsed);
        },
        dispose() {
            disposeCosmicSkybox?.();
        },
    },
    starfield: {
        id: 'starfield',
        init(ctx) {
            createStarField(ctx.scene, ctx.camera, ctx.deviceProfile?.starMultiplier ?? 1);
        },
        update(elapsed) {
            updateStarField?.(elapsed);
        },
        dispose() {
            disposeStarField?.();
        },
    },
    nebula: {
        id: 'nebula',
        init(ctx) {
            createNebula(ctx.scene, ctx.camera, ctx.deviceProfile?.shaderOctaves ?? 4);
        },
        update(elapsed) {
            updateNebula?.(elapsed);
        },
        dispose() {
            disposeNebula?.();
        },
    },
    shootingStars: {
        id: 'shootingStars',
        init(ctx) {
            createShootingStars(ctx.scene);
        },
        update(elapsed) {
            updateShootingStars?.(elapsed);
        },
        dispose() {
            disposeShootingStars?.();
        },
    },
    starGlows: {
        id: 'starGlows',
        init(ctx) {
            createStarGlows(ctx.scene, ctx.camera);
        },
        update(elapsed) {
            updateStarGlows?.(elapsed);
        },
        dispose() {
            disposeStarGlows?.();
        },
    },
    blackhole: {
        id: 'blackhole',
        init(ctx) {
            ctx.blackholeMesh = createBlackHole(ctx.scene, ctx.camera);
        },
        update(elapsed) {
            updateBlackHole?.(elapsed);
        },
        dispose() {
            disposeBlackHole?.();
        },
    },
    motes: {
        id: 'motes',
        init(ctx) {
            createCosmicMotes(ctx.scene);
        },
        update(elapsed) {
            updateCosmicMotes?.(elapsed);
        },
        dispose() {
            disposeCosmicMotes?.();
        },
    },
    petals: {
        id: 'petals',
        init(ctx) {
            createEtherealPetals(ctx.scene);
        },
        update(elapsed) {
            updateEtherealPetals?.(elapsed);
        },
        dispose() {
            disposeEtherealPetals?.();
        },
    },
};

// ───────────────────────────────────────────────────────────────────────
// Theme catalog. Adding a theme = a new entry here.
// ───────────────────────────────────────────────────────────────────────

export const THEMES = [
    {
        id: 'blackhole',
        label: 'Black Hole',
        // The original Cosmic Focus scene. All eight modules in their
        // historical order — order matters because rendering groups
        // (set in scene-manager) layer skybox → starfield → blackhole.
        modules: [
            MODULES.skybox,
            MODULES.starfield,
            MODULES.nebula,
            MODULES.shootingStars,
            MODULES.starGlows,
            MODULES.blackhole,
            MODULES.motes,
            MODULES.petals,
        ],
        // Palette is purely informational today — it doesn't drive
        // shader uniforms yet. Reserved for the time-of-day / seasonal
        // / weather modifier work in 4.10 / 4.11 / 4.12.
        palette: {
            primary: [255, 220, 160],
            secondary: [180, 144, 232],
            accentWarm: [255, 205, 115],
            accentCool: [144, 232, 200],
        },
    },
];

/** Return a theme by id, falling back to the first registered theme
 *  if the id is unknown (so a stale settings entry can't black-screen
 *  the scene). Logs a warning when falling back so a typo or removed
 *  theme is debuggable instead of silent. */
export function getTheme(id) {
    const found = THEMES.find((t) => t.id === id);
    if (found) return found;
    if (id) {
        console.warn(`[theme-registry] unknown theme id "${id}", falling back to "${THEMES[0].id}"`);
    }
    return THEMES[0];
}

/** Bring up every module in the theme's list. Returns the same ctx
 *  with any module-set handles attached. */
export function activateTheme(theme, ctx) {
    for (const mod of theme.modules) {
        try {
            mod.init(ctx);
        } catch (e) {
            console.error(`[theme-registry] failed to init module ${mod.id}:`, e);
        }
    }
    return ctx;
}

/** Run every module's update hook (if any). Called once per frame. */
export function updateActiveTheme(theme, elapsed, dt) {
    for (const mod of theme.modules) {
        try {
            mod.update?.(elapsed, dt);
        } catch (e) {
            console.error(`[theme-registry] update failed for module ${mod.id}:`, e);
        }
    }
}

/** Dispose every module in the theme's list. Inverted order so any
 *  late-registered module sees its dependencies still alive when its
 *  own dispose runs. */
export function deactivateTheme(theme) {
    for (let i = theme.modules.length - 1; i >= 0; i--) {
        try {
            theme.modules[i].dispose?.();
        } catch (e) {
            console.error(`[theme-registry] dispose failed for module ${theme.modules[i].id}:`, e);
        }
    }
}
