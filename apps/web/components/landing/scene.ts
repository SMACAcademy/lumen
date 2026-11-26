import * as THREE from "three";
import { CAMERA_END_Z, CAMERA_START_Z, lateralScale, WORLD_OBJECTS, type WorldObject, type WorldObjectKind } from "./objects";

/**
 * The science world, drawn with three.js. It is loaded on demand (the landing
 * page imports this module dynamically), so three.js never weighs on the app
 * itself. Everything here is decoration: the page is complete without it.
 */

export interface ScenePalette {
  maths: string;
  physics: string;
  chemistry: string;
  ink: string;
  muted: string;
  bg: string;
}

export interface SceneOptions {
  palette: ScenePalette;
  /** Hold every object still; the camera still goes where it is told. */
  still: boolean;
}

export interface ScienceScene {
  resize(width: number, height: number): void;
  /** Where the camera should be heading; it glides there unless `still`. */
  setCameraZ(z: number): void;
  /** Pointer position, −1..1 on each axis, for a little parallax. */
  setPointer(x: number, y: number): void;
  /** Advance and draw one frame. `time` is in milliseconds. */
  frame(time: number): void;
  /** Place one DOM label per object over its object, fading with distance. */
  placeLabels(labels: readonly (HTMLElement | null)[]): void;
  dispose(): void;
}

interface Built {
  group: THREE.Group;
  update?: (t: number) => void;
}

type Palette = Record<keyof ScenePalette, THREE.Color>;

const UP = new THREE.Vector3(0, 1, 0);

// Element colours follow the usual chemistry-model convention.
const ELEMENT = {
  H: "#e2e8f0",
  C: "#94a3b8",
  O: "#f87171",
  Na: "#a78bfa",
  Cl: "#4ade80",
} as const;

const SPECTRUM = ["#ff4d4d", "#ff9f40", "#ffe14d", "#5dde6c", "#4db8ff", "#6b6bff", "#b36bff"] as const;

/* ---------- small builders ---------- */

function solid(color: THREE.ColorRepresentation, glow = 0.25, opacity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: glow,
    roughness: 0.35,
    metalness: 0.1,
    transparent: opacity < 1,
    opacity,
  });
}

function lineMaterial(color: THREE.ColorRepresentation, opacity = 1): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
}

function sphere(radius: number, material: THREE.Material, at?: THREE.Vector3): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
  if (at) mesh.position.copy(at);
  return mesh;
}

/** A rod from `a` to `b`: bonds, pendulum strings, arrow shafts. */
function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 12), material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

function arrow(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(to, from);
  const head = Math.min(0.3, dir.length() * 0.3);
  const neck = from.clone().addScaledVector(dir.clone().normalize(), dir.length() - head);
  group.add(rod(from, neck, radius, material));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.8, head, 16), material);
  cone.position.copy(neck).addScaledVector(dir.clone().normalize(), head / 2);
  cone.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
  group.add(cone);
  return group;
}

function tube(points: THREE.Vector3[], radius: number, material: THREE.Material, closed = false): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, points.length * 2), radius, 8, closed), material);
}

