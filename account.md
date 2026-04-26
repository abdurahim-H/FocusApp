# Account Satellite — Visual Specification

A complete visual description of a new piece of UI chrome for Cosmic Focus: an **account trigger that hangs off the right edge of the existing Home/Focus nav pill**, connected to it by a delicate filament. Five variants are described — your friend picks the implementation; this doc only describes what it should *look like and feel like*.

---

## The setup

Today, the Home/Focus pill sits centred at the top of the viewport. We are extending its right side with two new elements:

```
   ┌──────────────────────────┐
   │  HOME  │  FOCUS          │ ────[ filament ]────●
   └──────────────────────────┘                    ▲
                                                satellite
```

These two new pieces — the **filament** (the connecting line) and the **satellite** (the circle) — are part of one composed object, visually tethered to the pill. The satellite is not an independent floating button somewhere else on the page. It hangs off the pill the way a charm hangs off a chain.

The whole rig — pill + filament + satellite — should read as **one centred unit**. When the user looks at the top of the page, they see a single horizontal object whose visual centre lines up with the centre of the screen. The pill itself shifts slightly to the left to accommodate this. The satellite is not an afterthought tacked on; it is a first-class member of the nav cluster.

---

## The satellite (the circle)

A perfect 40×40 pixel circle. **Perfect** is the operative word — in earlier iterations the circle came out elliptical because of layout pressure from its container; that is wrong. It must be a flawless geometric circle, jewel-cut.

The circle has a layered material quality, not a flat fill:

- **An engraved bezel ring** sits 2 pixels outside the core, like the metal ring around a watch face. It is a hairline gold (the same warm gold used elsewhere in Cosmic Focus, around `rgb(255, 205, 115)`), at low opacity. The bezel brightens subtly when the cursor approaches.
- **The core** is the actual surface. It has a deep dark base (near-black with warm undertones), a soft warm interior glow (as if there were a tiny ember inside the circle), and a small **specular highlight** in the upper-left quadrant — the kind of light catch you'd see on a polished obsidian gem. This makes the circle feel three-dimensional, not pasted on.
- **A soft outer halo** blooms outward from the circle as the cursor gets closer. At rest the halo is invisible. Within ~250 pixels of the cursor it fades in as a warm gold radial bloom about 10 pixels wide, peaking right around the circle's edge.
- **A subtle drop shadow** anchors the circle in space — about 6 pixels of falloff, very dark.

### Signed-out state

Inside the circle is a **simple person-outline glyph** in the feather-icon style: a 1.5px stroke, low opacity (about 78%) at rest, brightening with cursor proximity. The glyph is roughly 15 pixels — small relative to the circle, leaving generous breathing room on all sides. Just a head-and-shoulders silhouette, no detail.

The bezel and core borders are at moderate gold opacity. The whole thing reads as quiet, refined, available — but not loud.

### Signed-in state

The interior swaps entirely. The dark core is replaced with a **polished gold gradient**: warm light gold in the upper-left, deepening to a rich antique gold and finally to a deep amber-brown in the lower-right. This gives the same jewel-cut quality but in metal instead of obsidian. It looks like a signet — a personal mark.

In the centre of the gold core sits the user's **first initial**, set in a serif (Cormorant Garamond), single uppercase letter, ~18 pixels, in near-black with the faintest white text-shadow on top to suggest engraving. If the user has uploaded an avatar, the initial is replaced by that image, masked to the circle.

The bezel border becomes a brighter gold, and a faint outer gold glow sits around the whole circle — about 22 pixels of soft falloff. The signed-in satellite reads as **lit from within**, distinguishable at a glance from the signed-out version.

### Status dots (top-right corner of the circle)

A tiny 8×8 dot perched at roughly 1 o'clock on the circle's edge, set into the dark surrounding background with a small dark border so it reads as separate from the circle's gold rim:

- **Sync in flight** — gold, with a soft pulsing ring expanding outward from it every ~1.4 seconds, then fading. Not aggressive — it should feel like a heartbeat, not a notification badge.
- **Sync failed** — solid coral red, no animation. Clickable; clicking retries the sync.
- **Idle** — no dot at all.

### Hover behaviour

When the cursor enters the circle:
- The whole thing scales up to 106% over ~350ms with a smooth ease.
- The bezel ring and core border brighten further.
- The outer halo reaches its full intensity.
- A small **tooltip** fades in 14 pixels below the circle, centred on it.

The tooltip is a dark glass pill, ~110px wide, with two lines:
- **Top line** (Inter, ~11.5px, off-white): the user's name, or the word "Sign in".
- **Bottom line** (Cormorant Garamond italic, ~11px, dim off-white at ~45% opacity): a brief subtitle. Examples: "Abdurahim H." / "abduh@…com" when signed in. "Sign in" / "save your sky" when signed out.

