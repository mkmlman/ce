import{n as e}from"./rolldown-runtime-CbXtAM7H.js";import{a as t}from"./motion-6MpT-aL9.js";import{d as n,n as r,r as i}from"./index-kGces2HU.js";import{A as a,D as o,M as s,O as c,S as l,_ as u,a as d,b as f,c as p,d as m,g as h,h as g,i as _,s as v,t as ee}from"./three-Cq4jDphW.js";import{t as y}from"./animation-CvDoa17S.js";var b=e(t(),1),x=`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,S=`
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
`,C=512,w=Math.round(C/1.5),te=(e,t)=>new Promise((n,r)=>{let i=new Image;t&&(i.fetchPriority=t),i.crossOrigin=`anonymous`,i.onload=()=>n(i),i.onerror=()=>r(Error(`failed to load ${e}`)),i.src=e}),T=e=>/^(https?:|data:|blob:)/.test(e)?e:`/ce/${String(e).replace(/^\/+/,``)}`.replace(/\/+/g,`/`);function ne(e=r,t,n){let i=Math.ceil(Math.sqrt(e.length)),a=Math.ceil(e.length/i),o=document.createElement(`canvas`);o.width=i*C,o.height=a*w;let s=o.getContext(`2d`),c=new _(o);c.flipY=!1,c.colorSpace=``,c.wrapS=d,c.wrapT=d,c.minFilter=h,c.magFilter=g,c.generateMipmaps=!0;let l=(e,t)=>{let n=t%i*C,r=Math.floor(t/i)*w,a=Math.max(C/e.width,w/e.height),o=e.width*a,c=e.height*a;s.save(),s.beginPath(),s.rect(n,r,C,w),s.clip(),s.drawImage(e,n+(C-o)/2,r+(w-c)/2,o,c),s.restore()},u=0,f=0,p=()=>t?.(u/e.length),m=(t,r)=>te(T(e[t]),r).then(e=>l(e,t)).catch(r=>{f++,console.warn(`[atlas]`,r.message),n?.(Error(`Atlas ${f}/${e.length} failed: ${e[t]}`),{failed:f,total:e.length})}).finally(()=>{u++,p()}),v=m(0,`high`).then(()=>{c.needsUpdate=!0}),ee=Promise.all([v,...e.slice(1).map((e,t)=>m(t+1,`low`))]).then(()=>{c.needsUpdate=!0});return p(),{texture:c,grid:[i,a],count:e.length,first:v,ready:ee}}var re=[`left`,`right`],E=2,D=e=>e?.firstElementChild?.children;function O(e,t,n){e&&(t>=1?(e.style.filter=`none`,e.style.opacity=`1`):t<=0?(e.style.filter=`none`,e.style.opacity=`0`):(e.style.filter=`blur(${Math.min(n/t-n,100)}px)`,e.style.opacity=`${t**.4}`))}function k(e,t,n){let r={t:1},i=[``,``],a=[!1,!1],o=()=>{let i=t[e];if(!i)return;let o=D(i.layers[0]),s=D(i.layers[1]),c=D(i.plain),l=r.t;for(let e=0;e<E;e++)a[e]?(O(o?.[e],1-l,n.nameBlur),O(s?.[e],l,n.nameBlur),c?.[e]&&(c[e].style.opacity=`0`)):(o?.[e]&&(o[e].style.opacity=`0`),s?.[e]&&(s[e].style.opacity=`0`),c?.[e]&&(c[e].style.opacity=`1`));i.goo&&(i.goo.style.filter=l>=1?`none`:`url(#name-goo) blur(${n.nameSoften}px)`)};return{m:r,set:s=>{let c=t[e];if(!c?.layers[0]||!c.layers[1]||!c.plain)return;y.killTweensOf(r),r.t=1,o();let l=[s[0]??``,s[1]??``];a=[l[0]!==i[0],l[1]!==i[1]];let u=D(c.layers[0]),d=D(c.layers[1]),f=D(c.plain);for(let e=0;e<E;e++)u?.[e]&&(u[e].textContent=i[e]),d?.[e]&&(d[e].textContent=l[e]),f?.[e]&&(f[e].textContent=l[e]);if(i=l,!a[0]&&!a[1]){r.t=1,o();return}r.t=0,o(),y.to(r,{t:1,duration:n.nameMorphTime,ease:n.nameEase,onUpdate:o})}}}function ie(e,t,n){let{groups:r,list:i,loader:a,cut:o,live:s}=e,c=k(`left`,r,t),l=k(`right`,r,t),u=()=>{o?.setAttribute(`values`,`1 0 0 0 0
       0 1 0 0 0
       0 0 1 0 0
       0 0 0 ${t.nameEdge} ${-t.nameEdge*t.nameCut}`)};return{show:e=>{let t=n[e];t&&(c.set([String(e+1).padStart(2,`0`),t.name]),l.set([t.type,t.year]),s&&(s.textContent=`${t.name}. ${t.type}, ${t.year}.`))},style:({textK:e,tight:n,viewW:o})=>{let s=t.nameSize*e*(n?t.tightName:1),c=`${s}vw`,l=`${t.idxSize*e}vw`,d=`"${t.nameFont}", ui-sans-serif, system-ui, sans-serif`,f=`"${t.idxFont}", ui-sans-serif, system-ui, sans-serif`,p=`${t.nameWeight}`,m=`${t.idxWeight}`,h=s*3;for(let e of re){let i=r[e];if(!i?.box)continue;let a=e===`right`,u=n&&!a;if(n&&a){i.box.style.display=`none`;continue}if(i.box.style.display=``,i.box.style.width=`${u?t.tightMetaWidth:t.metaWidth}vw`,i.box.style.height=`${h}vw`,u){let e=h*o/100,n=s*o/100;i.box.style.top=`auto`,i.box.style.left=`auto`,i.box.style.right=`${t.tightNameRight}px`,i.box.style.bottom=`${t.tightNameBottom+n*.5-e*.5}px`,i.box.style.transform=`none`}else i.box.style.top=``,i.box.style.bottom=``,i.box.style.transform=``,i.box.style.left=a?`auto`:`${t.metaLeft}vw`,i.box.style.right=a?`${t.metaRight}vw`:`auto`;for(let e of[...i.layers,i.plain]){if(!e)continue;e.style.justifyContent=u||a?`flex-end`:`flex-start`;let n=e.firstElementChild;n.style.gap=`${a?t.metaGapR:t.metaGapL}vw`;let[r,i]=n.children;r.style.display=u?`none`:``,r.style.fontFamily=a?d:f,r.style.fontSize=a?c:l,r.style.fontWeight=a?p:m,i.style.fontFamily=a?f:d,i.style.fontSize=a?l:c,i.style.fontWeight=a?m:p}}i&&(i.style.fontSize=`${t.listSize*e}vw`),a&&(a.style.bottom=`${t.loaderBottom}vh`,a.style.fontFamily=f,a.style.fontSize=l,a.style.fontWeight=m),u()},setThreshold:u,dispose:()=>{y.killTweensOf(c.m),y.killTweensOf(l.m)}}}var A=`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,j=`
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
`;function ae(e,t){let n=[],r=[],i=()=>{for(let t of[...e.children])e.remove(t),t.geometry.dispose(),t.material.uniforms.uTex.value?.dispose(),t.material.dispose();n=[],r=[]};return{build:()=>{i();let a=t.textSize,o=Math.min(window.devicePixelRatio,2)*2,s=`${t.textWeight} ${a}px "${t.textFont}", ui-sans-serif, system-ui, sans-serif`,d=document.createElement(`canvas`).getContext(`2d`);d.font=s;let f=[...t.text],p=f.map(e=>d.measureText(e).width),m=t.textTracking*a,h=p.reduce((e,t)=>e+t,0)+m*(f.length-1),ee=a*.25,y=a*1.3+ee*2,b=-h/2;f.forEach((i,d)=>{let f=p[d];if(i.trim()){let d=f+ee*2,p=document.createElement(`canvas`);p.width=Math.max(1,Math.ceil(d*o)),p.height=Math.max(1,Math.ceil(y*o));let m=p.getContext(`2d`);m.scale(o,o),m.font=s,m.textBaseline=`alphabetic`,m.fillStyle=`#000`,m.fillText(i,ee,ee+a);let h=new _(p);h.colorSpace=``,h.minFilter=g,h.magFilter=g,h.generateMipmaps=!1;let x=new c({vertexShader:A,fragmentShader:j,uniforms:{uTex:{value:h},uReveal:{value:0},uColor:{value:new v(t.textColor)},uOpacity:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1}),S=new u(new l(1,1),x);S.scale.set(d,y,1),S.position.set(b+f/2,0,0),S.renderOrder=0,e.add(S),n.push(x.uniforms.uReveal),r.push(x.uniforms.uOpacity)}b+=f+m})},dispose:i,get chars(){return n},get fades(){return r}}}function oe(e,t){let n={sx:.5,sy:0},r=new Image,i=!1,a=null;return{box:n,build:()=>{let n=Math.min(window.devicePixelRatio,2)*2,o=document.createElement(`canvas`);o.width=Math.ceil(104*n),o.height=Math.ceil(40*n);let s=o.getContext(`2d`);s.scale(n,n),s.font=`${e.tagWeight} ${e.tagSize}px "${e.textFont}", ui-sans-serif, system-ui, sans-serif`,s.textBaseline=`middle`,s.fillStyle=`#fff`;let c=s.measureText(e.tagText).width,l=(104-(e.tagArrow+e.tagGap+c))*.5;if(s.fillText(e.tagText,l+e.tagArrow+e.tagGap,20),i){let t=(40-e.tagArrow)*.5;s.drawImage(r,l,t,e.tagArrow,e.tagArrow)}a?.dispose(),a=new _(o),a.colorSpace=``,a.minFilter=g,a.magFilter=g,a.generateMipmaps=!1,t.uTagTex.value=a},show:e=>{y.killTweensOf(n),e?(y.to(n,{sx:1,duration:.62,ease:`elastic.out(1, 0.5)`}),y.to(n,{sy:1,duration:.74,ease:`elastic.out(1, 0.42)`})):y.to(n,{sx:.5,sy:0,duration:.28,ease:`power3.in`})},load:e=>{r.onload=()=>{i=!0,e?.()},r.src=`/ce/arrow-up-right.svg`.replace(/\/+/g,`/`)},dispose:()=>{y.killTweensOf(n),a?.dispose()}}}function M(){return{refWidth:1512,refHeight:870,fitHeight:0,minScale:.5,maxScale:1.75,narrowAt:1024,narrowPlane:1.25,narrowRadius:1.3,narrowText:1.5,narrowPosX:-2.5,narrowEndScale:4.22,tightAt:640,tightRadius:.82,tightPosX:-3.5,tightSplit:.8,tightName:1.5,tightNameBottom:16,tightNameRight:16,tightMetaWidth:70,planeSize:90,count:10,ringRadius:340,seed:0,radial:!0,radius:6,textured:!0,blend:14,imageOffset:0,holdAfter:0,loaderChase:.18,loaderBottom:7,loaderOut:.45,stagger:.34,launchTime:1.95,spreadEase:`power2.out`,spreadTime:3.6,stageAt:.7,spinTurns:1,spinTime:2.6,spinEase:`power2.inOut`,spinDelay:0,posX:-2,posY:0,endScale:4.46,moveTime:2.2,moveEase:`power2.inOut`,moveDelay:.2,scrollSpeed:.0022,damping:.94,maxSpeed:12,dragSpeed:1,snap:!0,snapTime:.8,snapFrom:1,pickTime:.55,pickEase:`power3.inOut`,text:`Stories '26`,textSize:41,textFont:`Italiana`,textWeight:400,textTracking:0,textColor:`#f5f3ee`,textAt:.42,textTime:.95,textStagger:.015,textEase:`power4.out`,textOut:!0,textOutAt:-.5,textOutTime:.7,textOutEase:`power2.in`,metaLeft:5.5,metaRight:5.5,metaGapL:4.7,metaGapR:3.6,metaWidth:34,nameSize:24/1440*100,nameFont:`Manrope`,nameWeight:500,idxSize:16/1440*100,idxFont:`Manrope`,idxWeight:400,listSize:.9,nameMorphTime:1.2,nameEase:`circ.out`,nameBlur:8.5,nameEdge:400,nameCut:.33,nameSoften:.35,glass:!0,bandTop:.08,bandBottom:.08,refract:60,squeeze:.05,ripple:5,rippleFreq:.02,fringe:1.5,sheen:.05,hover:!0,touchHold:.16,touchSlop:10,lag:.3,melt:34,meltReach:260,reach:1.7,swell:.09,pull:26,grab:.14,release:.06,web:.2,webReach:1.15,wave:4,waveFreq:.05,waveSpeed:7,sideScale:.035,sidePush:17,sideDim:.15,sideReach:2.4,tagFrom:1024,tagText:`View`,tagSize:14,tagWeight:500,tagArrow:14,tagGap:6,tagX:64,tagY:-38,tagFrost:.16,tagRim:.02,tagRefract:39.5,thread:1,thin:.4,pinch:.35,sag:6,dissolve:2.9,fillet:14,wobble:3,goo:35}}var N=Math.PI*2,se=Math.PI/2,ce=Math.PI/180,P=e=>e<0?0:e>1?1:e,le=e=>1-(1-e)**3,ue=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,de=(e,t,n)=>{let r=P((n-e)/(t-e));return r*r*(3-2*r)},fe=e=>e===0?0:e%2==1?(e+1)/2:-e/2,pe=(e,t)=>1-(1-t)**(e*60),F=n(),me=.06,he=()=>{let e=new p(new Uint8Array([255,255,255,255]),1,1);return e.needsUpdate=!0,e};function ge({theme:e=`dark`,projects:t=i,onActiveChange:n,onOpenProject:r,onError:d}){let h=(0,b.useRef)(null),g=(0,b.useRef)(null),_=(0,b.useRef)([]),C=(0,b.useRef)(null),w=(0,b.useRef)(null),te=(0,b.useRef)(null),T=(0,b.useRef)(e);T.current=e;let re=(0,b.useRef)(n);re.current=n;let E=(0,b.useRef)(r);E.current=r;let D=(0,b.useRef)(d);D.current=d;let O=(0,b.useRef)({left:{box:null,goo:null,layers:[],plain:null},right:{box:null,goo:null,layers:[],plain:null}});(0,b.useEffect)(()=>{let e=h.current,n=g.current,r=C.current,d=!1,b=`ce-wheel-seen`,k=(()=>{try{return sessionStorage.getItem(b)===`1`}catch{return!1}})(),A=(()=>{try{return window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0}catch{return!1}})(),j=M(),F=Array.isArray(t)&&t.length>0?t:i;F.length>32&&console.warn(`[wheel] ${F.length} stories exceed MAX_PLANES=32 — clamping`),j.count=Math.min(Math.max(1,F.length),32);let ge=F.slice(0,32),_e={dark:{page:`#050505`,ink:`#f5f3ee`},light:{page:`#F4F2ED`,ink:`#1c1c1c`}},ve=e=>{let t=_e[e]||_e.dark;j.textColor=t.ink,R.uPage.value.set(t.page);for(let e of Te.children)e.material.uniforms.uColor.value.set(t.ink)},I={progress:0,launch:0,spread:0,spin:0,shift:0},L;try{L=new ee({antialias:!1,alpha:!0,depth:!1,stencil:!1,powerPreference:`high-performance`})}catch(e){console.error(`[ring] could not create a WebGL context:`,e),D.current?.(e);return}let ye=[Math.min(window.devicePixelRatio||1,2),1.5,1.25,1].filter((e,t,n)=>t===0||e<n[t-1]-1e-6),be=0,xe=0;L.setPixelRatio(ye[0]),e.appendChild(L.domElement);let Se=new o,Ce=new f(-1,1,1,-1,-100,100),R={uResolution:{value:new a(1,1)},uSize:{value:new a(150,100)},uRadius:{value:j.radius},uCount:{value:j.count},uPos:{value:Array.from({length:32},()=>new a)},uRot:{value:new Float32Array(32)},uScale:{value:Array.from({length:32},()=>new s(0,0,1,0))},uLinkCount:{value:0},uLinkA:{value:Array.from({length:32},()=>new a)},uLinkB:{value:Array.from({length:32},()=>new a)},uLinkPar:{value:Array.from({length:32},()=>new s)},uK:{value:j.goo},uWobble:{value:j.wobble},uTime:{value:0},uColor:{value:new v(`#0a0a0a`)},uAtlas:{value:he()},uGrid:{value:new a(1,1)},uBlend:{value:j.blend},uTextured:{value:0},uBandTop:{value:0},uBandBottom:{value:0},uGlass:{value:new s},uFringe:{value:0},uSheen:{value:0},uMouse:{value:new s},uMelt:{value:new s},uTagTex:{value:new p(new Uint8Array([0,0,0,0]),1,1)},uTag:{value:new s},uTagP:{value:new s},uTagQ:{value:new s},uPage:{value:new v(T.current===`light`?`#F4F2ED`:`#050505`)}},we=new u(new l(1,1),new c({vertexShader:x,fragmentShader:S,uniforms:R,transparent:!0,depthWrite:!1}));we.renderOrder=10,Se.add(we);let Te=new m;Se.add(Te);let z=ae(Te,j),B=oe(j,R),Ee=ie({groups:O.current,list:n,loader:r,cut:te.current,live:w.current},j,ge),De=!1,Oe=0,ke=!1,Ae=[],je=e=>ke?e():Ae.push(e),Me=ne(ge.map(e=>e.file),e=>{d||(Oe=e)});R.uAtlas.value.dispose(),Me.texture.anisotropy=L.capabilities.getMaxAnisotropy(),R.uAtlas.value=Me.texture,R.uGrid.value.set(Me.grid[0],Me.grid[1]);let V=Me.count;Me.first.then(()=>{d||(De=!0)}),Me.ready.then(()=>{d||(Oe=1)});let H=1,U=1,Ne={left:0,top:0},W=1,Pe=1,Fe=1,Ie=1,Le=!1,Re=!1,ze=()=>{let e=H/Math.max(1,j.refWidth),t=U/Math.max(1,j.refHeight),n=e*(1-j.fitHeight)+Math.min(e,t)*j.fitHeight;W=Math.min(j.maxScale,Math.max(j.minScale,n));let r=H<=j.narrowAt,i=H<=j.tightAt;Le=r,Re=i,Pe=r?j.narrowPlane:1,Fe=(r?j.narrowRadius:1)*(i?j.tightRadius:1),Ie=r?j.narrowText:1,`${Math.round(H)}${Math.round(U)}`,Math.round(W*1e3)/1e3;let a=W*Ie*(i?j.tightSplit:1);Te.scale.set(a,a,1)},Be=()=>Ee.style({textK:Ie,tight:Re,viewW:H}),Ve=()=>{H=e.clientWidth,U=e.clientHeight,ze(),L.setSize(H,U),Ce.left=-H/2,Ce.right=H/2,Ce.top=U/2,Ce.bottom=-U/2,Ce.updateProjectionMatrix(),we.scale.set(H,U,1),R.uResolution.value.set(H,U);let t=L.domElement.getBoundingClientRect();Ne.left=t.left,Ne.top=t.top},He=()=>{Ve(),Be()};Ve(),window.addEventListener(`resize`,He);let Ue={x:0,y:0},We=0,G=!1,K=0,Ge=!1,Ke=0,qe=0,q=!1,Je=0,Ye=0,J=!1,Xe=0,Ze=0,Qe=0,$e=e=>{let t=e.clientX-Ne.left-Ue.x,n=e.clientY-Ne.top-Ue.y;return Math.atan2(-n,t)},et=()=>{J&&=(y.killTweensOf(I),!1)};function tt(){!G&&$&&$.progress(1,!1)}let nt=e=>V>0?((Math.round(j.imageOffset)-e)%V+V)%V:0,rt=e=>{let t=N/Math.round(j.count),n=We-j.seed*ce-fe(e)*t,r=n+Math.round((I.spin-n)/N)*N;return{slots:Math.abs(r-I.spin)/t,target:r,slot:t}},it=e=>{let{slots:t,target:n}=rt(e);if(t<.01){E.current?.(nt(fe(e)));return}K=0,q=!1,J=!0,y.killTweensOf(I),y.to(I,{spin:n,duration:j.pickTime*Math.sqrt(Math.max(1,t)),ease:j.pickEase,onComplete:()=>{J=!1}})},Y={x:0,y:0,inside:!1,seeded:!1},X={x:0,y:0,amt:0,wake:0},at=!1,ot=!1,st=0,ct=()=>{clearTimeout(st),st=0,ot=!1},lt=()=>{clearTimeout(st),st=setTimeout(()=>{ot=!0},j.touchHold*1e3)},ut=()=>at?ot:Y.inside,dt=e=>{at=e.pointerType===`touch`,Y.x=e.clientX-Ne.left-H*.5,Y.y=U*.5-(e.clientY-Ne.top),Y.inside=!0,Y.seeded||(Y.seeded=!0,X.x=Y.x,X.y=Y.y)},ft=()=>{Y.inside=!1},pt=e=>{if(!G){tt();return}e.preventDefault();let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;et(),q=!1,K+=t*j.scrollSpeed,K=Math.max(-j.maxSpeed,Math.min(j.maxSpeed,K))},mt=e=>{if(Xe=0,Ze=e.clientX,Qe=e.clientY,dt(e),!G){tt();return}et(),at&&lt(),Ge=!0,q=!1,K=0,Ke=$e(e),qe=performance.now(),L.domElement.setPointerCapture?.(e.pointerId)},ht=e=>{if(dt(e),Xe+=Math.abs(e.clientX-Ze)+Math.abs(e.clientY-Qe),Ze=e.clientX,Qe=e.clientY,at&&!ot&&Xe>j.touchSlop&&ct(),!Ge)return;let t=$e(e),n=t-Ke;n>Math.PI&&(n-=N),n<-Math.PI&&(n+=N);let r=n*j.dragSpeed;I.spin+=r;let i=performance.now();K=r/(Math.max(8,i-qe)/1e3),Ke=t,qe=i},gt=e=>{if(dt(e),ct(),Ge){Ge=!1;try{L.domElement.releasePointerCapture?.(e.pointerId)}catch{}}},_t=()=>{if(!G){tt();return}Xe>=5||Nt<0||it(Nt)};e.addEventListener(`wheel`,pt,{passive:!1}),e.addEventListener(`pointerdown`,mt),e.addEventListener(`pointermove`,ht),e.addEventListener(`pointerup`,gt),e.addEventListener(`pointercancel`,gt),e.addEventListener(`pointerleave`,ft),e.addEventListener(`click`,_t);let vt=e=>{if(e.target?.closest?.(`[role="dialog"]`)||!G)return;let t=N/Math.max(1,Math.round(j.count));e.key===`ArrowRight`||e.key===`ArrowDown`?(e.preventDefault(),et(),q=!1,K=0,J=!0,y.killTweensOf(I),y.to(I,{spin:I.spin-t,duration:j.pickTime,ease:j.pickEase,onComplete:()=>{J=!1}})):(e.key===`ArrowLeft`||e.key===`ArrowUp`)&&(e.preventDefault(),et(),q=!1,K=0,J=!0,y.killTweensOf(I),y.to(I,{spin:I.spin+t,duration:j.pickTime,ease:j.pickEase,onComplete:()=>{J=!1}}))};window.addEventListener(`keydown`,vt);let yt=e=>{let t=j.hover&&ut()&&Y.seeded&&G;X.amt+=(+!!t-X.amt)*pe(e,.12);let n=pe(e,j.lag);X.x+=(Y.x-X.x)*n,X.y+=(Y.y-X.y)*n;let r=Math.hypot(Y.x-X.x,Y.y-X.y);X.wake=Math.max(X.wake*.94**(e*60),P(r/(Math.max(e,.001)*2600))),R.uMouse.value.set(X.x,X.y,X.amt,j.melt*W),R.uMelt.value.set(j.meltReach*W,j.wave*W*X.wake*X.amt,j.waveFreq,j.waveSpeed)},bt={shown:0},xt=e=>{let t=Math.min(Oe,P(I.progress));bt.shown+=(t-bt.shown)*pe(e,j.loaderChase);let n=Math.min(100,Math.max(1,Math.round(bt.shown*100)));if(r&&(r.textContent=String(n).padStart(3,`0`)),!ke&&n>=100){ke=!0;for(let e of Ae)e();Ae.length=0}},St=new Float32Array(32),Ct=new Float32Array(32),wt=[],Tt=Array.from({length:32},()=>new a),Et=new Float32Array(32),Dt=new Float32Array(32),Ot=new Float32Array(32),kt=new Float32Array(32),Z=new Float32Array(32),At=new a,jt=e=>Math.max(.05,1+j.swell*Et[e]-j.sideScale*Z[e]),Q=-1,Mt=-1,Nt=-1,Pt=!1,Ft=()=>{let e=_.current;for(let t=0;t<e.length;t++){let n=e[t];if(!n)continue;let r=t===Q;n.style.opacity=r?`1`:`0.2`,r?n.setAttribute(`aria-current`,`true`):n.removeAttribute(`aria-current`)}},It=e=>{let t=Math.round(j.count);R.uCount.value=t;let n=N/t,r=P(I.spread),i=Le?j.narrowEndScale:j.endScale,a=Re?j.tightPosX:Le?j.narrowPosX:j.posX,o=P(I.shift),s=(1+(i-1)*o)*W,c=a*H*.5*o,l=j.posY*U*.5*o;Ue.x=H*.5+c,Ue.y=U*.5-l,We=c!==0||l!==0?Math.atan2(-l,-c):0;let u=j.planeSize*Pe*s,d=u/1.5;R.uSize.value.set(u,d),R.uRadius.value=j.radius*Pe*s;let f=j.radial?d:u,p=j.radial?u:d,m=j.ringRadius*Fe*s,h=2*m*Math.sin(n/2)-f;Math.round(h/s*10)/10;let g=Math.max(1,h),_=Math.max(1,Math.abs(fe(t-1))),v=Math.max(.1,.94-j.stagger);Ct[0]=0;for(let e=1;e<=_;e++){let t=P((r-(me+(e-1)/_*j.stagger))/v),n=t*t*(3-2*t);St[e]=n,Ct[e]=Ct[e-1]+n}let ee=j.seed*ce,y=ue(P(I.launch)),b=m*y;wt.length=0;let x=X.amt>.001,S=Math.max(1,j.reach*u),C=Math.max(1,j.sideReach*u),w=pe(e,j.grab),te=pe(e,j.release),T=-1,ne=1e9,re=0,E=Math.round(j.imageOffset),D=e=>V>0?((E-e)%V+V)%V:0,O=Y.inside&&Y.seeded&&G,k=-1,ie=x?Nt:-1;for(let e=0;e<t;e++){let t=fe(e),r=Math.abs(t),i=e===0?P(I.progress):St[r],a=D(t),o=ee+Math.sign(t)*n*Ct[r]+I.spin,s=Math.cos(o)*b+c,f=Math.sin(o)*b+l;Tt[e].set(s,f);let p=o-We,m=Math.abs(Math.atan2(Math.sin(p),Math.cos(p)));m<ne&&(ne=m,T=e,re=a);let h=0,g=0,_=0;if(x){let e=X.x-s,t=X.y-f,n=Math.hypot(e,t);if(h=de(S,S*.22,n)*X.amt*i,h>1e-4&&n>1e-4){let r=j.pull*W*h/n;g=e*r,_=t*r}}let v=h>Et[e]?w:te;Et[e]+=(h-Et[e])*v,Dt[e]+=(g-Dt[e])*v,Ot[e]+=(_-Ot[e])*v;let E=0;if(ie>=0&&e!==ie){let e=Math.hypot(At.x-s,At.y-f);E=de(C,C*.2,e)*i}Z[e]+=(E-Z[e])*(E>Z[e]?w:te);let A=0,ae=0;if(Z[e]>1e-4){let t=s-At.x,n=f-At.y,r=Math.hypot(t,n);if(r>1e-4){let i=j.sidePush*W*Z[e]/r;A=t*i,ae=n*i}}R.uPos.value[e].set(s+Dt[e]+A,f+Ot[e]+ae),R.uRot.value[e]=(j.radial?o:o+se)*y;let oe=le(P(e===0?i/.7:i/.34)),M=le(P(e===0?(i-.18)/.74:(i-.06)/.36)),N=jt(e);if(R.uScale.value[e].set(oe*N,M*N,1-j.sideDim*Z[e],a),O&&k<0){let t=R.uRot.value[e],n=X.x-(s+Dt[e]+A),r=X.y-(f+Ot[e]+ae),i=Math.cos(t),a=Math.sin(t);Math.abs(n*i+r*a)<=u*.5*oe*N&&Math.abs(-n*a+r*i)<=d*.5*M*N&&(k=e)}wt.push(e)}for(let e=t;e<32;e++)R.uScale.value[e].set(0,0,1,0),Et[e]=0,Dt[e]=0,Ot[e]=0,Z[e]=0;Nt=k;let A=Nt>=0&&!at&&H>j.tagFrom;A!==Pt&&(Pt=A,B.show(A)),Nt>=0&&At.copy(Tt[Nt]),R.uTag.value.set(X.x+j.tagX,X.y+j.tagY,B.box.sx,B.box.sy),R.uTagP.value.set(52,20,20,j.tagRefract),R.uTagQ.value.set(j.tagFrost,j.tagRim,0,0),T>=0&&V>0&&re!==Q&&(Q=re,Ft()),wt.sort((e,t)=>fe(e)-fe(t));let ae=p*.5*j.thread,oe=Math.min(r>.995&&t>2?t:t-1,32);for(let e=0;e<oe;e++){let n=wt[e],r=wt[(e+1)%t],i=R.uPos.value[n],a=R.uPos.value[r],o=R.uScale.value[n],c=R.uScale.value[r],l=(j.radial?o.y:o.x)/jt(n),d=(j.radial?c.y:c.x)/jt(r),p=P((Tt[n].distanceTo(Tt[r])-f*.5*(l+d))/g),m=0;if(x&&j.web>1e-4){let e=(i.x+a.x)*.5,t=(i.y+a.y)*.5,n=Math.max(1,j.webReach*u),r=Math.hypot(X.x-e,X.y-t);m=de(n,n*.15,r)*X.amt}kt[e]+=(m-kt[e])*(m>kt[e]?w:te);let h=ae*Math.max((1-p)**j.thin,j.web*kt[e])-j.dissolve,_=h*(1-(1-j.pinch)*de(0,.7,p));R.uLinkA.value[e].copy(i),R.uLinkB.value[e].copy(a),R.uLinkPar.value[e].set(h,_,j.sag*s*p**1.5,Math.min(j.fillet*s*de(0,.35,p),Math.max(_,0)*1.5))}for(let e=oe;e<32;e++)R.uLinkPar.value[e].set(-100,-100,0,0);R.uLinkCount.value=oe,R.uK.value=j.goo*Pe*W,R.uWobble.value=j.wobble*W*(1-de(.2,.95,I.progress)),R.uTextured.value=j.textured&&De?1:0,R.uBlend.value=Math.max(.5,j.blend*Pe*s);let M=j.glass;R.uBandTop.value=M?j.bandTop*U:0,R.uBandBottom.value=M?j.bandBottom*U:0,R.uGlass.value.set(j.refract,j.squeeze,j.ripple,j.rippleFreq),R.uFringe.value=M?j.fringe:0,R.uSheen.value=M?j.sheen:0},Lt=0,Rt=()=>{G=!1,Mt=-1,K=0,Ge=!1,q=!1,et();let e=++Lt;r&&y.set(r,{opacity:+!ke});let t=y.timeline({delay:.25,onComplete:()=>{G=!0;try{sessionStorage.setItem(b,`1`)}catch{}}});t.fromTo(I,{progress:0,launch:0,spread:0,spin:0,shift:0},{progress:1,duration:1.2,ease:`power2.out`}),t.addPause(`>`,()=>{je(()=>{y.delayedCall(j.holdAfter,()=>{d||e!==Lt||(t.resume(),r&&y.to(r,{opacity:0,duration:j.loaderOut,ease:`power2.in`}))})})}),t.to(I,{launch:1,duration:j.launchTime,ease:`power2.inOut`});let i=t.duration()-.15;t.to(I,{spread:1,duration:j.spreadTime,ease:j.spreadEase},i);let a=i+j.stageAt*j.spreadTime;t.to(I,{spin:j.spinTurns*N,duration:j.spinTime,ease:j.spinEase},a+j.spinDelay),t.to(I,{shift:1,duration:j.moveTime,ease:j.moveEase},a+j.moveDelay);let o=i+j.textAt*j.spreadTime;if(z.chars.length&&t.fromTo(z.chars,{value:0},{value:1,duration:j.textTime,ease:j.textEase,stagger:j.textStagger},o),j.textOut&&z.fades.length){let e=Math.max(a+j.spinDelay+j.spinTime,a+j.moveDelay+j.moveTime);t.fromTo(z.fades,{value:1},{value:0,duration:j.textOutTime,ease:j.textOutEase,stagger:j.textStagger},Math.max(0,e+j.textOutAt))}return n&&t.fromTo(n,{opacity:0},{opacity:1,duration:j.textTime,ease:j.textEase},o),t};B.build(),B.load(()=>{d||B.build()}),Be();let $=null,zt=()=>{$?.kill(),$=Rt()},Bt=()=>{d||$||(ve(T.current),z.build(),ve(T.current),B.build(),Be(),zt(),(k||A)&&$?.progress(1,!1))},Vt=setTimeout(Bt,3e3);Promise.race([document.fonts?.ready??Promise.resolve(),new Promise(e=>setTimeout(e,500))]).then(Bt).catch(Bt);try{document.fonts?.ready.then(()=>{!d&&$&&B.build()}).catch(()=>{})}catch{}document.createElement(`div`);let Ht=performance.now(),Ut=Ht,Wt=T.current;return L.setAnimationLoop(()=>{let e=performance.now(),t=Math.min(.05,(e-Ut)/1e3);if(Ut=e,R.uTime.value=(e-Ht)*.001,be<ye.length-1&&(t>1/42?xe+=t:xe=Math.max(0,xe-t*.5),xe>1.2&&(be+=1,L.setPixelRatio(ye[be]),He(),xe=0)),G&&!Ge&&!J){I.spin+=K*t,K*=j.damping**(t*60);let e=0;if(j.snap){let n=N/Math.round(j.count),r=Math.max(.01,-Math.log(j.damping)*60),i=Math.max(j.snapFrom,r*n*.5),a=4.8/Math.max(.05,j.snapTime);if(!q&&Math.abs(K)<i){let e=I.spin+K/r,t=j.seed*ce-We;Je=Math.round((e+t)/n)*n-t,Ye=Math.max(Math.abs(K),n*.5*a),q=!0}if(q){e=Je-I.spin;let n=Math.max(-Ye,Math.min(Ye,e*a));K+=(n-K)*P(a*t)}}else q=!1;Math.abs(K)<.0015&&Math.abs(e)<8e-4&&(K=0,I.spin+=e)}xt(t),yt(t),Wt!==T.current&&(Wt=T.current,R.uPage.value.set(Wt===`light`?`#F4F2ED`:`#050505`)),It(t),G&&!Ge&&!J&&K===0&&Q>=0&&Q!==Mt&&(Mt=Q,Ee.show(Q),re.current?.(Q,ge[Q])),L.render(Se,Ce)}),()=>{d=!0,clearTimeout(st),clearTimeout(Vt),L.setAnimationLoop(null),window.removeEventListener(`resize`,He),window.removeEventListener(`keydown`,vt),e.removeEventListener(`wheel`,pt),e.removeEventListener(`pointerdown`,mt),e.removeEventListener(`pointermove`,ht),e.removeEventListener(`pointerup`,gt),e.removeEventListener(`pointercancel`,gt),e.removeEventListener(`pointerleave`,ft),e.removeEventListener(`click`,_t),$?.kill(),y.killTweensOf(z.chars),y.killTweensOf(z.fades),y.killTweensOf(n),Ee.dispose(),B.dispose(),z.dispose(),we.geometry.dispose(),we.material.dispose(),R.uAtlas.value?.dispose(),R.uTagTex.value?.dispose(),L.dispose(),L.forceContextLoss(),L.domElement.remove()}},[t]);let k=e===`light`?`#1c1c1c`:`#f5f3ee`;return(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(`div`,{ref:h,role:`group`,"aria-label":`Stories carousel. Scroll, drag, or use the left and right arrow keys to browse. Click the front card to open its story.`,className:`absolute inset-0 touch-none`}),(0,F.jsx)(`ul`,{ref:g,"aria-label":`Projects`,style:{fontFamily:`"Manrope", ui-sans-serif, system-ui, sans-serif`,color:k},className:`pointer-events-none absolute bottom-[7vh] left-[2vw] z-10 flex flex-col items-start text-left leading-[1.5] tracking-[0.01em] opacity-0 max-sm:hidden`,children:t.slice(0,32).map((e,t)=>(0,F.jsx)(`li`,{ref:e=>{_.current[t]=e},style:{opacity:.2},children:e.name},e.file))}),[{side:`left`,justify:`flex-start`},{side:`right`,justify:`flex-end`}].map(({side:e,justify:t})=>{let n=(0,F.jsxs)(`span`,{className:`flex items-baseline whitespace-nowrap`,children:[(0,F.jsx)(`span`,{}),(0,F.jsx)(`span`,{})]});return(0,F.jsxs)(`div`,{ref:t=>{O.current[e].box=t},"aria-hidden":`true`,style:{color:k},className:`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 tracking-[-0.01em]`,children:[(0,F.jsx)(`span`,{ref:t=>{O.current[e].goo=t},className:`absolute inset-0`,style:{willChange:`filter`},children:[0,1].map(r=>(0,F.jsx)(`span`,{ref:t=>{O.current[e].layers[r]=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n},r))}),(0,F.jsx)(`span`,{ref:t=>{O.current[e].plain=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n})]},e)}),(0,F.jsx)(`div`,{ref:C,"aria-hidden":`true`,style:{color:k},className:`pointer-events-none absolute bottom-[1vh] left-1/2 z-10 -translate-x-1/2 tracking-[-0.01em]`}),(0,F.jsx)(`div`,{ref:w,"aria-live":`polite`,className:`sr-only`}),(0,F.jsx)(`svg`,{"aria-hidden":`true`,className:`pointer-events-none absolute h-0 w-0`,focusable:`false`,children:(0,F.jsx)(`defs`,{children:(0,F.jsx)(`filter`,{id:`name-goo`,x:`-20%`,y:`-100%`,width:`140%`,height:`300%`,colorInterpolationFilters:`sRGB`,children:(0,F.jsx)(`feColorMatrix`,{ref:te,in:`SourceGraphic`,type:`matrix`,values:`1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140`})})})})]})}export{ge as default};