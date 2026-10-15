import{n as e}from"./rolldown-runtime-CbXtAM7H.js";import{a as t}from"./motion-6MpT-aL9.js";import{a as n,i as r,p as i}from"./index-BtrRy_fG.js";import{A as a,D as o,M as s,O as c,S as l,_ as u,a as d,b as f,c as p,d as m,g as h,h as g,i as _,s as v,t as ee}from"./three-Cq4jDphW.js";import{t as y}from"./animation-CvDoa17S.js";var b=e(t(),1),te=`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,x=`
  precision highp float;

  #define MAX_PLANES 32
  #define MAX_LINKS 32

  varying vec2 vUv;

  uniform vec2  uResolution;   // canvas size in px
  uniform vec2  uSize;         // resting plane size in px
  uniform float uRadius;       // resting corner radius in px

  // per-plane state, driven from JS
  uniform float uCount;
  uniform vec2  uPos[MAX_PLANES];    // centre in px, origin at screen centre
  uniform float uRot[MAX_PLANES];    // radians
  // xy = 0..1 per axis, z = brightness (1 = lit, 0 = black), w = which atlas
  // cell this plane wears. All three ride in here rather than in arrays of
  // their own because GLSL ES gives every element of a uniform array a full
  // vec4 row whatever it is declared as — zw were already being paid for and
  // thrown away. The cell is resolved on the CPU because it depends on where
  // the plane sits on the ring, not on its index, and working that out per
  // pixel in the loop below would be absurd.
  uniform vec4  uScale[MAX_PLANES];

  // honey threads between neighbours, driven from JS
  uniform float uLinkCount;
  uniform vec2  uLinkA[MAX_LINKS];
  uniform vec2  uLinkB[MAX_LINKS];
  // (radius at the ends, radius at the pinch, droop, fillet)
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
  float sdBridge(vec2 p, vec2 a, vec2 b, float rEnd, float rMid, float sag) {
    vec2 ba = b - a;
    float len = length(ba);
    if (len < 0.001) return 1e6;

    vec2 dir = ba / len;
    vec2 nrm = vec2(-dir.y, dir.x);

    vec2 q = p - (a + b) * 0.5;
    float along = dot(q, dir);
    float across = dot(q, nrm);

    float h = clamp(along / len + 0.5, 0.0, 1.0);
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

    float halfSpan = length(uSize) * 0.5;

    for (int i = 0; i < MAX_PLANES; i++) {
      if (float(i) >= uCount) break;

      vec4 st = uScale[i];
      vec2 sc = st.xy;
      float grown = max(sc.x, sc.y);
      if (grown <= 0.0001) continue;

      vec2 q = p - uPos[i];
      // Anything further out than this cannot affect the surface, so it can be
      // skipped outright — this is what keeps 32 planes affordable. Scaled by
      // the plane rather than fixed, because a plane swollen under the cursor
      // reaches further than its resting size, as does the melt around it.
      float cull = halfSpan * grown + k + uWobble + 8.0;
      if (dot(q, q) > cull * cull) continue;

      // into the plane's local frame
      float a  = uRot[i];
      float ca = cos(a), sa = sin(a);
      q = vec2(q.x * ca + q.y * sa, -q.x * sa + q.y * ca);

      vec2 halfSize = max(uSize * 0.5 * sc, vec2(0.0001));

      // starts as a circle (r = half extent), relaxes into the rounded rect
      float rMax = min(halfSize.x, halfSize.y);
      float r = min(rMax, mix(rMax, uRadius, smoothstep(0.30, 1.0, min(sc.x, sc.y))));

      float di = sdRoundBox(q, halfSize, r);
      d = smin(d, di, k);

      // Local UV. Clamped, so the goo outside a plane carries that plane's
      // edge colour rather than repeating or sampling the next atlas cell.
      vec2 luv = q / (2.0 * halfSize) + 0.5;
      luv.y = 1.0 - luv.y;
      luv = clamp(luv, 0.004, 0.996);

      if (di < d0) {
        d1 = d0; uv1 = uv0; im1 = im0; dm1 = dm0;
        d0 = di; uv0 = luv; im0 = st.w; dm0 = st.z;
      } else if (di < d1) {
        d1 = di; uv1 = luv; im1 = st.w; dm1 = st.z;
      }
    }

    // Threads strung between neighbours as they pull apart.
    for (int i = 0; i < MAX_LINKS; i++) {
      if (float(i) >= uLinkCount) break;

      vec4 par = uLinkPar[i];
      // Radii are allowed to go negative: that lifts the bridge's field clear
      // of the surface so it fades out, rather than bottoming out at zero as a
      // half-covered hairline. Only cull once it is further out than the
      // antialiasing can reach.
      if (par.x <= -3.0) continue;

      vec2 a = uLinkA[i];
      vec2 b = uLinkB[i];
      vec2 mid = (a + b) * 0.5;
      float reach = length(b - a) * 0.5 + par.x + par.w + 8.0;
      if (dot(p - mid, p - mid) > reach * reach) continue;

      d = smin(d, sdBridge(p, a, b, par.x, par.y, par.z), par.w);
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
      // taps land on the same texel and there is no fringe.
      if (uFringe > 0.0) {
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
`,S=512,C=Math.round(S/1.5),ne=(e,t)=>new Promise((n,r)=>{let i=new Image;t&&(i.fetchPriority=t),i.crossOrigin=`anonymous`,i.onload=()=>n(i),i.onerror=()=>r(Error(`failed to load ${e}`)),i.src=e}),w=e=>/^(https?:|data:|blob:)/.test(e)?e:`/ce/${String(e).replace(/^\/+/,``)}`.replace(/\/+/g,`/`);function re(e=r,t,n){let i=Math.ceil(Math.sqrt(e.length)),a=Math.ceil(e.length/i),o=document.createElement(`canvas`);o.width=i*S,o.height=a*C;let s=o.getContext(`2d`),c=new _(o);c.flipY=!1,c.colorSpace=``,c.wrapS=d,c.wrapT=d,c.minFilter=h,c.magFilter=g,c.generateMipmaps=!0;let l=(e,t)=>{let n=t%i*S,r=Math.floor(t/i)*C,a=Math.max(S/e.width,C/e.height),o=e.width*a,c=e.height*a;s.save(),s.beginPath(),s.rect(n,r,S,C),s.clip(),s.drawImage(e,n+(S-o)/2,r+(C-c)/2,o,c),s.restore()},u=0,f=0,p=()=>t?.(u/e.length),m=(t,r)=>ne(w(e[t]),r).then(e=>l(e,t)).catch(r=>{f++,console.warn(`[atlas]`,r.message),n?.(Error(`Atlas ${f}/${e.length} failed: ${e[t]}`),{failed:f,total:e.length})}).finally(()=>{u++,p()}),v=m(0,`high`).then(()=>{c.needsUpdate=!0}),ee=Promise.all([v,...e.slice(1).map((e,t)=>m(t+1,`low`))]).then(()=>{c.needsUpdate=!0});return p(),{texture:c,grid:[i,a],count:e.length,first:v,ready:ee}}var ie=[`left`,`right`],T=2,E=e=>e?.firstElementChild?.children;function D(e,t,n){e&&(t>=1?(e.style.filter=`none`,e.style.opacity=`1`):t<=0?(e.style.filter=`none`,e.style.opacity=`0`):(e.style.filter=`blur(${Math.min(n/t-n,100)}px)`,e.style.opacity=`${t**.4}`))}function O(e,t,n){let r={t:1},i=[``,``],a=[!1,!1],o=()=>{let i=t[e];if(!i)return;let o=E(i.layers[0]),s=E(i.layers[1]),c=E(i.plain),l=r.t;for(let e=0;e<T;e++)a[e]?(D(o?.[e],1-l,n.nameBlur),D(s?.[e],l,n.nameBlur),c?.[e]&&(c[e].style.opacity=`0`)):(o?.[e]&&(o[e].style.opacity=`0`),s?.[e]&&(s[e].style.opacity=`0`),c?.[e]&&(c[e].style.opacity=`1`));i.goo&&(i.goo.style.filter=l>=1?`none`:`url(#name-goo) blur(${n.nameSoften}px)`)};return{m:r,set:s=>{let c=t[e];if(!c?.layers[0]||!c.layers[1]||!c.plain)return;y.killTweensOf(r),r.t=1,o();let l=[s[0]??``,s[1]??``];a=[l[0]!==i[0],l[1]!==i[1]];let u=E(c.layers[0]),d=E(c.layers[1]),f=E(c.plain);for(let e=0;e<T;e++)u?.[e]&&(u[e].textContent=i[e]),d?.[e]&&(d[e].textContent=l[e]),f?.[e]&&(f[e].textContent=l[e]);if(i=l,!a[0]&&!a[1]){r.t=1,o();return}r.t=0,o(),y.to(r,{t:1,duration:n.nameMorphTime,ease:n.nameEase,onUpdate:o})}}}function ae(e,t,n){let{groups:r,list:i,loader:a,cut:o,live:s}=e,c=O(`left`,r,t),l=O(`right`,r,t),u=()=>{o?.setAttribute(`values`,`1 0 0 0 0
       0 1 0 0 0
       0 0 1 0 0
       0 0 0 ${t.nameEdge} ${-t.nameEdge*t.nameCut}`)};return{show:e=>{let t=n[e];t&&(c.set([String(e+1).padStart(2,`0`),t.name]),l.set([t.type,t.year]),s&&(s.textContent=`${t.name}. ${t.type}, ${t.year}.`))},style:({textK:e,tight:n,viewW:o})=>{let s=t.nameSize*e*(n?t.tightName:1),c=`${s}vw`,l=`${t.idxSize*e}vw`,d=`"${t.nameFont}", ui-sans-serif, system-ui, sans-serif`,f=`"${t.idxFont}", ui-sans-serif, system-ui, sans-serif`,p=`${t.nameWeight}`,m=`${t.idxWeight}`,h=s*3;for(let e of ie){let i=r[e];if(!i?.box)continue;let a=e===`right`,u=n&&!a;if(n&&a){i.box.style.display=`none`;continue}if(i.box.style.display=``,i.box.style.width=`${u?t.tightMetaWidth:t.metaWidth}vw`,i.box.style.height=`${h}vw`,u){let e=h*o/100,n=s*o/100;i.box.style.top=`auto`,i.box.style.left=`auto`,i.box.style.right=`${t.tightNameRight}px`,i.box.style.bottom=`${t.tightNameBottom+n*.5-e*.5}px`,i.box.style.transform=`none`}else i.box.style.top=``,i.box.style.bottom=``,i.box.style.transform=``,i.box.style.left=a?`auto`:`${t.metaLeft}vw`,i.box.style.right=a?`${t.metaRight}vw`:`auto`;for(let e of[...i.layers,i.plain]){if(!e)continue;e.style.justifyContent=u||a?`flex-end`:`flex-start`;let n=e.firstElementChild;n.style.gap=`${a?t.metaGapR:t.metaGapL}vw`;let[r,i]=n.children;r.style.display=u?`none`:``,r.style.fontFamily=a?d:f,r.style.fontSize=a?c:l,r.style.fontWeight=a?p:m,i.style.fontFamily=a?f:d,i.style.fontSize=a?l:c,i.style.fontWeight=a?m:p}}i&&(i.style.fontSize=`${t.listSize*e}vw`),a&&(a.style.bottom=`${t.loaderBottom}vh`,a.style.fontFamily=f,a.style.fontSize=l,a.style.fontWeight=m),u()},setThreshold:u,dispose:()=>{y.killTweensOf(c.m),y.killTweensOf(l.m)}}}var k=`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,A=`
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
`;function oe(e,t){let n=[],r=[],i=()=>{for(let t of[...e.children])e.remove(t),t.geometry.dispose(),t.material.uniforms.uTex.value?.dispose(),t.material.dispose();n=[],r=[]};return{build:()=>{i();let a=t.textSize,o=Math.min(window.devicePixelRatio,2)*2,s=`${t.textWeight} ${a}px "${t.textFont}", ui-sans-serif, system-ui, sans-serif`,d=document.createElement(`canvas`).getContext(`2d`);d.font=s;let f=[...t.text],p=f.map(e=>d.measureText(e).width),m=t.textTracking*a,h=p.reduce((e,t)=>e+t,0)+m*(f.length-1),ee=a*.25,y=a*1.3+ee*2,b=-h/2;f.forEach((i,d)=>{let f=p[d];if(i.trim()){let d=f+ee*2,p=document.createElement(`canvas`);p.width=Math.max(1,Math.ceil(d*o)),p.height=Math.max(1,Math.ceil(y*o));let m=p.getContext(`2d`);m.scale(o,o),m.font=s,m.textBaseline=`alphabetic`,m.fillStyle=`#000`,m.fillText(i,ee,ee+a);let h=new _(p);h.colorSpace=``,h.minFilter=g,h.magFilter=g,h.generateMipmaps=!1;let te=new c({vertexShader:k,fragmentShader:A,uniforms:{uTex:{value:h},uReveal:{value:0},uColor:{value:new v(t.textColor)},uOpacity:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1}),x=new u(new l(1,1),te);x.scale.set(d,y,1),x.position.set(b+f/2,0,0),x.renderOrder=0,e.add(x),n.push(te.uniforms.uReveal),r.push(te.uniforms.uOpacity)}b+=f+m})},dispose:i,get chars(){return n},get fades(){return r}}}function se(e,t){let n={sx:.5,sy:0},r=new Image,i=!1,a=null;return{box:n,build:()=>{let n=Math.min(window.devicePixelRatio,2)*2,o=document.createElement(`canvas`);o.width=Math.ceil(104*n),o.height=Math.ceil(40*n);let s=o.getContext(`2d`);s.scale(n,n),s.font=`${e.tagWeight} ${e.tagSize}px "${e.textFont}", ui-sans-serif, system-ui, sans-serif`,s.textBaseline=`middle`,s.fillStyle=`#fff`;let c=s.measureText(e.tagText).width,l=(104-(e.tagArrow+e.tagGap+c))*.5;if(s.fillText(e.tagText,l+e.tagArrow+e.tagGap,20),i){let t=(40-e.tagArrow)*.5;s.drawImage(r,l,t,e.tagArrow,e.tagArrow)}a?.dispose(),a=new _(o),a.colorSpace=``,a.minFilter=g,a.magFilter=g,a.generateMipmaps=!1,t.uTagTex.value=a},show:e=>{y.killTweensOf(n),e?(y.to(n,{sx:1,duration:.62,ease:`elastic.out(1, 0.5)`}),y.to(n,{sy:1,duration:.74,ease:`elastic.out(1, 0.42)`})):y.to(n,{sx:.5,sy:0,duration:.28,ease:`power3.in`})},load:e=>{r.onload=()=>{i=!0,e?.()},r.src=`/ce/arrow-up-right.svg`.replace(/\/+/g,`/`)},dispose:()=>{y.killTweensOf(n),a?.dispose()}}}function ce(){return{refWidth:1512,refHeight:870,fitHeight:0,minScale:.5,maxScale:1.75,narrowAt:1024,narrowPlane:1.25,narrowRadius:1.3,narrowText:1.5,narrowPosX:-2.5,narrowEndScale:4.22,tightAt:640,tightRadius:.82,tightPosX:-3.5,tightSplit:.8,tightName:1.5,tightNameBottom:16,tightNameRight:16,tightMetaWidth:70,planeSize:90,count:10,ringRadius:340,seed:0,radial:!0,radius:6,textured:!0,blend:14,imageOffset:0,holdAfter:0,loaderChase:.18,loaderBottom:7,loaderOut:.45,stagger:.34,launchTime:1.95,spreadEase:`power2.out`,spreadTime:3.6,stageAt:.7,spinTurns:1,spinTime:2.6,spinEase:`power2.inOut`,spinDelay:0,posX:-2,posY:0,endScale:4.46,moveTime:2.2,moveEase:`power2.inOut`,moveDelay:.2,scrollSpeed:.0022,damping:.94,maxSpeed:12,dragSpeed:1,snap:!0,snapTime:.8,snapFrom:1,pickTime:.55,pickEase:`power3.inOut`,text:`Stories '26`,textSize:41,textFont:`Italiana`,textWeight:400,textTracking:0,textColor:`#f5f3ee`,textAt:.42,textTime:.95,textStagger:.015,textEase:`power4.out`,textOut:!0,textOutAt:-.5,textOutTime:.7,textOutEase:`power2.in`,metaLeft:5.5,metaRight:5.5,metaGapL:4.7,metaGapR:3.6,metaWidth:34,nameSize:24/1440*100,nameFont:`Manrope`,nameWeight:500,idxSize:16/1440*100,idxFont:`Manrope`,idxWeight:400,listSize:.9,nameMorphTime:1.2,nameEase:`circ.out`,nameBlur:8.5,nameEdge:400,nameCut:.33,nameSoften:.35,glass:!0,bandTop:.08,bandBottom:.08,refract:60,squeeze:.05,ripple:5,rippleFreq:.02,fringe:1.5,sheen:.05,hover:!0,touchHold:.16,touchSlop:10,lag:.3,melt:34,meltReach:260,reach:1.7,swell:.09,pull:26,grab:.14,release:.06,web:.2,webReach:1.15,wave:4,waveFreq:.05,waveSpeed:7,sideScale:.035,sidePush:17,sideDim:.15,sideReach:2.4,tagFrom:1024,tagText:`View`,tagSize:14,tagWeight:500,tagArrow:14,tagGap:6,tagX:64,tagY:-38,tagFrost:.16,tagRim:.02,tagRefract:39.5,thread:1,thin:.4,pinch:.35,sag:6,dissolve:2.9,fillet:14,wobble:3,goo:35}}var j=Math.PI*2,le=Math.PI/2,ue=Math.PI/180,M=e=>e<0?0:e>1?1:e,de=e=>1-(1-e)**3,fe=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,pe=(e,t,n)=>{let r=M((n-e)/(t-e));return r*r*(3-2*r)},me=e=>e===0?0:e%2==1?(e+1)/2:-e/2,he=(e,t)=>1-(1-t)**(e*60),N=i(),ge=.06,_e=()=>{let e=new p(new Uint8Array([255,255,255,255]),1,1);return e.needsUpdate=!0,e};function ve({theme:e=`dark`,projects:t=n,onActiveChange:r,onOpenProject:i,onError:d}){let h=(0,b.useRef)(null),g=(0,b.useRef)(null),_=(0,b.useRef)([]),S=(0,b.useRef)(null),C=(0,b.useRef)(null),ne=(0,b.useRef)(null),w=(0,b.useRef)(e);w.current=e;let ie=(0,b.useRef)(r);ie.current=r;let T=(0,b.useRef)(i);T.current=i;let E=(0,b.useRef)(d);E.current=d;let D=(0,b.useRef)({left:{box:null,goo:null,layers:[],plain:null},right:{box:null,goo:null,layers:[],plain:null}});(0,b.useEffect)(()=>{let e=h.current,r=g.current,i=S.current,d=!1,b=`ce-wheel-seen`,O=(()=>{try{return sessionStorage.getItem(b)===`1`}catch{return!1}})(),k=(()=>{try{return window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0}catch{return!1}})(),A=ce(),N=Array.isArray(t)&&t.length>0?t:n;N.length>32&&console.warn(`[wheel] ${N.length} stories exceed MAX_PLANES=32 — clamping`),A.count=Math.min(Math.max(1,N.length),32);let ve=N.slice(0,32),ye={dark:{page:`#050505`,ink:`#f5f3ee`},light:{page:`#F4F2ED`,ink:`#1c1c1c`}},be=e=>{let t=ye[e]||ye.dark;A.textColor=t.ink,I.uPage.value.set(t.page);for(let e of Oe.children)e.material.uniforms.uColor.value.set(t.ink)},P={progress:0,launch:0,spread:0,spin:0,shift:0},F;try{F=new ee({antialias:!1,alpha:!0,depth:!1,stencil:!1,powerPreference:`high-performance`})}catch(e){console.error(`[ring] could not create a WebGL context:`,e),E.current?.(e);return}let xe=[Math.min(window.devicePixelRatio||1,1.5),1.25,1].filter((e,t,n)=>t===0||e<n[t-1]-1e-6),Se=0,Ce=0,we=!0;F.setPixelRatio(xe[0]),e.appendChild(F.domElement);let Te=new o,Ee=new f(-1,1,1,-1,-100,100),I={uResolution:{value:new a(1,1)},uSize:{value:new a(150,100)},uRadius:{value:A.radius},uCount:{value:A.count},uPos:{value:Array.from({length:32},()=>new a)},uRot:{value:new Float32Array(32)},uScale:{value:Array.from({length:32},()=>new s(0,0,1,0))},uLinkCount:{value:0},uLinkA:{value:Array.from({length:32},()=>new a)},uLinkB:{value:Array.from({length:32},()=>new a)},uLinkPar:{value:Array.from({length:32},()=>new s)},uK:{value:A.goo},uWobble:{value:A.wobble},uTime:{value:0},uColor:{value:new v(`#0a0a0a`)},uAtlas:{value:_e()},uGrid:{value:new a(1,1)},uBlend:{value:A.blend},uTextured:{value:0},uBandTop:{value:0},uBandBottom:{value:0},uGlass:{value:new s},uFringe:{value:0},uSheen:{value:0},uMouse:{value:new s},uMelt:{value:new s},uTagTex:{value:new p(new Uint8Array([0,0,0,0]),1,1)},uTag:{value:new s},uTagP:{value:new s},uTagQ:{value:new s},uPage:{value:new v(w.current===`light`?`#F4F2ED`:`#050505`)}},De=new u(new l(1,1),new c({vertexShader:te,fragmentShader:x,uniforms:I,transparent:!0,depthWrite:!1}));De.renderOrder=10,Te.add(De);let Oe=new m;Te.add(Oe);let L=oe(Oe,A),R=se(A,I),ke=ae({groups:D.current,list:r,loader:i,cut:ne.current,live:C.current},A,ve),Ae=!1,je=0,Me=!1,Ne=[],Pe=e=>Me?e():Ne.push(e),Fe=re(ve.map(e=>e.file),e=>{d||(je=e)});I.uAtlas.value.dispose(),Fe.texture.anisotropy=F.capabilities.getMaxAnisotropy(),I.uAtlas.value=Fe.texture,I.uGrid.value.set(Fe.grid[0],Fe.grid[1]);let z=Fe.count;Fe.first.then(()=>{d||(Ae=!0)}),Fe.ready.then(()=>{d||(je=1)});let B=1,V=1,Ie={left:0,top:0},H=1,Le=1,Re=1,ze=1,Be=!1,Ve=!1,He=()=>{let e=B/Math.max(1,A.refWidth),t=V/Math.max(1,A.refHeight),n=e*(1-A.fitHeight)+Math.min(e,t)*A.fitHeight;H=Math.min(A.maxScale,Math.max(A.minScale,n));let r=B<=A.narrowAt,i=B<=A.tightAt;Be=r,Ve=i,Le=r?A.narrowPlane:1,Re=(r?A.narrowRadius:1)*(i?A.tightRadius:1),ze=r?A.narrowText:1,`${Math.round(B)}${Math.round(V)}`,Math.round(H*1e3)/1e3;let a=H*ze*(i?A.tightSplit:1);Oe.scale.set(a,a,1)},Ue=()=>ke.style({textK:ze,tight:Ve,viewW:B}),We=()=>{B=e.clientWidth,V=e.clientHeight,He(),F.setSize(B,V),Ee.left=-B/2,Ee.right=B/2,Ee.top=V/2,Ee.bottom=-V/2,Ee.updateProjectionMatrix(),De.scale.set(B,V,1),I.uResolution.value.set(B,V);let t=F.domElement.getBoundingClientRect();Ie.left=t.left,Ie.top=t.top,we=!0},Ge=()=>{We(),Ue()};We(),window.addEventListener(`resize`,Ge);let Ke={x:0,y:0},qe=0,U=!1,W=0,G=!1,Je=0,Ye=0,K=!1,Xe=0,Ze=0,q=!1,Qe=0,$e=0,et=0,tt=e=>{let t=e.clientX-Ie.left-Ke.x,n=e.clientY-Ie.top-Ke.y;return Math.atan2(-n,t)},nt=()=>{q&&=(y.killTweensOf(P),!1)};function rt(){!U&&$&&$.progress(1,!1)}let it=e=>z>0?((Math.round(A.imageOffset)-e)%z+z)%z:0,at=e=>{let t=j/Math.round(A.count),n=qe-A.seed*ue-me(e)*t,r=n+Math.round((P.spin-n)/j)*j;return{slots:Math.abs(r-P.spin)/t,target:r,slot:t}},ot=e=>{let{slots:t,target:n}=at(e);if(t<.01){T.current?.(it(me(e)));return}W=0,K=!1,q=!0,y.killTweensOf(P),y.to(P,{spin:n,duration:A.pickTime*Math.sqrt(Math.max(1,t)),ease:A.pickEase,onComplete:()=>{q=!1}})},J={x:0,y:0,inside:!1,seeded:!1},Y={x:0,y:0,amt:0,wake:0},st=!1,ct=!1,lt=0,ut=()=>{clearTimeout(lt),lt=0,ct=!1},dt=()=>{clearTimeout(lt),lt=setTimeout(()=>{ct=!0},A.touchHold*1e3)},ft=()=>st?ct:J.inside,pt=e=>{st=e.pointerType===`touch`,J.x=e.clientX-Ie.left-B*.5,J.y=V*.5-(e.clientY-Ie.top),J.inside=!0,J.seeded||(J.seeded=!0,Y.x=J.x,Y.y=J.y)},mt=()=>{J.inside=!1},ht=e=>{if(!U){rt();return}e.preventDefault();let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;nt(),K=!1,W+=t*A.scrollSpeed,W=Math.max(-A.maxSpeed,Math.min(A.maxSpeed,W))},gt=e=>{if(Qe=0,$e=e.clientX,et=e.clientY,pt(e),!U){rt();return}nt(),st&&dt(),G=!0,K=!1,W=0,Je=tt(e),Ye=performance.now(),F.domElement.setPointerCapture?.(e.pointerId)},_t=e=>{if(pt(e),Qe+=Math.abs(e.clientX-$e)+Math.abs(e.clientY-et),$e=e.clientX,et=e.clientY,st&&!ct&&Qe>A.touchSlop&&ut(),!G)return;let t=tt(e),n=t-Je;n>Math.PI&&(n-=j),n<-Math.PI&&(n+=j);let r=n*A.dragSpeed;P.spin+=r;let i=performance.now();W=r/(Math.max(8,i-Ye)/1e3),Je=t,Ye=i},vt=e=>{if(pt(e),ut(),G){G=!1;try{F.domElement.releasePointerCapture?.(e.pointerId)}catch{}}},yt=()=>{if(!U){rt();return}Qe>=5||Q<0||ot(Q)};e.addEventListener(`wheel`,ht,{passive:!1}),e.addEventListener(`pointerdown`,gt),e.addEventListener(`pointermove`,_t),e.addEventListener(`pointerup`,vt),e.addEventListener(`pointercancel`,vt),e.addEventListener(`pointerleave`,mt),e.addEventListener(`click`,yt);let bt=e=>{if(e.target?.closest?.(`[role="dialog"]`)||!U)return;let t=j/Math.max(1,Math.round(A.count));e.key===`ArrowRight`||e.key===`ArrowDown`?(e.preventDefault(),nt(),K=!1,W=0,q=!0,y.killTweensOf(P),y.to(P,{spin:P.spin-t,duration:A.pickTime,ease:A.pickEase,onComplete:()=>{q=!1}})):(e.key===`ArrowLeft`||e.key===`ArrowUp`)&&(e.preventDefault(),nt(),K=!1,W=0,q=!0,y.killTweensOf(P),y.to(P,{spin:P.spin+t,duration:A.pickTime,ease:A.pickEase,onComplete:()=>{q=!1}}))};window.addEventListener(`keydown`,bt);let xt=e=>{let t=A.hover&&ft()&&J.seeded&&U;Y.amt+=(+!!t-Y.amt)*he(e,.12);let n=he(e,A.lag);Y.x+=(J.x-Y.x)*n,Y.y+=(J.y-Y.y)*n;let r=Math.hypot(J.x-Y.x,J.y-Y.y);Y.wake=Math.max(Y.wake*.94**(e*60),M(r/(Math.max(e,.001)*2600))),I.uMouse.value.set(Y.x,Y.y,Y.amt,A.melt*H),I.uMelt.value.set(A.meltReach*H,A.wave*H*Y.wake*Y.amt,A.waveFreq,A.waveSpeed)},St={shown:0,last:-1},Ct=e=>{let t=Math.min(je,M(P.progress));St.shown+=(t-St.shown)*he(e,A.loaderChase);let n=Math.min(100,Math.max(1,Math.round(St.shown*100)));if(i&&n!==St.last&&(St.last=n,i.textContent=String(n).padStart(3,`0`)),!Me&&n>=100){Me=!0;for(let e of Ne)e();Ne.length=0}},wt=new Float32Array(32),Tt=new Float32Array(32),Et=[],Dt=Array.from({length:32},()=>new a),Ot=new Float32Array(32),kt=new Float32Array(32),At=new Float32Array(32),jt=new Float32Array(32),X=new Float32Array(32),Mt=new a,Nt=e=>Math.max(.05,1+A.swell*Ot[e]-A.sideScale*X[e]),Z=-1,Pt=-1,Q=-1,Ft=!1,It=()=>{let e=_.current;for(let t=0;t<e.length;t++){let n=e[t];if(!n)continue;let r=t===Z;n.style.opacity=r?`1`:`0.2`,r?n.setAttribute(`aria-current`,`true`):n.removeAttribute(`aria-current`)}},Lt=e=>{let t=Math.round(A.count);I.uCount.value=t;let n=j/t,r=M(P.spread),i=Be?A.narrowEndScale:A.endScale,a=Ve?A.tightPosX:Be?A.narrowPosX:A.posX,o=M(P.shift),s=(1+(i-1)*o)*H,c=a*B*.5*o,l=A.posY*V*.5*o;Ke.x=B*.5+c,Ke.y=V*.5-l,qe=c!==0||l!==0?Math.atan2(-l,-c):0;let u=A.planeSize*Le*s,d=u/1.5;I.uSize.value.set(u,d),I.uRadius.value=A.radius*Le*s;let f=A.radial?d:u,p=A.radial?u:d,m=A.ringRadius*Re*s,h=2*m*Math.sin(n/2)-f;Math.round(h/s*10)/10;let g=Math.max(1,h),_=Math.max(1,Math.abs(me(t-1))),v=Math.max(.1,.94-A.stagger);Tt[0]=0;for(let e=1;e<=_;e++){let t=M((r-(ge+(e-1)/_*A.stagger))/v),n=t*t*(3-2*t);wt[e]=n,Tt[e]=Tt[e-1]+n}let ee=A.seed*ue,y=fe(M(P.launch)),b=m*y;Et.length=0;let te=Y.amt>.001,x=Math.max(1,A.reach*u),S=Math.max(1,A.sideReach*u),C=he(e,A.grab),ne=he(e,A.release),w=-1,re=1e9,ie=0,T=Math.round(A.imageOffset),E=e=>z>0?((T-e)%z+z)%z:0,D=J.inside&&J.seeded&&U,O=-1,ae=te?Q:-1;for(let e=0;e<t;e++){let t=me(e),r=Math.abs(t),i=e===0?M(P.progress):wt[r],a=E(t),o=ee+Math.sign(t)*n*Tt[r]+P.spin,s=Math.cos(o)*b+c,f=Math.sin(o)*b+l;Dt[e].set(s,f);let p=o-qe,m=Math.abs(Math.atan2(Math.sin(p),Math.cos(p)));m<re&&(re=m,w=e,ie=a);let h=0,g=0,_=0;if(te){let e=Y.x-s,t=Y.y-f,n=Math.hypot(e,t);if(h=pe(x,x*.22,n)*Y.amt*i,h>1e-4&&n>1e-4){let r=A.pull*H*h/n;g=e*r,_=t*r}}let v=h>Ot[e]?C:ne;Ot[e]+=(h-Ot[e])*v,kt[e]+=(g-kt[e])*v,At[e]+=(_-At[e])*v;let T=0;if(ae>=0&&e!==ae){let e=Math.hypot(Mt.x-s,Mt.y-f);T=pe(S,S*.2,e)*i}X[e]+=(T-X[e])*(T>X[e]?C:ne);let k=0,oe=0;if(X[e]>1e-4){let t=s-Mt.x,n=f-Mt.y,r=Math.hypot(t,n);if(r>1e-4){let i=A.sidePush*H*X[e]/r;k=t*i,oe=n*i}}I.uPos.value[e].set(s+kt[e]+k,f+At[e]+oe),I.uRot.value[e]=(A.radial?o:o+le)*y;let se=de(M(e===0?i/.7:i/.34)),ce=de(M(e===0?(i-.18)/.74:(i-.06)/.36)),j=Nt(e);if(I.uScale.value[e].set(se*j,ce*j,1-A.sideDim*X[e],a),D&&O<0){let t=I.uRot.value[e],n=Y.x-(s+kt[e]+k),r=Y.y-(f+At[e]+oe),i=Math.cos(t),a=Math.sin(t);Math.abs(n*i+r*a)<=u*.5*se*j&&Math.abs(-n*a+r*i)<=d*.5*ce*j&&(O=e)}Et.push(e)}for(let e=t;e<32;e++)I.uScale.value[e].set(0,0,1,0),Ot[e]=0,kt[e]=0,At[e]=0,X[e]=0;Q=O;let k=Q>=0&&!st&&B>A.tagFrom;k!==Ft&&(Ft=k,R.show(k)),Q>=0&&Mt.copy(Dt[Q]),I.uTag.value.set(Y.x+A.tagX,Y.y+A.tagY,R.box.sx,R.box.sy),I.uTagP.value.set(52,20,20,A.tagRefract),I.uTagQ.value.set(A.tagFrost,A.tagRim,0,0),w>=0&&z>0&&ie!==Z&&(Z=ie,It()),Et.sort((e,t)=>me(e)-me(t));let oe=p*.5*A.thread,se=Math.min(r>.995&&t>2?t:t-1,32);for(let e=0;e<se;e++){let n=Et[e],r=Et[(e+1)%t],i=I.uPos.value[n],a=I.uPos.value[r],o=I.uScale.value[n],c=I.uScale.value[r],l=(A.radial?o.y:o.x)/Nt(n),d=(A.radial?c.y:c.x)/Nt(r),p=M((Dt[n].distanceTo(Dt[r])-f*.5*(l+d))/g),m=0;if(te&&A.web>1e-4){let e=(i.x+a.x)*.5,t=(i.y+a.y)*.5,n=Math.max(1,A.webReach*u),r=Math.hypot(Y.x-e,Y.y-t);m=pe(n,n*.15,r)*Y.amt}jt[e]+=(m-jt[e])*(m>jt[e]?C:ne);let h=oe*Math.max((1-p)**A.thin,A.web*jt[e])-A.dissolve,_=h*(1-(1-A.pinch)*pe(0,.7,p));I.uLinkA.value[e].copy(i),I.uLinkB.value[e].copy(a),I.uLinkPar.value[e].set(h,_,A.sag*s*p**1.5,Math.min(A.fillet*s*pe(0,.35,p),Math.max(_,0)*1.5))}for(let e=se;e<32;e++)I.uLinkPar.value[e].set(-100,-100,0,0);I.uLinkCount.value=se,I.uK.value=A.goo*Le*H,I.uWobble.value=A.wobble*H*(1-pe(.2,.95,P.progress)),I.uTextured.value=A.textured&&Ae?1:0,I.uBlend.value=Math.max(.5,A.blend*Le*s);let ce=A.glass;I.uBandTop.value=ce?A.bandTop*V:0,I.uBandBottom.value=ce?A.bandBottom*V:0,I.uGlass.value.set(A.refract,A.squeeze,A.ripple,A.rippleFreq),I.uFringe.value=ce?A.fringe:0,I.uSheen.value=ce?A.sheen:0},Rt=0,zt=()=>{U=!1,Pt=-1,W=0,G=!1,K=!1,nt();let e=++Rt;i&&y.set(i,{opacity:+!Me});let t=y.timeline({delay:.25,onComplete:()=>{U=!0;try{sessionStorage.setItem(b,`1`)}catch{}}});t.fromTo(P,{progress:0,launch:0,spread:0,spin:0,shift:0},{progress:1,duration:1.2,ease:`power2.out`}),t.addPause(`>`,()=>{Pe(()=>{y.delayedCall(A.holdAfter,()=>{d||e!==Rt||(t.resume(),i&&y.to(i,{opacity:0,duration:A.loaderOut,ease:`power2.in`}))})})}),t.to(P,{launch:1,duration:A.launchTime,ease:`power2.inOut`});let n=t.duration()-.15;t.to(P,{spread:1,duration:A.spreadTime,ease:A.spreadEase},n);let a=n+A.stageAt*A.spreadTime;t.to(P,{spin:A.spinTurns*j,duration:A.spinTime,ease:A.spinEase},a+A.spinDelay),t.to(P,{shift:1,duration:A.moveTime,ease:A.moveEase},a+A.moveDelay);let o=n+A.textAt*A.spreadTime;if(L.chars.length&&t.fromTo(L.chars,{value:0},{value:1,duration:A.textTime,ease:A.textEase,stagger:A.textStagger},o),A.textOut&&L.fades.length){let e=Math.max(a+A.spinDelay+A.spinTime,a+A.moveDelay+A.moveTime);t.fromTo(L.fades,{value:1},{value:0,duration:A.textOutTime,ease:A.textOutEase,stagger:A.textStagger},Math.max(0,e+A.textOutAt))}return r&&t.fromTo(r,{opacity:0},{opacity:1,duration:A.textTime,ease:A.textEase},o),t};R.build(),R.load(()=>{d||R.build()}),Ue();let $=null,Bt=()=>{$?.kill(),$=zt()},Vt=()=>{d||$||(be(w.current),L.build(),be(w.current),R.build(),Ue(),Bt(),(O||k)&&$?.progress(1,!1))},Ht=setTimeout(Vt,3e3);Promise.race([document.fonts?.ready??Promise.resolve(),new Promise(e=>setTimeout(e,500))]).then(Vt).catch(Vt);try{document.fonts?.ready.then(()=>{!d&&$&&R.build()}).catch(()=>{})}catch{}document.createElement(`div`);let Ut=performance.now(),Wt=Ut,Gt=w.current;return F.setAnimationLoop(()=>{let e=performance.now(),t=Math.min(.05,(e-Wt)/1e3);if(Wt=e,I.uTime.value=(e-Ut)*.001,Se<xe.length-1&&(t>1/50?Ce+=t:Ce=Math.max(0,Ce-t*.6),Ce>.7&&(Se+=1,F.setPixelRatio(xe[Se]),Ge(),Ce=0)),U&&!G&&!q){P.spin+=W*t,W*=A.damping**(t*60);let e=0;if(A.snap){let n=j/Math.round(A.count),r=Math.max(.01,-Math.log(A.damping)*60),i=Math.max(A.snapFrom,r*n*.5),a=4.8/Math.max(.05,A.snapTime);if(!K&&Math.abs(W)<i){let e=P.spin+W/r,t=A.seed*ue-qe;Xe=Math.round((e+t)/n)*n-t,Ze=Math.max(Math.abs(W),n*.5*a),K=!0}if(K){e=Xe-P.spin;let n=Math.max(-Ze,Math.min(Ze,e*a));W+=(n-W)*M(a*t)}}else K=!1;Math.abs(W)<.0015&&Math.abs(e)<8e-4&&(W=0,P.spin+=e)}Ct(t),xt(t),Gt!==w.current&&(Gt=w.current,I.uPage.value.set(Gt===`light`?`#F4F2ED`:`#050505`),we=!0),Lt(t),U&&!G&&!q&&W===0&&Z>=0&&Z!==Pt&&(Pt=Z,ke.show(Z),ie.current?.(Z,ve[Z])),!(U&&!G&&!q&&!K&&W===0&&Y.amt<.002&&Y.wake<.002&&Math.abs(J.x-Y.x)<.05&&Math.abs(J.y-Y.y)<.05&&I.uWobble.value<.002&&!we)&&(we=!1,F.render(Te,Ee))}),()=>{d=!0,clearTimeout(lt),clearTimeout(Ht),F.setAnimationLoop(null),window.removeEventListener(`resize`,Ge),window.removeEventListener(`keydown`,bt),e.removeEventListener(`wheel`,ht),e.removeEventListener(`pointerdown`,gt),e.removeEventListener(`pointermove`,_t),e.removeEventListener(`pointerup`,vt),e.removeEventListener(`pointercancel`,vt),e.removeEventListener(`pointerleave`,mt),e.removeEventListener(`click`,yt),$?.kill(),y.killTweensOf(L.chars),y.killTweensOf(L.fades),y.killTweensOf(r),ke.dispose(),R.dispose(),L.dispose(),De.geometry.dispose(),De.material.dispose(),I.uAtlas.value?.dispose(),I.uTagTex.value?.dispose(),F.dispose(),F.forceContextLoss(),F.domElement.remove()}},[t]);let O=e===`light`?`#1c1c1c`:`#f5f3ee`;return(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(`div`,{ref:h,role:`group`,"aria-label":`Stories carousel. Scroll, drag, or use the left and right arrow keys to browse. Click the front card to open its story.`,className:`absolute inset-0 touch-none`}),(0,N.jsx)(`ul`,{ref:g,"aria-label":`Projects`,style:{fontFamily:`"Manrope", ui-sans-serif, system-ui, sans-serif`,color:O},className:`pointer-events-none absolute bottom-[7vh] left-[2vw] z-10 flex flex-col items-start text-left leading-[1.5] tracking-[0.01em] opacity-0 max-sm:hidden`,children:t.slice(0,32).map((e,t)=>(0,N.jsx)(`li`,{ref:e=>{_.current[t]=e},style:{opacity:.2},children:e.name},e.file))}),[{side:`left`,justify:`flex-start`},{side:`right`,justify:`flex-end`}].map(({side:e,justify:t})=>{let n=(0,N.jsxs)(`span`,{className:`flex items-baseline whitespace-nowrap`,children:[(0,N.jsx)(`span`,{}),(0,N.jsx)(`span`,{})]});return(0,N.jsxs)(`div`,{ref:t=>{D.current[e].box=t},"aria-hidden":`true`,style:{color:O},className:`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 tracking-[-0.01em]`,children:[(0,N.jsx)(`span`,{ref:t=>{D.current[e].goo=t},className:`absolute inset-0`,style:{willChange:`filter`},children:[0,1].map(r=>(0,N.jsx)(`span`,{ref:t=>{D.current[e].layers[r]=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n},r))}),(0,N.jsx)(`span`,{ref:t=>{D.current[e].plain=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n})]},e)}),(0,N.jsx)(`div`,{ref:S,"aria-hidden":`true`,style:{color:O},className:`pointer-events-none absolute bottom-[1vh] left-1/2 z-10 -translate-x-1/2 tracking-[-0.01em]`}),(0,N.jsx)(`div`,{ref:C,"aria-live":`polite`,className:`sr-only`}),(0,N.jsx)(`svg`,{"aria-hidden":`true`,className:`pointer-events-none absolute h-0 w-0`,focusable:`false`,children:(0,N.jsx)(`defs`,{children:(0,N.jsx)(`filter`,{id:`name-goo`,x:`-20%`,y:`-100%`,width:`140%`,height:`300%`,colorInterpolationFilters:`sRGB`,children:(0,N.jsx)(`feColorMatrix`,{ref:ne,in:`SourceGraphic`,type:`matrix`,values:`1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140`})})})})]})}export{ve as default};