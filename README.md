# Outerflow — Harboria Labs 3D Simulation & Experimental Engineering Studio

**Outerflow** is an interactive browser-based 3D prototyping, physics simulation, parametric CAD, mathematical design, and experimental engineering studio built for Harboria Labs.

## Capabilities

- **Rigid-Body & Mechanical Physics (`@dimforge/rapier3d-compat`):** Dynamic/fixed/kinematic bodies, revolute/prismatic/spherical/fixed/spring-damper joints, interactive motors, gravity presets (Earth, Moon, Mars, Zero-G), collider overlays, and motion recording/playback.
- **Parametric CAD & CSG Booleans:** Parametric blocks, hollow pipes, spur gears, bolted L-brackets, revolved nozzles, bored polygons, plus BSP-tree **Union / Subtract / Intersect** Boolean operations and one-click **Send to Physics World**.
- **Mathematical Design & Theoretical Systems (`mathjs`):**
  - Parametric surfaces `r(u, v)` (Möbius strip, Klein bottle, Enneper minimal surface, torus knot, seashell)
  - Animated explicit surfaces `z = f(x, y, t)`
  - Implicit iso-surfaces `F(x, y, z) = 0` via Marching Tetrahedra (Gyroid, Schwarz-P, metaballs)
  - 3D dynamical ODE attractors via RK4 (Lorenz, Rössler, Aizawa, Thomas, Halvorsen)
  - 3D vector fields with live advected flow tracers
- **Fields, Cloth & Fluids:** N-body / vortex / Lorentz particle fields, Verlet mass-spring cloth with wind & sphere collision, 3D SPH particle fluid tank, and 2D shallow-water wave PDE tank.
- **Programmable Experiments & Parameter Sweeps:** Built-in JavaScript `outerflow` scripting workbench, headless multi-trial Rapier3D parameter sweep runner, live telemetry charts, and **GLB / STL / OBJ / PNG / JSON / CSV** export.

## Development

```bash
npm install
npm run dev       # Starts Vite dev server at http://localhost:5173
npm run test      # Runs Vitest unit & physics sweep tests
npm run typecheck # Runs TypeScript strict check
npm run build     # Builds production bundle
```

## Workstation Location

- Canonical WSL workspace: `/home/ticket/workspaces/outerflow`
- Git repository: `/home/ticket/workspaces/outerflow/source`
- Non-canonical Windows scaffold: `C:\Workstation\04_Harboria_Labs\Outerflow`