function polyline(points: THREE.Vector3[], material: THREE.LineBasicMaterial): THREE.Line {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/* ---------- maths ---------- */

function helix(p: Palette): Built {
  const group = new THREE.Group();
  const R = 0.85;
  const L = 4.2;
  const at = (u: number) => {
    const a = u * Math.PI * 4;
    return new THREE.Vector3((u - 0.5) * L, Math.sin(a) * R, Math.cos(a) * R);
  };
  const points = range(161).map((i) => at(i / 160));
  group.add(tube(points, 0.05, solid(p.maths, 0.45)));
  // The circle it comes from, at the start.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.02, 8, 64), solid(p.ink, 0.2, 0.5));
  ring.rotation.y = Math.PI / 2;
  ring.position.x = -L / 2;
  group.add(ring);
  // Its shadow on a wall behind: the sine wave.
  const wall = -R - 0.35;
  group.add(polyline(points.map((q) => new THREE.Vector3(q.x, q.y, wall)), lineMaterial(p.physics, 0.8)));
  const dot = sphere(0.1, solid(p.ink, 0.8));
  const shadow = sphere(0.07, solid(p.physics, 0.8));
  group.add(dot, shadow);
  group.rotation.set(0.15, -0.55, 0);
  return {
    group,
    update: (t) => {
      const q = at((t * 0.08) % 1);
      dot.position.copy(q);
      shadow.position.set(q.x, q.y, wall);
      group.rotation.y = -0.55 + Math.sin(t * 0.25) * 0.25;
    },
  };
}

function conic(p: Palette): Built {
  const group = new THREE.Group();
  const H = 2.4;
  const B = 1.1;
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(B, H, 28, 6, true),
    new THREE.MeshBasicMaterial({ color: p.maths, wireframe: true, transparent: true, opacity: 0.3 }),
  );
  group.add(cone);
  // A tilted plane cuts the cone in an ellipse: r = c(h − y₀) / (1 + c·k·cos φ).
  const c = B / H;
  const y0 = -0.15;
  const k = 0.45;
  const ellipse = range(96).map((i) => {
    const phi = (i / 96) * Math.PI * 2;
    const r = (c * (H / 2 - y0)) / (1 + c * k * Math.cos(phi));
    return new THREE.Vector3(r * Math.cos(phi), y0 + k * r * Math.cos(phi), r * Math.sin(phi));
  });
  group.add(tube(ellipse, 0.035, solid(p.ink, 0.6), true));
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.2),
    new THREE.MeshBasicMaterial({ color: p.maths, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  // Lay it flat, then tilt it about z to the slope k (order: X first, then Z).
  plane.rotation.set(-Math.PI / 2, 0, Math.atan(k), "ZXY");
  plane.position.y = y0;
  group.add(plane);
  group.rotation.x = 0.2;
  return { group, update: (t) => (group.rotation.y = t * 0.2) };
}

function vectors(p: Palette): Built {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  const a = new THREE.Vector3(1.5, 0, 0);
  const b = new THREE.Vector3(0, 1.2, 0);
  const c = new THREE.Vector3(0, 0, 1.1);
  const sum = a.clone().add(b).add(c);
  const o = new THREE.Vector3();
  const part = solid(p.maths, 0.4);
  inner.add(arrow(o, a, 0.04, part), arrow(o, b, 0.04, part), arrow(o, c, 0.04, part));
  inner.add(arrow(o, sum, 0.055, solid(p.ink, 0.6)));
  // The box whose diagonal is the resultant.
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(a.x, b.y, c.z)), lineMaterial(p.muted, 0.5));
  box.position.copy(sum).multiplyScalar(0.5);
  inner.add(box);
  inner.position.copy(sum).multiplyScalar(-0.5);
  group.add(inner);
  return { group, update: (t) => group.rotation.set(0.35 + Math.sin(t * 0.3) * 0.15, t * 0.3, 0) };
}

function riemann(p: Palette): Built {
  const group = new THREE.Group();
  const f = (x: number) => 0.7 + 0.45 * Math.sin(1.5 * x) + 0.12 * x;
  const base = -0.8;
  const bars = 10;
  const width = 3.2 / bars;
  const materials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < bars; i++) {
    const x = -1.6 + width * (i + 0.5);
    const h = f(x);
    const m = solid(p.maths, 0.3, 0.55);
    materials.push(m);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, h, 0.5), m);
    bar.position.set(x, base + h / 2, 0);
    group.add(bar);
  }
  const curve = range(81).map((i) => {
    const x = -1.7 + (3.4 * i) / 80;
    return new THREE.Vector3(x, base + f(x), 0.26);
  });
  group.add(tube(curve, 0.035, solid(p.ink, 0.6)));
  group.add(polyline([new THREE.Vector3(-1.9, base, 0.26), new THREE.Vector3(1.9, base, 0.26)], lineMaterial(p.muted, 0.7)));
  return {
    group,
    update: (t) => {
      group.rotation.y = Math.sin(t * 0.3) * 0.5;
      // A bright sweep runs across the slices, adding them up.
      const lit = ((t * 3) % (bars + 4)) - 2;
      materials.forEach((m, i) => (m.emissiveIntensity = i <= lit ? 0.75 : 0.2));
    },
  };
}

