// From the diorama-worlds skill (github.com/educlopez/diorama, MIT, (c) 2026 Eduardo Calvo; LICENSE in this folder), unchanged.
import * as THREE from 'three';

export const FINISHES = Object.freeze(['miniature', 'pixel', 'halftone', 'blueprint']);
export const phase = (t, period) => ((t % period) + period) % period / period;
export const smooth = x => (x = Math.max(0, Math.min(1, x))) * x * (3 - 2 * x);
// Absolute elapsed time: skipped frames never turn action into slow motion.
export function clockTime(anchor, elapsedMilliseconds, duration, speed = 1) {
  return phase(anchor + Math.max(0, elapsedMilliseconds) / 1000 * speed, duration) * duration;
}
export function seeded(seed = 42) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function defineWorld(definition) {
  if (!/^[a-z][a-z0-9-]*$/.test(definition.name ?? '')) throw new Error('World name must be lowercase and hyphenated.');
  if (!(definition.duration > 0) || !Number.isFinite(definition.duration)) throw new Error('World duration must be finite and positive.');
  if (!(definition.still >= 0 && definition.still < definition.duration)) throw new Error('Still must be inside the loop.');
  if (typeof definition.build !== 'function' || typeof definition.tick !== 'function') throw new Error('World needs build and tick functions.');
  if (typeof definition.title !== 'string' || typeof definition.description !== 'string') throw new Error('World needs a title and description.');
  if (definition.bounds && (definition.bounds.length !== 2 || definition.bounds.some(v => v.length !== 3 || v.some(n => !Number.isFinite(n))) || definition.bounds[0].some((n, i) => n >= definition.bounds[1][i]))) throw new Error('Bounds must contain finite increasing min/max XYZ corners.');
  if (definition.contactTimes && (!Array.isArray(definition.contactTimes) || definition.contactTimes.some(t => !Number.isFinite(t) || t < 0 || t >= definition.duration) || typeof definition.contacts !== 'function')) throw new Error('Contact times need a contact inspector and must lie inside the loop.');
  return definition;
}