The tooltip has a small triangular arrow pointing up at the circle, and a hairline gold border. It animates in from 2 pixels below its resting position and fades to full opacity over ~200ms.

---

## The filament (the connecting "rail")

This is **not a plain dash or line**. It is a futuristic engraved data-rail that physically tethers the satellite to the nav pill. It must have texture, depth, and a small motion that suggests data is flowing along it.

The filament has four layered concerns:

1. **A baseline thread** — a hairline (0.5px) horizontal line that runs the full length of the rail. It fades from completely transparent at the satellite end to full gold at the pill end — actually wait, it's the opposite: it brightens as it runs *away* from the pill. The pill end starts faint (around 0% opacity), brightens through ~12% of the length to 35%, and reaches its brightest point (around 70% gold) just before it meets the satellite. This direction tells the eye "energy flows from the nav into the satellite."

2. **Dashed micro-fiducials stitched along the baseline** — tiny dashes about 3 pixels long with 2 pixel gaps, like the engraved tick marks on a sextant or a precision instrument. They run the full length of the rail. They share the brightening gradient of the baseline.

3. **A jewel rivet at the pill end** — a small gold bead, about 5 pixels in diameter, sitting exactly where the rail meets the right edge of the nav pill. It has its own small specular highlight (upper-left), a warm gold radial fill, and a 6-pixel halo around it. It looks like the rail is bolted to the pill with a tiny gemstone fastener. This rivet **does not appear on the satellite end** — that end fades into the circle's outer bezel.

4. **A travelling energy pulse** — every ~3.4 seconds, a small bright streak (~14 pixels long, 1.5 pixels tall) travels left-to-right along the rail. It enters faintly from the rivet end, brightens to full intensity (warm white-gold core with a 6-pixel halo), travels the full length, and fades out as it reaches the satellite. The motion uses an easing curve so it accelerates slightly through the middle. It feels like a packet of light being delivered from the nav to the account.

The default rail is roughly **32 pixels long**. Variants change this length and the intensity of these layers.

What the user should perceive: a delicate piece of engineered jewellery — a precision rail with engraved markings, a glowing rivet anchor, and small bursts of light running along it.

---

## The five variants

Each variant changes the visual character of the rail and the ornamentation around the satellite. The base structure (perfect circle, jewel core, bezel, halo, status dots, tooltip) stays the same throughout. Variants are tuning, not rebuilds.

### Variant A — **Orbit**

> *On-brand for Cosmic Focus: the satellite literally becomes a celestial body.*

Two faint circular rings rotate slowly around the satellite, like orbital paths.
- **Inner ring** sits 7 pixels outside the satellite's edge, dashed gold, low opacity (~22%), rotating clockwise once every 22 seconds. A tiny 3-pixel gold pip sits on top of the ring, glowing softly — it travels with the ring.
- **Outer ring** sits 13 pixels outside the satellite, even fainter (~10% opacity), solid (not dashed), rotating counter-clockwise once every 38 seconds. It also has a small pip.

The two rings move at different speeds and opposite directions, creating a gentle, mesmerising parallax. The pips are small enough that they read as planets in motion, not decorative dots.

The rail itself is slightly longer than default (~36 pixels) but otherwise unchanged.

**Mood:** alive, cosmic, in motion. Best fit for the Cosmic Focus metaphor.

### Variant B — **Pendant**

> *The most "expensive" variant. Quiet luxury, deep jewellery feel.*

The rail is shorter (~28 pixels) but *thicker*. The travelling energy pulse is doubled in intensity — it has a 2-pixel-tall body and a 16-pixel halo, and reads more like a lit filament inside a glass tube than a moving spark.

The satellite is **slightly larger** (42×42 instead of 40×40). The core has a more pronounced specular highlight in the upper-left and a deeper warm interior glow — the obsidian feels more polished, almost wet. The signed-in gold version glows more strongly: a 28-pixel outer bloom and a 40-pixel ambient halo make it look like a piece of jewellery lit from underneath.

No additional ornaments — Pendant is purely a tonal upgrade. Everything is just *richer*.

**Mood:** premium, weighty, jewel-like. The "expensive watch" of the set.

### Variant C — **Comet**

> *The most kinetic. Suggests state actively flowing in.*

The rail is the longest of any variant (~42 pixels). The travelling pulse becomes a proper **comet streak**: ~18 pixels long, with a bright white-hot leading tip and a tapering gold tail, and a halo that reaches 20 pixels around it. It travels every ~2.6 seconds (faster than default).

The streak is bright enough to be the dominant element of the rig at rest — your eye catches the motion before it registers the satellite. This makes the variant feel "live" — perfect for representing data sync or activity.

The satellite itself is unchanged.