function die(p: Palette): Built {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: p.maths, emissive: p.maths, emissiveIntensity: 0.2, flatShading: true, transparent: true, opacity: 0.75, roughness: 0.25 })));
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), lineMaterial(p.ink, 0.8)));
  return { group, update: (t) => group.rotation.set(t * 0.35, t * 0.5, t * 0.15) };
}

/* ---------- physics ---------- */

function atom(p: Palette): Built {
  const group = new THREE.Group();
  const plane = new THREE.Group();
  const proton = solid(p.physics, 0.5);
  const neutron = solid(p.muted, 0.2);
  const nucleus: [number, number, number][] = [
    [0, 0, 0], [0.13, 0.05, 0], [-0.1, 0.08, 0.06], [0.02, -0.12, 0.05], [-0.05, 0.02, -0.13], [0.08, 0.1, -0.09], [-0.12, -0.06, -0.04],
  ];
  nucleus.forEach(([x, y, z], i) => plane.add(sphere(0.1, i % 2 ? neutron : proton, new THREE.Vector3(x, y, z))));
  const radii = [0.55, 1.1, 1.75];
  const electrons = radii.map((r) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 96), solid(p.physics, 0.4, 0.55));
    ring.rotation.x = Math.PI / 2;
    plane.add(ring);
    const e = sphere(0.08, solid(p.ink, 0.9));
    plane.add(e);
    return e;
  });
  plane.rotation.x = 0.5;
  group.add(plane);
  return {
    group,
    update: (t) => {
      // Outer electrons are slower, as in Bohr's model (ω ∝ 1/n³).
      electrons.forEach((e, i) => {
        const n = i + 1;
        const a = (t * 2.4) / n ** 1.5 + i * 2;
        e.position.set(Math.cos(a) * radii[i]!, 0, Math.sin(a) * radii[i]!);
      });
      group.rotation.y = Math.sin(t * 0.2) * 0.4;
    },
  };
}

function orbit(p: Palette): Built {
  const group = new THREE.Group();
  const a = 1.8;
  const e = 0.6;
  const b = a * Math.sqrt(1 - e * e);
  const planet = sphere(0.42, solid(p.physics, 0.35));
  group.add(planet);
  const path = range(129).map((i) => {
    const E = (i / 128) * Math.PI * 2;
    return new THREE.Vector3(a * (Math.cos(E) - e), 0, b * Math.sin(E));
  });
  group.add(polyline(path, lineMaterial(p.ink, 0.55)));
  const moon = sphere(0.1, solid(p.ink, 0.9));
  group.add(moon);
  group.rotation.set(0.45, 0.3, 0);
  return {
    group,
    update: (t) => {
      // Kepler's equation, solved properly: the moon really is fastest at perigee.
      const M = (t * 0.7) % (Math.PI * 2);
      let E = M;
      for (let k = 0; k < 6; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      moon.position.set(a * (Math.cos(E) - e), 0, b * Math.sin(E));
      planet.rotation.y = t * 0.5;
    },
  };
}

function pendulum(p: Palette): Built {
  const group = new THREE.Group();
  const top = 1.3;
  const length = 2.1;
  group.add(rod(new THREE.Vector3(-0.6, top, 0), new THREE.Vector3(0.6, top, 0), 0.04, solid(p.muted, 0.1)));
  const swing = new THREE.Group();
  swing.position.y = top;
  swing.add(rod(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0), 0.015, solid(p.ink, 0.3)));
  swing.add(sphere(0.26, solid(p.physics, 0.45), new THREE.Vector3(0, -length, 0)));
  group.add(swing);
  const amplitude = 0.55;
  const arc = range(41).map((i) => {
    const th = -amplitude + (2 * amplitude * i) / 40;
    return new THREE.Vector3(Math.sin(th) * length, top - Math.cos(th) * length, 0);
  });
  group.add(polyline(arc, lineMaterial(p.physics, 0.45)));
  return { group, update: (t) => (swing.rotation.z = amplitude * Math.cos(t * 2.1)) };
}