// Public scene API. Helpers build once; tick only poses returned Object3Ds.
export function toolkit(parent) {
  const geometries = new Map(), materials = new Map(), textures = new Set();
  const random = seeded(42), resources = new Set();
  const own = resource => { resources.add(resource); return resource; };
  const geometry = (key, make) => { if (!geometries.has(key)) geometries.set(key, make()); return geometries.get(key); };
  const material = color => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
    return materials.get(color);
  };
  function group(x = 0, y = 0, z = 0, container = parent) {
    const g = new THREE.Group(); g.position.set(x, y, z); container.add(g); return g;
  }
  function mesh(geo, color, x, y, z, container = parent) {
    const m = new THREE.Mesh(geo, material(color)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; container.add(m); return m;
  }
  function box(w, h, d, color, x = 0, y = 0, z = 0, container = parent) {
    const m = mesh(geometry('box', () => new THREE.BoxGeometry(1, 1, 1)), color, x, y, z, container); m.scale.set(w, h, d); return m;
  }
  function ball(r, color, x = 0, y = 0, z = 0, container = parent) {
    const m = mesh(geometry('ball', () => new THREE.IcosahedronGeometry(1, 1)), color, x, y, z, container); m.scale.setScalar(r); return m;
  }
  function cylinder(r, h, color, x = 0, y = 0, z = 0, container = parent, segments = 8) {
    const m = mesh(geometry(`cyl${segments}`, () => new THREE.CylinderGeometry(1, 1, 1, segments)), color, x, y, z, container); m.scale.set(r, h, r); return m;
  }
  function line(points, color, width = .035, container = parent) {
    const g = group(0, 0, 0, container);
    for (let i = 1; i < points.length; i++) {
      const a = new THREE.Vector3(...points[i - 1]), b = new THREE.Vector3(...points[i]);
      const v = b.clone().sub(a), midpoint = a.clone().add(b).multiplyScalar(.5);
      const m = cylinder(width, v.length(), color, ...midpoint.toArray(), g, 6);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    }
    return g;
  }
  function ring(radius, color, x, y, z, container = parent, tube = .028, arc = Math.PI * 2) {
    const key = `ring:${radius}:${tube}:${arc}`;
    const m = mesh(geometry(key, () => new THREE.TorusGeometry(radius, tube, 4, 64, arc)), color, x, y, z, container);
    m.rotation.x = -Math.PI / 2; return m;
  }
  function surface(width, depth, color, x = 0, y = .03, z = 0, seed = 12, variation = .13) {
    const rng = seeded(seed), canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), base = new THREE.Color(color), c = new THREE.Color();
    ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18000; i++) {
      c.copy(base).multiplyScalar(1 + (rng() - .5) * variation * 2);
      ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect(rng()*256, rng()*256, 1+rng()*2, 1+rng()*2);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }); materials.set(`surface:${materials.size}`, mat);
    const m = new THREE.Mesh(geometry('surface', () => new THREE.PlaneGeometry(1, 1)), mat);
    m.rotation.x = -Math.PI/2; m.scale.set(width,depth,1); m.position.set(x,y,z); m.receiveShadow = true; parent.add(m); return m;
  }
  function terrain(width, depth, color = '#718c42', seed = 42, { base = 'none' } = {}) {
    if (!['none', 'slab'].includes(base)) throw new Error('Terrain base must be none or slab.');
    const rng = seeded(seed), points = [];
    for (let side = 0; side < 4; side++) for (let i = 0; i <= 18; i++) {
      const f = i / 18, notch = rng() * Math.min(width, depth) * .025;
      points.push(side === 0 ? [-width / 2 + width * f, -depth / 2 + notch] : side === 1 ? [width / 2 - notch, -depth / 2 + depth * f] : side === 2 ? [width / 2 - width * f, depth / 2 - notch] : [-width / 2 + notch, depth / 2 - depth * f]);
    }
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    // The default is a ground cutout, not a floating display plinth.
    // Opt-in extrusion is reserved for explicitly requested raised dioramas.
    if (base === 'slab') {
      const soil = new THREE.ExtrudeGeometry(shape, { depth: .36, bevelEnabled: false });
      geometries.set(`soil:${geometries.size}`, soil);
      const slab = mesh(soil, '#a17b4d', 0, -.355, 0); slab.rotation.x = -Math.PI / 2;
    }
    const top = new THREE.ShapeGeometry(shape); geometries.set(`top:${geometries.size}`, top);
    const grass = mesh(top, color, 0, .005, 0); grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
    // A deterministic mottled texture, generated locally; no remote textures.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'); const baseColor = new THREE.Color(color);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const c = baseColor.clone().multiplyScalar(.8 + rng() * .4);
      ctx.fillStyle = `#${c.getHexString()}`; ctx.fillRect(x, y, 1, 1);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 3); textures.add(texture);
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }); materials.set(`turf:${materials.size}`, mat); grass.material = mat;
    if (base === 'none') {
      // Small coplanar flecks break the silhouette into white space, without
      // alpha sorting, vertical walls or a continuous decorative outline.
      const fringe = seeded(seed + 197), tint = new THREE.Color(color);
      const geo = geometry('ground-fleck', () => new THREE.PlaneGeometry(1, 1));
      for (let i = 0; i < 220; i++) {
        const side = i % 4, f = fringe(), inset = (fringe() - .25) * .16;
        const x = side === 0 || side === 2 ? (f - .5) * width : (side === 1 ? 1 : -1) * (width / 2 - inset);
        const z = side === 1 || side === 3 ? (f - .5) * depth : (side === 0 ? 1 : -1) * (depth / 2 - inset);
        const tone = .9 + (i % 4) * .06;
        tint.set(color).multiplyScalar(tone);
        const fleck = mesh(geo, '#' + tint.getHexString(), x, .006, z);
        fleck.rotation.x = -Math.PI / 2;
        const size = .018 + fringe() * .055;
        fleck.scale.set(size, size * (.6 + fringe() * .8), 1);
        fleck.castShadow = false;
      }
    }
    return grass;
  }
  function grass(width, depth, count = 1400, seed = 7) {
    const rng = seeded(seed), geo = geometry('blade', () => new THREE.PlaneGeometry(1, 1));
    const mat = new THREE.MeshStandardMaterial({ color: '#8b9b4d', side: THREE.DoubleSide, roughness: 1 }); materials.set(`grass:${materials.size}`, mat);
    const inst = new THREE.InstancedMesh(geo, mat, count), dummy = new THREE.Object3D(), tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      let x = (rng() - .5) * width, z = (rng() - .5) * depth;
      // Detail confined to the fringe, never hiding action in the centre.
      if (Math.abs(x) < width / 2 - .6 && Math.abs(z) < depth / 2 - .6) z = (depth / 2 - rng() * .5) * (z < 0 ? -1 : 1);
      const h = .05 + rng() * .16; dummy.position.set(x, h / 2, z); dummy.rotation.y = rng() * Math.PI; dummy.scale.set(.035 + rng() * .04, h, 1); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
      tint.setHSL(.2 + rng() * .04, .28 + rng() * .2, .26 + rng() * .16); inst.setColorAt(i, tint);
    }
    inst.receiveShadow = true; parent.add(inst); return inst;
  }
  function tree(x, z, scale = 1, seed = 3) {
    const g = group(x, 0, z), rng = seeded(seed); g.scale.setScalar(scale);
    cylinder(.12, 1.8, '#745139', 0, .9, 0, g);
    line([[0, 1.1, 0], [.45, 2, .1]], '#745139', .075, g);
    for (let i = 0; i < 10; i++) ball(.48 + rng() * .24, ['#748b48', '#8d9e5a', '#a3ad65', '#617e41'][i % 4], (rng() - .5) * 1.3, 1.85 + rng() * .8, (rng() - .5) * 1.2, g);
    return g;
  }
  function bench(x, z, rotation = 0) {
    const g = group(x, 0, z); g.rotation.y = rotation;
    for (const dx of [-.75, .75]) for (const dz of [-.19, .19]) box(.08, .5, .08, '#303b37', dx, .25, dz, g);
    for (let i = 0; i < 3; i++) box(1.85, .07, .14, '#ab794d', 0, .53, -.18 + i * .18, g);
    for (let i = 0; i < 2; i++) box(1.85, .13, .06, '#ab794d', 0, .78 + i * .18, -.27, g);
    return g;
  }
  function person(x, z, shirt = '#e8e2cc', pants = '#283a43', scale = 1, skin = '#c89670') {
    const root = group(x, 0, z); root.scale.setScalar(scale);
    const body = group(0, .95, 0, root), chest = group(0, 0, 0, body);
    // Adult silhouette: about seven head-heights; no oversized toy head.
    const torsoGeo = geometry('adult-torso', () => {
      const geo = new THREE.BoxGeometry(1,1,1), pos = geo.attributes.position;
      for(let i=0;i<pos.count;i++) { const y=pos.getY(i); pos.setX(i,pos.getX(i)*(y>0?.46:.34));pos.setY(i,(y+.5)*.55+.025);pos.setZ(i,pos.getZ(i)*(y>0?.245:.215)); }
      geo.computeVertexNormals(); return geo;
    });
    mesh(torsoGeo,shirt,0,0,0,chest);
    box(.35,.12,.235,pants,0,.015,0,body);
    cylinder(.052,.16,skin,0,.65,0,chest);
    const head = group(0,.84,0,chest);
    const face = ball(.13,skin,0,0,0,head);face.scale.z*=.9;
    const hair = ball(.136,'#42382b',0,.065,-.026,head);hair.scale.y*=.53;
    box(.045,.05,.045,skin,0,-.005,.113,head);
    for(const dx of [-.048,.048]) box(.012,.016,.01,'#39352e',dx,.022,.112,head);
    const limb = (x,y,color,length,radius,container) => {
      const pivot=group(x,y,0,container);
      const geo=geometry('limb',()=>new THREE.CylinderGeometry(1,.82,1,8));
      const shape=mesh(geo,color,0,-length/2,0,pivot);shape.scale.set(radius,length,radius);return pivot;
    };
    const leftArm=limb(-.265,.53,shirt,.29,.072,chest),rightArm=limb(.265,.53,shirt,.29,.072,chest);
    const leftForearm=limb(0,-.29,skin,.28,.049,leftArm),rightForearm=limb(0,-.29,skin,.28,.049,rightArm);
    const leftHand=group(0,-.28,0,leftForearm),rightHand=group(0,-.28,0,rightForearm);
    box(.075,.095,.055,skin,0,-.012,0,leftHand);box(.075,.095,.055,skin,0,-.012,0,rightHand);
    const leftLeg=limb(-.13,0,pants,.43,.085,body),rightLeg=limb(.13,0,pants,.43,.085,body);
    const leftShin=limb(0,-.43,pants,.4,.065,leftLeg),rightShin=limb(0,-.43,pants,.4,.065,rightLeg);
    const leftFoot=group(0,-.43,0,leftShin),rightFoot=group(0,-.43,0,rightShin);
    const shoeGeo=geometry('adult-shoe',()=>{const g=new THREE.CapsuleGeometry(.5,1,3,8);g.rotateX(Math.PI/2);return g;});
    for(const foot of [leftFoot,rightFoot]){const shoe=mesh(shoeGeo,'#ded9c9',0,0,.05,foot);shoe.scale.set(.155,.09,.1325);}
    return {root,body,chest,head,face,leftArm,rightArm,leftForearm,rightForearm,leftHand,rightHand,leftLeg,rightLeg,leftShin,rightShin,leftFoot,rightFoot};
  }
  const reachCache=new WeakMap();
  function cacheFor(actor){
    if(!reachCache.has(actor))reachCache.set(actor,{v:new THREE.Vector3(),d:new THREE.Vector3(),n:new THREE.Vector3(),e:new THREE.Vector3(),lower:new THREE.Vector3(),down:new THREE.Vector3(0,-1,0),inv:new THREE.Quaternion(),endpoint:new THREE.Vector3(),footQ:new THREE.Quaternion()});
    return reachCache.get(actor);
  }
  function solve(actor,upper,lowerJoint,space,target,a,b,bend){
    const c=cacheFor(actor),{v,d,n,e,lower,down,inv,endpoint}=c;
    actor.root.updateMatrixWorld(true);v.set(...target);space.worldToLocal(v);d.subVectors(v,upper.position);
    const distance=Math.max(Math.abs(a-b)+.00001,Math.min(a+b-.00001,d.length()));d.normalize();v.copy(upper.position).addScaledVector(d,distance);
    const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
    n.set(...bend);n.addScaledVector(d,-n.dot(d));if(n.lengthSq()<1e-8)n.set(1,0,0);n.normalize();
    e.copy(upper.position).addScaledVector(d,along).addScaledVector(n,height);
    lower.subVectors(e,upper.position).normalize();upper.quaternion.setFromUnitVectors(down,lower);
    inv.copy(upper.quaternion).invert();lower.subVectors(v,e).applyQuaternion(inv).normalize();lowerJoint.quaternion.setFromUnitVectors(down,lower);
    actor.root.updateMatrixWorld(true);endpoint.set(0,-b,0);lowerJoint.localToWorld(endpoint);return endpoint.toArray();
  }
  function reach(actor,side,target){return solve(actor,side<0?actor.leftArm:actor.rightArm,side<0?actor.leftForearm:actor.rightForearm,actor.chest??actor.body,target,.29,.28,[side*.6,0,1]);}
  function plant(actor,{crouch=0,lean=0,twist=0}={}){
    actor.body.position.y=.95-crouch;actor.chest.rotation.set(lean,twist,0);
    const c=cacheFor(actor);
    for(const side of [-1,1]){
      actor.root.updateMatrixWorld(true);c.v.set(side*.13,.09,0);actor.root.localToWorld(c.v);
      solve(actor,side<0?actor.leftLeg:actor.rightLeg,side<0?actor.leftShin:actor.rightShin,actor.body,c.v.toArray(),.43,.43,[0,0,1]);
      const shin=side<0?actor.leftShin:actor.rightShin,foot=side<0?actor.leftFoot:actor.rightFoot;
      shin.getWorldQuaternion(c.inv);c.inv.invert();actor.root.getWorldQuaternion(c.footQ);foot.quaternion.copy(c.inv).multiply(c.footQ);
    }
    actor.root.updateMatrixWorld(true);
  }
  const batches = [];
  function batch() {
    const pools = new Map();
    parent.updateMatrixWorld(true);
    parent.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh) return;
      const key = `${o.geometry.uuid}:${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`;
      if (!pools.has(key)) pools.set(key, []); pools.get(key).push(o);
    });
    for (const originals of pools.values()) {
      if (originals.length < 2) continue;
      const first = originals[0], inst = new THREE.InstancedMesh(first.geometry, first.material, originals.length);
      inst.castShadow = first.castShadow; inst.receiveShadow = first.receiveShadow;
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); inst.frustumCulled = false;
      for (const o of originals) o.visible = false;
      parent.add(inst); batches.push({ inst, originals });
    }
  }
  const inverse = new THREE.Matrix4(), local = new THREE.Matrix4();
  function updateBatches() {
    parent.updateMatrixWorld(true); inverse.copy(parent.matrixWorld).invert();
    for (const { inst, originals } of batches) {
      originals.forEach((o, i) => { local.multiplyMatrices(inverse, o.matrixWorld); inst.setMatrixAt(i, local); });
      inst.instanceMatrix.needsUpdate = true;
    }
  }
  function dispose() {
    for (const resource of resources) resource.dispose();
    for (const g of geometries.values()) g.dispose();
    for (const m of materials.values()) m.dispose();
    for (const t of textures) t.dispose();
    parent.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
  }
  return { THREE, own, reach, plant, surface, group, box, ball, cylinder, line, ring, terrain, grass, tree, bench, person, random, phase, smooth, batch, updateBatches, dispose };
}

