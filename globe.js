(function initGlobe() {
  const canvas = document.getElementById('globe-canvas');
  if (!canvas || typeof THREE === 'undefined') return;
  const DPR=Math.min(window.devicePixelRatio||1,2), SIZE=520;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(DPR); renderer.setSize(SIZE,SIZE);
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(44,1,.1,200);
  camera.position.z=2.9;

  function makeEarthTexture(){
    const sz=1024,cnv=document.createElement('canvas');cnv.width=cnv.height=sz;
    const c=cnv.getContext('2d');
    const oc=c.createLinearGradient(0,0,sz,sz);
    oc.addColorStop(0,'#010f22');oc.addColorStop(.4,'#012644');oc.addColorStop(1,'#010c1a');
    c.fillStyle=oc;c.fillRect(0,0,sz,sz);
    [[.10,.18,.20,.26,.05],[.18,.46,.13,.24,.04],[.43,.18,.11,.15,.03],
     [.43,.34,.13,.24,.04],[.53,.12,.30,.26,.06],[.68,.54,.13,.12,.03],[.28,.84,.44,.08,.02]]
    .forEach(([x,y,w,h,r])=>{
      const gx=x*sz,gy=y*sz,gw=w*sz,gh=h*sz;
      c.save();c.beginPath();c.roundRect(gx,gy,gw,gh,r*sz);
      const lg=c.createRadialGradient(gx+gw*.4,gy+gh*.4,0,gx+gw*.5,gy+gh*.5,Math.max(gw,gh));
      lg.addColorStop(0,'rgba(0,220,255,.22)');lg.addColorStop(.5,'rgba(0,140,200,.13)');lg.addColorStop(1,'rgba(0,80,160,.05)');
      c.fillStyle=lg;c.fill();c.strokeStyle='rgba(0,200,255,.55)';c.lineWidth=2.5;c.stroke();c.restore();
    });
    c.strokeStyle='rgba(0,180,255,.07)';c.lineWidth=1;
    for(let i=1;i<12;i++){const y=(i/12)*sz;c.beginPath();c.moveTo(0,y);c.lineTo(sz,y);c.stroke();}
    for(let i=1;i<24;i++){const x=(i/24)*sz;c.beginPath();c.moveTo(x,0);c.lineTo(x,sz);c.stroke();}
    [[.20,.28],[.23,.33],[.20,.58],[.47,.25],[.50,.28],[.47,.44],[.58,.20],[.65,.22],[.73,.58]]
    .forEach(([nx,ny])=>{
      const cx=nx*sz,cy=ny*sz,g=c.createRadialGradient(cx,cy,0,cx,cy,7);
      g.addColorStop(0,'rgba(0,255,255,1)');g.addColorStop(.4,'rgba(0,200,255,.6)');g.addColorStop(1,'rgba(0,150,255,0)');
      c.beginPath();c.arc(cx,cy,7,0,Math.PI*2);c.fillStyle=g;c.fill();
    });
    return new THREE.CanvasTexture(cnv);
  }
  const R=1.0;
  const earth=new THREE.Mesh(new THREE.SphereGeometry(R,64,64),
    new THREE.MeshPhongMaterial({map:makeEarthTexture(),specular:new THREE.Color(0x003366),shininess:55}));
  scene.add(earth);

  function makeCloudTex(){
    const sz=512,cnv=document.createElement('canvas');cnv.width=cnv.height=sz;
    const c=cnv.getContext('2d');c.clearRect(0,0,sz,sz);
    [[.08,.22,.12,.05],[.25,.18,.09,.04],[.55,.30,.14,.05],[.70,.40,.10,.04],
     [.40,.55,.13,.05],[.15,.65,.11,.04],[.80,.20,.10,.04],[.30,.80,.40,.06]]
    .forEach(([cx,cy,w,h])=>{
      const gx=cx*sz,gy=cy*sz,gw=w*sz,gh=h*sz,g=c.createRadialGradient(gx+gw/2,gy+gh/2,0,gx+gw/2,gy+gh/2,gw/1.5);
      g.addColorStop(0,'rgba(180,220,255,.5)');g.addColorStop(1,'rgba(180,220,255,0)');
      c.beginPath();c.ellipse(gx+gw/2,gy+gh/2,gw/2,gh/2,0,0,Math.PI*2);c.fillStyle=g;c.fill();
    });
    return new THREE.CanvasTexture(cnv);
  }
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(R*1.012,48,48),
    new THREE.MeshPhongMaterial({map:makeCloudTex(),transparent:true,opacity:.45,depthWrite:false}));
  scene.add(clouds);

  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R*1.09,48,48),new THREE.ShaderMaterial({
    vertexShader:'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vN;void main(){float i=pow(.62-dot(vN,vec3(0,0,1.)),3.);gl_FragColor=vec4(0.,.45,1.,1.)*i;}',
    blending:THREE.AdditiveBlending,side:THREE.BackSide,transparent:true
  })));

  const gridG=new THREE.Group(),gMat=new THREE.LineBasicMaterial({color:0x00aaff,transparent:true,opacity:.12});
  for(let lat=-75;lat<=75;lat+=15){const pts=[],phi=(90-lat)*Math.PI/180;for(let i=0;i<=64;i++){const t=(i/64)*Math.PI*2;pts.push(new THREE.Vector3(R*Math.sin(phi)*Math.cos(t),R*Math.cos(phi),R*Math.sin(phi)*Math.sin(t)));}gridG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gMat));}
  for(let lon=0;lon<360;lon+=15){const pts=[],t=lon*Math.PI/180;for(let i=0;i<=64;i++){const phi=(i/64)*Math.PI;pts.push(new THREE.Vector3(R*Math.sin(phi)*Math.cos(t),R*Math.cos(phi),R*Math.sin(phi)*Math.sin(t)));}gridG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gMat));}
  scene.add(gridG);

  const orbitGroup=new THREE.Group();
  const orbitDefs=[
    {rx:Math.PI/2,   ry:0,           speed:.008, r:R*1.32,color:0x00d4ff,opacity:.55},
    {rx:Math.PI/3.5, ry:Math.PI/4,   speed:-.006,r:R*1.42,color:0x0088ff,opacity:.40},
    {rx:Math.PI/6,   ry:Math.PI/2,   speed:.010, r:R*1.38,color:0x00ffcc,opacity:.35},
    {rx:Math.PI/2.2, ry:Math.PI/1.5, speed:-.007,r:R*1.50,color:0x4488ff,opacity:.30},
    {rx:Math.PI/4,   ry:Math.PI*.8,  speed:.005, r:R*1.25,color:0x00eeff,opacity:.45},
    {rx:Math.PI/1.8, ry:Math.PI/3,   speed:-.009,r:R*1.45,color:0x22aaff,opacity:.28},
  ];
  const orbitMeshes=orbitDefs.map(def=>{
    const pts=[];for(let i=0;i<=128;i++){const a=(i/128)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*def.r,Math.sin(a)*def.r,0));}
    const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:def.color,transparent:true,opacity:def.opacity}));
    ring.rotation.x=def.rx;ring.rotation.y=def.ry;
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.022,8,8),new THREE.MeshBasicMaterial({color:def.color}));
    dot.userData.angle=Math.random()*Math.PI*2;dot.userData.r=def.r;
    const grp=new THREE.Group();grp.rotation.x=def.rx;grp.rotation.y=def.ry;grp.add(dot);
    orbitGroup.add(ring);orbitGroup.add(grp);
    return {ring,grp,dot,speed:def.speed,r:def.r};
  });
  scene.add(orbitGroup);

  const sPts=new Float32Array(400*3);
  for(let i=0;i<400;i++){const r=2.5+Math.random()*2,t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);sPts[i*3]=r*Math.sin(p)*Math.cos(t);sPts[i*3+1]=r*Math.cos(p);sPts[i*3+2]=r*Math.sin(p)*Math.sin(t);}
  const sGeo=new THREE.BufferGeometry();sGeo.setAttribute('position',new THREE.BufferAttribute(sPts,3));
  scene.add(new THREE.Points(sGeo,new THREE.PointsMaterial({color:0xaaddff,size:.016,transparent:true,opacity:.75})));

  const sun=new THREE.DirectionalLight(0xfff0e0,1.5);sun.position.set(3,1.5,2);scene.add(sun);
  scene.add(new THREE.AmbientLight(0x112244,.7));
  const rim=new THREE.DirectionalLight(0x0033ff,.35);rim.position.set(-3,-1,-2);scene.add(rim);

  earth.rotation.y=-0.5;
  let mouseX=0,mouseY=0,tY=0,tX=0;
  const sp=document.getElementById('view-splash');
  if(sp){sp.addEventListener('mousemove',e=>{const rc=sp.getBoundingClientRect();mouseX=(e.clientX-rc.left)/rc.width-.5;mouseY=(e.clientY-rc.top)/rc.height-.5;});sp.addEventListener('mouseleave',()=>{mouseX=0;mouseY=0;});}
  function animate(){
    const el=document.getElementById('view-splash');
    if(!el||!el.classList.contains('active')){setTimeout(()=>requestAnimationFrame(animate),500);return;}
    requestAnimationFrame(animate);
    tY+=(mouseX*.3-tY)*.04;tX+=(mouseY*.15-tX)*.04;
    earth.rotation.y+=.0022+tY*.002;earth.rotation.x+=tX*.002;
    clouds.rotation.y+=.0028;gridG.rotation.y=earth.rotation.y;gridG.rotation.x=earth.rotation.x;
    orbitMeshes.forEach(o=>{
      o.ring.rotation.z+=o.speed;o.grp.rotation.z+=o.speed;
      o.dot.userData.angle+=Math.abs(o.speed)*1.2;
      const a=o.dot.userData.angle;o.dot.position.set(Math.cos(a)*o.r,Math.sin(a)*o.r,0);
    });
    renderer.render(scene,camera);
  }
  animate();
})();