function prism(p: Palette): Built {
  const group = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(0.85, 0.85, 1.1, 3);
  const glass = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: p.ink, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false }),
  );
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), lineMaterial(p.ink, 0.7));
  for (const m of [glass, edges]) {
    m.rotation.x = Math.PI / 2;
    m.rotation.y = Math.PI / 6;
    group.add(m);
  }
  group.add(tube([new THREE.Vector3(-2.6, -0.55, 0), new THREE.Vector3(-0.45, 0.02, 0)], 0.03, solid("#ffffff", 0.9)));
  const rays = SPECTRUM.map((color, i) => {
    const m = solid(color, 0.8, 0.85);
    group.add(tube([new THREE.Vector3(0.4, 0, 0), new THREE.Vector3(2.6, -0.1 - i * 0.16, 0)], 0.022, m));
    return m;
  });
  return {
    group,
    update: (t) => {
      group.rotation.y = Math.sin(t * 0.25) * 0.35;
      rays.forEach((m, i) => (m.opacity = 0.65 + 0.3 * Math.sin(t * 2 + i * 0.6)));
    },
  };
}

function magnet(p: Palette): Built {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.36, 0.36), solid("#ef4444", 0.3)).translateX(0.4));
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.36, 0.36), solid("#3b82f6", 0.3)).translateX(-0.4));
  // Dipole field lines, r = k·sin²θ, turned around the magnet's axis.
  const line = (k: number, phi: number, u: number) => {
    const th = 0.12 + u * (Math.PI - 0.24);
    const r = k * Math.sin(th) ** 2;
    const rho = r * Math.sin(th);
    return new THREE.Vector3(r * Math.cos(th), rho * Math.cos(phi), rho * Math.sin(phi));
  };
  const loops: { k: number; phi: number }[] = [];
  for (const k of [1.1, 1.6, 2.2]) for (let j = 0; j < 6; j++) loops.push({ k, phi: (j / 6) * Math.PI * 2 });
  const mat = lineMaterial(p.physics, 0.45);
  loops.forEach(({ k, phi }) => group.add(polyline(range(49).map((i) => line(k, phi, i / 48)), mat)));
  // A few sparks flow out of north and round to south.
  const sparks = loops.filter((_, i) => i % 3 === 0).map((l) => ({ ...l, mesh: sphere(0.045, solid(p.ink, 1)) }));
  sparks.forEach((s) => group.add(s.mesh));
  group.rotation.set(0.35, 0, 0.1);
  return {
    group,
    update: (t) => {
      sparks.forEach((s, i) => s.mesh.position.copy(line(s.k, s.phi, (t * 0.18 + i * 0.17) % 1)));
      group.rotation.y = t * 0.15;
    },
  };
}

/* ---------- chemistry ---------- */

function water(p: Palette): Built {
  const group = new THREE.Group();
  const bond = solid(p.muted, 0.15);
  const half = (104.5 / 2) * (Math.PI / 180);
  const L = 0.9;
  const o = new THREE.Vector3(0, 0.25, 0);
  const h1 = new THREE.Vector3(Math.sin(half) * L, 0.25 - Math.cos(half) * L, 0);
  const h2 = new THREE.Vector3(-Math.sin(half) * L, 0.25 - Math.cos(half) * L, 0);
  group.add(sphere(0.42, solid(ELEMENT.O, 0.25), o), sphere(0.26, solid(ELEMENT.H, 0.2), h1), sphere(0.26, solid(ELEMENT.H, 0.2), h2));
  group.add(rod(o, h1, 0.07, bond), rod(o, h2, 0.07, bond));
  const arc = range(25).map((i) => {
    const a = -half + (2 * half * i) / 24;
    return new THREE.Vector3(Math.sin(a) * 0.62, 0.25 - Math.cos(a) * 0.62, 0.05);
  });
  group.add(polyline(arc, lineMaterial(p.chemistry, 0.9)));
  const cloud = sphere(1.25, new THREE.MeshBasicMaterial({ color: p.chemistry, transparent: true, opacity: 0.06, depthWrite: false }));
  group.add(cloud);
  return { group, update: (t) => (group.rotation.y = Math.sin(t * 0.4) * 0.9) };
}

