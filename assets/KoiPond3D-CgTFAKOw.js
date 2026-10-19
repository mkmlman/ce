import{a as e,n as t,t as n}from"./jsx-runtime-OQpaS_Dv.js";import{A as r,C as i,D as a,E as o,M as s,O as c,S as l,T as u,_ as d,b as f,d as p,f as m,i as h,j as g,k as ee,l as _,m as te,n as v,o as ne,p as re,r as ie,s as y,t as ae,u as oe,v as b,w as se,x as ce,y as x}from"./three-Cq4jDphW.js";import{n as S}from"./PondCanvas-CZnvIR0Z.js";var C=e(t(),1),w=n(),le=4,T=40,E=3.4,ue=0,de=-.28,D=-.7,O=(e,t)=>e+Math.random()*(t-e),k=(e,t,n,r,i,a,o)=>{e.save(),e.translate(t,n),e.rotate(a),e.fillStyle=o,e.beginPath(),e.ellipse(0,0,r,i,0,0,Math.PI*2),e.fill(),e.strokeStyle=`rgba(60,30,10,0.25)`,e.lineWidth=1.5,e.stroke(),e.restore()},A=e=>{let t=document.createElement(`canvas`);return t.width=t.height=e,[t,t.getContext(`2d`)]},fe=e=>{let t=256/20;for(let n=0;n<=15;n+=1){let r=n*17.066666666666666,i=n%2*t*.5;for(let n=-1;n<=20;n+=1){let a=n*t+i;e.strokeStyle=`rgba(40,32,24,0.12)`,e.lineWidth=1,e.beginPath(),e.arc(a+t/2,r,t*.62,.15*Math.PI,.85*Math.PI),e.stroke(),e.strokeStyle=`rgba(255,255,255,0.08)`,e.beginPath(),e.arc(a+t/2,r+1.5,t*.58,.2*Math.PI,.8*Math.PI),e.stroke()}}},pe=e=>{let[t,n]=A(512);n.scale(2,2);let r=`#d14e12`,i=`#b53a12`,a=`#232019`,s=`#f8f5ec`;if(n.fillStyle={kohaku:s,higoi:`#cf5a16`,kibekko:`#dfa63a`,akakohaku:s}[e]||s,n.fillRect(0,0,256,256),e===`kohaku`&&(k(n,128,52,44,28,-.15,r),k(n,128,132,52,32,.12,r),k(n,128,208,38,24,0,r)),e===`higoi`){let e=n.createLinearGradient(0,0,256,0);e.addColorStop(0,`rgba(247,240,220,0.5)`),e.addColorStop(.35,`rgba(247,240,220,0)`),e.addColorStop(.65,`rgba(247,240,220,0)`),e.addColorStop(1,`rgba(247,240,220,0.5)`),n.fillStyle=e,n.fillRect(0,0,256,256)}e===`kibekko`&&(k(n,128,60,30,20,.2,a),k(n,128,130,36,24,-.12,a),k(n,122,196,26,18,.1,a),k(n,136,236,20,14,0,a)),e===`akakohaku`&&(k(n,128,80,56,36,.1,i),k(n,128,180,62,38,-.1,i),k(n,128,236,30,18,0,i));for(let e=0;e<1400;e+=1)n.fillStyle=`rgba(60,50,40,${O(.02,.07)})`,n.fillRect(O(0,256),O(0,256),1.5,1.5);fe(n);let c=new h(t);return c.colorSpace=o,c.anisotropy=4,c},me=()=>{let[e,t]=A(256);t.fillStyle=`#555a33`,t.fillRect(0,0,256,256);for(let e=0;e<9;e+=1){let e=O(0,256),n=O(0,256),r=O(30,80),i=t.createRadialGradient(e,n,0,e,n,r),a=Math.random()<.5?`70,62,40`:`110,125,90`;i.addColorStop(0,`rgba(${a},0.3)`),i.addColorStop(1,`rgba(${a},0)`),t.fillStyle=i,t.fillRect(e-r,n-r,r*2,r*2)}for(let e=0;e<1400;e+=1){t.fillStyle=Math.random()<.5?`rgba(40,34,22,${O(.06,.18)})`:`rgba(190,180,140,${O(.05,.14)})`;let e=O(1,2.4);t.fillRect(O(0,256),O(0,256),e,e)}let n=new h(e);return n.colorSpace=o,n.wrapS=u,n.wrapT=u,n.repeat.set(4,3),n.anisotropy=4,n},he=()=>{let[e,t]=A(256);t.scale(2,2),t.clearRect(0,0,256,256);let n=t.createLinearGradient(0,0,128,0);n.addColorStop(0,`rgba(200,80,30,0.95)`),n.addColorStop(.35,`rgba(232,140,70,0.7)`),n.addColorStop(.7,`rgba(240,180,120,0.3)`),n.addColorStop(1,`rgba(247,243,232,0.06)`),t.fillStyle=n,t.beginPath(),t.moveTo(4,64),t.quadraticCurveTo(50,6,124,18),t.quadraticCurveTo(96,64,124,110),t.quadraticCurveTo(50,122,4,64),t.closePath(),t.fill();for(let e=0;e<3;e+=1){t.strokeStyle=`rgba(150,60,25,${.5-e*.13})`,t.lineWidth=2-e*.5;for(let n=-4;n<=4;n+=1){let r=Math.sin(n*2.3+e)*3;t.beginPath(),t.moveTo(8,64),t.quadraticCurveTo(60,64+n*9+r,118,64+n*13+r),t.stroke()}}for(let e=0;e<7;e+=1)t.fillStyle=`rgba(190,70,25,${O(.25,.5)})`,t.beginPath(),t.arc(O(8,46),O(34,94),O(2,5),0,Math.PI*2),t.fill();let r=new h(e);return r.colorSpace=o,r},ge=()=>{let[e,t]=A(128),n=t.createLinearGradient(0,128,0,0);n.addColorStop(0,`#1d4023`),n.addColorStop(.55,`#2f6532`),n.addColorStop(1,`#5b9a52`),t.fillStyle=n,t.fillRect(0,0,128,128),t.fillStyle=`rgba(200,230,170,0.5)`,t.fillRect(60,0,8,128);for(let e=0;e<160;e+=1)t.fillStyle=`rgba(20,40,20,${O(.04,.12)})`,t.fillRect(O(0,128),O(0,128),2,2);let r=new h(e);return r.colorSpace=o,r},_e=()=>{let[e,t]=A(64);t.clearRect(0,0,64,64);let n=t.createRadialGradient(32,32,2,32,32,30);n.addColorStop(0,`rgba(255,255,255,0.95)`),n.addColorStop(.55,`rgba(255,255,255,0.75)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.save(),t.translate(32,32),t.scale(1,.72),t.beginPath(),t.arc(0,0,30,0,Math.PI*2),t.fill(),t.restore(),t.strokeStyle=`rgba(190,120,130,0.4)`,t.lineWidth=2,t.beginPath(),t.moveTo(32,8),t.quadraticCurveTo(30,32,32,56),t.stroke();let r=new h(e);return r.colorSpace=o,r},ve=()=>{let[e,t]=A(128),n=t.createRadialGradient(64,64,4,64,64,62);return n.addColorStop(0,`rgba(20,40,32,0.55)`),n.addColorStop(.7,`rgba(20,40,32,0.22)`),n.addColorStop(1,`rgba(20,40,32,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),new h(e)},ye=`
  float pondCaustic(vec2 p, float t) {
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 3; n++) {
      float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / (length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten))) + 1e-4);
    }
    c /= 3.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 3.5);
  }
`,be=`
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`,xe=`
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform float uTime;
  uniform vec4 uRipples[${T}];
  uniform vec2 uBounds;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSunTint;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2 p = vWorld.xz;
    // Deep water in the middle, shallower toward the rim.
    float depthShade = (1.0 - smoothstep(0.0, 1.0, length(p / uBounds) * 1.1)) * 0.85;
    vec3 col = mix(uShallow, uDeep, depthShade);
    float grain = vnoise(p * 6.0 + vec2(uTime * 0.15, -uTime * 0.1));
    float grain2 = vnoise(p * 13.0 - vec2(uTime * 0.1, uTime * 0.22));
    col *= 0.96 + grain * 0.08;

    // Surface normal: drifting micro-waves plus tap ripples.
    vec2 grad = vec2(
      vnoise(p * 2.2 + vec2(0.0, uTime * 0.25)) - 0.5,
      vnoise(p * 2.2 + vec2(uTime * 0.2, 0.0)) - 0.5
    ) * 0.35;
    float foam = 0.0;
    for (int i = 0; i < ${T}; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (r.w > 0.001 && age > 0.0 && age < 4.0) {
        float d = distance(p, r.xy);
        // Ease-out expansion: quick birth, gentle settle.
        float radius = 5.2 * (1.0 - exp(-age * 1.1));
        float dr = (d - radius) * 4.5;
        float band = exp(-dr * dr);
        float fade = exp(-age * 1.6) * exp(-d * 0.8) * r.w;
        vec2 dir = d > 0.001 ? (p - r.xy) / d : vec2(0.0);
        grad += dir * band * fade * 1.4;
        // The initial dip where the drop landed.
        grad += dir * -exp(-d * d * 6.0) * exp(-age * 3.0) * r.w;
        foam += band * fade;
      }
    }
    vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));

    // Warm sun glitter on the wavelets.
    vec3 sunDir = normalize(vec3(-0.45, 0.8, 0.35));
    vec3 hv = normalize(sunDir + vec3(0.0, 1.0, 0.0));
    float spec = pow(max(dot(n, hv), 0.0), 90.0);
    float sparkle = smoothstep(0.55, 0.95, grain2);
    col += uSunTint * spec * (0.9 + 1.8 * sparkle);
    // Faint sky sheen (small: linear-space additions blow out fast).
    col += vec3(0.008, 0.012, 0.012) * (0.5 + 0.5 * grain);

    // Pale foam on fresh ripple crests.
    col = mix(col, vec3(0.97, 0.99, 0.98), clamp(foam * 0.4, 0.0, 0.2));

    // Darker rim for depth.
    float rim = smoothstep(0.7, 1.0, length(p / uBounds));
    col *= 1.0 - rim * 0.28;

    float alpha = 0.6 + clamp(foam, 0.0, 1.0) * 0.12 + grain * 0.05;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`,j=[`kohaku`,`higoi`,`kibekko`,`akakohaku`],M=()=>{let e=(0,C.useRef)(null),t=(0,C.useRef)(null),[n,u]=(0,C.useState)(!1),[h,k]=(0,C.useState)(!1),[A,fe]=(0,C.useState)(!1);return(0,C.useEffect)(()=>{let n=e.current,h=t.current;if(!n||!h)return;let S=null;try{S=new ae({canvas:h,antialias:!0,stencil:!1,powerPreference:`high-performance`})}catch{k(!0);return}if(!S.getContext()){k(!0);return}let C=typeof window.matchMedia==`function`&&window.matchMedia(`(prefers-reduced-motion: reduce)`).matches===!0;S.setPixelRatio(Math.min(2,window.devicePixelRatio||1)),S.outputColorSpace=o,S.toneMapping=7,S.toneMappingExposure=1.06;let w=new a;w.background=new y(`#a9bfb2`),w.add(new m(`#ffffff`,`#8fa895`,.65));let A=new _(`#fff6e8`,1.5);A.position.set(-4,8,3),w.add(A);let M=new f(-1,1,E,-3.4,.1,40);M.position.set(0,9,2.8),M.lookAt(0,0,-.3);let Ce=me(),N={value:0},P=new x({map:Ce,roughness:1,metalness:0});P.onBeforeCompile=e=>{e.uniforms.uCausticTime=N,e.vertexShader=`varying vec2 vPondXZ;\n${e.vertexShader.replace(`#include <begin_vertex>`,`#include <begin_vertex>
         vPondXZ = (modelMatrix * vec4(position, 1.0)).xz;`)}`,e.fragmentShader=`varying vec2 vPondXZ;\nuniform float uCausticTime;\n${ye}\n${e.fragmentShader.replace(`#include <map_fragment>`,`#include <map_fragment>
         {
           float ca = min(pondCaustic(vPondXZ * 3.5, uCausticTime), 1.5);
           diffuseColor.rgb *= 1.0 + ca * 1.3;
         }`)}`},P.customProgramCacheKey=()=>`pond-sand`;let F=new d(new l(1,1),P);F.rotation.x=-Math.PI/2,F.position.y=D,w.add(F);let I=Array.from({length:T},()=>({x:0,z:0,t0:-10,s:0})),L={value:Array.from({length:T},()=>new s(0,0,-10,0))},we=new c({vertexShader:be,fragmentShader:xe,transparent:!0,depthWrite:!1,uniforms:{uTime:{value:0},uRipples:L,uBounds:{value:new r(6,E)},uShallow:{value:new y(`#628a78`)},uDeep:{value:new y(`#1a4033`)},uSunTint:{value:new y(`#fff9ec`)}}}),R=new d(new l(1,1),we);R.rotation.x=-Math.PI/2,R.position.y=ue,R.renderOrder=10,w.add(R);let Te=he(),Ee=ve(),De=new b({map:Ee,transparent:!0,depthWrite:!1,opacity:.9}),Oe=new ee(.05,10,8),ke=new b({color:`#141414`}),Ae=[[.001,-1],[.1,-.92],[.16,-.75],[.24,-.45],[.32,-.1],[.38,.2],[.37,.45],[.3,.68],[.2,.85],[.1,.95],[.001,1]].map(([e,t])=>new r(e,t)),je=new te(Ae,20);je.rotateX(Math.PI/2);let Me=new l(.55,.5);Me.rotateZ(-Math.PI/2);let Ne=new l(.36,.22),Pe={kohaku:`#ffffff`,higoi:`#f5ead0`,kibekko:`#f7ecc8`,akakohaku:`#ffffff`},z=[];for(let e=0;e<le;e+=1){let t=O(2.2,2.6),n=t/1.75,r=new p,i={value:new s(0,O(0,Math.PI*2),5,.32)},a=pe(j[e%j.length]),o=new x({map:a,roughness:.65,metalness:.05,emissive:new y(`#ffffff`),emissiveMap:a,emissiveIntensity:.09});o.onBeforeCompile=e=>{e.uniforms.uBend=i,e.uniforms.uCausticTime=N,e.vertexShader=`uniform vec4 uBend;\nvarying vec2 vFishXZ;\n${e.vertexShader.replace(`#include <begin_vertex>`,`#include <begin_vertex>
           vFishXZ = (modelMatrix * vec4(position, 1.0)).xz;
           float bendT = uBend.x * uBend.z + uBend.y + position.z * 2.2;
           float bendW = smoothstep(1.2, -1.4, position.z);
           transformed.x += sin(bendT) * uBend.w * bendW;
           objectNormal.x += cos(bendT) * uBend.w * bendW * 1.5;`)}`,e.fragmentShader=`varying vec2 vFishXZ;\nuniform float uCausticTime;\n${ye}\n${e.fragmentShader.replace(`#include <map_fragment>`,`#include <map_fragment>
           {
             float fca = min(pondCaustic(vFishXZ * 3.5, uCausticTime), 1.5);
             diffuseColor.rgb *= 1.0 + fca * 0.5;
           }`)}`},o.customProgramCacheKey=()=>`koi-bend`;let c=new d(je,o);c.scale.set(.55,.44,t/2),r.add(c);let u=new b({map:Te,transparent:!0,depthWrite:!1,side:2,opacity:.8,color:Pe[j[e%j.length]]||`#ffffff`}),f=new d(Me,u);f.position.set(0,.02,-.5*t-.18),f.rotation.x=-Math.PI/2,f.scale.setScalar(n*1.15),r.add(f);let m=new d(Ne,u);m.position.set(.2*n,-.04,.16*t),m.rotation.set(.2,.5,-.55),m.scale.setScalar(n*1.2),r.add(m);let h=new d(Ne,u);h.position.set(-.2*n,-.04,.16*t),h.rotation.set(.2,-.5,.55),h.scale.setScalar(n*1.2),r.add(h);let g=new d(Oe,ke);g.position.set(.1*n,.08,.34*t),r.add(g);let ee=new d(Oe,ke);ee.position.set(-.1*n,.08,.34*t),r.add(ee);let _=new d(new l(t*1.2,.9),De);_.rotation.x=-Math.PI/2,_.position.y=-.6799999999999999,w.add(_),r.position.set(O(-4,4),de,O(-2,2)),r.rotation.y=O(0,Math.PI*2),w.add(r),z.push({group:r,tail:f,pecL:m,pecR:h,shadow:_,bend:i,len:t,vx:O(-1,1),vz:O(-.8,.8),dart:0,wake:O(0,.5),phase:O(0,Math.PI*2),wag:5,seedA:O(0,Math.PI*2),seedB:O(0,Math.PI*2),speed:0})}let Fe=new x({color:`#96928a`,roughness:.65}),Ie=[{fx:.06,fz:.12,s:.5},{fx:.93,fz:.66,s:.36},{fx:.3,fz:.88,s:.42}].map(e=>{let t=new d(new re(e.s,1),Fe);return t.rotation.set(O(0,3),O(0,3),O(0,3)),t.scale.y=.62,t.position.y=D+e.s*.35,w.add(t),{mesh:t,...e}}),Le={value:0},Re=ge(),ze=(e,t)=>{let n=new l(e,t,1,5),r=n.attributes.position;for(let e=0;e<r.count;e+=1){let n=(r.getY(e)+t/2)/t;r.setX(e,r.getX(e)*(1-n*.75)),r.setZ(e,Math.sin(n*Math.PI)*.03)}return n.translate(0,t/2,0),n.computeVertexNormals(),n},Be=[{fx:.08,fz:.3,w:.17,h:.9},{fx:.9,fz:.42,w:.15,h:.8},{fx:.24,fz:.82,w:.18,h:.98},{fx:.76,fz:.78,w:.14,h:.75},{fx:.5,fz:.12,w:.16,h:.88},{fx:.04,fz:.62,w:.13,h:.78},{fx:.95,fz:.85,w:.15,h:.85},{fx:.36,fz:.2,w:.13,h:.7},{fx:.63,fz:.55,w:.14,h:.92},{fx:.16,fz:.55,w:.13,h:.72},{fx:.85,fz:.15,w:.14,h:.8},{fx:.58,fz:.9,w:.15,h:.84}].map(e=>{let t=new x({map:Re,roughness:.85,metalness:0,side:2}),n=O(0,Math.PI*2);t.onBeforeCompile=t=>{t.uniforms.uSwayT=Le,t.uniforms.uSwayPhase={value:n},t.uniforms.uSwayH={value:e.h},t.vertexShader=`uniform float uSwayT;\nuniform float uSwayPhase;\nuniform float uSwayH;\n${t.vertexShader.replace(`#include <begin_vertex>`,`#include <begin_vertex>
           {
             float swayW = smoothstep(0.0, uSwayH, position.y);
             transformed.x += sin(uSwayT * 1.3 + uSwayPhase + position.y * 2.5) * 0.09 * swayW;
             transformed.z += cos(uSwayT * 0.9 + uSwayPhase * 1.7 + position.y * 2.0) * 0.05 * swayW;
           }`)}`},t.customProgramCacheKey=()=>`pond-blade`;let r=new d(ze(e.w,e.h),t);return r.rotation.y=O(0,Math.PI*2),r.position.y=D,w.add(r),{mesh:r,...e}}),B=new Float32Array(144),V=new Float32Array(48),Ve=new Float32Array(48),H=Array.from({length:48},()=>({x:0,y:0,z:0}));for(let e=0;e<48;e+=1)B[e*3+1]=-50;let U=new ie;U.setAttribute(`position`,new v(B,3).setUsage(oe)),U.setAttribute(`aLife`,new v(V,1).setUsage(oe)),U.setAttribute(`aSize`,new v(Ve,1));let He=new c({transparent:!0,depthWrite:!1,uniforms:{uPxScale:{value:600},uColor:{value:new y(`#f2faf6`)}},vertexShader:`
        attribute float aLife;
        attribute float aSize;
        varying float vLife;
        uniform float uPxScale;
        void main() {
          vLife = aLife;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPxScale / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,fragmentShader:`
        varying float vLife;
        uniform vec3 uColor;
        void main() {
          float m = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
          float a = m * clamp(vLife, 0.0, 1.0) * 0.85;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `}),Ue=new i(U,He);Ue.frustumCulled=!1,Ue.renderOrder=11,w.add(Ue);let We=0,Ge=(e,t,n)=>{if(C)return;let r=n?14:8;for(let n=0;n<r;n+=1){let n=We;We=(We+1)%48;let r=O(0,Math.PI*2),i=O(.6,2.2);B[n*3]=e,B[n*3+1]=.06,B[n*3+2]=t,H[n].x=Math.cos(r)*i,H[n].z=Math.sin(r)*i,H[n].y=O(1.4,3),V[n]=1,Ve[n]=O(.05,.14)}U.attributes.position.needsUpdate=!0,U.attributes.aLife.needsUpdate=!0,U.attributes.aSize.needsUpdate=!0},Ke=e=>{let t=!1;for(let n=0;n<48;n+=1)V[n]<=0||(t=!0,H[n].y-=6*e,B[n*3]+=H[n].x*e,B[n*3+1]+=H[n].y*e,B[n*3+2]+=H[n].z*e,V[n]-=e*.8,V[n]<=0&&(V[n]=0,B[n*3+1]=-50));t&&(U.attributes.position.needsUpdate=!0,U.attributes.aLife.needsUpdate=!0)},qe=_e(),Je=new l(.17,.12),Ye=[`#f3d3d8`,`#f7ecec`,`#eec9d2`,`#f6e3e6`],Xe=[];for(let e=0;e<7;e+=1){let t=new b({map:qe,transparent:!0,depthWrite:!1,side:2,opacity:.92,color:Ye[e%Ye.length]}),n=new d(Je,t);n.renderOrder=11,w.add(n);let r=O(0,Math.PI*2);Xe.push({mesh:n,x:O(-4,4),z:O(-2,2),dx:Math.cos(r),dz:Math.sin(r),speed:O(.05,.12),spin:O(0,Math.PI*2),spinV:O(-.25,.25),phase:O(0,Math.PI*2)})}let Ze=e=>{for(let t of Xe){t.x+=t.dx*t.speed*e,t.z+=t.dz*t.speed*e,t.spin+=t.spinV*e;let n=.6;t.x<W.minX-n?t.x=W.maxX+n:t.x>W.maxX+n&&(t.x=W.minX-n),t.z<W.minZ-n?t.z=W.maxZ+n:t.z>W.maxZ+n&&(t.z=W.minZ-n),t.mesh.position.set(t.x,.015+Math.sin(Y*.8+t.phase)*.008,t.z),t.mesh.rotation.set(-Math.PI/2,0,t.spin)}},W={minX:-5,maxX:5,minZ:-2.4,maxZ:2.4},G=new se,Qe=new ce(new g(0,1,0),0),K=new g,$e=()=>{let e=n.clientWidth,t=n.clientHeight;if(e<=0||t<=0)return;S.setSize(e,t,!1);let i=e/t;M.left=-3.4*i,M.right=E*i,M.top=E,M.bottom=-3.4,M.updateProjectionMatrix(),He.uniforms.uPxScale.value=S.getDrawingBufferSize(new r).y/(M.top-M.bottom);let a=[[-.93,-.88],[.93,-.88],[-.93,.88],[.93,.88]],o=1/0,s=-1/0,c=1/0,l=-1/0;for(let[e,t]of a)G.setFromCamera(new r(e,t),M),G.ray.intersectPlane(Qe,K)&&(o=Math.min(o,K.x),s=Math.max(s,K.x),c=Math.min(c,K.z),l=Math.max(l,K.z));if(!Number.isFinite(o))return;let u=.9;W.minX=o+u,W.maxX=s-u,W.minZ=c+u,W.maxZ=l-u;let d=s-o+3,f=l-c+3,p=(o+s)/2,m=(c+l)/2;R.scale.set(d,f,1),R.position.set(p,ue,m),F.scale.set(d+2,f+2,1),F.position.set(p,D,m),we.uniforms.uBounds.value.set(d/2,f/2),Ie.forEach(e=>{e.mesh.position.x=o+(s-o)*e.fx,e.mesh.position.z=c+(l-c)*e.fz}),Be.forEach(e=>{e.mesh.position.x=o+(s-o)*e.fx,e.mesh.position.z=c+(l-c)*e.fz})},et=new ne,q=0,tt=!0,J=!0,Y=0,X={x:0,z:0,on:!1},nt=(e,t,n)=>{if(C)return;let r=I.find(e=>e.s===0);if(!r){r=I[0];for(let e of I)e.t0<r.t0&&(r=e)}r.x=e,r.z=t,r.t0=Y,r.s=n},rt=(e,t,n)=>{if(nt(e,t,n?1:.35),n)for(let n of z){let r=n.group.position.x-e,i=n.group.position.z-t,a=Math.hypot(r,i)||1;if(a<2.4){let e=(1-a/2.4)*3.6;n.vx+=r/a*e,n.vz+=i/a*e,n.dart=1}}},it=e=>{let t=e=>e.group.rotation.y,n=Y;for(let r of z){let i=r.group.position,a=Math.sin(n*.5+r.seedA)+.6*Math.sin(n*.83+r.seedB*1.7),o=Math.atan2(r.vx,r.vz)+a*.45*e,s=1+.18*Math.sin(n*1.1+r.seedB),c=(1.1+r.dart*3.2)*s,l=1.2,u=0,d=0;i.x<W.minX+l?u=(W.minX+l-i.x)/l:i.x>W.maxX-l&&(u=(W.maxX-l-i.x)/l),i.z<W.minZ+l?d=(W.minZ+l-i.z)/l:i.z>W.maxZ-l&&(d=(W.maxZ-l-i.z)/l),r.vx+=(Math.sin(o)*c-r.vx)*Math.min(1,e*2.4)+u*e*5,r.vz+=(Math.cos(o)*c-r.vz)*Math.min(1,e*2.4)+d*e*5;let f=Math.hypot(r.vx,r.vz)||.001,p=1.4+r.dart*3.4;if(f>p&&(r.vx*=p/f,r.vz*=p/f),r.speed=Math.min(f,4),i.x=Math.min(Math.max(i.x+r.vx*e,W.minX),W.maxX),i.z=Math.min(Math.max(i.z+r.vz*e,W.minZ),W.maxZ),i.y=de+Math.sin(n*1.4+r.phase)*.04,r.dart*=Math.exp(-e*2),r.dart<.01&&(r.dart=0),r.wag+=(5+r.speed*2.4-r.wag)*Math.min(1,e*3),r.phase+=e*r.wag,r.wake-=e,r.wake<=0){let e=r.dart>.4;r.wake=e?.18:1+Math.random()*.4;let t=Math.sin(r.group.rotation.y),n=Math.cos(r.group.rotation.y);nt(i.x-t*.5*r.len,i.z-n*.5*r.len,e?.25:.05)}if(X.on&&r.dart<.2){let t=X.x-i.x,n=X.z-i.z,a=Math.hypot(t,n)||1;if(a<3.2&&a>.4){let i=(1-a/3.2)*1.1*e;r.vx+=t/a*i,r.vz+=n/a*i}}let m=Math.atan2(r.vx,r.vz)-t(r);for(;m>Math.PI;)m-=Math.PI*2;for(;m<-Math.PI;)m+=Math.PI*2;let h=(1.6+r.dart*3)*e;r.group.rotation.y+=Math.max(-h,Math.min(h,m)),r.bend.value.x=Y,r.bend.value.z=r.wag,r.tail.rotation.y=Math.sin(r.phase-.9)*.4,r.pecL.rotation.z=-.55+Math.sin(r.phase*1.3)*.18,r.pecR.rotation.z=.55-Math.sin(r.phase*1.3)*.18,r.shadow.position.x=i.x,r.shadow.position.z=i.z,r.shadow.rotation.z=-r.group.rotation.y}},Z=()=>{we.uniforms.uTime.value=Y,N.value=Y,Le.value=Y;for(let e=0;e<T;e+=1){let t=I[e],n=Y-t.t0;t.s>0&&n<4?L.value[e].set(t.x,t.z,t.t0,t.s):(L.value[e].set(0,0,-10,0),n>=4&&(t.s=0))}S.render(w,M)},at=()=>{if(q=0,!J||!tt||document.hidden||C)return;let e=Math.min(et.getDelta(),.05);Y+=e,it(e),Ke(e),Ze(e),Z(),q=requestAnimationFrame(at)},Q=()=>{!q&&J&&!C&&tt&&!document.hidden&&(et.getDelta(),q=requestAnimationFrame(at))},ot=e=>{let t=h.getBoundingClientRect();return new r((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1)},st=e=>{G.setFromCamera(ot(e),M),G.ray.intersectPlane(Qe,K)&&(rt(K.x,K.z,!0),Ge(K.x,K.z,!0),u(!0),C?(it(.016),Z()):Q())},ct=e=>{if(e.key!==`Enter`&&e.key!==` `)return;e.preventDefault();let t=z[Math.floor(Math.random()*z.length)];t&&(rt(t.group.position.x,t.group.position.z,!0),Ge(t.group.position.x,t.group.position.z,!0)),u(!0),C?(it(.016),Z()):Q()},lt=()=>Q(),ut=e=>{if(e.buttons!==0){X.on=!1;return}G.setFromCamera(ot(e),M),G.ray.intersectPlane(Qe,K)?(X.x=K.x,X.z=K.z,X.on=!0):X.on=!1},dt=()=>{X.on=!1},ft=e=>{e.preventDefault(),J=!1,q&&=(cancelAnimationFrame(q),0),k(!0)};h.addEventListener(`pointerdown`,st),h.addEventListener(`pointermove`,ut),h.addEventListener(`pointerleave`,dt),h.addEventListener(`keydown`,ct),h.addEventListener(`webglcontextlost`,ft),document.addEventListener(`visibilitychange`,lt);let pt=typeof ResizeObserver<`u`?new ResizeObserver($e):null;pt?.observe(n);let $=null;typeof IntersectionObserver<`u`&&($=new IntersectionObserver(([e])=>{tt=e.isIntersecting,Q()},{threshold:0}),$.observe(n)),$e();for(let e of z)e.group.position.x=O(W.minX+1,Math.max(W.minX+1.1,W.maxX-1)),e.group.position.z=O(W.minZ+.5,Math.max(W.minZ+.6,W.maxZ-.5)),e.shadow.position.x=e.group.position.x,e.shadow.position.z=e.group.position.z;for(let e of Xe)e.x=O(W.minX+.5,Math.max(W.minX+.6,W.maxX-.5)),e.z=O(W.minZ+.5,Math.max(W.minZ+.6,W.maxZ-.5));return et.start(),Z(),Q(),fe(!0),()=>{J=!1,q&&cancelAnimationFrame(q),h.removeEventListener(`pointerdown`,st),h.removeEventListener(`pointermove`,ut),h.removeEventListener(`pointerleave`,dt),h.removeEventListener(`keydown`,ct),h.removeEventListener(`webglcontextlost`,ft),document.removeEventListener(`visibilitychange`,lt),pt?.disconnect(),$?.disconnect(),w.traverse(e=>{let t=e;t.geometry&&t.geometry.dispose();let n=t.material;Array.isArray(n)?n.forEach(e=>Se(e)):n&&Se(n)}),Ce.dispose(),Te.dispose(),Ee.dispose(),Re.dispose(),S.dispose()}},[]),h?(0,w.jsx)(S,{}):(0,w.jsxs)(`div`,{ref:e,className:`relative h-64 w-full overflow-hidden rounded-[1.75rem] bg-[#b9cdc2] focus-within:ring-2 focus-within:ring-current focus-within:ring-offset-2 focus-within:ring-offset-[#fbfbfb] sm:h-72`,children:[(0,w.jsx)(`canvas`,{ref:t,role:`img`,tabIndex:0,"aria-label":`Koi pond. Tap the water to make ripples, or tap a fish to scatter it.`,className:`block h-full w-full touch-manipulation rounded-[1.75rem] transition-opacity duration-1000 [mask-image:radial-gradient(115%_100%_at_50%_50%,black_58%,transparent_82%)] [-webkit-mask-image:radial-gradient(115%_100%_at_50%_50%,black_58%,transparent_82%)] focus-visible:outline-none ${A?`opacity-100`:`opacity-0`}`}),(0,w.jsx)(`p`,{"aria-hidden":`true`,className:`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-black/10 bg-white/85 px-3 py-1 font-mono text-[11px] tracking-wide text-[#1a1a1a]/70 backdrop-blur transition-opacity duration-500 ${n?`opacity-0`:`opacity-100`}`,children:`tap the water — the koi startle`})]})},Se=e=>{Object.values(e).forEach(e=>{e&&e.isTexture&&e.dispose()}),e.dispose()};export{M as KoiPond3D,M as default};