**Mood:** active, alive, kinetic. Best for moments when you want the user to feel the system is doing something.

### Variant D — **Celestial**

> *The most ornate. Reads like an astronomical instrument.*

The rail's dashed fiducials become **denser and more pronounced** — instead of tiny stitches every 3 pixels, they become clear engraved ticks every 4 pixels at a much higher contrast. The rail is also slightly longer (~40 pixels). It looks like a measurement scale on a sextant or a star-chart calliper.

Around the satellite, faint **sun rays** emerge — five soft gold wedges arranged at irregular intervals (12°, 70°, 130°, 220°, 312°) around the circle, each only 2 degrees wide and at very low opacity (~18%). They are masked so they only appear in a thin ring 18–24 pixels out from the satellite — a halo of beams, not a full sunburst. The whole ray system rotates *very* slowly: one full revolution every 60 seconds, almost imperceptible.

**Mood:** instrumented, scientific, ornate. The most "designed" variant — feels like UI for an observatory.

### Variant E — **Thread**

> *The most restrained. Quiet luxury through subtraction.*

The rail is reduced to its absolute essentials: just the 0.5px hairline thread, no fiducial ticks, no travelling pulse, no jewel rivet. Length is moderate (~30 pixels). It's a single silk-thin gold line.

The satellite is **slightly smaller** (34×34 instead of 40×40). The core's warm interior glow is reduced — barely any specular highlight, just a hint of ember. It reads as more of a button and less of a jewel.

This is the variant to pick if anything else feels too loud. It's the "minimum viable account chrome" — but executed at a high finish.

**Mood:** quiet, deferential, present-but-not-shouting. Great for users who run the app in long focus sessions and don't want any motion or ornament near the centre of their attention.

---

## Colour palette

Everything in this rig uses one warm gold accent and one near-black background:

- **Gold** — `rgb(255, 205, 115)`. Used at every opacity from 10% (hairline borders) to 100% (the brightest point of the energy pulse). This is the existing Cosmic Focus accent gold; do not introduce a new colour.
- **Off-white ink** — `#faf3e3`, used only inside the tooltip text.
- **Background** — `#07060c` for the tooltip panel and the deepest parts of the satellite core.
- **Coral red** — used only for the sync-error dot.

Everything else is gold-on-black at varying transparency. The richness comes from layering, not from new hues.

---

## Interactions at a glance

| What happens | What the user sees |
|---|---|
| Cursor approaches the satellite | The whole circle wakes up: bezel brightens, halo blooms, glyph sharpens. Effect scales smoothly from 0 at ~250px away to full at the circle's edge. |
| Cursor enters the satellite | Circle scales up to 106%; tooltip fades in below. |
| Click | Account dropdown anchored below the satellite (existing component — not redesigned here). |
| Sync starts | Pulsing gold dot appears at 1 o'clock on the circle. |
| Sync fails | Dot turns to solid coral red. Clickable for retry. |
| Sign in | Circle interior swaps from dark obsidian + person-icon to gold gradient + initial. Brief soft glow expansion as it swaps. |
| Sign out | Reverse: gold core fades back to dark, initial is replaced by the person-icon. |

---

## Accessibility notes (visual)

- The satellite must show a clear focus ring when reached by keyboard — a 2px gold outline 4 pixels outside the bezel. This ring should not be confused with the proximity halo; it is sharp, not bloomed.
- Honour reduced-motion preferences: the rail's travelling pulse, the orbit ring rotation, the comet streak, and the celestial ray rotation should all freeze. The proximity glow on hover can stay (it's input-driven, not autonomous).

---

## Recommendation

If your friend can only build one variant: build **Pendant**. It carries the most visual weight without adding moving parts to the user's peripheral vision, and the deeper jewel-quality of the satellite holds up beautifully both signed-out and signed-in. It also pairs best with the rest of the existing chrome (the settings star, the cosmos toolbar) — they all share the same "polished gold object on dark glass" register.

**Orbit** is the most thematically on-brand and is the right pick if you want the trigger to feel alive.

**Thread** is the safest pick if you ever feel like the chrome is competing with the cosmos — keep it as a fallback for distraction-sensitive contexts (e.g. mid-focus-session).

Avoid building **Comet** as the default; it's eye-catching but stealing focus is the opposite of what Cosmic Focus is about. **Celestial** is gorgeous but the most labour-intensive to get right — only ship it if your friend has time to fine-tune the ray geometry.

That's everything. The whole rig is a small object — ~85 pixels wide and 40 tall — but it's doing a lot of careful visual work. Tell your friend to fight for the perfect circle, the engraved rail, and the jewel rivet at the pill end. Those three details are what take this from "an avatar button next to the nav" to "a piece of designed jewellery hanging off the chrome."