function benzene(p: Palette): Built {
  const group = new THREE.Group();
  const ring = new THREE.Group();
  const bond = solid(p.muted, 0.15);
  const carbon = solid(ELEMENT.C, 0.2);
  const hydrogen = solid(ELEMENT.H, 0.2);
  const at = (r: number, i: number) => new THREE.Vector3(Math.cos((i * Math.PI) / 3) * r, Math.sin((i * Math.PI) / 3) * r, 0);
  for (let i = 0; i < 6; i++) {
    const c = at(0.95, i);
    const h = at(1.6, i);
    ring.add(sphere(0.19, carbon, c), sphere(0.12, hydrogen, h));
    ring.add(rod(c, at(0.95, i + 1), 0.05, bond), rod(c, h, 0.035, bond));
  }
  // The delocalised π ring, the reason benzene is so stable.
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 64), solid(p.chemistry, 0.7)));
  ring.rotation.x = -0.9;
  group.add(ring);
  return { group, update: (t) => (ring.rotation.z = t * 0.3) };
}

function lattice(p: Palette): Built {
  const group = new THREE.Group();
  const s = 0.6;
  const na = solid(ELEMENT.Na, 0.3);
  const cl = solid(ELEMENT.Cl, 0.3);
  const points: THREE.Vector3[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const odd = (x + y + z + 3) % 2 === 1;
        group.add(sphere(odd ? 0.15 : 0.23, odd ? na : cl, new THREE.Vector3(x * s, y * s, z * s)));
        // Grid lines to the neighbours in +x, +y, +z.
        if (x < 1) points.push(new THREE.Vector3(x * s, y * s, z * s), new THREE.Vector3((x + 1) * s, y * s, z * s));
        if (y < 1) points.push(new THREE.Vector3(x * s, y * s, z * s), new THREE.Vector3(x * s, (y + 1) * s, z * s));
        if (z < 1) points.push(new THREE.Vector3(x * s, y * s, z * s), new THREE.Vector3(x * s, y * s, (z + 1) * s));
      }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), lineMaterial(p.chemistry, 0.35)));
  return { group, update: (t) => group.rotation.set(0.5, t * 0.3, 0.2) };
}

function dna(p: Palette): Built {
  const group = new THREE.Group();
  const N = 26;
  const R = 0.62;
  const bases = ["#f472b6", "#fbbf24", "#38bdf8", "#a3e635"] as const;
  const a: THREE.Vector3[] = [];
  const b: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const angle = i * 0.48;
    const y = (i - (N - 1) / 2) * 0.13;
    a.push(new THREE.Vector3(Math.cos(angle) * R, y, Math.sin(angle) * R));
    b.push(new THREE.Vector3(Math.cos(angle + 2.4) * R, y, Math.sin(angle + 2.4) * R));
  }
  group.add(tube(a, 0.045, solid(p.chemistry, 0.5)), tube(b, 0.045, solid(p.ink, 0.35)));
  for (let i = 1; i < N - 1; i += 2) {
    const mid = a[i]!.clone().lerp(b[i]!, 0.5);
    const pair = i % 4 === 1 ? [0, 1] : [2, 3];
    group.add(rod(a[i]!, mid, 0.03, solid(bases[pair[0]!]!, 0.4)), rod(mid, b[i]!, 0.03, solid(bases[pair[1]!]!, 0.4)));
  }
  group.rotation.z = 0.35;
  return { group, update: (t) => (group.rotation.y = t * 0.45) };
}

function methane(p: Palette): Built {
  const group = new THREE.Group();
  const bond = solid(p.muted, 0.15);
  const c = new THREE.Vector3();
  const hs = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ].map(([x, y, z]) => new THREE.Vector3(x!, y!, z!).normalize().multiplyScalar(1));
  group.add(sphere(0.3, solid(ELEMENT.C, 0.2), c));
  for (const h of hs) group.add(sphere(0.2, solid(ELEMENT.H, 0.2), h), rod(c, h, 0.06, bond));
  // The tetrahedron the four hydrogens mark out.
  const edges: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) edges.push(hs[i]!, hs[j]!);
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edges), lineMaterial(p.chemistry, 0.6)));
  return { group, update: (t) => group.rotation.set(t * 0.2, t * 0.35, 0) };
}

