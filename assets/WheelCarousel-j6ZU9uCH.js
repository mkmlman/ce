import{n as e}from"./rolldown-runtime-CbXtAM7H.js";import{a as t}from"./motion-6MpT-aL9.js";import{a as n,i as r,p as i}from"./index-BnbGZ4Sd.js";import{A as a,D as o,M as s,O as c,S as l,_ as u,a as d,b as f,c as p,d as m,g as h,h as g,i as _,s as v,t as y}from"./three-Cq4jDphW.js";import{t as b}from"./animation-CvDoa17S.js";var x=e(t(),1),S=`
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
`,C=512,w=Math.round(C/1.5),te=(e,t)=>new Promise((n,r)=>{let i=new Image;t&&(i.fetchPriority=t),i.crossOrigin=`anonymous`,i.onload=()=>n(i),i.onerror=()=>r(Error(`failed to load ${e}`)),i.src=e}),T=e=>/^(https?:|data:|blob:)/.test(e)?e:`/ce/${String(e).replace(/^\/+/,``)}`.replace(/\/+/g,`/`);function ne(e=r,t,n){let i=Math.ceil(Math.sqrt(e.length)),a=Math.ceil(e.length/i),o=document.createElement(`canvas`);o.width=i*C,o.height=a*w;let s=o.getContext(`2d`),c=new _(o);c.flipY=!1,c.colorSpace=``,c.wrapS=d,c.wrapT=d,c.minFilter=h,c.magFilter=g,c.generateMipmaps=!0;let l=(e,t)=>{let n=t%i*C,r=Math.floor(t/i)*w,a=Math.max(C/e.width,w/e.height),o=e.width*a,c=e.height*a;s.save(),s.beginPath(),s.rect(n,r,C,w),s.clip(),s.drawImage(e,n+(C-o)/2,r+(w-c)/2,o,c),s.restore()},u=0,f=0,p=()=>t?.(u/e.length),m=(t,r)=>te(T(e[t]),r).then(e=>l(e,t)).catch(r=>{f++,console.warn(`[atlas]`,r.message),n?.(Error(`Atlas ${f}/${e.length} failed: ${e[t]}`),{failed:f,total:e.length})}).finally(()=>{u++,p()}),v=m(0,`high`).then(()=>{c.needsUpdate=!0}),y=Promise.all([v,...e.slice(1).map((e,t)=>m(t+1,`low`))]).then(()=>{c.needsUpdate=!0});return p(),{texture:c,grid:[i,a],count:e.length,first:v,ready:y}}var re=[`left`,`right`],ie=2,E=e=>e?.firstElementChild?.children,ae=new WeakMap;function D(e,t,n){let r=ae.get(e);r===void 0&&(r=Object.create(null),ae.set(e,r)),r[t]!==n&&(r[t]=n,e.style[t]=n)}function oe(e,t,n){e&&(t>=1?(D(e,`filter`,`none`),D(e,`opacity`,`1`)):t<=0?(D(e,`filter`,`none`),D(e,`opacity`,`0`)):(D(e,`filter`,`blur(${Math.min(n/t-n,100)}px)`),D(e,`opacity`,`${t**.4}`)))}function se(e,t,n){let r={t:1},i=[``,``],a=[!1,!1],o=()=>{let i=t[e];if(!i)return;let o=E(i.layers[0]),s=E(i.layers[1]),c=E(i.plain),l=r.t;for(let e=0;e<ie;e++)a[e]?(oe(o?.[e],1-l,n.nameBlur),oe(s?.[e],l,n.nameBlur),c?.[e]&&D(c[e],`opacity`,`0`)):(o?.[e]&&D(o[e],`opacity`,`0`),s?.[e]&&D(s[e],`opacity`,`0`),c?.[e]&&D(c[e],`opacity`,`1`));i.goo&&D(i.goo,`filter`,l>=1?`none`:`url(#name-goo) blur(${n.nameSoften}px)`)};return{m:r,set:s=>{let c=t[e];if(!c?.layers[0]||!c.layers[1]||!c.plain)return;b.killTweensOf(r),r.t=1,o();let l=[s[0]??``,s[1]??``];a=[l[0]!==i[0],l[1]!==i[1]];let u=E(c.layers[0]),d=E(c.layers[1]),f=E(c.plain);for(let e=0;e<ie;e++)u?.[e]&&(u[e].textContent=i[e]),d?.[e]&&(d[e].textContent=l[e]),f?.[e]&&(f[e].textContent=l[e]);if(i=l,!a[0]&&!a[1]){r.t=1,o();return}r.t=0,o(),b.to(r,{t:1,duration:n.nameMorphTime,ease:n.nameEase,onUpdate:o})}}}function ce(e,t,n){let{groups:r,list:i,loader:a,cut:o,live:s}=e,c=se(`left`,r,t),l=se(`right`,r,t),u=()=>{o?.setAttribute(`values`,`1 0 0 0 0
       0 1 0 0 0
       0 0 1 0 0
       0 0 0 ${t.nameEdge} ${-t.nameEdge*t.nameCut}`)};return{show:e=>{let t=n[e];t&&(c.set([String(e+1).padStart(2,`0`),t.name]),l.set([t.type,t.year]),s&&(s.textContent=`${t.name}. ${t.type}, ${t.year}.`))},style:({textK:e,tight:n,viewW:o})=>{let s=t.nameSize*e*(n?t.tightName:1),c=`${s}vw`,l=`${t.idxSize*e}vw`,d=`"${t.nameFont}", ui-sans-serif, system-ui, sans-serif`,f=`"${t.idxFont}", ui-sans-serif, system-ui, sans-serif`,p=`${t.nameWeight}`,m=`${t.idxWeight}`,h=s*3;for(let e of re){let i=r[e];if(!i?.box)continue;let a=e===`right`,u=n&&!a;if(n&&a){i.box.style.display=`none`;continue}if(i.box.style.display=``,i.box.style.width=`${u?t.tightMetaWidth:t.metaWidth}vw`,i.box.style.height=`${h}vw`,u){let e=h*o/100,n=s*o/100;i.box.style.top=`auto`,i.box.style.left=`auto`,i.box.style.right=`${t.tightNameRight}px`,i.box.style.bottom=`calc(${t.tightNameBottom}vh + ${n*.5-e*.5}px)`,i.box.style.transform=`none`}else i.box.style.top=``,i.box.style.bottom=``,i.box.style.transform=``,i.box.style.left=a?`auto`:`${t.metaLeft}vw`,i.box.style.right=a?`${t.metaRight}vw`:`auto`;for(let e of[...i.layers,i.plain]){if(!e)continue;e.style.justifyContent=u||a?`flex-end`:`flex-start`;let n=e.firstElementChild;n.style.gap=`${a?t.metaGapR:t.metaGapL}vw`;let[r,i]=n.children;r.style.display=u?`none`:``,r.style.fontFamily=a?d:f,r.style.fontSize=a?c:l,r.style.fontWeight=a?p:m,i.style.fontFamily=a?f:d,i.style.fontSize=a?l:c,i.style.fontWeight=a?m:p}}i&&(i.style.fontSize=`${t.listSize*e}vw`),a&&(a.style.bottom=`${t.loaderBottom}vh`,a.style.fontFamily=f,a.style.fontSize=l,a.style.fontWeight=m),u()},setThreshold:u,dispose:()=>{b.killTweensOf(c.m),b.killTweensOf(l.m)}}}var O=`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,k=`
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
`;function le(e,t){let n=[],r=[],i=()=>{for(let t of[...e.children])e.remove(t),t.geometry.dispose(),t.material.uniforms.uTex.value?.dispose(),t.material.dispose();n=[],r=[]};return{build:()=>{i();let a=t.textSize,o=Math.min(window.devicePixelRatio,2)*2,s=`${t.textWeight} ${a}px "${t.textFont}", ui-sans-serif, system-ui, sans-serif`,d=document.createElement(`canvas`).getContext(`2d`);d.font=s;let f=[...t.text],p=f.map(e=>d.measureText(e).width),m=t.textTracking*a,h=p.reduce((e,t)=>e+t,0)+m*(f.length-1),y=a*.25,b=a*1.3+y*2,x=-h/2;f.forEach((i,d)=>{let f=p[d];if(i.trim()){let d=f+y*2,p=document.createElement(`canvas`);p.width=Math.max(1,Math.ceil(d*o)),p.height=Math.max(1,Math.ceil(b*o));let m=p.getContext(`2d`);m.scale(o,o),m.font=s,m.textBaseline=`alphabetic`,m.fillStyle=`#000`,m.fillText(i,y,y+a);let h=new _(p);h.colorSpace=``,h.minFilter=g,h.magFilter=g,h.generateMipmaps=!1;let S=new c({vertexShader:O,fragmentShader:k,uniforms:{uTex:{value:h},uReveal:{value:0},uColor:{value:new v(t.textColor)},uOpacity:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1}),ee=new u(new l(1,1),S);ee.scale.set(d,b,1),ee.position.set(x+f/2,0,0),ee.renderOrder=0,e.add(ee),n.push(S.uniforms.uReveal),r.push(S.uniforms.uOpacity)}x+=f+m})},dispose:i,get chars(){return n},get fades(){return r}}}function ue(e,t){let n={sx:.5,sy:0},r=new Image,i=!1,a=null;return{box:n,build:()=>{let n=Math.min(window.devicePixelRatio,2)*2,o=document.createElement(`canvas`);o.width=Math.ceil(104*n),o.height=Math.ceil(40*n);let s=o.getContext(`2d`);s.scale(n,n),s.font=`${e.tagWeight} ${e.tagSize}px "${e.textFont}", ui-sans-serif, system-ui, sans-serif`,s.textBaseline=`middle`,s.fillStyle=`#fff`;let c=s.measureText(e.tagText).width,l=(104-(e.tagArrow+e.tagGap+c))*.5;if(s.fillText(e.tagText,l+e.tagArrow+e.tagGap,20),i){let t=(40-e.tagArrow)*.5;s.drawImage(r,l,t,e.tagArrow,e.tagArrow)}a?.dispose(),a=new _(o),a.colorSpace=``,a.minFilter=g,a.magFilter=g,a.generateMipmaps=!1,t.uTagTex.value=a},show:e=>{b.killTweensOf(n),e?(b.to(n,{sx:1,duration:.62,ease:`elastic.out(1, 0.5)`}),b.to(n,{sy:1,duration:.74,ease:`elastic.out(1, 0.42)`})):b.to(n,{sx:.5,sy:0,duration:.28,ease:`power3.in`})},load:e=>{r.onload=()=>{i=!0,e?.()},r.src=`/ce/arrow-up-right.svg`.replace(/\/+/g,`/`)},dispose:()=>{b.killTweensOf(n),a?.dispose()}}}function de(){return{refWidth:1512,refHeight:870,fitHeight:0,minScale:.5,maxScale:1.75,narrowAt:1024,narrowPlane:1.25,narrowRadius:1.3,narrowText:1.5,narrowEndScale:4.22,tightAt:640,tightRadius:.82,tightSplit:.8,tightName:1.5,tightNameBottom:13,tightNameRight:16,tightMetaWidth:70,planeSize:90,count:10,ringRadius:340,seed:0,radial:!0,radius:6,textured:!0,blend:14,imageOffset:0,holdAfter:0,loaderChase:.18,loaderBottom:7,loaderOut:.45,stagger:.34,launchTime:1.95,spreadEase:`power2.out`,spreadTime:3.6,stageAt:.7,spinTurns:1,spinTime:2.6,spinEase:`power2.inOut`,spinDelay:0,posX:0,posY:0,endScale:4.46,moveTime:2.2,moveEase:`power2.inOut`,moveDelay:.2,scrollSpeed:.0022,damping:.94,maxSpeed:12,dragSpeed:1,snap:!0,snapTime:.8,snapFrom:1,pickTime:.55,pickEase:`power3.inOut`,text:`Stories '26`,textSize:41,textFont:`Italiana`,textWeight:400,textTracking:0,textColor:`#f5f3ee`,textAt:.42,textTime:.95,textStagger:.015,textEase:`power4.out`,textOut:!0,textOutAt:-.5,textOutTime:.7,textOutEase:`power2.in`,metaLeft:5.5,metaRight:5.5,metaGapL:4.7,metaGapR:3.6,metaWidth:34,nameSize:24/1440*100,nameFont:`Manrope`,nameWeight:500,idxSize:16/1440*100,idxFont:`Manrope`,idxWeight:400,listSize:.9,nameMorphTime:1.2,nameEase:`circ.out`,nameBlur:8.5,nameEdge:400,nameCut:.33,nameSoften:.35,glass:!0,bandTop:.08,bandBottom:.08,refract:60,squeeze:.05,ripple:5,rippleFreq:.02,fringe:1.5,sheen:.05,hover:!0,touchHold:.16,touchSlop:10,lag:.3,melt:34,meltReach:260,reach:1.7,swell:.09,pull:26,grab:.14,release:.06,web:.2,webReach:1.15,wave:4,waveFreq:.05,waveSpeed:7,sideScale:.035,sidePush:17,sideDim:.15,sideReach:2.4,tagFrom:1024,tagText:`View`,tagSize:14,tagWeight:500,tagArrow:14,tagGap:6,tagX:64,tagY:-38,tagFrost:.16,tagRim:.02,tagRefract:39.5,thread:1,thin:.4,pinch:.35,sag:6,dissolve:2.9,fillet:14,wobble:3,goo:35}}var A=Math.PI*2,fe=Math.PI/2,pe=Math.PI/180,j=e=>e<0?0:e>1?1:e,me=e=>1-(1-e)**3,he=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,ge=(e,t,n)=>{let r=j((n-e)/(t-e));return r*r*(3-2*r)},_e=e=>e===0?0:e%2==1?(e+1)/2:-e/2,ve=(e,t)=>1-(1-t)**(e*60),M=i(),ye=.06,be=()=>{let e=new p(new Uint8Array([255,255,255,255]),1,1);return e.needsUpdate=!0,e};function xe({theme:e=`dark`,projects:t=n,onActiveChange:r,onOpenProject:i,onError:d}){let h=(0,x.useRef)(null),g=(0,x.useRef)(null),_=(0,x.useRef)([]),C=(0,x.useRef)(null),w=(0,x.useRef)(null),te=(0,x.useRef)(null),T=(0,x.useRef)(e);T.current=e;let re=(0,x.useRef)(r);re.current=r;let ie=(0,x.useRef)(i);ie.current=i;let E=(0,x.useRef)(d);E.current=d;let ae=(0,x.useRef)(null),D=(0,x.useRef)({left:{box:null,goo:null,layers:[],plain:null},right:{box:null,goo:null,layers:[],plain:null}});(0,x.useEffect)(()=>{let e=h.current,r=g.current,i=C.current,d=!1,x=`ce-wheel-seen`,oe=(()=>{try{return sessionStorage.getItem(x)===`1`}catch{return!1}})(),se=(()=>{try{return window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0}catch{return!1}})(),O=de(),k=Array.isArray(t)&&t.length>0?t:n;k.length>32&&console.warn(`[wheel] ${k.length} stories exceed MAX_PLANES=32 — clamping`),O.count=Math.min(Math.max(1,k.length),32);let M=k.slice(0,32),xe={dark:{page:`#050505`,ink:`#f5f3ee`},light:{page:`#F4F2ED`,ink:`#1c1c1c`}},Se=e=>{let t=xe[e]||xe.dark;O.textColor=t.ink,B.uPage.value.set(t.page);for(let e of Oe.children)e.material.uniforms.uColor.value.set(t.ink)},N={progress:0,launch:0,spread:0,spin:0,shift:0},P;try{P=new y({antialias:!1,alpha:!0,depth:!1,stencil:!1,powerPreference:`high-performance`})}catch(e){console.error(`[ring] could not create a WebGL context:`,e),E.current?.(e);return}let Ce=[Math.min(window.devicePixelRatio||1,1.5),1.25,1,.85,.7].filter((e,t,n)=>t===0||e<n[t-1]-1e-6),we=0,F=0,I=0,Te=!1,L=!0,R=1;P.setPixelRatio(Ce[0]),e.appendChild(P.domElement);let Ee=new o,z=new f(-1,1,1,-1,-100,100),B={uResolution:{value:new a(1,1)},uSize:{value:new a(150,100)},uCount:{value:O.count},uPlane:{value:Array.from({length:32},()=>new s)},uBox:{value:Array.from({length:32},()=>new s(0,0,0,-1))},uArt:{value:Array.from({length:32},()=>new s(0,0,1,0))},uLinkCount:{value:0},uLinkA:{value:Array.from({length:32},()=>new s)},uLinkB:{value:Array.from({length:32},()=>new s)},uLinkPar:{value:Array.from({length:32},()=>new s)},uK:{value:O.goo},uWobble:{value:O.wobble},uTime:{value:0},uColor:{value:new v(`#0a0a0a`)},uAtlas:{value:be()},uGrid:{value:new a(1,1)},uBlend:{value:O.blend},uTextured:{value:0},uBandTop:{value:0},uBandBottom:{value:0},uGlass:{value:new s},uFringe:{value:0},uSheen:{value:0},uMouse:{value:new s},uMelt:{value:new s},uTagTex:{value:new p(new Uint8Array([0,0,0,0]),1,1)},uTag:{value:new s},uTagP:{value:new s},uTagQ:{value:new s},uPage:{value:new v(T.current===`light`?`#F4F2ED`:`#050505`)}},De=new u(new l(1,1),new c({vertexShader:S,fragmentShader:ee,uniforms:B,transparent:!0,depthWrite:!1}));De.renderOrder=10,Ee.add(De);let Oe=new m;Ee.add(Oe);let ke=le(Oe,O),V=ue(O,B),Ae=ce({groups:D.current,list:r,loader:i,cut:te.current,live:w.current},O,M),je=!1,Me=0,Ne=!1,Pe=[],Fe=e=>Ne?e():Pe.push(e),Ie=ne(M.map(e=>e.file),e=>{d||(Me=e)});B.uAtlas.value.dispose(),Ie.texture.anisotropy=Math.min(4,P.capabilities.getMaxAnisotropy()),B.uAtlas.value=Ie.texture,B.uGrid.value.set(Ie.grid[0],Ie.grid[1]);let Le=Ie.count;Ie.first.then(()=>{d||(je=!0,L=!0,$())}),Ie.ready.then(()=>{d||(Me=1,L=!0,$())});let H=1,U=1,Re={left:0,top:0},W=1,ze=1,Be=1,Ve=1,He=!1,Ue=!1,We=()=>{let e=H/Math.max(1,O.refWidth),t=U/Math.max(1,O.refHeight),n=e*(1-O.fitHeight)+Math.min(e,t)*O.fitHeight;W=Math.min(O.maxScale,Math.max(O.minScale,n));let r=H<=O.narrowAt,i=H<=O.tightAt;He=r,Ue=i,ze=r?O.narrowPlane:1,Be=(r?O.narrowRadius:1)*(i?O.tightRadius:1),Ve=r?O.narrowText:1,`${Math.round(H)}${Math.round(U)}`,Math.round(W*1e3)/1e3;let a=W*Ve*(i?O.tightSplit:1);Oe.scale.set(a,a,1)},Ge=()=>Ae.style({textK:Ve,tight:Ue,viewW:H}),Ke=()=>{H=e.clientWidth,U=e.clientHeight,We(),P.setSize(H,U),z.left=-H/2,z.right=H/2,z.top=U/2,z.bottom=-U/2,z.updateProjectionMatrix(),De.scale.set(H,U,1),B.uResolution.value.set(H,U);let t=P.domElement.getBoundingClientRect();Re.left=t.left,Re.top=t.top,L=!0},qe=()=>{$(),Ke(),Ge()};Ke(),window.addEventListener(`resize`,qe);let Je={x:0,y:0},Ye=0,G=!1,K=0,Xe=!1,Ze=0,Qe=0,q=!1,$e=0,et=0,J=!1,tt=0,nt=0,rt=0,it=e=>{let t=e.clientX-Re.left-Je.x,n=e.clientY-Re.top-Je.y;return Math.atan2(-n,t)},at=()=>{J&&=(b.killTweensOf(N),!1)};function ot(){!G&&Qt&&Qt.progress(1,!1)}let st=e=>Le>0?((Math.round(O.imageOffset)-e)%Le+Le)%Le:0,ct=e=>{let t=A/Math.round(O.count),n=Ye-O.seed*pe-_e(e)*t,r=n+Math.round((N.spin-n)/A)*A;return{slots:Math.abs(r-N.spin)/t,target:r,slot:t}},lt=e=>{let{slots:t,target:n}=ct(e);if(t<.01){ie.current?.(st(_e(e)));return}K=0,q=!1,J=!0,b.killTweensOf(N),b.to(N,{spin:n,duration:O.pickTime*Math.sqrt(Math.max(1,t)),ease:O.pickEase,onComplete:()=>{J=!1}})},Y={x:0,y:0,inside:!1,seeded:!1},X={x:0,y:0,amt:0,target:0,wake:0},Z=new Float64Array(192),ut=0,dt=(e,t,n)=>{let r=e*6,i=t-Z[r],a=n-Z[r+1],o=Z[r+4],s=Z[r+5];return Math.abs(i*o+a*s)<=Z[r+2]&&Math.abs(-i*s+a*o)<=Z[r+3]},ft=!1,pt=!1,mt=0,ht=()=>{clearTimeout(mt),mt=0,pt=!1},gt=()=>{clearTimeout(mt),mt=setTimeout(()=>{pt=!0},O.touchHold*1e3)},_t=()=>ft?pt:Y.inside,vt=e=>{ft=e.pointerType===`touch`,Y.x=e.clientX-Re.left-H*.5,Y.y=U*.5-(e.clientY-Re.top),Y.inside=!0,Y.seeded||(Y.seeded=!0,X.x=Y.x,X.y=Y.y)},yt=()=>{$(),Y.inside=!1},bt=e=>{if($(),!G){ot();return}e.preventDefault();let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;at(),q=!1,K+=t*O.scrollSpeed,K=Math.max(-O.maxSpeed,Math.min(O.maxSpeed,K))},xt=e=>{if($(),tt=0,nt=e.clientX,rt=e.clientY,vt(e),!G){ot();return}at(),ft&&gt(),Xe=!0,q=!1,K=0,Ze=it(e),Qe=performance.now(),P.domElement.setPointerCapture?.(e.pointerId)},St=e=>{if($(),vt(e),tt+=Math.abs(e.clientX-nt)+Math.abs(e.clientY-rt),nt=e.clientX,rt=e.clientY,ft&&!pt&&tt>O.touchSlop&&ht(),!Xe)return;let t=it(e),n=t-Ze;n>Math.PI&&(n-=A),n<-Math.PI&&(n+=A);let r=n*O.dragSpeed;N.spin+=r;let i=performance.now();K=r/(Math.max(8,i-Qe)/1e3),Ze=t,Qe=i},Ct=e=>{if($(),vt(e),ht(),Xe){Xe=!1;try{P.domElement.releasePointerCapture?.(e.pointerId)}catch{}}},wt=e=>{if($(),!G){ot();return}if(tt>=5)return;let t=Gt;if(t<0){let n=e.clientX-Re.left-H*.5,r=U*.5-(e.clientY-Re.top);for(let e=0;e<ut;e++)if(dt(e,n,r)){t=e;break}}t<0||lt(t)};e.addEventListener(`wheel`,bt,{passive:!1}),e.addEventListener(`pointerdown`,xt),e.addEventListener(`pointermove`,St),e.addEventListener(`pointerup`,Ct),e.addEventListener(`pointercancel`,Ct),e.addEventListener(`pointerleave`,yt),e.addEventListener(`click`,wt);let Tt=e=>{if(e.target?.closest?.(`[role="dialog"]`)||($(),!G))return;let t=A/Math.max(1,Math.round(O.count));e.key===`ArrowRight`||e.key===`ArrowDown`?(e.preventDefault(),at(),q=!1,K=0,J=!0,b.killTweensOf(N),b.to(N,{spin:N.spin-t,duration:O.pickTime,ease:O.pickEase,onComplete:()=>{J=!1}})):(e.key===`ArrowLeft`||e.key===`ArrowUp`)&&(e.preventDefault(),at(),q=!1,K=0,J=!0,b.killTweensOf(N),b.to(N,{spin:N.spin+t,duration:O.pickTime,ease:O.pickEase,onComplete:()=>{J=!1}}))};window.addEventListener(`keydown`,Tt);let Et=e=>{let t=O.hover&&_t()&&Y.seeded&&G;X.target=+!!t,X.amt+=(X.target-X.amt)*ve(e,.12);let n=ve(e,O.lag);X.x+=(Y.x-X.x)*n,X.y+=(Y.y-X.y)*n;let r=Math.hypot(Y.x-X.x,Y.y-X.y);X.wake=Math.max(X.wake*.94**(e*60),j(r/(Math.max(e,.001)*2600))),B.uMouse.value.set(X.x,X.y,X.amt,O.melt*W),B.uMelt.value.set(O.meltReach*W,O.wave*W*X.wake*X.amt,O.waveFreq,O.waveSpeed)},Dt={shown:0,last:-1},Ot=e=>{let t=Math.min(Me,j(N.progress));Dt.shown+=(t-Dt.shown)*ve(e,O.loaderChase);let n=Math.min(100,Math.max(1,Math.round(Dt.shown*100)));if(i&&n!==Dt.last&&(Dt.last=n,i.textContent=String(n).padStart(3,`0`)),!Ne&&n>=100){Ne=!0;for(let e of Pe)e();Pe.length=0}},kt=new Float32Array(32),At=new Float32Array(32),jt=[],Mt=-1,Nt=e=>{if(Mt!==e){Mt=e,jt.length=0;for(let t=0;t<e;t++)jt.push(t);jt.sort((e,t)=>_e(e)-_e(t))}return jt},Pt=Array.from({length:32},()=>new a),Ft=new Float32Array(32),It=new Float32Array(32),Lt=new Float32Array(32),Rt=new Float32Array(32),zt=new Float32Array(32),Bt=new Float32Array(32),Vt=new Float32Array(32),Ht=new a,Ut=e=>Math.max(.05,1+O.swell*Ft[e]-O.sideScale*Vt[e]),Q=-1,Wt=-1,Gt=-1,Kt=!1,qt=-1,Jt=()=>{let e=_.current;if(qt<0)for(let t=0;t<e.length;t++){let n=e[t];if(!n)continue;let r=t===Q;n.style.opacity=r?`1`:`0.2`,r?n.setAttribute(`aria-current`,`true`):n.removeAttribute(`aria-current`)}else{let t=e[qt];t&&(t.style.opacity=`0.2`,t.removeAttribute(`aria-current`));let n=e[Q];n&&(n.style.opacity=`1`,n.setAttribute(`aria-current`,`true`))}qt=Q},Yt=e=>{let t=Math.round(O.count);ut=t,B.uCount.value=t;let n=A/t,r=j(N.spread),i=He?O.narrowEndScale:O.endScale,a=j(N.shift),o=(1+(i-1)*a)*W,s=O.ringRadius*Be*o,c=(-s+O.posX*H*.5)*a,l=O.posY*U*.5*a;Je.x=H*.5+c,Je.y=U*.5-l,Ye=c!==0||l!==0?Math.atan2(-l,-c):0;let u=O.planeSize*ze*o,d=u/1.5;B.uSize.value.set(u,d);let f=O.radius*ze*o,p=Math.hypot(u,d)*.5,m=O.radial?d:u,h=O.radial?u:d,g=2*s*Math.sin(n/2)-m;Math.round(g/o*10)/10;let _=Math.max(1,g),v=Math.max(1,Math.abs(_e(t-1))),y=Math.max(.1,.94-O.stagger);At[0]=0;for(let e=1;e<=v;e++){let t=j((r-(ye+(e-1)/v*O.stagger))/y),n=t*t*(3-2*t);kt[e]=n,At[e]=At[e-1]+n}let b=O.seed*pe,x=he(j(N.launch)),S=s*x,ee=X.amt>.001,C=Math.max(1,O.reach*u),w=Math.max(1,O.sideReach*u),te=ve(e,O.grab),T=ve(e,O.release),ne=-1,re=1e9,ie=0,E=Math.round(O.imageOffset),ae=e=>Le>0?((E-e)%Le+Le)%Le:0,D=Y.inside&&Y.seeded&&G,oe=-1,se=ee?Gt:-1;R=0;for(let e=0;e<t;e++){let t=_e(e),r=Math.abs(t),i=e===0?j(N.progress):kt[r],a=ae(t),o=b+Math.sign(t)*n*At[r]+N.spin,s=Math.cos(o)*S+c,m=Math.sin(o)*S+l;Pt[e].set(s,m);let h=o-Ye,g=Math.abs(Math.atan2(Math.sin(h),Math.cos(h)));g<re&&(re=g,ne=e,ie=a);let _=0,v=0,y=0;if(ee){let e=X.x-s,t=X.y-m,n=Math.hypot(e,t);if(_=ge(C,C*.22,n)*X.amt*i,_>1e-4&&n>1e-4){let r=O.pull*W*_/n;v=e*r,y=t*r}}let E=_>Ft[e]?te:T,ce=_-Ft[e],k=v-It[e],le=y-Lt[e];Ft[e]+=ce*E,It[e]+=k*E,Lt[e]+=le*E,Math.abs(ce)>R&&(R=Math.abs(ce)),Math.abs(k)>R&&(R=Math.abs(k)),Math.abs(le)>R&&(R=Math.abs(le));let ue=0;if(se>=0&&e!==se){let e=Math.hypot(Ht.x-s,Ht.y-m);ue=ge(w,w*.2,e)*i}let de=ue-Vt[e];Vt[e]+=de*(ue>Vt[e]?te:T),Math.abs(de)>R&&(R=Math.abs(de));let A=0,pe=0;if(Vt[e]>1e-4){let t=s-Ht.x,n=m-Ht.y,r=Math.hypot(t,n);if(r>1e-4){let i=O.sidePush*W*Vt[e]/r;A=t*i,pe=n*i}}let he=s+It[e]+A,ve=m+Lt[e]+pe,M=(O.radial?o:o+fe)*x,ye=me(j(e===0?i/.7:i/.34)),be=me(j(e===0?(i-.18)/.74:(i-.06)/.36)),xe=Ut(e),Se=ye*xe,P=be*xe;Rt[e]=ye,zt[e]=be;let Ce=Math.cos(M),we=Math.sin(M),F=Math.max(u*.5*Se,1e-4),I=Math.max(d*.5*P,1e-4),Te=Math.min(F,I),L=Math.min(Te,Te+(f-Te)*ge(.3,1,Math.min(Se,P))),Ee=Math.max(Se,P);B.uPlane.value[e].set(he,ve,Ce,we),B.uBox.value[e].set(F-L,I-L,L,Ee>1e-4?p*Ee+8:-1),B.uArt.value[e].set(1/(2*F),1/(2*I),1-O.sideDim*Vt[e],a);let z=e*6;Z[z]=he,Z[z+1]=ve,Z[z+2]=F,Z[z+3]=I,Z[z+4]=Ce,Z[z+5]=we,D&&oe<0&&dt(e,X.x,X.y)&&(oe=e)}for(let e=t;e<32;e++)B.uBox.value[e].set(0,0,0,-1),Ft[e]=0,It[e]=0,Lt[e]=0,Vt[e]=0;Gt=oe;let ce=Gt>=0&&!ft&&H>O.tagFrom;ce!==Kt&&(Kt=ce,V.show(ce)),Gt>=0&&Ht.copy(Pt[Gt]),B.uTag.value.set(X.x+O.tagX,X.y+O.tagY,V.box.sx,V.box.sy),B.uTagP.value.set(52,20,20,O.tagRefract),B.uTagQ.value.set(O.tagFrost,O.tagRim,0,0),ne>=0&&Le>0&&ie!==Q&&(Q=ie,Jt());let k=Nt(t),le=h*.5*O.thread,ue=Math.min(r>.995&&t>2?t:t-1,32);for(let e=0;e<ue;e++){let n=k[e],r=k[(e+1)%t],i=B.uPlane.value[n],a=B.uPlane.value[r],s=O.radial?zt[n]:Rt[n],c=O.radial?zt[r]:Rt[r],l=j((Pt[n].distanceTo(Pt[r])-m*.5*(s+c))/_),d=(i.x+a.x)*.5,f=(i.y+a.y)*.5,p=0;if(ee&&O.web>1e-4){let e=Math.max(1,O.webReach*u),t=Math.hypot(X.x-d,X.y-f);p=ge(e,e*.15,t)*X.amt}let h=p-Bt[e];Bt[e]+=h*(p>Bt[e]?te:T),Math.abs(h)>R&&(R=Math.abs(h));let g=le*Math.max((1-l)**O.thin,O.web*Bt[e])-O.dissolve,v=g*(1-(1-O.pinch)*ge(0,.7,l)),y=Math.min(O.fillet*o*ge(0,.35,l),Math.max(v,0)*1.5),b=a.x-i.x,x=a.y-i.y,S=Math.hypot(b,x),C=S>.001?1/S:0,w=S>.001?b*C:1,ne=S>.001?x*C:0;B.uLinkA.value[e].set(d,f,w,ne),B.uLinkB.value[e].set(S,C,S>.001?g:-100,v),B.uLinkPar.value[e].set(O.sag*o*l**1.5,y,S*.5+g+y+8,0)}for(let e=ue;e<32;e++)B.uLinkB.value[e].set(0,0,-100,0);B.uLinkCount.value=ue,B.uK.value=O.goo*ze*W,B.uWobble.value=O.wobble*W*(1-ge(.2,.95,N.progress)),B.uTextured.value=O.textured&&je?1:0,B.uBlend.value=Math.max(.5,O.blend*ze*o);let de=O.glass;B.uBandTop.value=de?O.bandTop*U:0,B.uBandBottom.value=de?O.bandBottom*U:0,B.uGlass.value.set(O.refract,O.squeeze,O.ripple,O.rippleFreq),B.uFringe.value=de?O.fringe:0,B.uSheen.value=de?O.sheen:0},Xt=0,Zt=()=>{G=!1,Wt=-1,K=0,Xe=!1,q=!1,at();let e=++Xt;i&&b.set(i,{opacity:+!Ne});let t=b.timeline({delay:.25,onComplete:()=>{G=!0;try{sessionStorage.setItem(x,`1`)}catch{}}});t.fromTo(N,{progress:0,launch:0,spread:0,spin:0,shift:0},{progress:1,duration:1.2,ease:`power2.out`}),t.addPause(`>`,()=>{Fe(()=>{b.delayedCall(O.holdAfter,()=>{d||e!==Xt||(t.resume(),i&&b.to(i,{opacity:0,duration:O.loaderOut,ease:`power2.in`}))})})}),t.to(N,{launch:1,duration:O.launchTime,ease:`power2.inOut`});let n=t.duration()-.15;t.to(N,{spread:1,duration:O.spreadTime,ease:O.spreadEase},n);let a=n+O.stageAt*O.spreadTime;t.to(N,{spin:O.spinTurns*A,duration:O.spinTime,ease:O.spinEase},a+O.spinDelay),t.to(N,{shift:1,duration:O.moveTime,ease:O.moveEase},a+O.moveDelay);let o=n+O.textAt*O.spreadTime;if(ke.chars.length&&t.fromTo(ke.chars,{value:0},{value:1,duration:O.textTime,ease:O.textEase,stagger:O.textStagger},o),O.textOut&&ke.fades.length){let e=Math.max(a+O.spinDelay+O.spinTime,a+O.moveDelay+O.moveTime);t.fromTo(ke.fades,{value:1},{value:0,duration:O.textOutTime,ease:O.textOutEase,stagger:O.textStagger},Math.max(0,e+O.textOutAt))}return r&&t.fromTo(r,{opacity:0},{opacity:1,duration:O.textTime,ease:O.textEase},o),t};V.build(),V.load(()=>{d||(V.build(),L=!0,$())}),Ge();let Qt=null,$t=()=>{$(),Qt?.kill(),Qt=Zt()},en=()=>{d||Qt||(Se(T.current),ke.build(),Se(T.current),V.build(),Ge(),$t(),(oe||se)&&Qt?.progress(1,!1))},tn=setTimeout(en,3e3);Promise.race([document.fonts?.ready??Promise.resolve(),new Promise(e=>setTimeout(e,500))]).then(en).catch(en);try{document.fonts?.ready.then(()=>{!d&&Qt&&(V.build(),L=!0,$())}).catch(()=>{})}catch{}document.createElement(`div`);let nn=performance.now(),rn=nn,an=T.current,on=!0,sn=0;function $(){on||d||(on=!0,sn=0,rn=performance.now(),P.setAnimationLoop(cn))}function cn(){let e=performance.now(),t=Math.min(.05,(e-rn)/1e3);if(rn=e,B.uTime.value=(e-nn)*.001,Te||(t>1/50?(F+=t,I=0):(F=Math.max(0,F-t*.6),t<1/58?I+=t:I=Math.max(0,I-t*.2)),we<Ce.length-1&&F>.5+we*.35?(we+=1,P.setPixelRatio(Ce[we]),qe(),F=0,I=0):we>0&&I>5&&(--we,P.setPixelRatio(Ce[we]),qe(),F=0,I=0)),G&&!Xe&&!J){N.spin+=K*t,K*=O.damping**(t*60);let e=0;if(O.snap){let n=A/Math.round(O.count),r=Math.max(.01,-Math.log(O.damping)*60),i=Math.max(O.snapFrom,r*n*.5),a=4.8/Math.max(.05,O.snapTime);if(!q&&Math.abs(K)<i){let e=N.spin+K/r,t=O.seed*pe-Ye;$e=Math.round((e+t)/n)*n-t,et=Math.max(Math.abs(K),n*.5*a),q=!0}if(q){e=$e-N.spin;let n=Math.max(-et,Math.min(et,e*a));K+=(n-K)*j(a*t)}}else q=!1;Math.abs(K)<.0015&&Math.abs(e)<8e-4&&(K=0,N.spin+=e,q=!1)}Ot(t),Et(t),an!==T.current&&(an=T.current,B.uPage.value.set(an===`light`?`#F4F2ED`:`#050505`),L=!0),Yt(t),G&&!Xe&&!J&&K===0&&Q>=0&&Q!==Wt&&(Wt=Q,Ae.show(Q),re.current?.(Q,M[Q]));let n=G&&!Xe&&!J&&!q&&K===0&&Math.abs(X.amt-X.target)<.002&&X.wake<.002&&Math.abs(Y.x-X.x)<.05&&Math.abs(Y.y-X.y)<.05&&B.uWobble.value<.002&&R<1e-4&&!b.isTweening(N)&&!b.isTweening(V.box);if(Te=n,n&&!L){++sn>30&&(on=!1,P.setAnimationLoop(null));return}sn=0,L=!1,P.render(Ee,z)}return P.setAnimationLoop(cn),ae.current=$,()=>{d=!0,ae.current=null,clearTimeout(mt),clearTimeout(tn),P.setAnimationLoop(null),window.removeEventListener(`resize`,qe),window.removeEventListener(`keydown`,Tt),e.removeEventListener(`wheel`,bt),e.removeEventListener(`pointerdown`,xt),e.removeEventListener(`pointermove`,St),e.removeEventListener(`pointerup`,Ct),e.removeEventListener(`pointercancel`,Ct),e.removeEventListener(`pointerleave`,yt),e.removeEventListener(`click`,wt),Qt?.kill(),b.killTweensOf(ke.chars),b.killTweensOf(ke.fades),b.killTweensOf(r),Ae.dispose(),V.dispose(),ke.dispose(),De.geometry.dispose(),De.material.dispose(),B.uAtlas.value?.dispose(),B.uTagTex.value?.dispose(),P.dispose(),P.forceContextLoss(),P.domElement.remove()}},[t]),(0,x.useEffect)(()=>{ae.current?.()},[e]);let oe=e===`light`?`#1c1c1c`:`#f5f3ee`;return(0,M.jsxs)(M.Fragment,{children:[(0,M.jsx)(`div`,{ref:h,role:`group`,"aria-label":`Stories carousel. Scroll, drag, or use the left and right arrow keys to browse. Click the front card to open its story.`,className:`absolute inset-0 touch-none`}),(0,M.jsx)(`ul`,{ref:g,"aria-label":`Projects`,style:{fontFamily:`"Manrope", ui-sans-serif, system-ui, sans-serif`,color:oe},className:`pointer-events-none absolute bottom-[7vh] left-[2vw] z-10 flex flex-col items-start text-left leading-[1.5] tracking-[0.01em] opacity-0 max-sm:hidden`,children:t.slice(0,32).map((e,t)=>(0,M.jsx)(`li`,{ref:e=>{_.current[t]=e},style:{opacity:.2},children:e.name},e.file))}),[{side:`left`,justify:`flex-start`},{side:`right`,justify:`flex-end`}].map(({side:e,justify:t})=>{let n=(0,M.jsxs)(`span`,{className:`flex items-baseline whitespace-nowrap`,children:[(0,M.jsx)(`span`,{}),(0,M.jsx)(`span`,{})]});return(0,M.jsxs)(`div`,{ref:t=>{D.current[e].box=t},"aria-hidden":`true`,style:{color:oe},className:`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 tracking-[-0.01em]`,children:[(0,M.jsx)(`span`,{ref:t=>{D.current[e].goo=t},className:`absolute inset-0`,style:{willChange:`filter`},children:[0,1].map(r=>(0,M.jsx)(`span`,{ref:t=>{D.current[e].layers[r]=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n},r))}),(0,M.jsx)(`span`,{ref:t=>{D.current[e].plain=t},className:`absolute inset-0 flex items-center`,style:{justifyContent:t},children:n})]},e)}),(0,M.jsx)(`div`,{ref:C,"aria-hidden":`true`,style:{color:oe},className:`pointer-events-none absolute bottom-[1vh] left-1/2 z-10 -translate-x-1/2 tracking-[-0.01em]`}),(0,M.jsx)(`div`,{ref:w,"aria-live":`polite`,className:`sr-only`}),(0,M.jsx)(`svg`,{"aria-hidden":`true`,className:`pointer-events-none absolute h-0 w-0`,focusable:`false`,children:(0,M.jsx)(`defs`,{children:(0,M.jsx)(`filter`,{id:`name-goo`,x:`-20%`,y:`-100%`,width:`140%`,height:`300%`,colorInterpolationFilters:`sRGB`,children:(0,M.jsx)(`feColorMatrix`,{ref:te,in:`SourceGraphic`,type:`matrix`,values:`1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140`})})})})]})}export{xe as default};