const vertexShader = `varying vec2 uv0; void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragmentShader = `
precision highp float;
uniform sampler2D image; uniform sampler2D depth; uniform int mode; uniform vec2 resolution; varying vec2 uv0;
float bayer(vec2 p){vec2 q=mod(floor(p),4.);float a=mod(q.x,2.)*2.+mod(q.y,2.)*3.;a=mod(a,4.);vec2 r=floor(q/2.);float b=mod(r.x*2.+r.y*3.,4.);return (4.*a+b+.5)/16.-.5;}
vec3 srgb(vec3 x){return mix(12.92*x,1.055*pow(max(x,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),x));}
void main(){
  vec4 c=texture2D(image,uv0);vec3 color=srgb(c.rgb);
  if(mode==1){float d=bayer(gl_FragCoord.xy);color=floor(clamp(color+d/24.,0.,1.)*23.+.5)/23.;}
  if(mode>=2){
    float z=texture2D(depth,uv0).x;
    // Depth separates even pale objects from untouched white negative space.
    if(z<.99999){
      float l=dot(color,vec3(.299,.587,.114));vec2 px=1./resolution;
      float edge=0.;
      for(int i=0;i<4;i++){
        vec2 offset=i==0?vec2(px.x,0.):i==1?vec2(-px.x,0.):i==2?vec2(0.,px.y):vec2(0.,-px.y);
        vec3 neighbor=srgb(texture2D(image,uv0+offset).rgb);
        edge=max(edge,length(color-neighbor));
        edge=max(edge,step(.0015,abs(z-texture2D(depth,uv0+offset).x)));
      }
      if(mode==2){
        vec2 p=gl_FragCoord.xy;vec2 rotated=vec2(p.x+p.y,p.y-p.x)*.70710678;
        vec2 cell=fract(rotated/5.)-.5;float tone=clamp((1.-l)*1.25,0.,1.);
        float dotInk=1.-smoothstep(tone*.65-.06,tone*.65+.06,length(cell));
        float lineInk=smoothstep(.14,.5,edge)*.48;
        vec3 paper=vec3(.975,.949,.882),ink=mix(vec3(.16,.22,.26),vec3(.57,.24,.16),smoothstep(.04,.25,color.r-color.b));
        color=mix(paper,ink,max(dotInk,lineInk));
      }else{
        vec2 grid=abs(fract(gl_FragCoord.xy/24.)-.5);
        float gridLine=smoothstep(.46,.49,max(grid.x,grid.y))*.13;
        color=mix(vec3(.055,.19,.38),vec3(.20,.44,.61),l*.65+gridLine);
        color=mix(color,vec3(.84,.95,.96),smoothstep(.08,.32,edge));
      }
    }else{color=vec3(1.);}
  }
  gl_FragColor=vec4(color,c.a);
}`;

export function mountWorld(def, { el, finish = 'miniature', paused = false } = {}) {
  if (!el) throw new Error('mountWorld needs a container.');
  if (!FINISHES.includes(finish)) throw new Error('Unknown finish.');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' }); }
  catch { el.textContent = 'This world needs WebGL 2. Try a browser with hardware acceleration enabled.'; el.dataset.state = 'unavailable'; return null; }
  el.replaceChildren(renderer.domElement); el.dataset.state = 'ready';
  const canvas = renderer.domElement; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', def.description);
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(1); renderer.setClearColor('#ffffff'); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#ffffff');
  const content = new THREE.Group(); scene.add(content);
  scene.add(new THREE.HemisphereLight('#f5f4df', '#8b9476', 2.2));
  const sun = new THREE.DirectionalLight('#fff1d5', 3); sun.position.set(-7, 13, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005; sun.shadow.normalBias = .045;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: .1, far: 45 }); scene.add(sun);
  const W = toolkit(content), parts = def.build(W); W.batch();
  const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, .1, 100);
  camera.position.set(24, 21, 26); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  // Fit all declared motion bounds, not merely whatever pose happened to build.
  const bounds = def.bounds ? new THREE.Box3(new THREE.Vector3(...def.bounds[0]), new THREE.Vector3(...def.bounds[1])) : new THREE.Box3().setFromObject(content);
  const corners = []; for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
  const minX = Math.min(...corners.map(v => v.x)), maxX = Math.max(...corners.map(v => v.x));
  const minY = Math.min(...corners.map(v => v.y)), maxY = Math.max(...corners.map(v => v.y));
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const post = new THREE.Scene(), postCamera = new THREE.Camera();
  const postMaterial = new THREE.ShaderMaterial({ uniforms: { image: { value: target.texture }, depth: { value: target.depthTexture }, mode: { value: FINISHES.indexOf(finish) }, resolution: { value: new THREE.Vector2(1,1) } }, vertexShader, fragmentShader, depthTest: false, depthWrite: false });
  const quadGeo = new THREE.PlaneGeometry(2, 2); post.add(new THREE.Mesh(quadGeo, postMaterial));
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, visible = true, contextLost = false, looping = false, time = def.still, epoch = performance.now(), anchor = def.still, speed = 1, lastFrame = -Infinity;
  let frames = 0, draws = 0, triangles = 0, width = 1, height = 1;
  function render(t) {
    if (disposed || contextLost) return;
    time = t; def.tick({ t, parts, W }); W.updateBatches();
    renderer.info.reset(); renderer.info.autoReset = false;
    renderer.setRenderTarget(target); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(post, postCamera);
    draws = renderer.info.render.calls; triangles = renderer.info.render.triangles; frames++;
  }
  function resize() {
    if (disposed) return;
    const rect = el.getBoundingClientRect(); width = Math.max(1, Math.round(rect.width)); height = Math.max(1, Math.round(rect.height));
    const aspect = width / height, spanY = Math.max(maxY - minY, (maxX - minX) / aspect) * 1.12;
    camera.left = centerX - spanY * aspect / 2; camera.right = centerX + spanY * aspect / 2;
    camera.top = centerY + spanY / 2; camera.bottom = centerY - spanY / 2; camera.updateProjectionMatrix();
    const scale = finish === 'pixel' ? 1 / (width < 600 ? 2 : 3) : Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    renderer.setSize(w, h, false); target.setSize(w, h); postMaterial.uniforms.resolution.value.set(w,h);
    canvas.style.imageRendering = finish === 'pixel' ? 'pixelated' : 'auto'; render(time);
  }
  function canRun() { return !disposed && !paused && !media.matches && visible && !document.hidden && !contextLost; }
  function synchronize() {
    const next = canRun();
    if (next === looping) return;
    looping = next; epoch = performance.now(); anchor = time; lastFrame = -Infinity;
    renderer.setAnimationLoop(next ? now => {
      if (now - lastFrame < 1000 / 30 - .5) return;
      lastFrame = now; render(clockTime(anchor, now - epoch, def.duration, speed));
    } : null);
  }
  const visibility = () => synchronize();
  const reduced = () => { if (media.matches) render(def.still); synchronize(); };
  const lose = e => { e.preventDefault(); contextLost = true; el.dataset.state = 'context-lost'; synchronize(); };
  const restore = () => { contextLost = false; el.dataset.state = 'ready'; resize(); synchronize(); };
  canvas.addEventListener('webglcontextlost', lose); canvas.addEventListener('webglcontextrestored', restore);
  document.addEventListener('visibilitychange', visibility); media.addEventListener('change', reduced);
  const io = new IntersectionObserver(entries => { const latest = entries.at(-1); if (latest) { visible = latest.isIntersecting; synchronize(); } }); io.observe(el);
  const ro = new ResizeObserver(resize); ro.observe(el); resize(); synchronize();
  return {
    setFinish(value) { if (!FINISHES.includes(value)) throw new Error('Unknown finish.'); finish = value; postMaterial.uniforms.mode.value = FINISHES.indexOf(value); resize(); },
    setPaused(value) { paused = Boolean(value); synchronize(); },
    setSpeed(value) { if (!Number.isFinite(value) || value < .25 || value > 3) throw new Error('Speed must be between 0.25 and 3.'); anchor = time; epoch = performance.now(); speed = value; },
    seek(value) { if (!Number.isFinite(value)) throw new Error('Time must be finite.'); render(phase(value, def.duration) * def.duration); anchor = time; epoch = performance.now(); },
    contacts() { return def.contacts ? def.contacts({ t: time, parts, W }) : []; },
    stats() { return { time, duration: def.duration, finish, speed, paused, reduced: media.matches, running: looping, frames, draws, triangles, width, height, buffer: [canvas.width, canvas.height], geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
    snapshot() { const a = []; content.updateMatrixWorld(true); content.traverse(o => { if (o.isMesh || o.isGroup) a.push(...o.matrixWorld.elements); }); return a; },
    dispose() {
      if (disposed) return; disposed = true; looping = false; renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', reduced);
      canvas.removeEventListener('webglcontextlost', lose); canvas.removeEventListener('webglcontextrestored', restore);
      W.dispose(); sun.shadow.dispose(); target.dispose(); quadGeo.dispose(); postMaterial.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); el.dataset.state = 'disposed';
    }
  };
}
