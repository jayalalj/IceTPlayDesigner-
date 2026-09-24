/* IceT Play Designer — animated walkthrough.
   Usage: IceTDesignerDemo.mount(element)  → draws a looping demo with play/pause, replay and a scrub bar. */
(function(){
  'use strict';
  var W=960, H=520, SC=4.6, RX=function(x){ return 16+x*SC; }, RY=function(y){ return 44+y*SC; };
  var ease=function(t){ return t<.5?2*t*t:-1+(4-2*t)*t; };
  var clamp=function(v,a,b){ return Math.max(a,Math.min(b,v)); };
  var FONT='"Barlow Condensed", "Arial Narrow", Arial, sans-serif', BODY='Barlow, "Segoe UI", Arial, sans-serif';

  // ---------- the play being built ----------
  var S0={ G:[13,42.5], C:[27.5,22], OC:[34.5,22], LW:[29,6.5], ORW:[35,6.5], LD:[18,27], RD:[29,38], OLW:[35,38], RW:[29,47], OD1:[70,14], OD2:[70,52], puck:[31,22] };
  function withP(base,over){ var o={}; for(var k in base) o[k]=base[k]; for(var j in over) o[j]=over[j]; return o; }
  var S1=withP(S0,{ puck:[25,9] });
  var S2=withP(S1,{ RW:[40,74], puck:[38,79] });
  var OURS=['C','LW','RW','LD','RD'], THEM=['OC','OLW','ORW','OD1','OD2'];
  // the rim: up to the boards, around the corner, behind the net, around the other corner, out to RW
  var RIM=(function(){ var P=[[25,9],[24,2.5]], i, a;
    for(i=1;i<=10;i++){ a=-Math.PI/2-i*Math.PI/20; P.push([24+21.5*Math.cos(a),24+21.5*Math.sin(a)]); }
    for(i=0;i<=10;i++){ a=Math.PI-i*Math.PI/20; P.push([24+21.5*Math.cos(a),61+21.5*Math.sin(a)]); }
    P.push([38,82.5],[38,79]); return P; })();
  function along(pts,e){ var L=[0],i; for(i=1;i<pts.length;i++) L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
    var d=clamp(e,0,1)*L[L.length-1]; i=1; while(i<pts.length-1&&L[i]<d) i++; var u=(d-L[i-1])/((L[i]-L[i-1])||1);
    return [pts[i-1][0]+(pts[i][0]-pts[i-1][0])*u, pts[i-1][1]+(pts[i][1]-pts[i-1][1])*u]; }
  function upTo(pts,e){ var out=[pts[0]], L=0, T=0, i; for(i=1;i<pts.length;i++) T+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
    var d=clamp(e,0,1)*T; for(i=1;i<pts.length;i++){ var sl=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); if(L+sl>=d){ out.push(along([pts[i-1],pts[i]],(d-L)/(sl||1))); return out; } L+=sl; out.push(pts[i]); } return out; }
  var CAP1='C wins the draw to LW in the strong-side corner.', CAP1B=' Win it clean!';
  var CAP2='LW rims it around the boards to RW at the weak-side half-wall.';

  // ---------- mock panel layout (canvas px) ----------
  var P={ name:[662,94,276,30], faceoff:[662,148,82,26], breakout:[750,148,82,26], dzone:[838,148,100,26],
    set:[662,202,62,26], s1:[744,202,30,26], s2:[790,202,30,26], add:[662,236,134,30], del:[804,236,134,30],
    cap:[662,300,276,50], save:[662,356,276,30], preview:[662,394,134,36], test:[804,394,134,36], copy:[662,436,276,30],
    bar:[284,441,350,28] };
  function mid(r){ return [r[0]+r[2]/2, r[1]+r[3]/2]; }
  function rk(p){ return [RX(p[0]),RY(p[1])]; }

  // ---------- timeline ----------
  var LEN=38, RIMT=[15.8,19.0];
  var CUR=[ // [t, x, y] cursor keyframes
    [0,520,300],[1.2].concat(mid(P.faceoff)),[2.6,700,109],[5.8].concat(mid(P.add)),
    [6.9].concat(rk(S0.puck)),[7.0].concat(rk(S0.puck)),[8.2].concat(rk(S1.puck)),[8.3].concat(rk(S1.puck)),
    [9.5,905,338],[11.7].concat(mid(P.save)),[13.3].concat(mid(P.add)),
    [14.1].concat(rk(S1.RW)),[14.2].concat(rk(S1.RW)),[15.3].concat(rk(S2.RW)),[15.4].concat(rk(S2.RW)),
    [15.75].concat(rk(S1.puck)),[15.8].concat(rk(S1.puck)),[19.0].concat(rk(S2.puck)),[19.2].concat(rk(S2.puck)),
    [20.2,470,455],[21.7].concat(mid(P.save)),[23.5].concat(mid(P.preview)),[30.1].concat(mid(P.test)),[33.1].concat(mid(P.copy)),[38,560,300] ];
  var CLICKS=[1.3,2.7,5.9,7.0,9.6,11.8,13.4,14.2,15.8,21.8,23.6,30.2,33.2];
  var DRAGS=[ // [start, end, entity]
    [7.0,8.2,'puck'],[14.2,15.3,'RW'] ];
  var SCENES=[[0,'1 · Pick a faceoff dot'],[2.4,'2 · Name the play'],[5.2,'3 · Add a step'],[6.4,'4 · Drag the puck to where it ends up'],
    [8.4,'5 · The description writes itself. Edit it if you like'],[10.9,'6 · Save the step'],[12.6,'Add the next step'],
    [15.6,'7 · Slide the puck along the boards = a rim'],[20.6,'Save step 2'],[22.8,'8 · Preview it'],[29.4,'9 · Test it, then copy the share link']];
  function typed(txt,t0,t1,t){ if(t<t0) return ''; return txt.slice(0,Math.round(clamp((t-t0)/(t1-t0),0,1)*txt.length)); }

  function cursorAt(t){
    if(t>=RIMT[0]&&t<=RIMT[1]) return rk(along(RIM,(t-RIMT[0])/(RIMT[1]-RIMT[0])));
    if(t<=CUR[0][0]) return [CUR[0][1],CUR[0][2]];
    for(var i=0;i<CUR.length-1;i++){ var a=CUR[i], b=CUR[i+1]; if(t<=b[0]){ var e=ease((t-a[0])/((b[0]-a[0])||1)); return [a[1]+(b[1]-a[1])*e, a[2]+(b[2]-a[2])*e]; } }
    var l=CUR[CUR.length-1]; return [l[1],l[2]];
  }
  function toRink(px){ return [(px[0]-16)/SC,(px[1]-44)/SC]; }
  function lerpPos(a,b,e){ var o={}; for(var k in a) o[k]=[a[k][0]+(b[k][0]-a[k][0])*e, a[k][1]+(b[k][1]-a[k][1])*e]; return o; }

  function state(t){
    var s={ t:t, cursor:cursorAt(t), players:null, ghost:null, step:0, steps:1, tpl:false, name:typed('Win it, rim it out',2.8,4.4,t), cap:'', capLabel:'Lineup note', capHint:false, flash:0,
      save:null, draft:[], path:'', bar:false, rim:null, trail:null, banner:'', toast:'', pressed:null, dragging:null };
    s.scene=SCENES[0][1]; for(var i=0;i<SCENES.length;i++) if(t>=SCENES[i][0]) s.scene=SCENES[i][1];
    if(t>=1.3){ s.tpl=true; s.players=S0; }
    // step 1
    if(t>=5.9){ s.steps=2; s.step=1; s.ghost=S0; s.players=withP(S0,{}); s.capLabel='What happens in step 1'; s.bar=true; if(t<11.8) s.draft=[1]; }
    if(t>=8.2 && t<13.4){ s.players.puck=S1.puck; }
    if(t>=8.3 && t<13.4){ s.cap=CAP1+typed(CAP1B,9.9,10.7,t); s.capHint=true; s.flash=clamp(1-(t-8.3)/1.2,0,1); if(t<11.8) s.save='✓ Save step 1'; }
    if(t>=11.8&&t<13.4) s.toast='Step 1 saved. Press + Add step for the next move.';
    // step 2
    if(t>=13.4){ s.steps=3; s.step=2; s.ghost=S1; s.players=withP(S1,{}); s.capLabel='What happens in step 2'; s.cap=''; s.capHint=false; if(t<21.8) s.draft=[2]; }
    if(t>=15.3 && t>=13.4) s.players.RW=S2.RW;
    if(t>=RIMT[0]&&t<RIMT[1]){ var e=(t-RIMT[0])/(RIMT[1]-RIMT[0]); s.trail=upTo(RIM,e); s.players.puck=along(RIM,e); s.dragging='puck'; }
    if(t>=RIMT[1]){ s.players.puck=S2.puck; s.path='rim'; s.rim=RIM; }
    if(t>=RIMT[1]+0.1){ s.cap=CAP2; s.capHint=true; s.flash=clamp(1-(t-19.1)/1.2,0,1); if(t<21.8) s.save='✓ Save step 2'; }
    if(t>=RIMT[1]+0.1&&t<21.8) s.toast='You slid the puck along the boards, so it\'s a rim.';
    if(t>=21.8&&t<23.4) s.toast='Step 2 saved.';
    DRAGS.forEach(function(d){ if(t>=d[0]&&t<d[1]){ var q=withP(s.players,{}); q[d[2]]=toRink(s.cursor); s.players=q; s.dragging=d[2]; } });
    // preview
    if(t>=23.6&&t<29.4){ s.ghost=null; s.bar=false; s.rim=null; var tt=t-23.8;
      if(tt<0) s.players=S0; else if(tt<1.4){ s.players=lerpPos(S0,S1,ease(tt/1.4)); s.banner=CAP1+CAP1B; }
      else if(tt<4.2){ var e2=ease((tt-1.4)/2.8); s.players=lerpPos(S1,S2,e2); s.players.puck=along(RIM,e2); s.banner=CAP2; }
      else { s.players=S2; s.banner=CAP2; } }
    if(t>=30.3&&t<33) s.toast='Test it opens the play the way the team sees it: Watch, Play it, grading.';
    if(t>=33.3) s.toast='Link copied! Paste it into an email or the team chat.';
    CLICKS.forEach(function(c){ if(t>=c&&t<c+.35) s.click={p:s.cursor,k:(t-c)/.35}; });
    if(t>=23.6&&t<24) s.pressed='preview'; if(t>=30.2&&t<30.6) s.pressed='test'; if(t>=33.2&&t<33.6) s.pressed='copy';
    if(t>=5.9&&t<6.3||t>=13.4&&t<13.8) s.pressed='add';
    return s;
  }

  // ---------- drawing ----------
  function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  function rink(c){
    c.save(); rr(c,RX(0),RY(0),134*SC,85*SC,24*SC); c.fillStyle='#e9f1f8'; c.fill(); c.lineWidth=2; c.strokeStyle='#9fb0c2'; c.stroke(); c.clip();
    function L(x,col,w){ c.strokeStyle=col; c.lineWidth=w; c.beginPath(); c.moveTo(RX(x),RY(0)); c.lineTo(RX(x),RY(85)); c.stroke(); }
    L(11,'#d7263d',2); L(75,'#1f6fd0',5); L(100,'#d7263d',5); L(125,'#1f6fd0',5);
    c.lineWidth=1.6; [[31,22],[31,63]].forEach(function(p){ c.strokeStyle='#d7263d'; c.beginPath(); c.arc(RX(p[0]),RY(p[1]),15*SC,0,7); c.stroke(); c.fillStyle='#d7263d'; c.beginPath(); c.arc(RX(p[0]),RY(p[1]),4,0,7); c.fill(); });
    c.strokeStyle='#1f6fd0'; c.beginPath(); c.arc(RX(100),RY(42.5),15*SC,0,7); c.stroke();
    c.fillStyle='rgba(31,111,208,.18)'; c.beginPath(); c.arc(RX(11),RY(42.5),6*SC,-Math.PI/2,Math.PI/2); c.fill();
    c.fillStyle='#15202b'; c.fillRect(RX(7),RY(39),4*SC,7*SC); c.restore();
    c.fillStyle='#5b6673'; c.font='700 13px '+FONT; c.textAlign='center'; c.fillText('OUR NET',RX(11),RY(-1.5));
  }
  function player(c,p,fill,label,o){ o=o||{}; var r=(o.r||3)*SC; c.save(); c.globalAlpha=o.a==null?1:o.a;
    c.beginPath(); c.arc(RX(p[0]),RY(p[1]),r,0,7); c.fillStyle=fill; c.fill(); c.lineWidth=1.5; c.strokeStyle=o.stroke||'#fff'; c.stroke();
    if(o.hot){ c.beginPath(); c.arc(RX(p[0]),RY(p[1]),r+4,0,7); c.lineWidth=3; c.strokeStyle='#15202b'; c.stroke(); }
    c.fillStyle=o.ink||'#fff'; c.font='800 '+(label.length>1?11:13)+'px '+FONT; c.textAlign='center'; c.textBaseline='middle'; c.fillText(label,RX(p[0]),RY(p[1])+1); c.restore(); }
  function puck(c,p,a,hot){ c.save(); c.globalAlpha=a==null?1:a; if(hot||a==null){ c.beginPath(); c.arc(RX(p[0]),RY(p[1]),12,0,7); c.fillStyle='rgba(255,212,0,.4)'; c.fill(); }
    c.beginPath(); c.arc(RX(p[0]),RY(p[1]),6,0,7); c.fillStyle='#15202b'; c.fill(); c.lineWidth=2; c.strokeStyle='#ffd400'; c.stroke(); c.restore(); }
  function arrow(c,a,b,col,w,dash){ var ax=RX(a[0]),ay=RY(a[1]),bx=RX(b[0]),by=RY(b[1]),d=Math.hypot(bx-ax,by-ay); if(d<14) return; var ux=(bx-ax)/d,uy=(by-ay)/d;
    c.save(); c.strokeStyle=col; c.fillStyle=col; c.lineWidth=w; if(dash) c.setLineDash([7,5]); c.beginPath(); c.moveTo(ax+ux*14,ay+uy*14); c.lineTo(bx-ux*22,by-uy*22); c.stroke(); c.setLineDash([]);
    var hx=bx-ux*18, hy=by-uy*18; c.beginPath(); c.moveTo(hx+ux*9,hy+uy*9); c.lineTo(hx-uy*6,hy+ux*6); c.lineTo(hx+uy*6,hy-ux*6); c.closePath(); c.fill(); c.restore(); }
  function scene(c,s){
    rink(c);
    if(!s.players){ c.fillStyle='#8c98a6'; c.font='700 22px '+FONT; c.textAlign='center'; c.fillText('Pick a starting setup →',RX(67),RY(44)); return; }
    var fade=clamp((s.t-1.3)/.4,0,1);
    if(s.ghost){ for(var k in s.ghost){ if(k==='puck'){ puck(c,s.ghost[k],.3); continue; } var opp=k[0]==='O';
        player(c,s.ghost[k],opp?'#c6cfd9':(k[1]==='D'||k==='G'?'#23395b':'#e8641b'),opp?'X':k,{a:.28,r:k==='G'?2.6:3,ink:opp?'#4a5561':null,stroke:opp?'#8c98a6':null}); }
      for(var j in s.players){ if(j==='puck'&&(s.rim||s.trail)) continue; arrow(c,s.ghost[j],s.players[j], j[0]==='O'?'#8c98a6':'#15202b', j==='puck'?2.4:1.8, j!=='puck'); }
      if(s.rim){ c.save(); c.strokeStyle='#15202b'; c.lineWidth=2.4; c.lineJoin='round'; c.beginPath(); s.rim.forEach(function(p,i){ i?c.lineTo(RX(p[0]),RY(p[1])):c.moveTo(RX(p[0]),RY(p[1])); }); c.stroke(); c.restore(); arrow(c,s.rim[s.rim.length-3],s.rim[s.rim.length-1],'#15202b',2.4,false); } }
    if(s.trail&&s.trail.length>1){ c.save(); c.strokeStyle='rgba(31,111,208,.75)'; c.lineWidth=3; c.lineCap='round'; c.setLineDash([2,7]); c.beginPath(); s.trail.forEach(function(p,i){ i?c.lineTo(RX(p[0]),RY(p[1])):c.moveTo(RX(p[0]),RY(p[1])); }); c.stroke(); c.restore(); }
    c.save(); c.globalAlpha=fade;
    THEM.forEach(function(k){ player(c,s.players[k],'#c6cfd9','X',{ink:'#4a5561',stroke:'#8c98a6'}); });
    player(c,s.players.G,'#23395b','G',{r:2.6});
    OURS.forEach(function(k){ player(c,s.players[k],k[1]==='D'?'#23395b':'#e8641b',k,{hot:s.dragging===k}); });
    puck(c,s.players.puck,null,s.dragging==='puck'); c.restore();
    if(s.bar){ var b=P.bar; c.save(); rr(c,b[0],b[1],b[2],b[3],14); c.fillStyle='rgba(255,255,255,.95)'; c.fill(); c.strokeStyle='#d5dde6'; c.lineWidth=1; c.stroke();
      c.fillStyle='#5b6673'; c.font='800 11px '+FONT; c.textAlign='left'; c.textBaseline='middle'; c.fillText('PUCK',b[0]+10,b[1]+14);
      var opts=[['STRAIGHT','',64],['ALONG THE BOARDS','rim',122],['OFF THE BOARDS','bank',108]], x=b[0]+42;
      opts.forEach(function(o){ var on=s.path===o[1]; rr(c,x,b[1]+4,o[2],20,10); c.fillStyle=on?(o[1]?'#d7263d':'#15202b'):'#e6ebf1'; c.fill(); c.fillStyle=on?'#fff':'#15202b'; c.font='700 11px '+FONT; c.textAlign='center'; c.fillText(o[0],x+o[2]/2,b[1]+15); x+=o[2]+4; });
      c.restore(); }
    if(s.banner){ c.save(); c.fillStyle='rgba(21,32,43,.78)'; rr(c,RX(4),RY(2),620-8*1,34,8); c.fill(); c.fillStyle='#fff'; var fs=18, bt=s.banner.toUpperCase(); c.font='800 '+fs+'px '+FONT; while(c.measureText(bt).width>580&&fs>11){ fs--; c.font='800 '+fs+'px '+FONT; } c.textAlign='center'; c.textBaseline='middle'; c.fillText(bt,RX(4)+306,RY(2)+17); c.restore(); }
  }
  function btn(c,r,label,style,on){ c.save(); rr(c,r[0],r[1],r[2],r[3],r[3]>30?8:13);
    c.fillStyle= style==='red'?'#d7263d': style==='dark'?'#15202b': on?'#15202b':'#e6ebf1'; if(style==='plain') c.fillStyle='#fff'; c.fill();
    if(style==='plain'){ c.strokeStyle='#d5dde6'; c.lineWidth=1; c.stroke(); }
    c.fillStyle=(style==='red'||style==='dark'||on)?'#fff':'#15202b'; c.font='700 '+(r[3]>30?16:13)+'px '+FONT; c.textAlign='center'; c.textBaseline='middle'; c.fillText(label.toUpperCase(),r[0]+r[2]/2,r[1]+r[3]/2+1); c.restore(); }
  function field(c,r,txt,focus,ph){ c.save(); rr(c,r[0],r[1],r[2],r[3],7); c.fillStyle='#fff'; c.fill(); c.lineWidth=focus?2.5:1; c.strokeStyle=focus?'#1f6fd0':'#c9d3df'; c.stroke();
    c.fillStyle=txt?'#15202b':'#9aa7b4'; c.font='14px '+BODY; c.textAlign='left'; c.textBaseline='top';
    var words=(txt||ph).split(' '), line='', y=r[1]+8; words.forEach(function(w){ var tl=line?line+' '+w:w; if(c.measureText(tl).width>r[2]-16){ c.fillText(line,r[0]+8,y); line=w; y+=18; } else line=tl; }); c.fillText(line+(focus&&txt!==null&&Math.floor(Date.now()/450)%2?'|':''),r[0]+8,y); c.restore(); }
  function label(c,x,y,t){ c.fillStyle='#5b6673'; c.font='600 11px '+FONT; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText(t.toUpperCase(),x,y); }
  function panel(c,s){
    c.fillStyle='#f2f5f8'; c.fillRect(646,0,W-646,H);
    c.fillStyle='#15202b'; c.font='800 24px '+FONT; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('PLAY DESIGNER',662,64);
    label(c,662,89,'Play name'); field(c,P.name,s.name,s.t>=2.7&&s.t<5.2,'e.g. Win to LW');
    label(c,662,143,'Starting position · faceoff dot'); btn(c,P.faceoff,'Our end ↑','chip',s.tpl); btn(c,P.breakout,'Our end ↓','chip'); btn(c,P.dzone,'📍 Place puck','chip');
    label(c,662,197,'Play timeline'); btn(c,P.set,'Lineup','chip',s.step===0); c.fillStyle='#5b6673'; c.font='700 14px '+FONT; c.textAlign='center'; c.textBaseline='middle'; if(s.steps>1) c.fillText('→',735,215); if(s.steps>2) c.fillText('→',781,215); if(s.steps>1) btn(c,P.s1,'1','chip',s.step===1); if(s.steps>2) btn(c,P.s2,'2','chip',s.step===2);
    s.draft.forEach(function(n){ var r=n===1?P.s1:P.s2; c.save(); rr(c,r[0]-1,r[1]-1,r[2]+2,r[3]+2,14); c.strokeStyle='#d7263d'; c.lineWidth=2.5; c.stroke(); c.restore(); });
    btn(c,P.add,s.pressed==='add'?'+ Add step ✓':'+ Add step','plain'); btn(c,P.del,'Delete step','plain');
    label(c,662,284,s.capLabel); if(s.capHint){ c.fillStyle='#5b6673'; c.font='italic 11.5px '+BODY; c.textAlign='left'; c.fillText('Written for you from your moves. Change anything.',662,296); }
    field(c,P.cap,s.cap,(s.t>=9.6&&s.t<10.9),'What happens in this step…');
    if(s.flash>0){ c.save(); rr(c,P.cap[0],P.cap[1],P.cap[2],P.cap[3],7); c.fillStyle='rgba(255,212,0,'+(0.35*s.flash)+')'; c.fill(); c.restore(); }
    if(s.save) btn(c,P.save,s.save,'red');
    btn(c,P.preview,'▶ Preview','dark'); btn(c,P.test,'Test it','red'); btn(c,P.copy,s.pressed==='copy'||s.t>=30.8?'Link copied ✓':'Copy share link','plain');
    if(s.toast){ c.fillStyle='#1a9e5c'; c.font='600 13px '+BODY; c.textAlign='left'; var words=s.toast.split(' '), line='', y=484; words.forEach(function(w){ var tl=line?line+' '+w:w; if(c.measureText(tl).width>276){ c.fillText(line,662,y); line=w; y+=17; } else line=tl; }); c.fillText(line,662,y); }
  }
  function cursor(c,s){ var p=s.cursor;
    if(s.click){ c.save(); c.beginPath(); c.arc(p[0],p[1],8+22*s.click.k,0,7); c.strokeStyle='rgba(215,38,61,'+(1-s.click.k)+')'; c.lineWidth=3; c.stroke(); c.restore(); }
    c.save(); c.translate(p[0],p[1]); c.beginPath(); c.moveTo(0,0); c.lineTo(0,22); c.lineTo(6,17); c.lineTo(10,26); c.lineTo(14,24); c.lineTo(10,15); c.lineTo(17,15); c.closePath();
    c.fillStyle= s.dragging?'#d7263d':'#15202b'; c.fill(); c.strokeStyle='#fff'; c.lineWidth=2; c.stroke(); c.restore(); }
  function caption(c,s){ c.fillStyle='#15202b'; c.fillRect(0,H-44,646,44); c.fillStyle='#fff'; c.font='800 21px '+FONT; c.textAlign='left'; c.textBaseline='middle'; c.fillText(s.scene.toUpperCase(),18,H-22); }
  function frame(c,t){ c.clearRect(0,0,W,H); c.fillStyle='#fff'; c.fillRect(0,0,646,H); var s=state(t); scene(c,s); caption(c,s); panel(c,s); cursor(c,s);
    if(t>LEN-0.6){ c.fillStyle='rgba(255,255,255,'+clamp((t-(LEN-0.6))/0.6,0,1)+')'; c.fillRect(0,0,W,H); } }

  // ---------- widget ----------
  function mount(el){
    var wrap=document.createElement('div'); wrap.className='icet-demo';
    wrap.innerHTML='<style>.icet-demo{border:1px solid #d5dde6;border-radius:14px;overflow:hidden;background:#fff}.icet-demo canvas{display:block;width:100%;height:auto}'+
      '.icet-demo .bar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f2f5f8;border-top:1px solid #d5dde6;font-family:'+BODY+';font-size:13px;color:#5b6673}'+
      '.icet-demo button{font-family:'+FONT+';font-weight:800;font-size:15px;text-transform:uppercase;border:0;border-radius:8px;padding:6px 12px;cursor:pointer;background:#15202b;color:#fff}'+
      '.icet-demo button.ghost{background:#fff;color:#15202b;border:1px solid #d5dde6}'+
      '.icet-demo input[type=range]{flex:1;accent-color:#d7263d}'+
      '.icet-demo button:focus-visible,.icet-demo input:focus-visible{outline:3px solid #1f6fd0;outline-offset:2px}</style>'+
      '<canvas width="'+W+'" height="'+H+'" role="img" aria-label="Animated demo of the Play Designer: pick a faceoff dot, name the play, add a step, drag the puck, the description writes itself, save the step, slide the puck along the boards to make a rim, preview, test and share."></canvas>'+
      '<div class="bar"><button type="button" data-a="play">❚❚ Pause</button><button type="button" class="ghost" data-a="replay">↺ Replay</button><input type="range" min="0" max="'+LEN+'" step="0.1" value="0" aria-label="Demo position"><span data-a="time">0:00</span></div>';
    el.appendChild(wrap);
    var cv=wrap.querySelector('canvas'), c=cv.getContext('2d'), pb=wrap.querySelector('[data-a=play]'), rg=wrap.querySelector('input'), tm=wrap.querySelector('[data-a=time]');
    var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t=reduce?20:0, playing=!reduce, visible=true, last=performance.now();
    function ui(){ pb.textContent=playing?'❚❚ Pause':'▶ Play'; rg.value=t.toFixed(1); var s=Math.floor(t); tm.textContent='0:'+(s<10?'0':'')+s+' / 0:'+LEN; }
    pb.onclick=function(){ playing=!playing; if(playing&&t>=LEN-0.05) t=0; ui(); };
    wrap.querySelector('[data-a=replay]').onclick=function(){ t=0; playing=true; ui(); };
    rg.oninput=function(){ t=parseFloat(rg.value); ui(); frame(c,t); };
    try{ new IntersectionObserver(function(es){ visible=es[0].isIntersecting; }).observe(cv); }catch(e){}
    (function loop(now){ var dt=Math.min(.05,(now-last)/1000); last=now;
      if(playing&&visible){ t+=dt; if(t>=LEN) t=0; ui(); }
      frame(c,t); requestAnimationFrame(loop); })(performance.now());
    ui();
    return { play:function(){ playing=true; ui(); }, pause:function(){ playing=false; ui(); }, restart:function(){ t=0; playing=true; ui(); } };
  }
  window.IceTDesignerDemo={ mount:mount };
})();
