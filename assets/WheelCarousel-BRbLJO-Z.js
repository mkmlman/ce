import{n as e}from"./rolldown-runtime-CbXtAM7H.js";import{a as t}from"./motion-6MpT-aL9.js";import{a as n,i as r,p as i}from"./index-Ditxd4WU.js";import{A as a,D as o,M as s,O as c,S as l,_ as u,a as d,b as f,c as p,d as m,g as h,h as g,i as _,s as v,t as y}from"./three-Cq4jDphW.js";import{t as b}from"./animation-CvDoa17S.js";var x=e(t(),1),S=`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,ee=`
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
`,C=512,w=Math.round(C/1.5),te=(e,t)=>new Promise((n,r)=>{let i=new Image;t&&(i.fetchPriority=t),i.crossOrigin=`anonymous`,i.onload=()=>n(i),i.onerror=()=>r(Error(`failed to load ${e}`)),i.src=e}),T=e=>/^(https?:|data:|blob:)/.test(e)?e:`/ce/${String(e).replace(/^\/+/,``)}`.replace(/\/+/g,`/`);function ne(e=r,t,n){let i=Math.ceil(Math.sqrt(e.length)),a=Math.ceil(e.length/i),o=document.createElement(`canvas`);o.width=i*C,o.height=a*w;let s=o.getContext(`2d`),c=new _(o);c.flipY=!1,c.colorSpace=``,c.wrapS=d,c.wrapT=d,c.minFilter=h,c.magFilter=g,c.generateMipmaps=!0;let l=(e,t)=>{let n=t%i*C,r=Math.floor(t/i)*w,a=Math.max(C/e.width,w/e.height),o=e.width*a,c=e.height*a;s.save(),s.beginPath(),s.rect(n,r,C,w),s.clip(),s.drawImage(e,n+(C-o)/2,r+(w-c)/2,o,c),s.restore()},u=0,f=0,p=()=>t?.(u/e.length),m=(t,r)=>te(T(e[t]),r).then(e=>l(e,t)).catch(r=>{f++,console.warn(`[atlas]`,r.message),n?.(Error(`Atlas ${f}/${e.length} failed: ${e[t]}`),{failed:f,total:e.length})}).finally(()=>{u++,p()}),v=m(0,`high`).then(()=>{c.needsUpdate=!0}),y=Promise.all([v,...e.slice(1).map((e,t)=>m(t+1,`low`))]).then(()=>{c.needsUpdate=!0});return p(),{texture:c,grid:[i,a],count:e.length,first:v,ready:y}}var re=[`left`,`right`],ie=2,E=e=>e?.firstElementChild?.children,ae=new WeakMap;function D(e,t,n){let r=ae.get(e);r===void 0&&(r=Object.create(null),ae.set(e,r)),r[t]!==n&&(r[t]=n,e.style[t]=n)}function O(e,t,n){e&&(t>=1?(D(e,`filter`,`none`),D(e,`opacity`,`1`)):t<=0?(D(e,`filter`,`none`),D(e,`opacity`,`0`)):(D(e,`filter`,`blur(${Math.min(n/t-n,100)}px)`),D(e,`opacity`,`${t**.4}`)))}function oe(e,t,n){let r={t:1},i=[``,``],a=[!1,!1],o=()=>{let i=t[e];if(!i)return;let o=E(i.layers[0]),s=E(i.layers[1]),c=E(i.plain),l=r.t;for(let e=0;e<ie;e++)a[e]?(O(o?.[e],1-l,n.nameBlur),O(s?.[e],l,n.nameBlur),c?.[e]&&D(c[e],`opacity`,`0`)):(o?.[e]&&D(o[e],`opacity`,`0`),s?.[e]&&D(s[e],`opacity`,`0`),c?.[e]&&D(c[e],`opacity`,`1`));i.goo&&D(i.goo,`filter`,l>=1?`none`:`url(#name-goo) blur(${n.nameSoften}px)`)};return{m:r,set:s=>{let c=t[e];if(!c?.layers[0]||!c.layers[1]||!c.plain)return;b.killTweensOf(r),r.t=1,o();let l=[s[0]??``,s[1]??``];a=[l[0]!==i[0],l[1]!==i[1]];let u=E(c.layers[0]),d=E(c.layers[1]),f=E(c.plain);for(let e=0;e<ie;e++)u?.[e]&&(u[e].textContent=i[e]),d?.[e]&&(d[e].textContent=l[e]),f?.[e]&&(f[e].textContent=l[e]);if(i=l,!a[0]&&!a[1]){r.t=1,o();return}r.t=0,o(),b.to(r,{t:1,duration:n.nameMorphTime,ease:n.nameEase,onUpdate:o})}}}function se(e,t,n){let{groups:r,list:i,loader:a,cut:o,live:s}=e,c=oe(`left`,r,t),l=oe(`right`,r,t),u=()=>{o?.setAttribute(`values`,`1 0 0 0 0
       0 1 0 0 0
       0 0 1 0 0
       0 0 0 ${t.nameEdge} ${-t.nameEdge*t.nameCut}`)};return{show:e=>{let t=n[e];t&&(c.set([String(e+1).padStart(2,`0`),t.name]),l.set([t.type,t.year]),s&&(s.textContent=`${t.name}. ${t.type}, ${t.year}.`))},style:({textK:e,tight:n,viewW:o})=>{let s=t.nameSize*e*(n?t.tightName:1),c=`${s}vw`,l=`${t.idxSize*e}vw`,d=`"${t.nameFont}", ui-sans-serif, system-ui, sans-serif`,f=`"${t.idxFont}", ui-sans-serif, system-ui, sans-serif`,p=`${t.nameWeight}`,m=`${t.idxWeight}`,h=s*3;for(let e of re){let i=r[e];if(!i?.box)continue;let a=e===`right`,u=n&&!a;if(n&&a){i.box.style.display=`none`;continue}if(i.box.style.display=``,i.box.style.width=`${u?t.tightMetaWidth:t.metaWidth}vw`,i.box.style.height=`${h}vw`,u){let e=h*o/100,n=s*o/100;i.box.style.top=`auto`,i.box.style.left=`auto`,i.box.style.right=`${t.tightNameRight}px`,i.box.style.bottom=`calc(${t.tightNameBottom}vh + ${n*.5-e*.5}px)`,i.box.style.transform=`none`}else i.box.style.top=``,i.box.style.bottom=``,i.box.style.transform=``,i.box.style.left=a?`auto`:`${t.metaLeft}vw`,i.box.style.right=a?`${t.metaRight}vw`:`auto`;for(let e of[...i.layers,i.plain]){if(!e)continue;e.style.justifyContent=u||a?`flex-end`:`flex-start`;let n=e.firstElementChild;n.style.gap=`${a?t.metaGapR:t.metaGapL}vw`;let[r,i]=n.children;r.style.display=u?`none`:``,r.style.fontFamily=a?d:f,r.style.fontSize=a?c:l,r.style.fontWeight=a?p:m,i.style.fontFamily=a?f:d,i.style.fontSize=a?l:c,i.style.fontWeight=a?m:p}}i&&(i.style.fontSize=`${t.listSize*e}vw`),a&&(a.style.bottom=`${t.loaderBottom}vh`,a.style.fontFamily=f,a.style.fontSize=l,a.style.fontWeight=m),u()},setThreshold:u,dispose:()=>{b.killTweensOf(c.m),b.killTweensOf(l.m)}}}var k=`
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
`;function ce(e,t){let n=[],r=[],i=()=>{for(let t of[...e.children])e.remove(t),t.geometry.dispose(),t.material.uniforms.uTex.value?.dispose(),t.material.dispose();n=[],r=[]};return{build:()=>{i();let a=t.textSize,o=Math.min(window.devicePixelRatio,2)*2,s=`${t.textWeight} ${a}px "${t.textFont}", ui-sans-serif, system-ui, sans-serif`,d=document.createElement(`canvas`).getContext(`2d`);d.font=s;let f=[...t.text],p=f.map(e=>d.measureText(e).width),m=t.textTracking*a,h=p.reduce((e,t)=>e+t,0)+m*(f.length-1),y=a*.25,b=a*1.3+y*2,x=-h/2;f.forEach((i,d)=>{let f=p[d];if(i.trim()){let d=f+y*2,p=document.createElement(`canvas`);p.width=Math.max(1,Math.ceil(d*o)),p.height=Math.max(1,Math.ceil(b*o));let m=p.getContext(`2d`);m.scale(o,o),m.font=s,m.textBaseline=`alphabetic`,m.fillStyle=`#000`,m.fillText(i,y,y+a);let h=new _(p);h.colorSpace=``,h.minFilter=g,h.magFilter=g,h.generateMipmaps=!1;let S=new c({vertexShader:k,fragmentShader:A,uniforms:{uTex:{value:h},uReveal:{value:0},uColor:{value:new v(t.textColor)},uOpacity:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1}),ee=new u(new l(1,1),S);ee.scale.set(d,b,1),ee.position.set(x+f/2,0,0),ee.renderOrder=0,e.add(ee),n.push(S.uniforms.uReveal),r.push(S.uniforms.uOpacity)}x+=f+m})},dispose:i,get chars(){return n},get fades(){return r}}}function le(e,t){let n={sx:.5,sy:0},r=new Image,i=!1,a=null;return{box:n,build:()=>{let n=Math.min(window.devicePixelRatio,2)*2,o=document.createElement(`canvas`);o.width=Math.ceil(104*n),o.height=Math.ceil(40*n);let s=o.getContext(`2d`);s.scale(n,n),s.font=`${e.tagWeight} ${e.tagSize}px "${e.textFont}", ui-sans-serif, system-ui, sans-serif`,s.textBaseline=`middle`,s.fillStyle=`#fff`;let c=s.measureText(e.tagText).width,l=(104-(e.tagArrow+e.tagGap+c))*.5;if(s.fillText(e.tagText,l+e.tagArrow+e.tagGap,20),i){let t=(40-e.tagArrow)*.5;s.drawImage(r,l,t,e.tagArrow,e.tagArrow)}a?.dispose(),a=new _(o),a.colorSpace=``,a.minFilter=g,a.magFilter=g,a.generateMipmaps=!1,t.uTagTex.value=a},show:e=>{b.killTweensOf(n),e?(b.to(n,{sx:1,duration:.62,ease:`elastic.out(1, 0.5)`}),b.to(n,{sy:1,duration:.74,ease:`elastic.out(1, 0.42)`})):b.to(n,{sx:.5,sy:0,duration:.28,ease:`power3.in`})},load:e=>{r.onload=()=>{i=!0,e?.()},r.src=`/ce/arrow-up-right.svg`.replace(/\/+/g,`/`)},dispose:()=>{b.killTweensOf(n),a?.dispose()}}}function ue(){return{refWidth:1512,refHeight:870,fitHeight:0,minScale:.5,maxScale:1.75,narrowAt:1024,narrowPlane:1.25,narrowRadius:1.3,narrowText:1.5,narrowEndScale:4.22,tightAt:640,tightRadius:.82,tightSplit:.8,tightName:1.5,tightNameBottom:13,tightNameRight:16,tightMetaWidth:70,planeSize:90,count:10,ringRadius:340,seed:0,radial:!0,radius:6,textured:!0,blend:14,imageOffset:0,holdAfter:0,loaderChase:.18,loaderBottom:7,loaderOut:.45,stagger:.34,launchTime:1.95,spreadEase:`power2.out`,spreadTime:3.6,stageAt:.7,spinTurns:1,spinTime:2.6,spinEase:`power2.inOut`,spinDelay:0,posX:0,posY:0,endScale:4.46,moveTime:2.2,moveEase:`power2.inOut`,moveDelay:.2,scrollSpeed:.0022,damping:.94,maxSpeed:12,dragSpeed:1,snap:!0,snapTime:.8,snapFrom:1,pickTime:.55,pickEase:`power3.inOut`,text:`Stories '26`,textSize:41,textFont:`Italiana`,textWeight:400,textTracking:0,textColor:`#f5f3ee`,textAt:.42,textTime:.95,textStagger:.015,textEase:`power4.out`,textOut:!0,textOutAt:-.5,textOutTime:.7,textOutEase:`power2.in`,metaLeft:5.5,metaRight:5.5,metaGapL:4.7,metaGapR:3.6,metaWidth:34,nameSize:24/1440*100,nameFont:`Manrope`,nameWeight:500,idxSize:16/1440*100,idxFont:`Manrope`,idxWeight:400,listSize:.9,nameMorphTime:1.2,nameEase:`circ.out`,nameBlur:8.5,nameEdge:400,nameCut:.33,nameSoften:.35,glass:!0,bandTop:.08,bandBottom:.08,refract:60,squeeze:.05,ripple:5,rippleFreq:.02,fringe:1.5,sheen:.05,hover:!0,touchHold:.16,touchSlop:10,lag:.3,melt:34,meltReach:260,reach:1.7,swell:.09,pull:26,grab:.14,release:.06,web:.2,webReach:1.15,wave:4,waveFreq:.05,waveSpeed:7,sideScale:.035,sidePush:17,sideDim:.15,sideReach:2.4,tagFrom:1024,tagText:`View`,tagSize:14,tagWeight:500,tagArrow:14,tagGap:6,tagX:64,tagY:-38,tagFrost:.16,tagRim:.02,tagRefract:39.5,thread:1,thin:.4,pinch:.35,sag:6,dissolve:2.9,fillet:14,wobble:3,goo:35}}var j=Math.PI*2,de=Math.PI/2,fe=Math.PI/180,M=e=>e<0?0:e>1?1:e,pe=e=>1-(1-e)**3,me=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,he=(e,t,n)=>{let r=M((n-e)/(t-e));return r*r*(3-2*r)},ge=e=>e===0?0:e%2==1?(e+1)/2:-e/2,_e=(e,t)=>1-(1-t)**(e*60),N=i(),ve=.06,ye=()=>{let e=new p(new Uint8Array([255,255,255,255]),1,1);return e.needsUpdate=!0,e};function be({theme:e=`dark`,projects:t=n,onActiveChange:r,onOpenProject:i,onError:d}){let h=(0,x.useRef)(null),g=(0,x.useRef)(null),_=(0,x.useRef)([]),C=(0,x.useRef)(null),w=(0,x.useRef)(null),te=(0,x.useRef)(null),T=(0,x.useRef)(e);T.current=e;let re=(0,x.useRef)(r);re.current=r;let ie=(0,x.useRef)(i);ie.current=i;let E=(0,x.useRef)(d);E.current=d;let ae=(0,x.useRef)(null),D=(0,x.useRef)({left:{box:null,goo:null,layers:[],plain:null},right:{box:null,goo:null,layers:[],plain:null}});(0,x.useEffect)(()=>{let e=h.current,r=g.current,i=C.current,d=!1,x=`ce-wheel-seen`,O=(()=>{try{return sessionStorage.getItem(x)===`1`}catch{return!1}})(),oe=(()=>{try{return window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0}catch{return!1}})(),k=ue(),A=Array.isArray(t)&&t.length>0?t:n;A.length>32&&console.warn(`[wheel] ${A.length} stories exceed MAX_PLANES=32 — clamping`),k.count=Math.min(Math.max(1,A.length),32);let N=A.slice(0,32),be={dark:{page:`#050505`,ink:`#f5f3ee`},light:{page:`#F4F2ED`,ink:`#1c1c1c`}},xe=e=>{let t=be[e]||be.dark;k.textColor=t.ink,V.uPage.value.set(t.page);for(let e of De.children)e.material.uniforms.uColor.value.set(t.ink)},P={progress:0,launch:0,spread:0,spin:0,shift:0},F;try{F=new y({antialias:!1,alpha:!0,depth:!1,stencil:!1,powerPreference:`high-performance`})}catch(e){console.error(`[ring] could not create a WebGL context:`,e),E.current?.(e);return}let Se=[Math.min(window.devicePixelRatio||1,1.5),1.25,1,.85,.7].filter((e,t,n)=>t===0||e<n[t-1]-1e-6),I=0,L=0,R=0,Ce=!1,z=!0,B=1;F.setPixelRatio(Se[0]),e.appendChild(F.domElement);let we=new o,Te=new f(-1,1,1,-1,-100,100),V={uResolution:{value:new a(1,1)},uSize:{value:new a(150,100)},uCount:{value:k.count},uPlane:{value:Array.from({length:32},()=>new s)},uBox:{value:Array.from({length:32},()=>new s(0,0,0,-1))},uArt:{value:Array.from({length:32},()=>new s(0,0,1,0))},uLinkCount:{value:0},uLinkA:{value:Array.from({length:32},()=>new s)},uLinkB:{value:Array.from({length:32},()=>new s)},uLinkPar:{value:Array.from({length:32},()=>new s)},uK:{value:k.goo},uWobble:{value:k.wobble},uTime:{value:0},uColor:{value:new v(`#0a0a0a`)},uAtlas:{value:ye()},uGrid:{value:new a(1,1)},uBlend:{value:k.blend},uTextured:{value:0},uBandTop:{value:0},uBandBottom:{value:0},uGlass:{value:new s},uFringe:{value:0},uSheen:{value:0},uMouse:{value:new s},uMelt:{value:new s},uTagTex:{value:new p(new Uint8Array([0,0,0,0]),1,1)},uTag:{value:new s},uTagP:{value:new s},uTagQ:{value:new s},uPage:{value:new v(T.current===`light`?`#F4F2ED`:`#050505`)}},Ee=new u(new l(1,1),new c({vertexShader:S,fragmentShader:ee,uniforms:V,transparent:!0,depthWrite:!1}));Ee.renderOrder=10,we.add(Ee);let De=new m;we.add(De);let Oe=ce(De,k),H=le(k,V),ke=se({groups:D.current,list:r,loader:i,cut:te.current,live:w.current},k,N),Ae=!1,je=0,Me=!1,Ne=[],Pe=e=>Me?e():Ne.push(e),Fe=ne(N.map(e=>e.file),e=>{d||(je=e)});V.uAtlas.value.dispose(),Fe.texture.anisotropy=Math.min(4,F.capabilities.getMaxAnisotropy()),V.uAtlas.value=Fe.texture,V.uGrid.value.set(Fe.grid[0],Fe.grid[1]);let Ie=Fe.count;Fe.first.then(()=>{d||(Ae=!0,z=!0,$())}),Fe.ready.then(()=>{d||(je=1,z=!0,$())});let U=1,W=1,Le={left:0,top:0},G=1,Re=1,ze=1,Be=1,Ve=!1,He=!1,Ue=()=>{let e=U/Math.max(1,k.refWidth),t=W/Math.max(1,k.refHeight),n=e*(1-k.fitHeight)+Math.min(e,t)*k.fitHeight;G=Math.min(k.maxScale,Math.max(k.minScale,n));let r=U<=k.narrowAt,i=U<=k.tightAt;Ve=r,He=i,Re=r?k.narrowPlane:1,ze=(r?k.narrowRadius:1)*(i?k.tightRadius:1),Be=r?k.narrowText:1,`${Math.round(U)}${Math.round(W)}`,Math.round(G*1e3)/1e3;let a=G*Be*(i?k.tightSplit:1);De.scale.set(a,a,1)},We=()=>ke.style({textK:Be,tight:He,viewW:U}),Ge=()=>{U=e.clientWidth,W=e.clientHeight,Ue(),F.setSize(U,W),Te.left=-U/2,Te.right=U/2,Te.top=W/2,Te.bottom=-W/2,Te.updateProjectionMatrix(),Ee.scale.set(U,W,1),V.uResolution.value.set(U,W);let t=F.domElement.getBoundingClientRect();Le.left=t.left,Le.top=t.top,z=!0},Ke=()=>{$(),Ge(),We()};Ge(),window.addEventListener(`resize`,Ke);let qe={x:0,y:0},Je=0,K=!1,q=0,Ye=!1,Xe=0,Ze=0,J=!1,Qe=0,$e=0,Y=!1,et=0,tt=0,nt=0,rt=e=>{let t=e.clientX-Le.left-qe.x,n=e.clientY-Le.top-qe.y;return Math.atan2(-n,t)},it=()=>{Y&&=(b.killTweensOf(P),!1)};function at(){!K&&Yt&&Yt.progress(1,!1)}let ot=e=>Ie>0?((Math.round(k.imageOffset)-e)%Ie+Ie)%Ie:0,st=e=>{let t=j/Math.round(k.count),n=Je-k.seed*fe-ge(e)*t,r=n+Math.round((P.spin-n)/j)*j;return{slots:Math.abs(r-P.spin)/t,target:r,slot:t}},ct=e=>{let{slots:t,target:n}=st(e);if(t<.01){ie.current?.(ot(ge(e)));return}q=0,J=!1,Y=!0,b.killTweensOf(P),b.to(P,{spin:n,duration:k.pickTime*Math.sqrt(Math.max(1,t)),ease:k.pickEase,onComplete:()=>{Y=!1}})},X={x:0,y:0,inside:!1,seeded:!1},Z={x:0,y:0,amt:0,target:0,wake:0},lt=!1,ut=!1,dt=0,ft=()=>{clearTimeout(dt),dt=0,ut=!1},pt=()=>{clearTimeout(dt),dt=setTimeout(()=>{ut=!0},k.touchHold*1e3)},mt=()=>lt?ut:X.inside,ht=e=>{lt=e.pointerType===`touch`,X.x=e.clientX-Le.left-U*.5,X.y=W*.5-(e.clientY-Le.top),X.inside=!0,X.seeded||(X.seeded=!0,Z.x=X.x,Z.y=X.y)},gt=()=>{$(),X.inside=!1},_t=e=>{if($(),!K){at();return}e.preventDefault();let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;it(),J=!1,q+=t*k.scrollSpeed,q=Math.max(-k.maxSpeed,Math.min(k.maxSpeed,q))},vt=e=>{if($(),et=0,tt=e.clientX,nt=e.clientY,ht(e),!K){at();return}it(),lt&&pt(),Ye=!0,J=!1,q=0,Xe=rt(e),Ze=performance.now(),F.domElement.setPointerCapture?.(e.pointerId)},yt=e=>{if($(),ht(e),et+=Math.abs(e.clientX-tt)+Math.abs(e.clientY-nt),tt=e.clientX,nt=e.clientY,lt&&!ut&&et>k.touchSlop&&ft(),!Ye)return;let t=rt(e),n=t-Xe;n>Math.PI&&(n-=j),n<-Math.PI&&(n+=j);let r=n*k.dragSpeed;P.spin+=r;let i=performance.now();q=r/(Math.max(8,i-Ze)/1e3),Xe=t,Ze=i},bt=e=>{if($(),ht(e),ft(),Ye){Ye=!1;try{F.domElement.releasePointerCapture?.(e.pointerId)}catch{}}},xt=()=>{if($(),!K){at();return}et>=5||Ht<0||ct(Ht)};e.addEventListener(`wheel`,_t,{passive:!1}),e.addEventListener(`pointerdown`,vt),e.addEventListener(`pointermove`,yt),e.addEventListener(`pointerup`,bt),e.addEventListener(`pointercancel`,bt),e.addEventListener(`pointerleave`,gt),e.addEventListener(`click`,xt);let St=e=>{if(e.target?.closest?.(`[role="dialog"]`)||($(),!K))return;let t=j/Math.max(1,Math.round(k.count));e.key===`ArrowRight`||e.key===`ArrowDown`?(e.preventDefault(),it(),J=!1,q=0,Y=!0,b.killTweensOf(P),b.to(P,{spin:P.spin-t,duration:k.pickTime,ease:k.pickEase,onComplete:()=>{Y=!1}})):(e.key===`ArrowLeft`||e.key===`ArrowUp`)&&(e.preventDefault(),it(),J=!1,q=0,Y=!0,b.killTweensOf(P),b.to(P,{spin:P.spin+t,duration:k.pickTime,ease:k.pickEase,onComplete:()=>{Y=!1}}))};window.addEventListener(`keydown`,St);let Ct=e=>{let t=k.hover&&mt()&&X.seeded&&K;Z.target=+!!t,Z.amt+=(Z.target-Z.amt)*_e(e,.12);let n=_e(e,k.lag);Z.x+=(X.x-Z.x)*n,Z.y+=(X.y-Z.y)*n;let r=Math.hypot(X.x-Z.x,X.y-Z.y);Z.wake=Math.max(Z.wake*.94**(e*60),M(r/(Math.max(e,.001)*2600))),V.uMouse.value.set(Z.x,Z.y,Z.amt,k.melt*G),V.uMelt.value.set(k.meltReach*G,k.wave*G*Z.wake*Z.amt,k.waveFreq,k.waveSpeed)},wt={shown:0,last:-1},Tt=e=>{let t=Math.min(je,M(P.progress));wt.shown+=(t-wt.shown)*_e(e,k.loaderChase);let n=Math.min(100,Math.max(1,Math.round(wt.shown*100)));if(i&&n!==wt.last&&(wt.last=n,i.textContent=String(n).padStart(3,`0`)),!Me&&n>=100){Me=!0;for(let e of Ne)e();Ne.length=0}},Et=new Float32Array(32),Dt=new Float32Array(32),Ot=[],kt=-1,At=e=>{if(kt!==e){kt=e,Ot.length=0;for(let t=0;t<e;t++)Ot.push(t);Ot.sort((e,t)=>ge(e)-ge(t))}return Ot},jt=Array.from({length:32},()=>new a),Mt=new Float32Array(32),Nt=new Float32Array(32),Pt=new Float32Array(32),Ft=new Float32Array(32),It=new Float32Array(32),Lt=new Float32Array(32),Rt=new Float32Array(32),zt=new a,Bt=e=>Math.max(.05,1+k.swell*Mt[e]-k.sideScale*Rt[e]),Q=-1,Vt=-1,Ht=-1,Ut=!1,Wt=-1,Gt=()=>{let e=_.current;if(Wt<0)for(let t=0;t<e.length;t++){let n=e[t];if(!n)continue;let r=t===Q;n.style.opacity=r?`1`:`0.2`,r?n.setAttribute(`aria-current`,`true`):n.removeAttribute(`aria-current`)}else{let t=e[Wt];t&&(t.style.opacity=`0.2`,t.removeAttribute(`aria-current`));let n=e[Q];n&&(n.style.opacity=`1`,n.setAttribute(`aria-current`,`true`))}Wt=Q},Kt=e=>{let t=Math.round(k.count);V.uCount.value=t;let n=j/t,r=M(P.spread),i=Ve?k.narrowEndScale:k.endScale,a=M(P.shift),o=(1+(i-1)*a)*G,s=k.ringRadius*ze*o,c=(-s+k.posX*U*.5)*a,l=k.posY*W*.5*a;qe.x=U*.5+c,qe.y=W*.5-l,Je=c!==0||l!==0?Math.atan2(-l,-c):0;let u=k.planeSize*Re*o,d=u/1.5;V.uSize.value.set(u,d);let f=k.radius*Re*o,p=Math.hypot(u,d)*.5,m=k.radial?d:u,h=k.radial?u:d,g=2*s*Math.sin(n/2)-m;Math.round(g/o*10)/10;let _=Math.max(1,g),v=Math.max(1,Math.abs(ge(t-1))),y=Math.max(.1,.94-k.stagger);Dt[0]=0;for(let e=1;e<=v;e++){let t=M((r-(ve+(e-1)/v*k.stagger))/y),n=t*t*(3-2*t);Et[e]=n,Dt[e]=Dt[e-1]+n}let b=k.seed*fe,x=me(M(P.launch)),S=s*x,ee=Z.amt>.001,C=Math.max(1,k.reach*u),w=Math.max(1,k.sideReach*u),te=_e(e,k.grab),T=_e(e,k.release),ne=-1,re=1e9,ie=0,E=Math.round(k.imageOffset),ae=e=>Ie>0?((E-e)%Ie+Ie)%Ie:0,D=X.inside&&X.seeded&&K,O=-1,oe=ee?Ht:-1;B=0;for(let e=0;e<t;e++){let t=ge(e),r=Math.abs(t),i=e===0?M(P.progress):Et[r],a=ae(t),o=b+Math.sign(t)*n*Dt[r]+P.spin,s=Math.cos(o)*S+c,m=Math.sin(o)*S+l;jt[e].set(s,m);let h=o-Je,g=Math.abs(Math.atan2(Math.sin(h),Math.cos(h)));g<re&&(re=g,ne=e,ie=a);let _=0,v=0,y=0;if(ee){let e=Z.x-s,t=Z.y-m,n=Math.hypot(e,t);if(_=he(C,C*.22,n)*Z.amt*i,_>1e-4&&n>1e-4){let r=k.pull*G*_/n;v=e*r,y=t*r}}let E=_>Mt[e]?te:T,se=_-Mt[e],A=v-Nt[e],ce=y-Pt[e];Mt[e]+=se*E,Nt[e]+=A*E,Pt[e]+=ce*E,Math.abs(se)>B&&(B=Math.abs(se)),Math.abs(A)>B&&(B=Math.abs(A)),Math.abs(ce)>B&&(B=Math.abs(ce));let le=0;if(oe>=0&&e!==oe){let e=Math.hypot(zt.x-s,zt.y-m);le=he(w,w*.2,e)*i}let ue=le-Rt[e];Rt[e]+=ue*(le>Rt[e]?te:T),Math.abs(ue)>B&&(B=Math.abs(ue));let j=0,fe=0;if(Rt[e]>1e-4){let t=s-zt.x,n=m-zt.y,r=Math.hypot(t,n);if(r>1e-4){let i=k.sidePush*G*Rt[e]/r;j=t*i,fe=n*i}}let me=s+Nt[e]+j,_e=m+Pt[e]+fe,N=(k.radial?o:o+de)*x,ve=pe(M(e===0?i/.7:i/.34)),ye=pe(M(e===0?(i-.18)/.74:(i-.06)/.36)),be=Bt(e),xe=ve*be,F=ye*be;Ft[e]=ve,It[e]=ye;let Se=Math.cos(N),I=Math.sin(N),L=Math.max(u*.5*xe,1e-4),R=Math.max(d*.5*F,1e-4),Ce=Math.min(L,R),z=Math.min(Ce,Ce+(f-Ce)*he(.3,1,Math.min(xe,F))),we=Math.max(xe,F);if(V.uPlane.value[e].set(me,_e,Se,I),V.uBox.value[e].set(L-z,R-z,z,we>1e-4?p*we+8:-1),V.uArt.value[e].set(1/(2*L),1/(2*R),1-k.sideDim*Rt[e],a),D&&O<0){let t=Z.x-me,n=Z.y-_e;Math.abs(t*Se+n*I)<=L&&Math.abs(-t*I+n*Se)<=R&&(O=e)}}for(let e=t;e<32;e++)V.uBox.value[e].set(0,0,0,-1),Mt[e]=0,Nt[e]=0,Pt[e]=0,Rt[e]=0;Ht=O;let se=Ht>=0&&!lt&&U>k.tagFrom;se!==Ut&&(Ut=se,H.show(se)),Ht>=0&&zt.copy(jt[Ht]),V.uTag.value.set(Z.x+k.tagX,Z.y+k.tagY,H.box.sx,H.box.sy),V.uTagP.value.set(52,20,20,k.tagRefract),V.uTagQ.value.set(k.tagFrost,k.tagRim,0,0),ne>=0&&Ie>0&&ie!==Q&&(Q=ie,Gt());let A=At(t),ce=h*.5*k.thread,le=Math.min(r>.995&&t>2?t:t-1,32);for(let e=0;e<le;e++){let n=A[e],r=A[(e+1)%t],i=V.uPlane.value[n],a=V.uPlane.value[r],s=k.radial?It[n]:Ft[n],c=k.radial?It[r]:Ft[r],l=M((jt[n].distanceTo(jt[r])-m*.5*(s+c))/_),d=(i.x+a.x)*.5,f=(i.y+a.y)*.5,p=0;if(ee&&k.web>1e-4){let e=Math.max(1,k.webReach*u),t=Math.hypot(Z.x-d,Z.y-f);p=he(e,e*.15,t)*Z.amt}let h=p-Lt[e];Lt[e]+=h*(p>Lt[e]?te:T),Math.abs(h)>B&&(B=Math.abs(h));let g=ce*Math.max((1-l)**k.thin,k.web*Lt[e])-k.dissolve,v=g*(1-(1-k.pinch)*he(0,.7,l)),y=Math.min(k.fillet*o*he(0,.35,l),Math.max(v,0)*1.5),b=a.x-i.x,x=a.y-i.y,S=Math.hypot(b,x),C=S>.001?1/S:0,w=S>.001?b*C:1,ne=S>.001?x*C:0;V.uLinkA.value[e].set(d,f,w,ne),V.uLinkB.value[e].set(S,C,S>.001?g:-100,v),V.uLinkPar.value[e].set(k.sag*o*l**1.5,y,S*.5+g+y+8,0)}for(let e=le;e<32;e++)V.uLinkB.value[e].set(0,0,-100,0);V.uLinkCount.value=le,V.uK.value=k.goo*Re*G,V.uWobble.value=k.wobble*G*(1-he(.2,.95,P.progress)),V.uTextured.value=k.textured&&Ae?1:0,V.uBlend.value=Math.max(.5,k.blend*Re*o);let ue=k.glass;V.uBandTop.value=ue?k.bandTop*W:0,V.uBandBottom.value=ue?k.bandBottom*W:0,V.uGlass.value.set(k.refract,k.squeeze,k.ripple,k.rippleFreq),V.uFringe.value=ue?k.fringe:0,V.uSheen.value=ue?k.sheen:0},qt=0,Jt=()=>{K=!1,Vt=-1,q=0,Ye=!1,J=!1,it();let e=++qt;i&&b.set(i,{opacity:+!Me});let t=b.timeline({delay:.25,onComplete:()=>{K=!0;try{sessionStorage.setItem(x,`1`)}catch{}}});t.fromTo(P,{progress:0,launch:0,spread:0,spin:0,shift:0},{progress:1,duration:1.2,ease:`power2.out`}),t.addPause(`>`,()=>{Pe(()=>{b.delayedCall(k.holdAfter,()=>{d||e!==qt||(t.resume(),i&&b.to(i,{opacity:0,duration:k.loaderOut,ease:`power2.in`}))})})}),t.to(P,{launch:1,duration:k.launchTime,ease:`power2.inOut`});let n=t.duration()-.15;t.to(P,{spread:1,duration:k.spreadTime,ease:k.spreadEase},n);let a=n+k.stageAt*k.spreadTime;t.to(P,{spin:k.spinTurns*j,duration:k.spinTime,ease:k.spinEase},a+k.spinDelay),t.to(P,{shift:1,duration:k.moveTime,ease:k.moveEase},a+k.moveDelay);let o=n+k.textAt*k.spreadTime;if(Oe.chars.length&&t.fromTo(Oe.chars,{value:0},{value:1,duration:k.textTime,ease:k.textEase,stagger:k.textStagger},o),k.textOut&&Oe.fades.length){let e=Math.max(a+k.spinDelay+k.spinTime,a+k.moveDelay+k.moveTime);t.fromTo(Oe.fades,{value:1},{value:0,duration:k.textOutTime,ease:k.textOutEase,stagger:k.textStagger},Math.max(0,e+k.textOutAt))}return r&&t.fromTo(r,{opacity:0},{opacity:1,duration:k.textTime,ease:k.textEase},o),t};H.build(),H.load(()=>{d||(H.build(),z=!0,$())}),We();let Yt=null,Xt=()=>{$(),Yt?.kill(),Yt=Jt()},Zt=()=>{d||Yt||(xe(T.current),Oe.build(),xe(T.current),H.build(),We(),Xt(),(O||oe)&&Yt?.progress(1,!1))},Qt=setTimeout(Zt,3e3);Promise.race([document.fonts?.ready??Promise.resolve(),new Promise(e=>setTimeout(e,500))]).then(Zt).catch(Zt);try{document.fonts?.ready.then(()=>{!d&&Yt&&(H.build(),z=!0,$())}).catch(()=>{})}catch{}document.createElement(`div`);let $t=performance.now(),en=$t,tn=T.current,nn=!0,rn=0;function $(){nn||d||(nn=!0,rn=0,en=performance.now(),F.setAnimationLoop(an))}function an(){let e=performance.now(),t=Math.min(.05,(e-en)/1e3);if(en=e,V.uTime.value=(e-$t)*.001,Ce||(t>1/50?(L+=t,R=0):(L=Math.max(0,L-t*.6),t<1/58?R+=t:R=Math.max(0,R-t*.2)),I<Se.length-1&&L>.5+I*.35?(I+=1,F.setPixelRatio(Se[I]),Ke(),L=0,R=0):I>0&&R>5&&(--I,F.setPixelRatio(Se[I]),Ke(),L=0,R=0)),K&&!Ye&&!Y){P.spin+=q*t,q*=k.damping**(t*60);let e=0;if(k.snap){let n=j/Math.round(k.count),r=Math.max(.01,-Math.log(k.damping)*60),i=Math.max(k.snapFrom,r*n*.5),a=4.8/Math.max(.05,k.snapTime);if(!J&&Math.abs(q)<i){let e=P.spin+q/r,t=k.seed*fe-Je;Qe=Math.round((e+t)/n)*n-t,$e=Math.max(Math.abs(q),n*.5*a),J=!0}if(J){e=Qe-P.spin;let n=Math.max(-$e,Math.min($e,e*a));q+=(n-q)*M(a*t)}}else J=!1;Math.abs(q)<.0015&&Math.abs(e)<8e-4&&(q=0,P.spin+=e,J=!1)}Tt(t),Ct(t),tn!==T.current&&(tn=T.current,V.uPage.value.set(tn===`light`?`#F4F2ED`:`#050505`),z=!0),Kt(t),K&&!Ye&&!Y&&q===0&&Q>=0&&Q!==Vt&&(Vt=Q,ke.show(Q),re.current?.(Q,N[Q]));let n=K&&!Ye&&!Y&&!J&&q===0&&Math.abs(Z.amt-Z.target)<.002&&Z.wake<.002&&Math.abs(X.x-Z.x)<.05&&Math.abs(X.y-Z.y)<.05&&V.uWobble.value<.002&&B<1e-4&&!b.isTweening(P)&&!b.isTweening(H.box);if(Ce=n,n&&!z){++rn>30&&(nn=!1,F.setAnimationLoop(null));return}rn=0,z=!1,F.render(we,Te)}return F.setAnimationLoop(an),ae.current=$,()=>{d=!0,ae.current=null,clearTimeout(dt),clearTimeout(Qt),F.setAnimationLoop(null),window.removeEventListener(`resize`,Ke),window.removeEventListener(`keydown`,St),e.removeEventListener(`wheel`,_t),e.removeEventListener(`pointerdown`,vt),e.removeEventListener(`pointermove`,yt),e.removeEventListener(`pointerup`,bt),e.removeEventListener(`pointercancel`,bt),e.removeEventListener(`pointerleave`,gt),e.removeEventListener(`click`,xt),Yt?.kill(),b.killTweensOf(Oe.chars),b.killTweensOf(Oe.fades),b.killTweensOf(r),ke.dispose(),H.dispose(),Oe.dispose(),Ee.geometry.dispose(),Ee.material.dispose(),V.uAtlas.value?.dispose(),V.uTagTex.value?.dispose(),F.dispose(),F.forceContextLoss(),F.domElement.remove()}},[t]),(0,x.useEffect)(()=>{ae.current?.()},[e]);let O=e===`light`?`#1c1c1c`:`#f5f3ee`;return(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(`div`,{ref:h,role:`group`,"aria-label":`Stories carousel. Scroll, drag, or use the left and right arrow keys to browse. Click the front card to open its story.`,className:`absolute inset-0 touch-none`}),(0,N.jsx)(`ul`,{ref:g,"aria-label":`Projects`,style:{fontFamily:`"Manrope", ui-sans-serif, system-ui, sans-serif`,color:O},className:`pointer-events-none absolute bottom-[7vh] left-[2vw] z-10 flex flex-col items-start text-left leading-[1.5] tracking-[0.01em] opacity-0 max-sm:hidden`,children:t.slice(0,32).map((e,t)=>(0,N.jsx)(`li`,{ref:e=>{_.current[t]=e},style:{opacity:.2},children:e.name},e.file))}),[{side:`left`,justify:`flex-start`},{side:`right`,justify:`flex-end`}].map(({side:e,justify:t})=>{let n=(0,N.jsxs)(`span`,{className:`flex items-baseline whitespace-nowrap`,children:[(0,N.jsx)(`span`,{}),(0,N.jsx)(`span`,{})]});return(0,N.jsxs)(`div`,{ref:t=>{D.current[e].box=t},"aria-hidden":`true`,style:{color:O},className:`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 tracking-[-0.01em]`,children:[(0,N.jsx)(`span`,{ref:t=>{D.current[e].goo=t},className:`absolute inset-0`,style:{willChange:`filter`},children:[0,1].map(r=>(0,N.jsx)(`span`,{ref:t=>{D.current[e].layers[r]=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n},r))}),(0,N.jsx)(`span`,{ref:t=>{D.current[e].plain=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n})]},e)}),(0,N.jsx)(`div`,{ref:C,"aria-hidden":`true`,style:{color:O},className:`pointer-events-none absolute bottom-[1vh] left-1/2 z-10 -translate-x-1/2 tracking-[-0.01em]`}),(0,N.jsx)(`div`,{ref:w,"aria-live":`polite`,className:`sr-only`}),(0,N.jsx)(`svg`,{"aria-hidden":`true`,className:`pointer-events-none absolute h-0 w-0`,focusable:`false`,children:(0,N.jsx)(`defs`,{children:(0,N.jsx)(`filter`,{id:`name-goo`,x:`-20%`,y:`-100%`,width:`140%`,height:`300%`,colorInterpolationFilters:`sRGB`,children:(0,N.jsx)(`feColorMatrix`,{ref:te,in:`SourceGraphic`,type:`matrix`,values:`1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140`})})})})]})}export{be as default};