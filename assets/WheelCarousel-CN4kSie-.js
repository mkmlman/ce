import{a as e,n as t,t as n}from"./jsx-runtime-OQpaS_Dv.js";import{a as r,m as i,o as a}from"./index-DSJGntye.js";import{A as o,D as s,M as c,O as l,S as u,_ as d,a as f,b as p,c as m,d as h,g,h as _,i as v,s as ee,t as te}from"./three-Cq4jDphW.js";import{t as y}from"./animation-CvDoa17S.js";var b=e(t(),1),ne=`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,re=`
  precision highp float;

  #define MAX_PLANES 32
  #define MAX_LINKS 32

  varying vec2 vUv;

  uniform vec2  uResolution;   // canvas size in px
  uniform vec2  uSize;         // resting plane size in px

  // per-plane state, all of it resolved on the CPU. Everything here is a
  // constant across a plane's pixels — its rotation, its rounded-box radii,
  // its cull reach, its inverse size — so keeping any of it in the fragment
  // shader would re-derive it for every pixel on screen. Packed into vec4 rows
  // because GLSL ES gives every element of a uniform array a full vec4 row
  // whatever it is declared as.
  //   uPlane: centre.xy, cos(rot), sin(rot)
  //   uBox:   halfSize - r (xy), r, cull reach (halfSpan*grown + 8); < 0 = skip
  //   uArt:   1/(2*halfSize) (xy), brightness (1 = lit, 0 = black), atlas cell
  uniform float uCount;
  uniform vec4  uPlane[MAX_PLANES];
  uniform vec4  uBox[MAX_PLANES];
  uniform vec4  uArt[MAX_PLANES];

  // honey threads between neighbours, also precomputed on the CPU
  //   uLinkA: midpoint.xy, unit direction.xy
  //   uLinkB: length, 1/length, radius at the ends, radius at the pinch
  //   uLinkPar: droop, fillet, cull reach (len/2 + rEnd + fillet + 8)
  uniform float uLinkCount;
  uniform vec4  uLinkA[MAX_LINKS];
  uniform vec4  uLinkB[MAX_LINKS];
  uniform vec4  uLinkPar[MAX_LINKS];

  uniform float uK;            // smin blend strength in px
  uniform float uWobble;       // surface tension noise amount, px
  uniform float uTime;
  uniform vec3  uColor;
  uniform vec3  uPage;         // what is behind the ring, for the tag to read

  // All the artwork lives in one atlas: ESSL 1.00 cannot index an array of
  // samplers with a varying index, so a per-plane texture is not an option.
  uniform sampler2D uAtlas;
  uniform vec2  uGrid;         // atlas cells across, down
  uniform float uBlend;        // px over which neighbouring art crossfades
  uniform float uTextured;

  // --- pointer -------------------------------------------------------------
  // Nothing is ever drawn at the cursor. It only changes how the ring behaves
  // around it: the field goes soft, and a wake runs out through the surface.
  // Packed into vec4s for the same reason the link parameters are.
  uniform vec4 uMouse;  // cursor.xy px, presence 0..1, blend px added at it
  uniform vec4 uMelt;   // reach px, wake px, wake frequency, wake speed

  // --- the cursor tag ------------------------------------------------------
  // Drawn in this pass with everything else rather than as an element over the
  // canvas. That is what lets its label inspect the pixels it is sitting on and
  // invert against them, and it means the glass refracts the ring the same way
  // the lip does instead of having to sample it back out of a backdrop.
  uniform sampler2D uTagTex;  // the label; only its alpha is used, as a mask
  uniform vec4 uTag;   // centre.xy px, scale.xy — scale 0 is simply absent
  uniform vec4 uTagP;  // half width, half height, corner radius, refract px
  uniform vec4 uTagQ;  // frost, rim gain, unused, unused

  vec2 atlasUV(vec2 uv, float idx) {
    float col = mod(idx, uGrid.x);
    float row = floor(idx / uGrid.x);
    return (vec2(col, row) + uv) / uGrid;
  }


  // --- glass lip -----------------------------------------------------------
  // A band along the top and bottom of the screen behaving like the rounded
  // edge of a thick glass sheet. Because the whole scene is evaluated from p,
  // warping p here refracts the planes and the honey together, with no second
  // pass and no render target.
  uniform float uBandTop;     // px
  uniform float uBandBottom;  // px
  uniform vec4  uGlass;       // refract px, squeeze, ripple px, ripple freq
  uniform float uFringe;      // px of chromatic split inside the band
  uniform float uSheen;       // lift applied across the lip

  // Warps p in place and returns how deep into the lip this pixel sits, 0..1.
  float glassBend(inout vec2 p) {
    float band = p.y > 0.0 ? uBandTop : uBandBottom;
    if (band <= 0.5) return 0.0;

    float dy = abs(p.y) - (uResolution.y * 0.5 - band);
    if (dy <= 0.0) return 0.0;

    float t = clamp(dy / band, 0.0, 1.0);
    // Circular profile: barely bends at the inner edge, falls away sharply at
    // the very edge, which is what reads as thickness rather than a gradient.
    float bend = 1.0 - sqrt(max(0.0, 1.0 - t * t));

    float s = sign(p.y);
    // Sampling back toward centre throws content outward, so the image
    // stretches forward into the lip and swells as it reaches the edge.
    // Both terms are signed: negatives invert the lip and compress instead.
    p.y -= s * bend * (uGlass.x + sin(p.x * uGlass.w) * uGlass.z);
    p.x *= 1.0 - bend * uGlass.y;

    return bend;
  }

  // --- simplex noise -------------------------------------------------------
  // Copyright (C) 2011 Ashima Arts. All rights reserved.
  // Copyright (C) 2011-2016 by Stefan Gustavson (Classic noise and others)
  // Distributed under the MIT License. https://github.com/ashima/webgl-noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // --- sdf helpers ---------------------------------------------------------
  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // The honey between two planes: a flat slab spanning centre to centre, as
  // wide as the edges it comes off and pinched in the middle, drooping under
  // its own weight.
  //
  // Deliberately not a capsule. A capsule has a round cross-section, so at
  // full merge it bulges out past the flat sides of the planes themselves.
  // This is swept as a box, so while the planes overlap it stays entirely
  // inside them and the silhouette reads as one flat card.
  //
  // Endpoints, direction, length and the cull reach are all resolved on the
  // CPU, so only the per-pixel part is left here.
  float sdBridge(vec2 p, vec2 mid, vec2 dir, vec2 nrm, float len, float invLen, float rEnd, float rMid, float sag) {
    vec2 q = p - mid;
    float along = dot(q, dir);
    float across = dot(q, nrm);

    float h = clamp(along * invLen + 0.5, 0.0, 1.0);
    float bell = sin(3.14159265 * h);           // 0 at the ends, 1 in the middle

    // droop, world -Y, resolved onto the across axis
    across += sag * bell * nrm.y;

    float taper = pow(1.0 - bell, 1.7);         // 1 at the ends, 0 in the middle
    float r = mix(rMid, rEnd, taper);

    // Ends are square and buried inside the planes, so they never show.
    return max(abs(along) - len * 0.5, abs(across) - r);
  }

  // The tag's own outline, scaled by whatever the pop animation is doing.
  float sdTag(vec2 p) {
    vec2 hs = uTagP.xy * abs(uTag.zw);
    return sdRoundBox(p - uTag.xy, hs, min(uTagP.z, min(hs.x, hs.y)));
  }

  // Its surface normal, by difference. A pill's normal is vertical along the
  // flat edges and radial round the ends, so nothing simpler than this gets the
  // refraction pointing the right way the whole way round.
  vec2 tagNormal(vec2 p) {
    vec2 e = vec2(1.0, 0.0);
    vec2 g = vec2(
      sdTag(p + e.xy) - sdTag(p - e.xy),
      sdTag(p + e.yx) - sdTag(p - e.yx)
    );
    float l = length(g);
    return l > 0.0001 ? g / l : vec2(0.0);
  }

  // smooth minimum — this is what makes the shapes read as liquid.
  // Note it also behaves as a plain min() when a is the 1e6 sentinel.
  float smin(float a, float b, float k) {
    if (k <= 0.0001) return min(a, b);
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  void main() {
    // Screen position, kept unbent: the tag is pinned to the cursor, so it is
    // placed and drawn here rather than in the lip's warped space.
    vec2 ps = (vUv - 0.5) * uResolution;

    vec2 p = ps;
    float bend = glassBend(p);

    // The tag refracts whatever is under it, so its warp has to be applied to
    // the sampling position before the field is read — the same order the lip
    // works in. Flat through the middle, bending hard at the rim, which is what
    // reads as a thickness of glass rather than a smear.
    float dTag = sdTag(ps);
    float tagOn = min(abs(uTag.z), abs(uTag.w));
    if (tagOn > 0.001 && dTag < 0.0 && uTagP.w > 0.0) {
      float depth = clamp(-dTag / max(uTagP.y * abs(uTag.w), 1.0), 0.0, 1.0);
      float t = 1.0 - depth;
      p += tagNormal(ps) * (1.0 - sqrt(max(0.0, 1.0 - t * t))) * uTagP.w;
    }

    // Read after the bend, so the cursor acts in the same warped space as the
    // ring: dragged into the lip, its influence is refracted with everything
    // else rather than sitting flat on top of it.
    float toMouse = length(p - uMouse.xy);

    // Blend strength is lifted in a halo around the cursor, so the ring goes
    // soft exactly where it is being touched and stays crisp everywhere else.
    // Resolved once per pixel rather than per plane: it costs one length().
    float k = uK;
    if (uMouse.z > 0.001) {
      float t = 1.0 - smoothstep(0.0, max(uMelt.x, 1.0), toMouse);
      k += uMouse.w * uMouse.z * t * t;
    }

    float d = 1e6;

    // The two planes nearest this pixel, tracked alongside the field so the
    // colour can be resolved without a second pass. In the goo between two
    // planes both are close, which is exactly where the crossfade belongs.
    float d0 = 1e6, d1 = 1e6;
    vec2 uv0 = vec2(0.5), uv1 = vec2(0.5);
    float im0 = 0.0, im1 = 0.0;
    float dm0 = 1.0, dm1 = 1.0;

    for (int i = 0; i < MAX_PLANES; i++) {
      if (float(i) >= uCount) break;

      vec4 box = uBox[i];
      if (box.w < 0.0) continue;                // unborn, or an empty slot

      vec4 pl = uPlane[i];
      vec2 q = p - pl.xy;
      // Anything further out than this cannot affect the surface, so it can be
      // skipped outright — this is what keeps 32 planes affordable. The reach
      // is scaled by the plane rather than fixed, because a plane swollen
      // under the cursor reaches further than its resting size, as does the
      // melt around it.
      float cull = box.w + k + uWobble;
      if (dot(q, q) > cull * cull) continue;

      // into the plane's local frame
      q = vec2(q.x * pl.z + q.y * pl.w, -q.x * pl.w + q.y * pl.z);

      // Rounded box: abs(q) - (halfSize - r), rounded by r.
      vec2 qb = abs(q) - box.xy;
      float di = min(max(qb.x, qb.y), 0.0) + length(max(qb, vec2(0.0))) - box.z;
      d = smin(d, di, k);

      vec4 art = uArt[i];
      // Local UV. Clamped, so the goo outside a plane carries that plane's
      // edge colour rather than repeating or sampling the next atlas cell.
      vec2 luv = q * art.xy + 0.5;
      luv.y = 1.0 - luv.y;
      luv = clamp(luv, 0.004, 0.996);

      if (di < d0) {
        d1 = d0; uv1 = uv0; im1 = im0; dm1 = dm0;
        d0 = di; uv0 = luv; im0 = art.w; dm0 = art.z;
      } else if (di < d1) {
        d1 = di; uv1 = luv; im1 = art.w; dm1 = art.z;
      }
    }

    // Threads strung between neighbours as they pull apart.
    for (int i = 0; i < MAX_LINKS; i++) {
      if (float(i) >= uLinkCount) break;

      vec4 lb = uLinkB[i];
      // Radii are allowed to go negative: that lifts the bridge's field clear
      // of the surface so it fades out, rather than bottoming out at zero as a
      // half-covered hairline. Only cull once it is further out than the
      // antialiasing can reach.
      if (lb.z <= -3.0) continue;

      vec4 la = uLinkA[i];
      vec2 mid = la.xy;
      if (dot(p - mid, p - mid) > uLinkPar[i].z * uLinkPar[i].z) continue;

      vec2 dir = la.zw;
      d = smin(
        d,
        sdBridge(p, mid, dir, vec2(-dir.y, dir.x), lb.x, lb.y, lb.z, lb.w, uLinkPar[i].x),
        uLinkPar[i].y
      );
    }

    // Surface tension wobble, decays to zero so resting planes are dead flat.
    if (uWobble > 0.001) {
      float n = snoise(p * 0.012 + vec2(uTime * 0.22, uTime * -0.17));
      d += n * uWobble;
    }

    // A capillary wake off the cursor, amplitude driven by how fast it is
    // moving. Rings out from it and dies over the same reach the softening
    // uses, so a flick leaves a ripple in the surface that outlives the
    // movement that made it.
    if (uMelt.y > 0.001) {
      d += sin(toMouse * uMelt.z - uTime * uMelt.w)
         * uMelt.y * exp(-toMouse / max(uMelt.x, 1.0));
    }

    // Clamped, not just floored: the distance cull above leaves a step in the
    // field, and an unclamped fwidth across that step paints a half-opaque
    // outline along every cull boundary.
    float aa = clamp(fwidth(d), 0.5, 2.0);
    float alpha = 1.0 - smoothstep(-aa, aa, d);

    // The tag has to survive this: it can overhang the edge of a card, and
    // those pixels are its own even though the ring has nothing there.
    float taa = clamp(fwidth(dTag), 0.5, 2.0);
    float ta = tagOn > 0.001 ? 1.0 - smoothstep(-taa, taa, dTag) : 0.0;

    if (alpha <= 0.001 && ta <= 0.001) discard;

    // Even mix where the two nearest planes are equidistant, resolving to
    // whichever is clearly nearer beyond uBlend. Both the art and the dim are
    // carried across on it, so neither can put a seam down the goo.
    float nearest = smoothstep(-uBlend, uBlend, d1 - d0);

    vec3 col = uColor;
    if (uTextured > 0.5) {
      vec3 c0, c1;

      // Uniform branch, so the derivatives the mip selection needs stay
      // defined. The offset is scaled by bend, so outside the lip the three
      // taps land on the same texel and there is no fringe — which is also why
      // bend can gate the extra two taps without changing a pixel: at bend 0
      // the three taps are the same sample, and the three-tap path costs three
      // times as much over the ~85% of the screen that is outside the lip.
      if (uFringe > 0.0 && bend > 0.0) {
        vec2 fr = vec2(uFringe * bend / max(uSize.x, 1.0), 0.0);
        c0 = vec3(
          texture2D(uAtlas, atlasUV(uv0 + fr, im0)).r,
          texture2D(uAtlas, atlasUV(uv0, im0)).g,
          texture2D(uAtlas, atlasUV(uv0 - fr, im0)).b
        );
        c1 = vec3(
          texture2D(uAtlas, atlasUV(uv1 + fr, im1)).r,
          texture2D(uAtlas, atlasUV(uv1, im1)).g,
          texture2D(uAtlas, atlasUV(uv1 - fr, im1)).b
        );
      } else {
        c0 = texture2D(uAtlas, atlasUV(uv0, im0)).rgb;
        c1 = texture2D(uAtlas, atlasUV(uv1, im1)).rgb;
      }

      col = mix(c1, c0, nearest);
    }

    // Cards standing off the one being pointed at are turned down, so the
    // hovered card reads as the lit one. Untextured, uColor is already almost
    // black and there is nothing here to see — which is fine, that mode exists
    // to read the goo's silhouette.
    col *= mix(dm1, dm0, nearest);

    // A touch of lift where the lip is steepest, so the band reads as a
    // surface catching light rather than only a warp.
    col += bend * uSheen;

    // --- the tag -------------------------------------------------------------
    if (ta > 0.001) {
        // Where the ring does not reach, the page is what shows through the
        // glass, so the label has something real to read there too.
        vec3 under = mix(uPage, col, alpha);
        vec3 glass = mix(under, vec3(1.0), uTagQ.x);

        // Rim: lit where it faces the light, dark where it turns away. Signing
        // it is what gives an edge that reads as thickness rather than as an
        // outline drawn on.
        float band = clamp(1.0 + dTag / max(uTagP.z, 1.0), 0.0, 1.0);
        glass += band * band * uTagQ.y *
                 dot(tagNormal(ps), vec2(-0.7071, 0.7071));

        // The label. Pure black or pure white, decided per pixel from what that
        // pixel is sitting on, so a glyph crossing a light edge onto a dark one
        // changes colour halfway across. A blend cannot do this — inverting a
        // mid grey returns a mid grey — and picking one colour for the whole
        // label cannot either.
        vec2 tuv = (ps - uTag.xy) / (uTagP.xy * 2.0 * abs(uTag.zw)) + 0.5;
        float m = texture2D(uTagTex, clamp(tuv, 0.0, 1.0)).a;
        float l = dot(glass, vec3(0.2126, 0.7152, 0.0722));
        // Narrow, not hard: a step here would alias along the boundary.
        glass = mix(glass, vec3(1.0 - smoothstep(0.46, 0.54, l)), m);

      col = mix(col, glass, ta);
      alpha = max(alpha, ta);
    }

    // Written straight through. The atlas is tagged NoColorSpace so sampling
    // returns the authored sRGB values, and this shader adds no output
    // encoding of its own — decoding on read without encoding on write is
    // what darkens everything.
    gl_FragColor = vec4(col, alpha);
  }
`,x=512,S=Math.round(x/1.5),C=(e,t,n)=>new Promise((r,i)=>{let a=new Image;t&&(a.fetchPriority=t),a.crossOrigin=`anonymous`;let o=!1;a.onload=()=>r(a),a.onerror=()=>{if(n&&!o){o=!0,a.src=n;return}i(Error(`failed to load ${e}`))},a.src=e}),ie=e=>/^(https?:|data:|blob:)/.test(e)?e:`/ce/${String(e).replace(/^\/+/,``)}`.replace(/\/+/g,`/`),ae=e=>{let t=ie(e);return i(t)??t};function oe(e=r,t,n){let i=Math.ceil(Math.sqrt(e.length)),a=Math.ceil(e.length/i),o=document.createElement(`canvas`);o.width=i*x,o.height=a*S;let s=o.getContext(`2d`),c=new v(o);c.flipY=!1,c.colorSpace=``,c.wrapS=f,c.wrapT=f,c.minFilter=g,c.magFilter=_,c.generateMipmaps=!0;let l=(e,t)=>{let n=t%i*x,r=Math.floor(t/i)*S,a=Math.max(x/e.width,S/e.height),o=e.width*a,c=e.height*a;s.save(),s.beginPath(),s.rect(n,r,x,S),s.clip(),s.drawImage(e,n+(x-o)/2,r+(S-c)/2,o,c),s.restore()},u=0,d=0,p=()=>t?.(u/e.length),m=(t,r)=>C(ae(e[t]),r,ie(e[t])).then(e=>l(e,t)).catch(r=>{d++,console.warn(`[atlas]`,r.message),n?.(Error(`Atlas ${d}/${e.length} failed: ${e[t]}`),{failed:d,total:e.length})}).finally(()=>{u++,p()}),h=m(0,`high`).then(()=>{c.needsUpdate=!0}),ee=Promise.all([h,...e.slice(1).map((e,t)=>m(t+1,`low`))]).then(()=>{c.needsUpdate=!0});return p(),{texture:c,grid:[i,a],count:e.length,first:h,ready:ee}}var se=[`left`,`right`],ce=2,w=e=>e?.firstElementChild?.children,T=new WeakMap;function E(e,t,n){let r=T.get(e);r===void 0&&(r=Object.create(null),T.set(e,r)),r[t]!==n&&(r[t]=n,e.style[t]=n)}function D(e,t,n){e&&(t>=1?(E(e,`filter`,`none`),E(e,`opacity`,`1`)):t<=0?(E(e,`filter`,`none`),E(e,`opacity`,`0`)):(E(e,`filter`,`blur(${Math.min(n/t-n,100)}px)`),E(e,`opacity`,`${t**.4}`)))}function O(e,t,n){let r={t:1},i=[``,``],a=[!1,!1],o=()=>{let i=t[e];if(!i)return;let o=w(i.layers[0]),s=w(i.layers[1]),c=w(i.plain),l=r.t;for(let e=0;e<ce;e++)a[e]?(D(o?.[e],1-l,n.nameBlur),D(s?.[e],l,n.nameBlur),c?.[e]&&E(c[e],`opacity`,`0`)):(o?.[e]&&E(o[e],`opacity`,`0`),s?.[e]&&E(s[e],`opacity`,`0`),c?.[e]&&E(c[e],`opacity`,`1`));i.goo&&E(i.goo,`filter`,l>=1?`none`:`url(#name-goo) blur(${n.nameSoften}px)`)};return{m:r,set:s=>{let c=t[e];if(!c?.layers[0]||!c.layers[1]||!c.plain)return;y.killTweensOf(r),r.t=1,o();let l=[s[0]??``,s[1]??``];a=[l[0]!==i[0],l[1]!==i[1]];let u=w(c.layers[0]),d=w(c.layers[1]),f=w(c.plain);for(let e=0;e<ce;e++)u?.[e]&&(u[e].textContent=i[e]),d?.[e]&&(d[e].textContent=l[e]),f?.[e]&&(f[e].textContent=l[e]);if(i=l,!a[0]&&!a[1]){r.t=1,o();return}r.t=0,o(),y.to(r,{t:1,duration:n.nameMorphTime,ease:n.nameEase,onUpdate:o})}}}function le(e,t,n){let{groups:r,list:i,loader:a,cut:o,live:s}=e,c=O(`left`,r,t),l=O(`right`,r,t),u=()=>{o?.setAttribute(`values`,`1 0 0 0 0
       0 1 0 0 0
       0 0 1 0 0
       0 0 0 ${t.nameEdge} ${-t.nameEdge*t.nameCut}`)};return{show:e=>{let t=n[e];t&&(c.set([String(e+1).padStart(2,`0`),t.name]),l.set([t.type,t.year]),s&&(s.textContent=`${t.name}. ${t.type}, ${t.year}.`))},style:({textK:e,tight:n,viewW:o})=>{let s=t.nameSize*e*(n?t.tightName:1),c=`${s}vw`,l=`${t.idxSize*e}vw`,d=`"${t.nameFont}", ui-sans-serif, system-ui, sans-serif`,f=`"${t.idxFont}", ui-sans-serif, system-ui, sans-serif`,p=`${t.nameWeight}`,m=`${t.idxWeight}`,h=s*3;for(let e of se){let i=r[e];if(!i?.box)continue;let a=e===`right`,u=n&&!a;if(n&&a){i.box.style.display=`none`;continue}if(i.box.style.display=``,i.box.style.width=`${u?t.tightMetaWidth:t.metaWidth}vw`,i.box.style.height=`${h}vw`,u){let e=h*o/100,n=s*o/100;i.box.style.top=`auto`,i.box.style.left=`auto`,i.box.style.right=`${t.tightNameRight}px`,i.box.style.bottom=`calc(${t.tightNameBottom}vh + ${n*.5-e*.5}px)`,i.box.style.transform=`none`}else i.box.style.top=``,i.box.style.bottom=``,i.box.style.transform=``,i.box.style.left=a?`auto`:`${t.metaLeft}vw`,i.box.style.right=a?`${t.metaRight}vw`:`auto`;for(let e of[...i.layers,i.plain]){if(!e)continue;e.style.justifyContent=u||a?`flex-end`:`flex-start`;let n=e.firstElementChild;n.style.gap=`${a?t.metaGapR:t.metaGapL}vw`;let[r,i]=n.children;r.style.display=u?`none`:``,r.style.fontFamily=a?d:f,r.style.fontSize=a?c:l,r.style.fontWeight=a?p:m,i.style.fontFamily=a?f:d,i.style.fontSize=a?l:c,i.style.fontWeight=a?m:p}}i&&(i.style.fontSize=`${t.listSize*e}vw`),a&&(a.style.bottom=`${t.loaderBottom}vh`,a.style.fontFamily=f,a.style.fontSize=l,a.style.fontWeight=m),u()},setThreshold:u,dispose:()=>{y.killTweensOf(c.m),y.killTweensOf(l.m)}}}var ue=`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,de=`
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uReveal;
  uniform vec3  uColor;
  uniform float uOpacity;

  void main() {
    float gy = vUv.y + 1.0 - uReveal;
    if (gy > 1.0 || gy < 0.0) discard;

    float a = texture2D(uTex, vec2(vUv.x, gy)).a;
    if (a <= 0.001) discard;

    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;function fe(e,t){let n=[],r=[],i=()=>{for(let t of[...e.children])e.remove(t),t.geometry.dispose(),t.material.uniforms.uTex.value?.dispose(),t.material.dispose();n=[],r=[]};return{build:()=>{i();let a=t.textSize,o=Math.min(window.devicePixelRatio,2)*2,s=`${t.textWeight} ${a}px "${t.textFont}", ui-sans-serif, system-ui, sans-serif`,c=document.createElement(`canvas`).getContext(`2d`);c.font=s;let f=[...t.text],p=f.map(e=>c.measureText(e).width),m=t.textTracking*a,h=p.reduce((e,t)=>e+t,0)+m*(f.length-1),g=a*.25,te=a*1.3+g*2,y=-h/2;f.forEach((i,c)=>{let f=p[c];if(i.trim()){let c=f+g*2,p=document.createElement(`canvas`);p.width=Math.max(1,Math.ceil(c*o)),p.height=Math.max(1,Math.ceil(te*o));let m=p.getContext(`2d`);m.scale(o,o),m.font=s,m.textBaseline=`alphabetic`,m.fillStyle=`#000`,m.fillText(i,g,g+a);let h=new v(p);h.colorSpace=``,h.minFilter=_,h.magFilter=_,h.generateMipmaps=!1;let b=new l({vertexShader:ue,fragmentShader:de,uniforms:{uTex:{value:h},uReveal:{value:0},uColor:{value:new ee(t.textColor)},uOpacity:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1}),ne=new d(new u(1,1),b);ne.scale.set(c,te,1),ne.position.set(y+f/2,0,0),ne.renderOrder=0,e.add(ne),n.push(b.uniforms.uReveal),r.push(b.uniforms.uOpacity)}y+=f+m})},dispose:i,get chars(){return n},get fades(){return r}}}function pe(e,t){let n={sx:.5,sy:0},r=new Image,i=!1,a=null;return{box:n,build:()=>{let n=Math.min(window.devicePixelRatio,2)*2,o=document.createElement(`canvas`);o.width=Math.ceil(104*n),o.height=Math.ceil(40*n);let s=o.getContext(`2d`);s.scale(n,n),s.font=`${e.tagWeight} ${e.tagSize}px "${e.textFont}", ui-sans-serif, system-ui, sans-serif`,s.textBaseline=`middle`,s.fillStyle=`#fff`;let c=s.measureText(e.tagText).width,l=(104-(e.tagArrow+e.tagGap+c))*.5;if(s.fillText(e.tagText,l+e.tagArrow+e.tagGap,20),i){let t=(40-e.tagArrow)*.5;s.drawImage(r,l,t,e.tagArrow,e.tagArrow)}a?.dispose(),a=new v(o),a.colorSpace=``,a.minFilter=_,a.magFilter=_,a.generateMipmaps=!1,t.uTagTex.value=a},show:e=>{y.killTweensOf(n),e?(y.to(n,{sx:1,duration:.62,ease:`elastic.out(1, 0.5)`}),y.to(n,{sy:1,duration:.74,ease:`elastic.out(1, 0.42)`})):y.to(n,{sx:.5,sy:0,duration:.28,ease:`power3.in`})},load:e=>{r.onload=()=>{i=!0,e?.()},r.src=`/ce/arrow-up-right.svg`.replace(/\/+/g,`/`)},dispose:()=>{y.killTweensOf(n),a?.dispose()}}}function me(){return{refWidth:1512,refHeight:870,fitHeight:0,minScale:.5,maxScale:1.75,narrowAt:1024,narrowPlane:1.25,narrowRadius:1.3,narrowText:1.5,narrowEndScale:4.22,tightAt:640,tightRadius:.82,tightSplit:.8,tightName:1.5,tightNameBottom:13,tightNameRight:16,tightMetaWidth:70,planeSize:90,count:10,ringRadius:340,seed:0,radial:!0,radius:6,textured:!0,blend:14,imageOffset:0,holdAfter:0,loaderChase:.18,loaderBottom:7,loaderOut:.45,stagger:.34,launchTime:1.95,spreadEase:`power2.out`,spreadTime:3.6,stageAt:.7,spinTurns:1,spinTime:2.6,spinEase:`power2.inOut`,spinDelay:0,posX:0,posY:0,endScale:4.46,moveTime:2.2,moveEase:`power2.inOut`,moveDelay:.2,scrollSpeed:.0022,damping:.94,maxSpeed:12,dragSpeed:1,snap:!0,snapTime:.8,snapFrom:1,pickTime:.55,pickEase:`power3.inOut`,text:`Stories '26`,textSize:41,textFont:`Italiana`,textWeight:400,textTracking:0,textColor:`#f5f3ee`,textAt:.42,textTime:.95,textStagger:.015,textEase:`power4.out`,textOut:!0,textOutAt:-.5,textOutTime:.7,textOutEase:`power2.in`,metaLeft:5.5,metaRight:5.5,metaGapL:4.7,metaGapR:3.6,metaWidth:34,nameSize:24/1440*100,nameFont:`Manrope`,nameWeight:500,idxSize:16/1440*100,idxFont:`Manrope`,idxWeight:400,listSize:.9,nameMorphTime:1.2,nameEase:`circ.out`,nameBlur:8.5,nameEdge:400,nameCut:.33,nameSoften:.35,glass:!0,bandTop:.08,bandBottom:.08,refract:60,squeeze:.05,ripple:5,rippleFreq:.02,fringe:1.5,sheen:.05,hover:!0,touchHold:.16,touchSlop:10,lag:.3,melt:34,meltReach:260,reach:1.7,swell:.09,pull:26,grab:.14,release:.06,web:.2,webReach:1.15,wave:4,waveFreq:.05,waveSpeed:7,sideScale:.035,sidePush:17,sideDim:.15,sideReach:2.4,tagFrom:1024,tagText:`View`,tagSize:14,tagWeight:500,tagArrow:14,tagGap:6,tagX:64,tagY:-38,tagFrost:.16,tagRim:.02,tagRefract:39.5,thread:1,thin:.4,pinch:.35,sag:6,dissolve:2.9,fillet:14,wobble:3,goo:35}}var k=Math.PI*2,he=Math.PI/2,ge=Math.PI/180,A=e=>e<0?0:e>1?1:e,_e=e=>1-(1-e)**3,ve=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,ye=(e,t,n)=>{let r=A((n-e)/(t-e));return r*r*(3-2*r)},be=e=>e===0?0:e%2==1?(e+1)/2:-e/2,xe=(e,t)=>1-(1-t)**(e*60),j=n(),Se=.06,Ce=()=>{let e=new m(new Uint8Array([255,255,255,255]),1,1);return e.needsUpdate=!0,e};function M({theme:e=`dark`,projects:t=a,onActiveChange:n,onOpenProject:r,onError:i}){let f=(0,b.useRef)(null),g=(0,b.useRef)(null),_=(0,b.useRef)([]),v=(0,b.useRef)(null),x=(0,b.useRef)(null),S=(0,b.useRef)(null),C=(0,b.useRef)(e);C.current=e;let ie=(0,b.useRef)(n);ie.current=n;let ae=(0,b.useRef)(r);ae.current=r;let se=(0,b.useRef)(i);se.current=i;let ce=(0,b.useRef)(null),w=(0,b.useRef)({left:{box:null,goo:null,layers:[],plain:null},right:{box:null,goo:null,layers:[],plain:null}});(0,b.useEffect)(()=>{let e=f.current,n=g.current,r=v.current,i=!1,b=`ce-wheel-seen`,T=(()=>{try{return sessionStorage.getItem(b)===`1`}catch{return!1}})(),E=(()=>{try{return window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0}catch{return!1}})(),D=me(),O=Array.isArray(t)&&t.length>0?t:a;O.length>32&&console.warn(`[wheel] ${O.length} stories exceed MAX_PLANES=32 — clamping`),D.count=Math.min(Math.max(1,O.length),32);let ue=O.slice(0,32),de={dark:{page:`#050505`,ink:`#f5f3ee`},light:{page:`#F4F2ED`,ink:`#1c1c1c`}},j=e=>{let t=de[e]||de.dark;D.textColor=t.ink,B.uPage.value.set(t.page);for(let e of Oe.children)e.material.uniforms.uColor.value.set(t.ink)},M={progress:0,launch:0,spread:0,spin:0,shift:0},N;try{N=new te({antialias:!1,alpha:!0,depth:!1,stencil:!1,powerPreference:`high-performance`})}catch(e){console.error(`[ring] could not create a WebGL context:`,e),se.current?.(e);return}let we=[Math.min(window.devicePixelRatio||1,1.5),1.25,1,.85,.7].filter((e,t,n)=>t===0||e<n[t-1]-1e-6),P=0,F=0,I=0,Te=!1,L=!0,R=1;N.setPixelRatio(we[0]),e.appendChild(N.domElement);let Ee=new s,z=new p(-1,1,1,-1,-100,100),B={uResolution:{value:new o(1,1)},uSize:{value:new o(150,100)},uCount:{value:D.count},uPlane:{value:Array.from({length:32},()=>new c)},uBox:{value:Array.from({length:32},()=>new c(0,0,0,-1))},uArt:{value:Array.from({length:32},()=>new c(0,0,1,0))},uLinkCount:{value:0},uLinkA:{value:Array.from({length:32},()=>new c)},uLinkB:{value:Array.from({length:32},()=>new c)},uLinkPar:{value:Array.from({length:32},()=>new c)},uK:{value:D.goo},uWobble:{value:D.wobble},uTime:{value:0},uColor:{value:new ee(`#0a0a0a`)},uAtlas:{value:Ce()},uGrid:{value:new o(1,1)},uBlend:{value:D.blend},uTextured:{value:0},uBandTop:{value:0},uBandBottom:{value:0},uGlass:{value:new c},uFringe:{value:0},uSheen:{value:0},uMouse:{value:new c},uMelt:{value:new c},uTagTex:{value:new m(new Uint8Array([0,0,0,0]),1,1)},uTag:{value:new c},uTagP:{value:new c},uTagQ:{value:new c},uPage:{value:new ee(C.current===`light`?`#F4F2ED`:`#050505`)}},De=new d(new u(1,1),new l({vertexShader:ne,fragmentShader:re,uniforms:B,transparent:!0,depthWrite:!1}));De.renderOrder=10,Ee.add(De);let Oe=new h;Ee.add(Oe);let ke=fe(Oe,D),V=pe(D,B),Ae=le({groups:w.current,list:n,loader:r,cut:S.current,live:x.current},D,ue),je=!1,Me=0,Ne=!1,Pe=[],Fe=e=>Ne?e():Pe.push(e),Ie=oe(ue.map(e=>e.file),e=>{i||(Me=e)});B.uAtlas.value.dispose(),Ie.texture.anisotropy=Math.min(4,N.capabilities.getMaxAnisotropy()),B.uAtlas.value=Ie.texture,B.uGrid.value.set(Ie.grid[0],Ie.grid[1]);let Le=Ie.count;Ie.first.then(()=>{i||(je=!0,L=!0,$())}),Ie.ready.then(()=>{i||(Me=1,L=!0,$())});let H=1,U=1,Re={left:0,top:0},W=1,ze=1,Be=1,Ve=1,He=!1,Ue=!1,We=()=>{let e=H/Math.max(1,D.refWidth),t=U/Math.max(1,D.refHeight),n=e*(1-D.fitHeight)+Math.min(e,t)*D.fitHeight;W=Math.min(D.maxScale,Math.max(D.minScale,n));let r=H<=D.narrowAt,i=H<=D.tightAt;He=r,Ue=i,ze=r?D.narrowPlane:1,Be=(r?D.narrowRadius:1)*(i?D.tightRadius:1),Ve=r?D.narrowText:1,`${Math.round(H)}${Math.round(U)}`,Math.round(W*1e3)/1e3;let a=W*Ve*(i?D.tightSplit:1);Oe.scale.set(a,a,1)},Ge=()=>Ae.style({textK:Ve,tight:Ue,viewW:H}),Ke=()=>{H=e.clientWidth,U=e.clientHeight,We(),N.setSize(H,U),z.left=-H/2,z.right=H/2,z.top=U/2,z.bottom=-U/2,z.updateProjectionMatrix(),De.scale.set(H,U,1),B.uResolution.value.set(H,U);let t=N.domElement.getBoundingClientRect();Re.left=t.left,Re.top=t.top,L=!0},qe=()=>{$(),Ke(),Ge()};Ke(),window.addEventListener(`resize`,qe);let Je={x:0,y:0},Ye=0,G=!1,K=0,Xe=!1,Ze=0,Qe=0,q=!1,$e=0,et=0,J=!1,tt=0,nt=0,rt=0,it=e=>{let t=e.clientX-Re.left-Je.x,n=e.clientY-Re.top-Je.y;return Math.atan2(-n,t)},at=()=>{J&&=(y.killTweensOf(M),!1)};function ot(){!G&&Qt&&Qt.progress(1,!1)}let st=e=>Le>0?((Math.round(D.imageOffset)-e)%Le+Le)%Le:0,ct=e=>{let t=k/Math.round(D.count),n=Ye-D.seed*ge-be(e)*t,r=n+Math.round((M.spin-n)/k)*k;return{slots:Math.abs(r-M.spin)/t,target:r,slot:t}},lt=e=>{let{slots:t,target:n}=ct(e);if(t<.01){ae.current?.(st(be(e)));return}K=0,q=!1,J=!0,y.killTweensOf(M),y.to(M,{spin:n,duration:D.pickTime*Math.sqrt(Math.max(1,t)),ease:D.pickEase,onComplete:()=>{J=!1}})},Y={x:0,y:0,inside:!1,seeded:!1},X={x:0,y:0,amt:0,target:0,wake:0},Z=new Float64Array(192),ut=0,dt=(e,t,n)=>{let r=e*6,i=t-Z[r],a=n-Z[r+1],o=Z[r+4],s=Z[r+5];return Math.abs(i*o+a*s)<=Z[r+2]&&Math.abs(-i*s+a*o)<=Z[r+3]},ft=!1,pt=!1,mt=0,ht=()=>{clearTimeout(mt),mt=0,pt=!1},gt=()=>{clearTimeout(mt),mt=setTimeout(()=>{pt=!0},D.touchHold*1e3)},_t=()=>ft?pt:Y.inside,vt=e=>{ft=e.pointerType===`touch`,Y.x=e.clientX-Re.left-H*.5,Y.y=U*.5-(e.clientY-Re.top),Y.inside=!0,Y.seeded||(Y.seeded=!0,X.x=Y.x,X.y=Y.y)},yt=()=>{$(),Y.inside=!1},bt=e=>{if($(),!G){ot();return}e.preventDefault();let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;at(),q=!1,K+=t*D.scrollSpeed,K=Math.max(-D.maxSpeed,Math.min(D.maxSpeed,K))},xt=e=>{if($(),tt=0,nt=e.clientX,rt=e.clientY,vt(e),!G){ot();return}at(),ft&&gt(),Xe=!0,q=!1,K=0,Ze=it(e),Qe=performance.now(),N.domElement.setPointerCapture?.(e.pointerId)},St=e=>{if($(),vt(e),tt+=Math.abs(e.clientX-nt)+Math.abs(e.clientY-rt),nt=e.clientX,rt=e.clientY,ft&&!pt&&tt>D.touchSlop&&ht(),!Xe)return;let t=it(e),n=t-Ze;n>Math.PI&&(n-=k),n<-Math.PI&&(n+=k);let r=n*D.dragSpeed;M.spin+=r;let i=performance.now();K=r/(Math.max(8,i-Qe)/1e3),Ze=t,Qe=i},Ct=e=>{if($(),vt(e),ht(),Xe){Xe=!1;try{N.domElement.releasePointerCapture?.(e.pointerId)}catch{}}},wt=e=>{if($(),!G){ot();return}if(tt>=5)return;let t=Gt;if(t<0){let n=e.clientX-Re.left-H*.5,r=U*.5-(e.clientY-Re.top);for(let e=0;e<ut;e++)if(dt(e,n,r)){t=e;break}}t<0||lt(t)};e.addEventListener(`wheel`,bt,{passive:!1}),e.addEventListener(`pointerdown`,xt),e.addEventListener(`pointermove`,St),e.addEventListener(`pointerup`,Ct),e.addEventListener(`pointercancel`,Ct),e.addEventListener(`pointerleave`,yt),e.addEventListener(`click`,wt);let Tt=e=>{if(e.target?.closest?.(`[role="dialog"]`)||($(),!G))return;let t=k/Math.max(1,Math.round(D.count));e.key===`ArrowRight`||e.key===`ArrowDown`?(e.preventDefault(),at(),q=!1,K=0,J=!0,y.killTweensOf(M),y.to(M,{spin:M.spin-t,duration:D.pickTime,ease:D.pickEase,onComplete:()=>{J=!1}})):(e.key===`ArrowLeft`||e.key===`ArrowUp`)&&(e.preventDefault(),at(),q=!1,K=0,J=!0,y.killTweensOf(M),y.to(M,{spin:M.spin+t,duration:D.pickTime,ease:D.pickEase,onComplete:()=>{J=!1}}))};window.addEventListener(`keydown`,Tt);let Et=e=>{let t=D.hover&&_t()&&Y.seeded&&G;X.target=+!!t,X.amt+=(X.target-X.amt)*xe(e,.12);let n=xe(e,D.lag);X.x+=(Y.x-X.x)*n,X.y+=(Y.y-X.y)*n;let r=Math.hypot(Y.x-X.x,Y.y-X.y);X.wake=Math.max(X.wake*.94**(e*60),A(r/(Math.max(e,.001)*2600))),B.uMouse.value.set(X.x,X.y,X.amt,D.melt*W),B.uMelt.value.set(D.meltReach*W,D.wave*W*X.wake*X.amt,D.waveFreq,D.waveSpeed)},Dt={shown:0,last:-1},Ot=e=>{let t=Math.min(Me,A(M.progress));Dt.shown+=(t-Dt.shown)*xe(e,D.loaderChase);let n=Math.min(100,Math.max(1,Math.round(Dt.shown*100)));if(r&&n!==Dt.last&&(Dt.last=n,r.textContent=String(n).padStart(3,`0`)),!Ne&&n>=100){Ne=!0;for(let e of Pe)e();Pe.length=0}},kt=new Float32Array(32),At=new Float32Array(32),jt=[],Mt=-1,Nt=e=>{if(Mt!==e){Mt=e,jt.length=0;for(let t=0;t<e;t++)jt.push(t);jt.sort((e,t)=>be(e)-be(t))}return jt},Pt=Array.from({length:32},()=>new o),Ft=new Float32Array(32),It=new Float32Array(32),Lt=new Float32Array(32),Rt=new Float32Array(32),zt=new Float32Array(32),Bt=new Float32Array(32),Vt=new Float32Array(32),Ht=new o,Ut=e=>Math.max(.05,1+D.swell*Ft[e]-D.sideScale*Vt[e]),Q=-1,Wt=-1,Gt=-1,Kt=!1,qt=-1,Jt=()=>{let e=_.current;if(qt<0)for(let t=0;t<e.length;t++){let n=e[t];if(!n)continue;let r=t===Q;n.style.opacity=r?`1`:`0.2`,r?n.setAttribute(`aria-current`,`true`):n.removeAttribute(`aria-current`)}else{let t=e[qt];t&&(t.style.opacity=`0.2`,t.removeAttribute(`aria-current`));let n=e[Q];n&&(n.style.opacity=`1`,n.setAttribute(`aria-current`,`true`))}qt=Q},Yt=e=>{let t=Math.round(D.count);ut=t,B.uCount.value=t;let n=k/t,r=A(M.spread),i=He?D.narrowEndScale:D.endScale,a=A(M.shift),o=(1+(i-1)*a)*W,s=D.ringRadius*Be*o,c=(-s+D.posX*H*.5)*a,l=D.posY*U*.5*a;Je.x=H*.5+c,Je.y=U*.5-l,Ye=c!==0||l!==0?Math.atan2(-l,-c):0;let u=D.planeSize*ze*o,d=u/1.5;B.uSize.value.set(u,d);let f=D.radius*ze*o,p=Math.hypot(u,d)*.5,m=D.radial?d:u,h=D.radial?u:d,g=2*s*Math.sin(n/2)-m;Math.round(g/o*10)/10;let _=Math.max(1,g),v=Math.max(1,Math.abs(be(t-1))),ee=Math.max(.1,.94-D.stagger);At[0]=0;for(let e=1;e<=v;e++){let t=A((r-(Se+(e-1)/v*D.stagger))/ee),n=t*t*(3-2*t);kt[e]=n,At[e]=At[e-1]+n}let te=D.seed*ge,y=ve(A(M.launch)),b=s*y,ne=X.amt>.001,re=Math.max(1,D.reach*u),x=Math.max(1,D.sideReach*u),S=xe(e,D.grab),C=xe(e,D.release),ie=-1,ae=1e9,oe=0,se=Math.round(D.imageOffset),ce=e=>Le>0?((se-e)%Le+Le)%Le:0,w=Y.inside&&Y.seeded&&G,T=-1,E=ne?Gt:-1;R=0;for(let e=0;e<t;e++){let t=be(e),r=Math.abs(t),i=e===0?A(M.progress):kt[r],a=ce(t),o=te+Math.sign(t)*n*At[r]+M.spin,s=Math.cos(o)*b+c,m=Math.sin(o)*b+l;Pt[e].set(s,m);let h=o-Ye,g=Math.abs(Math.atan2(Math.sin(h),Math.cos(h)));g<ae&&(ae=g,ie=e,oe=a);let _=0,v=0,ee=0;if(ne){let e=X.x-s,t=X.y-m,n=Math.hypot(e,t);if(_=ye(re,re*.22,n)*X.amt*i,_>1e-4&&n>1e-4){let r=D.pull*W*_/n;v=e*r,ee=t*r}}let se=_>Ft[e]?S:C,O=_-Ft[e],le=v-It[e],ue=ee-Lt[e];Ft[e]+=O*se,It[e]+=le*se,Lt[e]+=ue*se,Math.abs(O)>R&&(R=Math.abs(O)),Math.abs(le)>R&&(R=Math.abs(le)),Math.abs(ue)>R&&(R=Math.abs(ue));let de=0;if(E>=0&&e!==E){let e=Math.hypot(Ht.x-s,Ht.y-m);de=ye(x,x*.2,e)*i}let fe=de-Vt[e];Vt[e]+=fe*(de>Vt[e]?S:C),Math.abs(fe)>R&&(R=Math.abs(fe));let pe=0,me=0;if(Vt[e]>1e-4){let t=s-Ht.x,n=m-Ht.y,r=Math.hypot(t,n);if(r>1e-4){let i=D.sidePush*W*Vt[e]/r;pe=t*i,me=n*i}}let k=s+It[e]+pe,ge=m+Lt[e]+me,ve=(D.radial?o:o+he)*y,xe=_e(A(e===0?i/.7:i/.34)),j=_e(A(e===0?(i-.18)/.74:(i-.06)/.36)),Se=Ut(e),Ce=xe*Se,N=j*Se;Rt[e]=xe,zt[e]=j;let we=Math.cos(ve),P=Math.sin(ve),F=Math.max(u*.5*Ce,1e-4),I=Math.max(d*.5*N,1e-4),Te=Math.min(F,I),L=Math.min(Te,Te+(f-Te)*ye(.3,1,Math.min(Ce,N))),Ee=Math.max(Ce,N);B.uPlane.value[e].set(k,ge,we,P),B.uBox.value[e].set(F-L,I-L,L,Ee>1e-4?p*Ee+8:-1),B.uArt.value[e].set(1/(2*F),1/(2*I),1-D.sideDim*Vt[e],a);let z=e*6;Z[z]=k,Z[z+1]=ge,Z[z+2]=F,Z[z+3]=I,Z[z+4]=we,Z[z+5]=P,w&&T<0&&dt(e,X.x,X.y)&&(T=e)}for(let e=t;e<32;e++)B.uBox.value[e].set(0,0,0,-1),Ft[e]=0,It[e]=0,Lt[e]=0,Vt[e]=0;Gt=T;let O=Gt>=0&&!ft&&H>D.tagFrom;O!==Kt&&(Kt=O,V.show(O)),Gt>=0&&Ht.copy(Pt[Gt]),B.uTag.value.set(X.x+D.tagX,X.y+D.tagY,V.box.sx,V.box.sy),B.uTagP.value.set(52,20,20,D.tagRefract),B.uTagQ.value.set(D.tagFrost,D.tagRim,0,0),ie>=0&&Le>0&&oe!==Q&&(Q=oe,Jt());let le=Nt(t),ue=h*.5*D.thread,de=Math.min(r>.995&&t>2?t:t-1,32);for(let e=0;e<de;e++){let n=le[e],r=le[(e+1)%t],i=B.uPlane.value[n],a=B.uPlane.value[r],s=D.radial?zt[n]:Rt[n],c=D.radial?zt[r]:Rt[r],l=A((Pt[n].distanceTo(Pt[r])-m*.5*(s+c))/_),d=(i.x+a.x)*.5,f=(i.y+a.y)*.5,p=0;if(ne&&D.web>1e-4){let e=Math.max(1,D.webReach*u),t=Math.hypot(X.x-d,X.y-f);p=ye(e,e*.15,t)*X.amt}let h=p-Bt[e];Bt[e]+=h*(p>Bt[e]?S:C),Math.abs(h)>R&&(R=Math.abs(h));let g=ue*Math.max((1-l)**D.thin,D.web*Bt[e])-D.dissolve,v=g*(1-(1-D.pinch)*ye(0,.7,l)),ee=Math.min(D.fillet*o*ye(0,.35,l),Math.max(v,0)*1.5),te=a.x-i.x,y=a.y-i.y,b=Math.hypot(te,y),re=b>.001?1/b:0,x=b>.001?te*re:1,ie=b>.001?y*re:0;B.uLinkA.value[e].set(d,f,x,ie),B.uLinkB.value[e].set(b,re,b>.001?g:-100,v),B.uLinkPar.value[e].set(D.sag*o*l**1.5,ee,b*.5+g+ee+8,0)}for(let e=de;e<32;e++)B.uLinkB.value[e].set(0,0,-100,0);B.uLinkCount.value=de,B.uK.value=D.goo*ze*W,B.uWobble.value=D.wobble*W*(1-ye(.2,.95,M.progress)),B.uTextured.value=D.textured&&je?1:0,B.uBlend.value=Math.max(.5,D.blend*ze*o);let fe=D.glass;B.uBandTop.value=fe?D.bandTop*U:0,B.uBandBottom.value=fe?D.bandBottom*U:0,B.uGlass.value.set(D.refract,D.squeeze,D.ripple,D.rippleFreq),B.uFringe.value=fe?D.fringe:0,B.uSheen.value=fe?D.sheen:0},Xt=0,Zt=()=>{G=!1,Wt=-1,K=0,Xe=!1,q=!1,at();let e=++Xt;r&&y.set(r,{opacity:+!Ne});let t=y.timeline({delay:.25,onComplete:()=>{G=!0;try{sessionStorage.setItem(b,`1`)}catch{}}});t.fromTo(M,{progress:0,launch:0,spread:0,spin:0,shift:0},{progress:1,duration:1.2,ease:`power2.out`}),t.addPause(`>`,()=>{Fe(()=>{y.delayedCall(D.holdAfter,()=>{i||e!==Xt||(t.resume(),r&&y.to(r,{opacity:0,duration:D.loaderOut,ease:`power2.in`}))})})}),t.to(M,{launch:1,duration:D.launchTime,ease:`power2.inOut`});let a=t.duration()-.15;t.to(M,{spread:1,duration:D.spreadTime,ease:D.spreadEase},a);let o=a+D.stageAt*D.spreadTime;t.to(M,{spin:D.spinTurns*k,duration:D.spinTime,ease:D.spinEase},o+D.spinDelay),t.to(M,{shift:1,duration:D.moveTime,ease:D.moveEase},o+D.moveDelay);let s=a+D.textAt*D.spreadTime;if(ke.chars.length&&t.fromTo(ke.chars,{value:0},{value:1,duration:D.textTime,ease:D.textEase,stagger:D.textStagger},s),D.textOut&&ke.fades.length){let e=Math.max(o+D.spinDelay+D.spinTime,o+D.moveDelay+D.moveTime);t.fromTo(ke.fades,{value:1},{value:0,duration:D.textOutTime,ease:D.textOutEase,stagger:D.textStagger},Math.max(0,e+D.textOutAt))}return n&&t.fromTo(n,{opacity:0},{opacity:1,duration:D.textTime,ease:D.textEase},s),t};V.build(),V.load(()=>{i||(V.build(),L=!0,$())}),Ge();let Qt=null,$t=()=>{$(),Qt?.kill(),Qt=Zt()},en=()=>{i||Qt||(j(C.current),ke.build(),j(C.current),V.build(),Ge(),$t(),(T||E)&&Qt?.progress(1,!1))},tn=setTimeout(en,3e3);Promise.race([document.fonts?.ready??Promise.resolve(),new Promise(e=>setTimeout(e,500))]).then(en).catch(en);try{document.fonts?.ready.then(()=>{!i&&Qt&&(V.build(),L=!0,$())}).catch(()=>{})}catch{}document.createElement(`div`);let nn=performance.now(),rn=nn,an=C.current,on=!0,sn=0;function $(){on||i||(on=!0,sn=0,rn=performance.now(),N.setAnimationLoop(cn))}function cn(){let e=performance.now(),t=Math.min(.05,(e-rn)/1e3);if(rn=e,B.uTime.value=(e-nn)*.001,Te||(t>1/50?(F+=t,I=0):(F=Math.max(0,F-t*.6),t<1/58?I+=t:I=Math.max(0,I-t*.2)),P<we.length-1&&F>.5+P*.35?(P+=1,N.setPixelRatio(we[P]),qe(),F=0,I=0):P>0&&I>5&&(--P,N.setPixelRatio(we[P]),qe(),F=0,I=0)),G&&!Xe&&!J){M.spin+=K*t,K*=D.damping**(t*60);let e=0;if(D.snap){let n=k/Math.round(D.count),r=Math.max(.01,-Math.log(D.damping)*60),i=Math.max(D.snapFrom,r*n*.5),a=4.8/Math.max(.05,D.snapTime);if(!q&&Math.abs(K)<i){let e=M.spin+K/r,t=D.seed*ge-Ye;$e=Math.round((e+t)/n)*n-t,et=Math.max(Math.abs(K),n*.5*a),q=!0}if(q){e=$e-M.spin;let n=Math.max(-et,Math.min(et,e*a));K+=(n-K)*A(a*t)}}else q=!1;Math.abs(K)<.0015&&Math.abs(e)<8e-4&&(K=0,M.spin+=e,q=!1)}Ot(t),Et(t),an!==C.current&&(an=C.current,B.uPage.value.set(an===`light`?`#F4F2ED`:`#050505`),L=!0),Yt(t),G&&!Xe&&!J&&K===0&&Q>=0&&Q!==Wt&&(Wt=Q,Ae.show(Q),ie.current?.(Q,ue[Q]));let n=G&&!Xe&&!J&&!q&&K===0&&Math.abs(X.amt-X.target)<.002&&X.wake<.002&&Math.abs(Y.x-X.x)<.05&&Math.abs(Y.y-X.y)<.05&&B.uWobble.value<.002&&R<1e-4&&!y.isTweening(M)&&!y.isTweening(V.box);if(Te=n,n&&!L){++sn>30&&(on=!1,N.setAnimationLoop(null));return}sn=0,L=!1,N.render(Ee,z)}return N.setAnimationLoop(cn),ce.current=$,()=>{i=!0,ce.current=null,clearTimeout(mt),clearTimeout(tn),N.setAnimationLoop(null),window.removeEventListener(`resize`,qe),window.removeEventListener(`keydown`,Tt),e.removeEventListener(`wheel`,bt),e.removeEventListener(`pointerdown`,xt),e.removeEventListener(`pointermove`,St),e.removeEventListener(`pointerup`,Ct),e.removeEventListener(`pointercancel`,Ct),e.removeEventListener(`pointerleave`,yt),e.removeEventListener(`click`,wt),Qt?.kill(),y.killTweensOf(ke.chars),y.killTweensOf(ke.fades),y.killTweensOf(n),Ae.dispose(),V.dispose(),ke.dispose(),De.geometry.dispose(),De.material.dispose(),B.uAtlas.value?.dispose(),B.uTagTex.value?.dispose(),N.dispose(),N.forceContextLoss(),N.domElement.remove()}},[t]),(0,b.useEffect)(()=>{ce.current?.()},[e]);let T=e===`light`?`#1c1c1c`:`#f5f3ee`;return(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(`div`,{ref:f,role:`group`,"aria-label":`Stories carousel. Scroll, drag, or use the left and right arrow keys to browse. Click the front card to open its story.`,className:`absolute inset-0 touch-none`}),(0,j.jsx)(`ul`,{ref:g,"aria-label":`Projects`,style:{fontFamily:`"Manrope", ui-sans-serif, system-ui, sans-serif`,color:T},className:`pointer-events-none absolute bottom-[7vh] left-[2vw] z-10 flex flex-col items-start text-left leading-[1.5] tracking-[0.01em] opacity-0 max-sm:hidden`,children:t.slice(0,32).map((e,t)=>(0,j.jsx)(`li`,{ref:e=>{_.current[t]=e},style:{opacity:.2},children:e.name},e.file))}),[{side:`left`,justify:`flex-start`},{side:`right`,justify:`flex-end`}].map(({side:e,justify:t})=>{let n=(0,j.jsxs)(`span`,{className:`flex items-baseline whitespace-nowrap`,children:[(0,j.jsx)(`span`,{}),(0,j.jsx)(`span`,{})]});return(0,j.jsxs)(`div`,{ref:t=>{w.current[e].box=t},"aria-hidden":`true`,style:{color:T},className:`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 tracking-[-0.01em]`,children:[(0,j.jsx)(`span`,{ref:t=>{w.current[e].goo=t},className:`absolute inset-0`,style:{willChange:`filter`},children:[0,1].map(r=>(0,j.jsx)(`span`,{ref:t=>{w.current[e].layers[r]=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n},r))}),(0,j.jsx)(`span`,{ref:t=>{w.current[e].plain=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n})]},e)}),(0,j.jsx)(`div`,{ref:v,"aria-hidden":`true`,style:{color:T},className:`pointer-events-none absolute bottom-[1vh] left-1/2 z-10 -translate-x-1/2 tracking-[-0.01em]`}),(0,j.jsx)(`div`,{ref:x,"aria-live":`polite`,className:`sr-only`}),(0,j.jsx)(`svg`,{"aria-hidden":`true`,className:`pointer-events-none absolute h-0 w-0`,focusable:`false`,children:(0,j.jsx)(`defs`,{children:(0,j.jsx)(`filter`,{id:`name-goo`,x:`-20%`,y:`-100%`,width:`140%`,height:`300%`,colorInterpolationFilters:`sRGB`,children:(0,j.jsx)(`feColorMatrix`,{ref:S,in:`SourceGraphic`,type:`matrix`,values:`1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140`})})})})]})}export{M as default};