const BUILDERS: Record<WorldObjectKind, (p: Palette) => Built> = {
  helix,
  conic,
  vectors,
  riemann,
  die,
  atom,
  orbit,
  pendulum,
  prism,
  magnet,
  water,
  benzene,
  lattice,
  dna,
  methane,
};

/* ---------- the scene ---------- */

/** Specks of light through the whole flight, tinted by the subject they sit in. */
function dust(p: Palette): THREE.Points {
  const count = 1600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const span = CAMERA_START_Z + 10 - (CAMERA_END_Z - 30);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < count; i++) {
    const z = CAMERA_START_Z + 10 - rand() * span;
    positions.set([(rand() - 0.5) * 50, (rand() - 0.5) * 30, z], i * 3);
    const tint = z > -50 ? p.maths : z > -100 ? p.physics : p.chemistry;
    const c = tint.clone().lerp(p.ink, rand() * 0.6);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createScienceScene(canvas: HTMLCanvasElement, { palette, still }: SceneOptions): ScienceScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  const p = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, new THREE.Color(v)])) as Palette;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(p.bg, 12, 38);
  scene.add(new THREE.HemisphereLight(0xffffff, p.bg, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(5, 8, 10);
  scene.add(sun);
  scene.add(dust(p));

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0.3, CAMERA_START_Z);

  const objects = WORLD_OBJECTS.map((o: WorldObject) => {
    const built = BUILDERS[o.kind](p);
    built.group.position.set(...o.position);
    built.group.scale.setScalar(o.scale);
    scene.add(built.group);
    return { spec: o, ...built };
  });
  // Still pictures show each object at a pleasing moment rather than t = 0.
  const STILL_TIME = 2.2;
  objects.forEach((o) => o.update?.(STILL_TIME));

  let targetZ = CAMERA_START_Z;
  let z = CAMERA_START_Z;
  const pointer = new THREE.Vector2();
  const eased = new THREE.Vector2();
  let last = 0;
  let width = 1;
  let height = 1;
  let lateral = 1;
  const anchor = new THREE.Vector3();

  function placeCamera() {
    const sway = Math.sin(z * 0.06) * 0.7 * lateral;
    camera.position.set(sway + eased.x * 0.6 * lateral, 0.3 + eased.y * 0.35, z);
    camera.lookAt(sway * 0.4, 0, z - 10);
  }

  return {
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Narrow screens see less sideways, so objects move in and the view widens a little.
      camera.fov = camera.aspect < 0.8 ? 68 : 55;
      camera.updateProjectionMatrix();
      lateral = lateralScale(camera.aspect);
      objects.forEach((o) => (o.group.position.x = o.spec.position[0] * lateral));
    },
    setCameraZ(next) {
      targetZ = next;
      if (still) z = next;
    },
    setPointer(x, y) {
      pointer.set(x, y);
    },
    frame(time) {
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;
      if (!still) {
        const follow = 1 - Math.exp(-dt * 4);
        z += (targetZ - z) * follow;
        eased.lerp(pointer, 1 - Math.exp(-dt * 3));
        const t = time / 1000;
        for (const o of objects) {
          // Only animate what is near enough to see.
          if (Math.abs(o.group.position.z - z) < 45) o.update?.(t);
        }
      }
      placeCamera();
      renderer.render(scene, camera);
    },
    placeLabels(labels) {
      objects.forEach((o, i) => {
        const el = labels[i];
        if (!el) return;
        const distance = z - o.group.position.z;
        const fade = smoothstep(2.5, 6, distance) * (1 - smoothstep(15, 24, distance));
        anchor.copy(o.group.position);
        anchor.y += 1.75 * o.spec.scale;
        anchor.project(camera);
        if (fade <= 0.01 || anchor.z > 1) {
          el.style.opacity = "0";
          el.style.visibility = "hidden";
          return;
        }
        const x = ((anchor.x + 1) / 2) * width;
        const y = ((1 - anchor.y) / 2) * height;
        const scale = Math.min(1.05, Math.max(0.75, 9 / distance));
        el.style.visibility = "visible";
        el.style.opacity = fade.toFixed(3);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      });
    },
    dispose() {
      scene.traverse((node) => {
        const mesh = node as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
