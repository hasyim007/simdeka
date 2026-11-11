
/* ===== Notulensi: fitur tambahan ala Word =====
   Menimpa ndToolbar, ndCleanNode, ndSyncTb, dan msBook dengan versi yang lebih lengkap.
   Tanpa pembungkus IIFE agar deklarasi function menjadi global dan bisa dipanggil dari onclick. */

/* ---------- 1. Tab ribbon: Beranda, Sisipkan, Tinjau, Tabel, Bagian ---------- */
ND_TABS.splice(0,ND_TABS.length,['home','Beranda'],['ins','Sisipkan'],['rev','Tinjau'],['tbl','Tabel'],['sec','Bagian']);

/* ---------- 2. Sanitasi: izinkan warna, sorotan, spasi baris, indentasi, tautan, garis, pemisah halaman ---------- */
['HR','S','STRIKE','A','SUP','SUB'].forEach(function(t){ND_OKTAG.add(t);});
const ND_OKCSS_X=new Set(['font-size','font-weight','font-family','font-style','text-decoration','text-decoration-line','text-align','color','background-color','line-height','margin-left','page-break-after']);
function ndCleanNode(src,dst){
 Array.from(src.childNodes).forEach(function(n){
  if(n.nodeType===3){dst.appendChild(document.createTextNode(n.nodeValue));return;}
  if(n.nodeType!==1)return;
  const tg=n.tagName;
  if(ND_DROP.has(tg))return;
  if(tg==='A'){
   const h=(n.getAttribute('href')||'').trim();
   if(!/^(https?:\/\/|mailto:)/i.test(h)){ndCleanNode(n,dst);return;}
   const a=document.createElement('a');a.setAttribute('href',h);ndCleanNode(n,a);dst.appendChild(a);return;
  }
  if(!ND_OKTAG.has(tg)){ndCleanNode(n,dst);return;}
  const e=document.createElement(tg.toLowerCase());
  if(tg==='FONT'){const sz=n.getAttribute('size');if(sz&&/^[1-7]$/.test(sz))e.setAttribute('size',sz);const fc=n.getAttribute('face');if(fc&&/^[\w\s,'"-]+$/.test(fc))e.setAttribute('face',fc);}
  if(tg==='TD'||tg==='TH'){['colspan','rowspan'].forEach(function(a){const v=n.getAttribute(a);if(v&&/^\d{1,2}$/.test(v))e.setAttribute(a,v);});}
  const st=n.getAttribute&&n.getAttribute('style');
  if(st){
   const keep=[];
   st.split(';').forEach(function(d){const i=d.indexOf(':');if(i<0)return;const k=d.slice(0,i).trim().toLowerCase(),v=d.slice(i+1).trim();
    if(ND_OKCSS_X.has(k)&&/^[\w\s.,%'"()#\-]+$/.test(v)&&!/url|expression/i.test(v))keep.push(k+':'+v);});
   if(keep.length)e.setAttribute('style',keep.join(';'));
  }
  ndCleanNode(n,e);dst.appendChild(e);
 });
}

/* ---------- 3. Util seleksi ---------- */
const ND_BLOCK=/^(DIV|P|LI|UL|OL|H[1-6]|TABLE|BLOCKQUOTE|HR)$/;
function ndSel(){const s=getSelection();return s&&s.rangeCount?s.getRangeAt(0):null;}
/* blok (baris/paragraf) yang tersentuh seleksi. Teks yang berdiri sendiri di kotak isi
   dibungkus <div> dulu, karena hanya isi anak elemen yang disimpan (kotak isi itu sendiri tidak). */
function ndBlocksOf(a){
 const r=ndSel()||a.range;if(!r)return [a.rt];
 const kids=Array.from(a.rt.childNodes).filter(function(n){try{return r.intersectsNode(n);}catch(e){return false;}});
 if(!kids.length)return [a.rt];
 const out=[];let grp=null;
 kids.forEach(function(n){
  if(n.nodeType===1&&ND_BLOCK.test(n.tagName)){grp=null;out.push(n);return;}
  if(!grp){grp=document.createElement('div');a.rt.insertBefore(grp,n);out.push(grp);}
  grp.appendChild(n);
 });
 return out;
}

/* ---------- 4. Format tambahan (Beranda) ---------- */
function ndSyncTb(){
 const tb=document.querySelector('.nd-tb');if(!tb)return;
 const hasSel=ND_SEL&&document.body.contains(ND_SEL.rt);
 const q=function(c){try{return document.queryCommandState(c);}catch(e){return false;}};
 const map={b:'bold',i:'italic',u:'underline',s:'strikeThrough',sup:'superscript',sub:'subscript'};
 Object.keys(map).forEach(function(k){const el=tb.querySelector('[data-c="'+k+'"]');if(el)el.classList.toggle('on',!!(hasSel&&q(map[k])));});
 const sz=tb.querySelector('.sz');if(sz&&hasSel)sz.textContent=Math.round(ndSizeNow()||14);
}
function ndColor(cmd,val){
 const a=ndAct();if(!a)return;
 document.execCommand('styleWithCSS',false,true);
 document.execCommand(cmd,false,val);
 ndFire(a.rt);ndSyncTb();
}
function ndLine(v){
 if(!v)return;const a=ndAct();if(!a)return;
 ndBlocksOf(a).forEach(function(el){el.style.lineHeight=v;});
 ndFire(a.rt);
}
function ndIndent(dl){
 const a=ndAct();if(!a)return;
 ndBlocksOf(a).forEach(function(el){const cur=parseFloat(el.style.marginLeft)||0;const nw=Math.max(0,Math.min(192,cur+dl*24));el.style.marginLeft=nw?nw+'px':'';});
 ndFire(a.rt);
}
function ndCase(mode){
 if(!mode)return;const a=ndAct();if(!a)return;
 const t=getSelection().toString();
 if(!t){showToast('Blok teks yang ingin diubah dulu');return;}
 const out=mode==='up'?t.toLocaleUpperCase('id'):mode==='low'?t.toLocaleLowerCase('id'):t.toLowerCase().replace(/(^|\s)(\S)/g,function(m,p,c){return p+c.toLocaleUpperCase('id');});
 document.execCommand('insertText',false,out);
 ndFire(a.rt);
}

/* ---------- 5. Sisipkan (tab Sisipkan) ---------- */
function ndDateIns(){const a=ndAct();if(!a)return;document.execCommand('insertText',false,fmDateLong(fmToday()));ndFire(a.rt);}
function ndRule(){const a=ndAct();if(!a)return;document.execCommand('insertHTML',false,'<hr><div><br></div>');ndFire(a.rt);}
function ndPageBreak(){const a=ndAct();if(!a)return;document.execCommand('insertHTML',false,'<div style="page-break-after:always"><br></div>');ndFire(a.rt);showToast('Pemisah halaman ditambahkan (berlaku saat dicetak)');}
function ndLink(){
 const a=ndAct();if(!a)return;
 const sel=ndSel();const saved=sel?sel.cloneRange():null,txt=sel?sel.toString():'';
 const u=(prompt(txt?'Alamat tautan untuk teks terpilih (https://…):':'Alamat tautan (https://…):','https://')||'').trim();
 if(!u)return;
 if(!/^(https?:\/\/|mailto:)/i.test(u)){showToast('Tautan harus diawali https:// atau mailto:');return;}
 if(saved){const s=getSelection();s.removeAllRanges();s.addRange(saved);}
 a.rt.focus();
 if(txt)document.execCommand('createLink',false,u);
 else document.execCommand('insertHTML',false,'<a href="'+u.replace(/"/g,'&quot;')+'">'+u.replace(/</g,'&lt;')+'</a>');
 ndFire(a.rt);
}

/* ---------- 6. Tinjau: ejaan, ringkasan, status bar ---------- */
function ndSpellOn(){return MS_UI.spell!==false;}
function ndSpellApply(){
 const on=ndSpellOn();
 document.querySelectorAll('.nd-paper .nd-rt').forEach(function(rt){rt.spellcheck=on;rt.lang='id';});
}
function ndSpell(){
 MS_UI.spell=!ndSpellOn();
 ndSpellApply();
 const b=document.querySelector('.nd-tb [data-c="ej"]');if(b)b.classList.toggle('on',ndSpellOn());
 ndStatusUpd();
}
function ndStats(){
 const roots=Array.from(document.querySelectorAll('.nd-paper .nd-rt'));
 const txt=roots.map(function(r){return r.innerText||r.textContent||'';}).join(' ').replace(/\u200b/g,'');
 const t=txt.trim();
 const words=t?t.split(/\s+/).length:0;
 const chars=t.replace(/\s+/g,' ').length;
 const paper=document.querySelector('.nd-paper');
 const pages=paper?Math.max(1,Math.ceil((paper.offsetHeight/(MS_UI.z||1))/1000)):1;
 const bahas=document.querySelectorAll('.nd-paper .nd-bhx').length;
 return {words:words,chars:chars,pages:pages,bahas:bahas};
}
function ndSummary(){
 const s=ndStats();
 showToast('Kata '+s.words+' · Karakter '+s.chars+' · ±'+s.pages+' halaman · '+s.bahas+' hasil pembahasan');
}
function ndStatusHtml(){
 return '<div id="ndStatus" class="nd-status"><span id="ndStTxt"></span><span id="ndStEj" class="nd-st-r"><i></i><span></span></span></div>';
}
function ndStatusUpd(){
 const tx=document.getElementById('ndStTxt');if(!tx)return;
 const s=ndStats();
 tx.textContent='Kata: '+s.words+'   ·   Karakter: '+s.chars+'   ·   Perkiraan halaman: '+s.pages+'   ·   Hasil pembahasan: '+s.bahas;
 const e=document.getElementById('ndStEj');
 if(e){e.classList.toggle('off',!ndSpellOn());e.querySelector('span').textContent='Pemeriksa ejaan '+(ndSpellOn()?'aktif':'nonaktif');}
}

/* ---------- 7. Cari & ganti ---------- */
const NDF={open:false,rep:false,hits:[],idx:-1};
function ndFindHtml(){
 return '<div id="ndFind" class="nd-find" role="dialog" aria-label="Cari dan ganti">'
  +'<div class="nd-find-row"><span class="nd-find-ic">'+icon('search','w-4 h-4')+'</span>'
  +'<input id="ndFq" type="text" placeholder="Cari di notulensi" autocomplete="off" aria-label="Cari teks">'
  +'<span id="ndFc" class="nd-find-c"></span>'
  +'<button type="button" class="nd-fb" onclick="ndFindStep(-1)" title="Sebelumnya (Shift+Enter)" aria-label="Sebelumnya">'+icon('chevron-up','w-4 h-4')+'</button>'
  +'<button type="button" class="nd-fb" onclick="ndFindStep(1)" title="Berikutnya (Enter)" aria-label="Berikutnya">'+icon('chevron-down','w-4 h-4')+'</button>'
  +'<button type="button" class="nd-fb" onclick="ndFindClose()" title="Tutup (Esc)" aria-label="Tutup">'+icon('x','w-4 h-4')+'</button></div>'
  +'<div class="nd-find-row nd-find-rep"><span class="nd-find-ic">'+icon('replace','w-4 h-4')+'</span>'
  +'<input id="ndFr" type="text" placeholder="Ganti dengan" autocomplete="off" aria-label="Ganti dengan">'
  +'<button type="button" class="nd-fbtn" onclick="ndReplaceOne()">Ganti</button>'
  +'<button type="button" class="nd-fbtn main" onclick="ndReplaceAll()">Ganti semua</button></div></div>';
}
function ndFindQ(){const e=document.getElementById('ndFq');return e?e.value:'';}
function ndFindRep(){const e=document.getElementById('ndFr');return e?e.value:'';}
/* semua kecocokan di kertas: teks di kotak isi + isi kotak input (judul, nama, tempat) */
function ndFindCollect(q){
 const out=[];if(!q)return out;const ql=q.toLowerCase();
 document.querySelectorAll('.nd-paper .nd-rt, .nd-paper input.nd-f').forEach(function(el){
  if(el.tagName==='INPUT'){
   if(el.type&&el.type!=='text')return;
   const v=(el.value||'').toLowerCase();let i=v.indexOf(ql);
   while(i>-1){out.push({kind:'input',el:el,s:i,e:i+ql.length});i=v.indexOf(ql,i+ql.length);}
   return;
  }
  const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){
   const v=n.nodeValue.toLowerCase();let i=v.indexOf(ql);
   while(i>-1){out.push({kind:'text',rt:el,node:n,s:i,e:i+ql.length});i=v.indexOf(ql,i+ql.length);}
  }
 });
 return out;
}
/* sorotan semua hasil (kuning) dan hasil aktif (oranye) lewat CSS Custom Highlight API */
function ndFindPaint(cur){
 if(!window.CSS||!CSS.highlights||typeof Highlight==='undefined')return;
 const all=new Highlight(),c=new Highlight();
 NDF.hits.forEach(function(h,k){
  if(h.kind!=='text')return;
  const r=document.createRange();r.setStart(h.node,h.s);r.setEnd(h.node,h.e);
  (k===cur?c:all).add(r);
 });
 CSS.highlights.set('nd-find',all);CSS.highlights.set('nd-find-cur',c);
}
function ndFindUnpaint(){
 if(window.CSS&&CSS.highlights){CSS.highlights.delete('nd-find');CSS.highlights.delete('nd-find-cur');}
}
function ndFindCount(){
 const c=document.getElementById('ndFc');if(!c)return;
 const q=ndFindQ();
 c.textContent=!q?'':NDF.hits.length?((NDF.idx<0?0:NDF.idx)+1)+' dari '+NDF.hits.length:'Tidak ditemukan';
}
/* pindah ke hasil ke-i. Fokus dikembalikan ke kotak cari agar pengetikan & Enter tidak masuk ke teks notulen */
function ndFindSelect(i){
 const h=NDF.hits[i];if(!h)return false;
 const prev=document.activeElement;
 const keep=(prev&&(prev.id==='ndFq'||prev.id==='ndFr'))?prev:null;
 if(h.kind==='input'){
  h.el.scrollIntoView({block:'center',behavior:'smooth'});
  h.el.classList.add('nd-flash');setTimeout(function(){h.el.classList.remove('nd-flash');},900);
 }else{
  if(!document.body.contains(h.node))return false;
  const r=document.createRange();r.setStart(h.node,h.s);r.setEnd(h.node,h.e);
  const s=getSelection();s.removeAllRanges();s.addRange(r);
  ND_SEL={rt:h.rt,range:r.cloneRange()};
  const el=h.node.parentElement;if(el&&el.scrollIntoView)el.scrollIntoView({block:'center',behavior:'smooth'});
 }
 ndFindPaint(i);
 if(keep)keep.focus({preventScroll:true});
 return true;
}
function ndFindStep(dir){
 const q=ndFindQ();
 NDF.hits=ndFindCollect(q);
 if(!NDF.hits.length){NDF.idx=-1;ndFindUnpaint();ndFindCount();return;}
 const len=NDF.hits.length;
 NDF.idx=NDF.idx<0?(dir>0?0:len-1):(((NDF.idx+dir)%len)+len)%len;
 ndFindSelect(NDF.idx);ndFindCount();
}
function ndFindOpen(withRep){
 if(!document.querySelector('#modalBody .nd-app'))return;
 ndMount();
 NDF.open=true;NDF.rep=!!withRep;
 const p=document.getElementById('ndFind');if(!p)return;
 p.classList.add('open');p.classList.toggle('rep',NDF.rep);
 const sel=getSelection(),q=document.getElementById('ndFq');
 if(q&&!q.value&&sel&&sel.rangeCount){const t=sel.toString();if(t&&t.length<60&&!/\n/.test(t))q.value=t;}
 NDF.hits=ndFindCollect(ndFindQ());NDF.idx=NDF.hits.length?0:-1;ndFindCount();
 if(NDF.idx>=0)ndFindSelect(0);
 setTimeout(function(){const tgt=(NDF.rep&&document.getElementById('ndFr'))?document.getElementById('ndFr'):q;if(tgt){tgt.focus({preventScroll:true});if(tgt.select)tgt.select();}},30);
}
function ndFindClose(){
 const p=document.getElementById('ndFind');if(p)p.classList.remove('open');
 NDF.open=false;ndFindUnpaint();
 const rt=ND_SEL&&ND_SEL.rt;if(rt&&document.body.contains(rt))rt.focus({preventScroll:true});
}
function ndSetInput(h,rep){
 h.el.setRangeText(rep,h.s,h.e,'end');
 h.el.dispatchEvent(new Event('input',{bubbles:true}));
}
function ndReplaceOne(){
 const q=ndFindQ(),rep=ndFindRep();if(!q)return;
 NDF.hits=ndFindCollect(q);
 if(!NDF.hits.length){NDF.idx=-1;ndFindUnpaint();ndFindCount();return;}
 const i=NDF.idx>=0?NDF.idx%NDF.hits.length:0;
 NDF.idx=i;
 const h=NDF.hits[i];
 if(h.kind==='input'){ndSetInput(h,rep);}
 else{
  if(!ndFindSelect(i))return;
  h.rt.focus({preventScroll:true});
  document.execCommand('insertText',false,rep);
  ndFire(h.rt);
 }
 /* hasil ganti tidak dilompati bila mengandung kata yang dicari */
 const next=rep.toLowerCase().indexOf(q.toLowerCase())>-1?i+1:i;
 NDF.hits=ndFindCollect(q);
 NDF.idx=NDF.hits.length?(next%NDF.hits.length):-1;
 if(NDF.hits.length)ndFindSelect(NDF.idx);else ndFindUnpaint();
 ndFindCount();ndStatusUpd();
 const fq=document.getElementById('ndFq');if(fq)fq.focus({preventScroll:true});
}
function ndReplaceAll(){
 const q=ndFindQ(),rep=ndFindRep();if(!q)return;
 const hits=ndFindCollect(q);
 if(!hits.length){showToast('Tidak ada teks yang cocok');return;}
 const changed=new Set();
 /* dari belakang ke depan agar posisi kecocokan sebelumnya tetap benar */
 for(let k=hits.length-1;k>=0;k--){
  const h=hits[k];
  if(h.kind==='input'){h.el.setRangeText(rep,h.s,h.e,'end');changed.add(h.el);continue;}
  if(!h.rt.contains(h.node))continue;
  const r=document.createRange();r.setStart(h.node,h.s);r.setEnd(h.node,h.e);
  const s=getSelection();s.removeAllRanges();s.addRange(r);
  h.rt.focus({preventScroll:true});
  document.execCommand('insertText',false,rep);
  changed.add(h.rt);
 }
 changed.forEach(function(el){el.dispatchEvent(new Event('input',{bubbles:true}));});
 NDF.hits=[];NDF.idx=-1;ndFindUnpaint();
 showToast(hits.length+' teks diganti');
 ndFindCount();ndStatusUpd();
 const fq=document.getElementById('ndFq');if(fq)fq.focus({preventScroll:true});
}

/* ---------- 8. Ribbon (ndToolbar lengkap) ---------- */
function ndToolbar(d){
 const cur=MS_UI.rb||'home';
 const ic=function(n){return icon(n,'w-4 h-4');};
 const B=function(c,tip,inner,fn,cls){return '<button type="button" data-c="'+c+'"'+(cls?' class="'+cls+'"':'')+' title="'+tip+'" aria-label="'+tip+'" onclick="'+fn+'">'+inner+'</button>';};
 const G=function(x){return '<div class="rb-g">'+x+'</div>';};
 const spOn=ndSpellOn();
 const home=
  G(B('b','Tebalkan teks (Bold)','<b>B</b>','ndBold(true)')+B('t','Tipiskan teks (hapus tebal)','<span style="font-weight:300">B</span>','ndBold(false)')+B('u','Garis bawah','<u>U</u>',"ndCmd('underline')")+B('i','Miringkan teks (Italic)','<i>I</i>',"ndCmd('italic')")+B('s','Coret','<s>S</s>',"ndCmd('strikeThrough')")+B('sup','Superskrip (contoh: x²)','x<sup>2</sup>',"ndCmd('superscript')")+B('sub','Subskrip (contoh: H₂O)','H<sub>2</sub>',"ndCmd('subscript')"))
  +G(B('s-','Perkecil huruf','A−','ndSize(-1)')+'<span class="sz" title="Ukuran huruf (px)">14</span>'+B('s+','Perbesar huruf','A+','ndSize(1)'))
  +G('<select title="Font. Pilih teks lalu pilih font untuk bagian itu; tanpa pilihan = font seluruh dokumen" onchange="ndFont(this.value)">'+ND_FONTS.map(function(f){return '<option '+(f===(d.font||'Times New Roman')?'selected':'')+' style="font-family:\''+f+'\'">'+f+'</option>';}).join('')+'</select>')
  +G('<select class="rb-cs" title="Ubah huruf pada teks terpilih" aria-label="Ubah huruf" onchange="ndCase(this.value);this.value=\'\'">'
    +'<option value="">Ubah huruf</option><option value="up">HURUF BESAR</option><option value="low">huruf kecil</option><option value="title">Huruf Awal Besar</option></select>')
  +G('<label class="rb-col" title="Warna teks"><span class="rb-col-ic">'+ic('baseline')+'</span><input type="color" value="#173B70" aria-label="Warna teks" onchange="ndColor(\'foreColor\',this.value)"></label>'
    +'<label class="rb-col" title="Warna sorotan"><span class="rb-col-ic">'+ic('highlighter')+'</span><input type="color" value="#fff3a3" aria-label="Warna sorotan" onchange="ndColor(\'hiliteColor\',this.value)"></label>')
  +G(B('al','Rata kiri',ic('align-left'),"ndCmd('justifyLeft')")+B('ac2','Rata tengah',ic('align-center'),"ndCmd('justifyCenter')")+B('aj','Rata kiri-kanan',ic('align-justify'),"ndCmd('justifyFull')"))
  +G('<select class="rb-ls" title="Spasi baris" aria-label="Spasi baris" onchange="ndLine(this.value);this.value=\'\'"><option value="">Spasi</option><option value="1">1,0</option><option value="1.15">1,15</option><option value="1.5">1,5</option><option value="2">2,0</option></select>'
    +B('ind-','Kurangi indentasi',ic('indent-decrease'),'ndIndent(-1)')+B('ind+','Tambah indentasi',ic('indent-increase'),'ndIndent(1)'))
  +G(B('ul','Daftar poin',ic('list'),"ndCmd('insertUnorderedList')")+B('ol','Daftar bernomor',ic('list-ordered'),"ndCmd('insertOrderedList')"))
  +G(B('un','Urungkan (Ctrl+Z)',ic('undo-2'),"ndCmd('undo')")+B('re','Ulangi (Ctrl+Y)',ic('redo-2'),"ndCmd('redo')")+B('cf','Hapus format teks terpilih',ic('remove-formatting')+'<span>Bersihkan</span>',"ndCmd('removeFormat')"))
  +G(B('ai','Tulis ulang hasil pembahasan yang sedang aktif (kursor di dalamnya) dengan AI agar bahasanya profesional',ic('sparkles')+'<span>Tulis ulang AI</span>','aiRewriteCursor()','tx')+B('aia','Tulis ulang semua hasil pembahasan dengan AI',ic('sparkles')+'<span>Semua poin</span>','aiRewriteAll()','tx'));
 const ins=
  G(B('ib','Tambah hasil pembahasan',ic('message-square-plus')+'<span>Hasil pembahasan</span>',"msAdd('bahas')",'tx'))
  +G(B('id','Tambah informasi desa',ic('megaphone')+'<span>Informasi desa</span>',"msAdd('info','Desa')",'tx')+B('ir','Tambah informasi daerah',ic('megaphone')+'<span>Informasi daerah</span>',"msAdd('info','Daerah')",'tx'))
  +G(B('tp','Tambah tabel template Pengajian Muda Mudi Desa ke Pembahasan',ic('table')+'<span>Template Pengajian</span>',"msAdd('pmd')",'tx')+B('tc','Salin susunan kelas, penerobos, dan jam dari notulensi sebelumnya',ic('copy')+'<span>Salin template bulan lalu</span>',"pmdCopyPrev()",'tx'))
  +G(B('so','Urutkan hasil pembahasan dari tanggal terkecil (berdasarkan tanggal yang tertulis di isinya)',ic('arrow-up-narrow-wide')+'<span>Urutkan berdasarkan tanggal</span>','bhSort()','tx')+(MS_UI.bhPrev?B('su','Kembalikan urutan sebelum diurutkan',ic('undo-2')+'<span>Urungkan urutan</span>','bhUnsort()','tx'):''))
  +G(B('dt','Sisipkan tanggal hari ini',ic('calendar-days')+'<span>Tanggal</span>','ndDateIns()','tx')+B('hr','Sisipkan garis pemisah',ic('minus')+'<span>Garis</span>','ndRule()','tx'))
  +G(B('pb','Pemisah halaman: isi setelahnya mulai di halaman baru saat dicetak',ic('file-output')+'<span>Pemisah halaman</span>','ndPageBreak()','tx')+B('ln','Sisipkan tautan ke teks terpilih',ic('link')+'<span>Tautan</span>','ndLink()','tx'));
 const tbl=
  G(B('tb','Sisipkan tabel di teks',ic('table')+'<span>Sisipkan tabel</span>','ndTable()'))
  +G(B('ac','Tambah kolom di kanan sel',ic('columns-2')+'<span>+ Kolom</span>',"ndTbl('addCol')")+B('ar','Tambah baris di bawah sel',ic('rows-2')+'<span>+ Baris</span>',"ndTbl('addRow')"))
  +G(B('dc','Hapus kolom','<span>− Kolom</span>',"ndTbl('delCol')")+B('dr','Hapus baris','<span>− Baris</span>',"ndTbl('delRow')"))
  +'<span class="rb-hint">Letakkan kursor di dalam sel tabel untuk menambah atau menghapus baris dan kolom.</span>';
 const rev=
  G(B('fd','Cari teks (Ctrl+F)',ic('search')+'<span>Cari</span>','ndFindOpen(false)','tx')+B('rp','Cari dan ganti (Ctrl+H)',ic('replace')+'<span>Ganti</span>','ndFindOpen(true)','tx'))
  +G(B('ej','Pemeriksa ejaan: klik untuk mengaktifkan atau menonaktifkan',ic('spell-check')+'<span>Pemeriksa ejaan</span>','ndSpell()',spOn?'on':''))
  +G(B('rs','Tampilkan jumlah kata, karakter, dan perkiraan halaman',ic('bar-chart-3')+'<span>Ringkasan</span>','ndSummary()','tx'))
  +'<span class="rb-hint">Cari & ganti bekerja pada isi notulensi. Enter untuk hasil berikutnya, Shift+Enter untuk sebelumnya.</span>';
 const sec=G(ND_NAV.map(function(x){return B('go-'+x[0],'Ke bagian '+x[1],'<span>'+x[1]+'</span>',"ndGo('"+x[0]+"')");}).join(''));
 const P={home:home,ins:ins,rev:rev,tbl:tbl,sec:sec};
 return '<div class="nd-tb" onmousedown="if(!event.target.closest(\'select,input,label\'))event.preventDefault()">'
  +'<div class="rb-tabs" role="tablist">'+ND_TABS.map(function(t){return '<button type="button" role="tab" class="rb-tab'+(t[0]===cur?' on':'')+'" data-t="'+t[0]+'" onclick="ndTab(\''+t[0]+'\')">'+t[1]+'</button>';}).join('')+'</div>'
  +'<div class="rb-body">'+ND_TABS.map(function(t){return '<div class="rb-pn'+(t[0]===cur?' on':'')+'" data-t="'+t[0]+'" role="tabpanel">'+P[t[0]]+'</div>';}).join('')+'</div></div>';
}

/* ---------- 9. Pemasangan: status bar, panel cari, pintasan keyboard ---------- */
function ndMount(){
 const app=document.querySelector('#modalBody .nd-app');if(!app)return;
 if(!document.getElementById('ndStatus'))app.insertAdjacentHTML('beforeend',ndStatusHtml());
 if(!document.getElementById('ndFind'))app.insertAdjacentHTML('beforeend',ndFindHtml());
 if(NDF.open){const p=document.getElementById('ndFind');if(p){p.classList.add('open');p.classList.toggle('rep',NDF.rep);}}
 ndSpellApply();ndStatusUpd();
}
const _msBookOrig=msBook;

msBook=function(){const r=_msBookOrig.apply(this,arguments);ndMount();return r;};

const ndBody=document.getElementById('modalBody');
ndBody.addEventListener('input',function(e){
 const t=e.target;
 if(t.id==='ndFq'){NDF.hits=ndFindCollect(ndFindQ());NDF.idx=NDF.hits.length?0:-1;if(NDF.hits.length)ndFindSelect(0);ndFindCount();return;}
 if(t.closest&&t.closest('.nd-paper'))ndStatusUpd();
});
ndBody.addEventListener('keydown',function(e){
 const t=e.target;if(t.id!=='ndFq'&&t.id!=='ndFr')return;
 if(e.key==='Enter'){e.preventDefault();ndFindStep(e.shiftKey?-1:1);}
 else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ndFindClose();}
});
document.addEventListener('keydown',function(e){
 const m=document.getElementById('modal');if(!m||!m.classList.contains('ms-mode'))return;
 const k=(e.key||'').toLowerCase();
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&(k==='f'||k==='h')){
  if(!document.querySelector('#modalBody .nd-app'))return;
  e.preventDefault();e.stopPropagation();ndFindOpen(k==='h');
 }else if(k==='escape'&&NDF.open){e.preventDefault();e.stopPropagation();ndFindClose();}
},true);

;

/* ===================================================================
   PENGUMUMAN & UNDANGAN — pembuat teks WhatsApp + database masjid + kirim via Fonnte
   Penyimpanan: simdeka_peng_v1 (masjid, riwayat, default) • simdeka_fonnte_v1 (token, jeda)
   =================================================================== */
const PG_KEY='simdeka_peng_v1', FON_KEY='simdeka_fonnte_v1';
const PG_HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const PG_BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const PG_NUM=['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
const PG_MAPS_RX=/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i;
const PG_DALIL=[
 ['','— Tanpa dalil —',''],
 ['ilmu','Keutamaan menuntut ilmu (HR. Muslim)','مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ\n"Barangsiapa yang keluar menuju jalan dengan niat mencari ilmu, maka Allah akan memudahkan baginya jalan menuju Surga"\n[HR. Muslim]']
];
const PG_JENIS={
 kelompok:{l:'Pengajian Muda-Mudi Kelompok',fmt:'pengumuman',judul:'Pengajian Muda-Mudi Kelompok',sas:'seluruh Generus Pra Remaja, Remaja dan Muda-Mudi',ag:'Al-Qur’an\nHadist K. Ahkam\nNasehat Keimaman',cat:'Amal sholeh bisa datang tepat waktu'},
 desa:{l:'Pengajian Muda-Mudi Desa',fmt:'pengumuman',judul:'Pengajian Muda-Mudi Desa Karangmojo',sas:'seluruh Generus Pra Remaja, Remaja dan Muda-Mudi Desa Karangmojo',ag:'Al-Qur’an\nHadist K. Ahkam\nNasehat Keimaman',cat:'Amal sholeh bisa datang tepat waktu'},
 daerah:{l:'Pengajian Muda-Mudi Daerah',fmt:'pengumuman',judul:'Pengajian Muda-Mudi Daerah',sas:'seluruh Generus Pra Remaja, Remaja dan Muda-Mudi',ag:'Al-Qur’an\nNasehat Keimaman',cat:'Amal sholeh bisa datang tepat waktu'},
 musyawarah:{l:'Musyawarah Pengurus',fmt:'undangan',judul:'Musyawarah KMM Desa Karangmojo',yth:'Pengurus KMM Desa\nKetua MM Kelompok / Wakilnya\nKoordinator MT Desa\nKeputrian KMM Desa',ag:'',cat:'Amal sholeh untuk bisa hadir tepat waktu\nBagi yang izin, mohon berikan perwakilan'},
 undangan:{l:'Undangan Wajib / Rapat',fmt:'undangan',judul:'',yth:'Pengurus KMM Desa\nKetua MM Kelompok / Wakilnya',ag:'',cat:'Amal sholeh untuk bisa hadir tepat waktu\nBagi yang izin, mohon berikan perwakilan'},
 lain:{l:'Kegiatan Lainnya',fmt:'pengumuman',judul:'',sas:'seluruh Generus Pra Remaja, Remaja dan Muda-Mudi Desa Karangmojo',ag:'',cat:''}
};
function pgLoad(){
 try{const o=JSON.parse(localStorage.getItem(PG_KEY)||'null');
  if(o&&typeof o==='object')return {masjid:Array.isArray(o.masjid)?o.masjid:[],riwayat:Array.isArray(o.riwayat)?o.riwayat:[],grup:Array.isArray(o.grup)?o.grup:[],def:(o.def&&typeof o.def==='object')?o.def:{}};}catch(e){}
 return {masjid:[],riwayat:[],grup:[],def:{}};
}
let PGD=pgLoad();
function pgSave(){try{localStorage.setItem(PG_KEY,JSON.stringify(PGD));return true;}catch(e){showToast('Penyimpanan penuh — data pengumuman tidak tersimpan');return false;}}
function fonCfg(){try{const o=JSON.parse(localStorage.getItem(FON_KEY)||'null');if(o&&typeof o==='object')return Object.assign({token:'',delay:'10-20'},o);}catch(e){}return {token:'',delay:'10-20'};}
(function(){const _b=bkIsData;bkIsData=function(k){return _b(k)&&k!==FON_KEY;};})(); /* token Fonnte tidak ikut file cadangan */

/* ---------- penyusun teks (murni, mudah diuji) ---------- */
function pgTglId(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return '';const p=iso.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2]);return PG_HARI[d.getDay()]+', '+p[2]+' '+PG_BLN[p[1]-1]+' '+p[0];}
function pgJamId(t){return /^\d{1,2}:\d{2}$/.test(t||'')?t.replace(':','.')+' WIB':'';}
const PG_SALAM_BUKA='السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ';
const PG_SALAM_TUTUP='وَالسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ';
const PG_PENUTUP='الْحَمْدُ لِلَّهِ جَزَاكُمُ اللَّهُ خَيْرًا';
const PG_JAM_RX=/^\d{1,2}:\d{2}$/;
function pgRdKosong(){return {jam:'',sel:'',materi:'',pem:''};}
function pgRd(f){return Array.isArray(f.rd)?f.rd:pgLines(f.ag).map(m=>({jam:'',sel:'',materi:m,pem:''}));}
function pgRdTeks(rows){
 return (rows||[]).filter(r=>(r.materi||'').trim()).map((r,i)=>{
  const no=i<10?PG_NUM[i]:(i+1)+'.';
  const a=PG_JAM_RX.test(r.jam||'')?r.jam.replace(':','.'):'',b=PG_JAM_RX.test(r.sel||'')?r.sel.replace(':','.'):'';
  const jam=a?(b?a+' – '+b:a):'';
  const pem=(r.pem||'').trim();
  return no+' '+(jam?jam+' | ':'')+r.materi.trim()+(pem?'\n    Pemateri: '+pem:'');
 });
}
function pgNomor(arr){return arr.map((x,i)=>(i<10?PG_NUM[i]:(i+1)+'.')+' '+x).join('\n');}
function pgLines(s){return String(s||'').split('\n').map(x=>x.replace(/^\s*(?:[-•*✅]|\d+[.)])\s*/,'').trim()).filter(Boolean);}
function pgMapsUrl(m){if(!m)return '';if(m.maps)return m.maps;const q=[m.nama,m.alamat].filter(Boolean).join(' ');return q?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q):'';}
function pgTempatBlok(list,mas){
 const rows=(list||[]).map(t=>{
  if(t.mid==='__m'||!t.mid)return t.man?{nama:t.man,ket:t.ket,alamat:'',maps:''}:null;
  const m=mas.find(x=>x.id===t.mid);if(!m)return null;
  return {nama:m.nama+(m.kel?' (Kelompok '+m.kel+')':''),ket:t.ket,alamat:m.alamat,maps:pgMapsUrl(m)};
 }).filter(Boolean);
 if(!rows.length)return '📍 Tempat : —';
 const det=r=>(r.alamat?'\n    🏠 '+r.alamat:'')+(r.maps?'\n    🗺 '+r.maps:'');
 if(rows.length===1)return '📍 Tempat : '+rows[0].nama+(rows[0].ket?' ('+rows[0].ket+')':'')+det(rows[0]);
 return '📍 Tempat :\n'+rows.map((r,i)=>(i+1)+'. '+r.nama+(r.ket?' ('+r.ket+')':'')+det(r)).join('\n');
}
function pgBangun(f,mas){
 const tgl=pgTglId(f.tgl)||'—',mulai=pgJamId(f.jam)||'—',akhir=f.selesai?pgJamId(f.selesai):'selesai';
 const waktu=mulai+' – '+akhir,judul=(f.judul||'').trim()||'Kegiatan',leb=(f.lembaga||'').trim();
 const ag=pgRdTeks(pgRd(f)),ct=pgLines(f.cat),tp=pgTempatBlok(f.tempat,mas),dalil=(f.dalil||'').trim();
 const L=[];
 if(f.fmt==='undangan'){
  L.push('📢 *UNDANGAN '+judul.toUpperCase()+'* 📢');
  if(leb)L.push('_'+leb+'_');
  L.push('');
  const y=pgLines(f.yth);
  if(y.length){L.push('Kepada Yth:');L.push(pgNomor(y));L.push('');}
  L.push(PG_SALAM_BUKA);
  L.push('Dengan hormat, kami mengharap kehadiran Saudara/i dalam acara:');
  L.push('🗓 Hari, Tanggal : '+tgl);
  L.push('⏰ Waktu : '+waktu);
  L.push(tp);
  L.push('📝 Acara : '+judul);
  if(ag.length){L.push('');L.push('📌 Rundown Acara:');L.push(ag.join('\n'));}
 }else{
  L.push('📣 *PENGUMUMAN '+judul.toUpperCase()+'* 📣');
  if(leb)L.push('_'+leb+'_');
  L.push('');
  L.push(PG_SALAM_BUKA);
  L.push('Diberitahukan kepada '+((f.sas||'').trim()||'seluruh Generus')+', insyaAllah akan dilaksanakan *'+judul+'* pada:');
  L.push('');
  L.push('🗓 Hari/Tanggal : '+tgl);
  L.push('⏰ Waktu : '+waktu);
  L.push(tp);
  if(ag.length){L.push('');L.push('📌 Rundown Acara:');L.push(ag.join('\n'));}
 }
 if(dalil){L.push('');L.push(dalil);}
 if(ct.length){L.push('');L.push('📝 Catatan:');L.push(ct.map(x=>'✅ '+x).join('\n'));}
 L.push('');
 L.push(f.fmt==='undangan'?'Kerjakan lillah, semoga barokah.':'Tetap semangat mencari ilmu 💪');
 L.push(PG_PENUTUP);
 L.push(PG_SALAM_TUTUP);
 if((f.ttd||'').trim()){L.push('');L.push('_'+f.ttd.trim()+'_');}
 return L.join('\n');
}

/* ---------- state form ---------- */
let PGU={tab:'buat',f:null,rq:'',manual:null};
function pgBaru(j,keep){
 const p=PG_JENIS[j]||PG_JENIS.lain,old=keep||{},d=PGD.def||{};
 return {jenis:j,fmt:p.fmt,judul:p.judul,sas:p.sas||'',yth:p.yth||'',ag:'',rd:pgLines(p.ag).map(m=>({jam:'',sel:'',materi:m,pem:''})),cat:p.cat||'',dalil:old.dalil||'',
  tgl:old.tgl||'',jam:old.jam||(typeof KA!=='undefined'&&KA.jam)||'19:30',selesai:old.selesai||'',
  tempat:(old.tempat&&old.tempat.length)?old.tempat:[{mid:'',man:'',ket:''}],
  lembaga:d.lembaga||'KMM Desa Karangmojo',ttd:d.ttd||''};
}
function pgF(){if(!PGU.f)PGU.f=pgBaru('kelompok');return PGU.f;}
function pgSet(k,v){pgF()[k]=v;pgPrev();}
function pgJenis(j){PGU.manual=null;PGU.f=pgBaru(j,pgF());renderPengumuman();}
function pgFmt(v){pgF().fmt=v;renderPengumuman();}
function pgDalil(v){const d=PG_DALIL.find(x=>x[0]===v);pgF().dalil=d?d[2]:'';const t=document.getElementById('pgDalilTx');if(t)t.value=pgF().dalil;pgPrev();}
function pgTp(i,k,v){const t=pgF().tempat[i];if(!t)return;t[k]=v;if(k==='mid')renderPengumuman();else pgPrev();}
function pgRdEnsure(f){if(!Array.isArray(f.rd))f.rd=pgRd(f);return f.rd;}
function pgRdSet(i,k,v){const r=pgRdEnsure(pgF())[i];if(!r)return;r[k]=v;pgPrev();}
function pgRdAdd(){pgRdEnsure(pgF()).push(pgRdKosong());renderPengumuman();}
function pgRdDel(i){pgRdEnsure(pgF()).splice(i,1);renderPengumuman();}
function pgRdMove(i,d){const a=pgRdEnsure(pgF()),j=i+d;if(j<0||j>=a.length)return;const t=a[i];a[i]=a[j];a[j]=t;renderPengumuman();}
function pgTpAdd(){pgF().tempat.push({mid:'',man:'',ket:''});renderPengumuman();}
function pgTpDel(i){const t=pgF().tempat;t.splice(i,1);if(!t.length)t.push({mid:'',man:'',ket:''});renderPengumuman();}
function pgTeks(){return PGU.manual!=null?PGU.manual:pgBangun(pgF(),PGD.masjid);}
function pgOk(){const f=pgF();if(!f.tgl){showToast('Isi tanggal kegiatan dulu');return false;}if(!f.jam){showToast('Isi jam mulai dulu');return false;}if(!(f.judul||'').trim()){showToast('Isi nama kegiatan dulu');return false;}return true;}
function pgWaHtml(t){return esc(t).replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g,'$1<i>$2</i>');}
function pgPrev(keep){
 if(!keep&&PGU.manual!=null){PGU.manual=null;showToast('Isian formulir diubah — pratinjau dibuat ulang otomatis');}
 const e=document.getElementById('pgPrev');if(e){if(document.activeElement!==e)e.innerText=pgTeks();else e.innerText=pgTeks();}
 pgManualUi();
}
function pgManualUi(){const b=document.getElementById('pgReset'),h=document.getElementById('pgEditTag');if(b)b.classList.toggle('hidden',PGU.manual==null);if(h)h.textContent=PGU.manual==null?'klik teks untuk mengedit langsung':'diedit manual';}
function pgEdit(e){PGU.manual=(e.innerText||'').replace(/\u00a0/g,' ').replace(/\r/g,'');pgManualUi();}
function pgEditPaste(e){e.preventDefault();const t=(e.clipboardData||window.clipboardData).getData('text/plain');document.execCommand('insertText',false,t);}
function pgReset(){PGU.manual=null;pgPrev(true);showToast('Pratinjau dikembalikan ke teks otomatis');}
function pgSimpanDef(){PGD.def=Object.assign({},PGD.def,{lembaga:pgF().lembaga,ttd:pgF().ttd});}
function pgSalin(){if(!pgOk())return;pgSimpanDef();fmCopyText(pgTeks(),'Teks disalin — tinggal tempel di WhatsApp');pgRiwayat(null);}
function pgWa(){if(!pgOk())return;pgSimpanDef();pgRiwayat(null);window.open('https://wa.me/?text='+encodeURIComponent(pgTeks()),'_blank','noopener');}
function pgRiwayat(sent){
 const f=JSON.parse(JSON.stringify(pgF())),teks=pgTeks();
 const last=PGD.riwayat[0];
 if(last&&last.teks===teks){if(sent)last.sent=sent;pgSave();return;}
 PGD.riwayat.unshift({id:'R'+Date.now().toString(36),at:new Date().toISOString(),judul:f.judul,tgl:f.tgl,teks:teks,f:f,sent:sent||null});
 PGD.riwayat=PGD.riwayat.slice(0,60);pgSave();
}

/* ---------- halaman ---------- */
function renderPengumuman(){
 const f=pgF(),tab=PGU.tab;
 const items=[{v:'buat',label:'Buat Pengumuman',n:''},{v:'riwayat',label:'Riwayat',n:PGD.riwayat.length},{v:'masjid',label:'Database Masjid',n:PGD.masjid.length}];
 const chips=`<div class="kchips" role="tablist">${items.map(it=>`<button type="button" role="tab" aria-selected="${it.v===tab}" onclick="pgTab('${it.v}')" class="kchip${it.v===tab?' on':''}">${it.label}${it.n!==''?' <i>'+it.n+'</i>':''}</button>`).join('')}</div>`;
 document.getElementById('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead('Buat <b>pengumuman &amp; undangan</b> pengajian, musyawarah, dan kegiatan lain dengan format baku, lalu bagikan ke WhatsApp atau kirim massal lewat <b>Fonnte</b>.','')}
  <div class="mb-4">${chips}</div>
  ${tab==='buat'?pgBuatHtml(f):tab==='riwayat'?pgRiwayatHtml():pgMasjidHtml()}
 </div>`;
 lucide.createIcons();
 if(tab==='buat')pgPrev(true);
}
function pgTab(t){PGU.tab=t;renderPengumuman();}
function pgBuatHtml(f){
 const inp='mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white',lb=t=>`<span class="text-xs font-bold text-slate-600">${t}</span>`;
 const jenisOpt=Object.keys(PG_JENIS).map(k=>`<option value="${k}" ${f.jenis===k?'selected':''}>${esc(PG_JENIS[k].l)}</option>`).join('');
 const masOpt=cur=>'<option value="">— Pilih masjid —</option>'+PGD.masjid.slice().sort((a,b)=>(a.kel+a.nama).localeCompare(b.kel+b.nama)).map(m=>`<option value="${esc(m.id)}" ${cur===m.id?'selected':''}>${esc((m.kel?m.kel+' — ':'')+m.nama)}</option>`).join('')+`<option value="__m" ${cur==='__m'?'selected':''}>✎ Tulis tempat manual…</option>`;
 const tp=f.tempat.map((t,i)=>`<div class="rounded-xl border border-line p-3 bg-slate-50/60"><div class="flex gap-2 items-center"><select onchange="pgTp(${i},'mid',this.value)" class="${inp} !mt-0 flex-1">${masOpt(t.mid)}</select>${f.tempat.length>1?`<button type="button" onclick="pgTpDel(${i})" class="u-btn danger" aria-label="Hapus tempat">${icon('trash-2','w-4 h-4')}</button>`:''}</div>
   ${t.mid==='__m'?`<input value="${esc(t.man)}" oninput="pgTp(${i},'man',this.value)" placeholder="Nama tempat / alamat" class="${inp}">`:''}
   <input value="${esc(t.ket)}" oninput="pgTp(${i},'ket',this.value)" placeholder="Keterangan, mis. Usia Muda-mudi (opsional)" class="${inp}"></div>`).join('');
 const noMas=!PGD.masjid.length?`<p class="text-[11px] text-amber-700 mt-2">Belum ada masjid di database. <button type="button" class="font-bold underline" onclick="pgTab('masjid')">Tambah masjid</button> supaya alamat dan link Google Maps otomatis masuk ke pengumuman.</p>`:'';
 const dl=PG_DALIL.map(d=>`<option value="${d[0]}">${esc(d[1])}</option>`).join('');
 return `<div class="grid lg:grid-cols-[1fr_420px] gap-5 items-start">
  <div class="u-card p-4 sm:p-5 space-y-4">
   <div class="grid sm:grid-cols-2 gap-3">
    <label class="block">${lb('Jenis kegiatan')}<select onchange="pgJenis(this.value)" class="${inp}">${jenisOpt}</select></label>
    <label class="block">${lb('Bentuk surat')}<select onchange="pgFmt(this.value)" class="${inp}"><option value="pengumuman" ${f.fmt==='pengumuman'?'selected':''}>Pengumuman (untuk semua generus)</option><option value="undangan" ${f.fmt==='undangan'?'selected':''}>Undangan (untuk pengurus tertentu)</option></select></label>
   </div>
   <label class="block">${lb('Nama kegiatan')}<input value="${esc(f.judul)}" oninput="pgSet('judul',this.value)" placeholder="Pengajian Muda-Mudi Desa Karangmojo" class="${inp}"></label>
   ${f.fmt==='undangan'
    ?`<label class="block">${lb('Kepada Yth (satu baris satu penerima)')}<textarea rows="4" oninput="pgSet('yth',this.value)" class="${inp}">${esc(f.yth)}</textarea></label>`
    :`<label class="block">${lb('Ditujukan kepada')}<input value="${esc(f.sas)}" oninput="pgSet('sas',this.value)" placeholder="seluruh Generus Pra Remaja, Remaja dan Muda-Mudi" class="${inp}"></label>`}
   <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
    <label class="block col-span-2 sm:col-span-1">${lb('Tanggal')}<input type="date" value="${esc(f.tgl)}" oninput="pgSet('tgl',this.value)" class="${inp}"></label>
    <label class="block">${lb('Jam mulai')}<input type="time" value="${esc(f.jam)}" oninput="pgSet('jam',this.value)" class="${inp}"></label>
    <label class="block">${lb('Selesai (opsional)')}<input type="time" value="${esc(f.selesai)}" oninput="pgSet('selesai',this.value)" class="${inp}"></label>
   </div>
   <div>${lb('Tempat')}<div class="space-y-2 mt-1.5">${tp}</div>${noMas}
    <button type="button" onclick="pgTpAdd()" class="u-btn mt-2">${icon('plus','w-4 h-4')} Tambah tempat lain</button></div>
   <div>${lb('Rundown acara (nomor, jam, materi, pemateri)')}<div class="space-y-2 mt-1.5">${pgRdEnsure(f).map((r,i)=>`<div class="rounded-xl border border-line p-3 bg-slate-50/60"><div class="flex items-center gap-2 mb-2"><span class="text-xs font-extrabold text-slate-500 w-6">${i+1}.</span><input type="time" value="${esc(r.jam)}" oninput="pgRdSet(${i},'jam',this.value)" class="${inp} !mt-0" aria-label="Jam mulai"><span class="text-xs text-slate-400">s/d</span><input type="time" value="${esc(r.sel)}" oninput="pgRdSet(${i},'sel',this.value)" class="${inp} !mt-0" aria-label="Jam selesai (opsional)"><button type="button" onclick="pgRdMove(${i},-1)" class="u-btn" aria-label="Naik">${icon('arrow-up','w-4 h-4')}</button><button type="button" onclick="pgRdMove(${i},1)" class="u-btn" aria-label="Turun">${icon('arrow-down','w-4 h-4')}</button><button type="button" onclick="pgRdDel(${i})" class="u-btn danger" aria-label="Hapus baris">${icon('trash-2','w-4 h-4')}</button></div>
    <div class="grid sm:grid-cols-2 gap-2"><input value="${esc(r.materi)}" oninput="pgRdSet(${i},'materi',this.value)" placeholder="Materi, mis. Al-Qur’an" class="${inp} !mt-0"><input value="${esc(r.pem)}" oninput="pgRdSet(${i},'pem',this.value)" placeholder="Nama pemateri" class="${inp} !mt-0"></div></div>`).join('')||'<p class="text-[11px] text-slate-400">Belum ada rundown. Tambahkan baris di bawah.</p>'}</div>
    <button type="button" onclick="pgRdAdd()" class="u-btn mt-2">${icon('plus','w-4 h-4')} Tambah baris rundown</button></div>
   <label class="block">${lb('Catatan penting (satu baris satu poin)')}<textarea rows="3" oninput="pgSet('cat',this.value)" class="${inp}">${esc(f.cat)}</textarea></label>
   <div class="grid sm:grid-cols-2 gap-3">
    <label class="block">${lb('Dalil (opsional)')}<select onchange="pgDalil(this.value)" class="${inp}">${dl}</select></label>
    <label class="block">${lb('Penyelenggara')}<input value="${esc(f.lembaga)}" oninput="pgSet('lembaga',this.value)" class="${inp}"></label>
   </div>
   <label class="block">${lb('Teks dalil (boleh ditempel sendiri)')}<textarea id="pgDalilTx" rows="3" oninput="pgSet('dalil',this.value)" class="${inp}" dir="auto">${esc(f.dalil)}</textarea></label>
   <label class="block">${lb('Penandatangan (opsional)')}<input value="${esc(f.ttd)}" oninput="pgSet('ttd',this.value)" placeholder="Ketua KMM Desa Karangmojo" class="${inp}"></label>
  </div>
  <div class="lg:sticky lg:top-4 space-y-3">
   <div class="u-card p-4"><div class="flex items-center justify-between mb-2"><div class="text-sm font-extrabold">Pratinjau WhatsApp <span class="font-normal text-[11px] text-slate-400">(bisa diedit)</span></div><span class="flex items-center gap-2"><button type="button" id="pgReset" onclick="pgReset()" class="hidden text-[10px] font-bold text-emerald-700 underline">Kembalikan otomatis</button><span id="pgEditTag" class="text-[10px] text-slate-400">klik teks untuk mengedit langsung</span></span></div>
    <div id="pgPrev" contenteditable="true" spellcheck="false" oninput="pgEdit(event)" onpaste="pgEditPaste(event)" title="Klik untuk mengedit teks pesan langsung" class="rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400 cursor-text p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words max-h-[62vh] overflow-y-auto" style="unicode-bidi:plaintext;background:#DCF8C6;color:#111;box-shadow:0 1px 1px rgba(0,0,0,.12)"></div></div>
   <div class="grid grid-cols-2 gap-2"><button onclick="pgSalin()" class="u-btn">${icon('copy','w-4 h-4')} Salin teks</button><button onclick="pgWa()" class="u-btn">${icon('share-2','w-4 h-4')} Buka WhatsApp</button></div>
   <button onclick="pgKirimBuka()" class="u-btn primary w-full justify-center">${icon('send','w-4 h-4')} Kirim ke banyak nomor (Fonnte)</button>
  </div></div>`;
}

/* ---------- riwayat ---------- */
function pgRiwayatHtml(){
 if(!PGD.riwayat.length)return emptyState('history','Belum ada riwayat','Pengumuman yang disalin, dibuka di WhatsApp, atau dikirim lewat Fonnte akan tersimpan di sini.',[['Buat pengumuman',"pgTab('buat')",'primary']]);
 return `<div class="space-y-2.5">${PGD.riwayat.map(r=>{
  const at=new Date(r.at).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const st=r.sent?`<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Terkirim ${r.sent.ok}${r.sent.fail?' • gagal '+r.sent.fail:''}</span>`:'';
  return `<div class="u-card p-4"><div class="flex flex-wrap items-start gap-3"><div class="flex-1 min-w-[220px]"><div class="font-extrabold text-sm">${esc(r.judul||'Tanpa judul')} ${st}</div><div class="text-[11px] text-slate-400 mt-0.5">Kegiatan ${esc(pgTglId(r.tgl)||'—')} • dibuat ${esc(at)}</div></div>
   <div class="flex gap-1.5 flex-wrap"><button onclick="pgPakai('${r.id}')" class="u-btn">${icon('pencil','w-4 h-4')} Pakai lagi</button><button onclick="pgSalinR('${r.id}')" class="u-btn">${icon('copy','w-4 h-4')} Salin</button><button onclick="pgHapusR('${r.id}')" class="u-btn danger" aria-label="Hapus">${icon('trash-2','w-4 h-4')}</button></div></div>
   <details class="mt-2"><summary class="text-[11px] font-bold text-navy cursor-pointer">Lihat isi</summary><pre class="mt-2 text-[12px] whitespace-pre-wrap break-words bg-slate-50 rounded-xl p-3 border border-line" style="font-family:inherit">${esc(r.teks)}</pre></details></div>`;}).join('')}</div>`;
}
function pgPakai(id){const r=PGD.riwayat.find(x=>x.id===id);if(!r||!r.f)return;PGU.f=JSON.parse(JSON.stringify(r.f));PGU.manual=(r.teks&&r.teks!==pgBangun(PGU.f,PGD.masjid))?r.teks:null;PGU.tab='buat';renderPengumuman();}
function pgSalinR(id){const r=PGD.riwayat.find(x=>x.id===id);if(r)fmCopyText(r.teks,'Teks disalin');}
async function pgHapusR(id){if(!await uiConfirm({title:'Hapus dari riwayat?',message:'Teks pengumuman ini akan dihapus dari riwayat.',ok:'Ya, Hapus',tone:'danger'}))return;PGD.riwayat=PGD.riwayat.filter(x=>x.id!==id);pgSave();renderPengumuman();}

/* ---------- database masjid ---------- */
function pgMasjidHtml(){
 const L=PGD.masjid.slice().sort((a,b)=>(a.kel+a.nama).localeCompare(b.kel+b.nama));
 const head=`<div class="flex flex-wrap items-center justify-between gap-2 mb-3"><p class="text-[12px] text-slate-500 max-w-xl">Nama masjid/madrasah per kelompok beserta alamat dan link Google Maps. Dipakai otomatis saat memilih tempat kegiatan.</p><button onclick="pgMasjidForm('')" class="u-btn primary">${icon('plus','w-4 h-4')} Tambah Masjid</button></div>`;
 if(!L.length)return head+emptyState('building-2','Belum ada data masjid','Tambahkan masjid atau madrasah tempat pengajian dilaksanakan.',[['Tambah masjid',"pgMasjidForm('')",'primary']]);
 return head+`<div class="u-card overflow-x-auto"><table class="w-full min-w-[720px] text-left text-sm"><thead class="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3">Kelompok</th><th class="px-4 py-3">Nama tempat</th><th class="px-4 py-3">Alamat</th><th class="px-4 py-3">Maps</th><th class="px-4 py-3 text-right">Aksi</th></tr></thead><tbody>${L.map(m=>`<tr class="border-t border-line"><td class="px-4 py-3 font-semibold">${esc(m.kel||'—')}</td><td class="px-4 py-3">${esc(m.nama)}</td><td class="px-4 py-3 text-slate-500">${esc(m.alamat||'—')}</td><td class="px-4 py-3">${m.maps?`<a href="${esc(m.maps)}" target="_blank" rel="noopener" class="font-bold text-blue-600 hover:underline">Buka peta</a>`:'<span class="text-slate-300">—</span>'}</td><td class="px-4 py-3"><div class="flex justify-end gap-1.5"><button onclick="pgMasjidForm('${esc(m.id)}')" class="u-btn" aria-label="Edit">${icon('pencil','w-4 h-4')}</button><button onclick="pgMasjidDel('${esc(m.id)}')" class="u-btn danger" aria-label="Hapus">${icon('trash-2','w-4 h-4')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function pgMasjidForm(id){
 const m=PGD.masjid.find(x=>x.id===id)||{id:'',kel:'',nama:'',alamat:'',maps:''};
 let kels=[];try{kels=(typeof kelompokList!=='undefined'?kelompokList:[]).map(k=>k.nama);}catch(e){}
 if(m.kel&&!kels.includes(m.kel))kels.push(m.kel);
 const inp='mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white',lb=t=>`<span class="text-xs font-bold text-slate-600">${t}</span>`;
 if(typeof kaWide==='function')kaWide(false);
 document.getElementById('modalTitle').textContent=id?'Edit Masjid':'Tambah Masjid';
 document.getElementById('modalDesc').textContent='Data tempat pengajian dan kegiatan';
 document.getElementById('modalBody').innerHTML=`<div class="space-y-4">
  <label class="block">${lb('Kelompok')}<select id="pmKel" class="${inp}"><option value="">— Pilih kelompok —</option>${kels.map(k=>`<option ${m.kel===k?'selected':''}>${esc(k)}</option>`).join('')}</select></label>
  <label class="block">${lb('Nama masjid / madrasah')}<input id="pmNama" value="${esc(m.nama)}" maxlength="80" class="${inp}" placeholder="Masjid Al-Hidayah"></label>
  <label class="block">${lb('Alamat')}<input id="pmAlamat" value="${esc(m.alamat)}" maxlength="160" class="${inp}" placeholder="Jl. ... RT/RW, Desa Karangmojo"></label>
  <label class="block">${lb('Link Google Maps')}<input id="pmMaps" value="${esc(m.maps)}" class="${inp}" placeholder="https://maps.app.goo.gl/..."><span class="block text-[11px] text-slate-400 mt-1">Kosongkan jika belum ada: link pencarian Maps dibuat otomatis dari nama dan alamat.</span></label>
  <p id="pmErr" class="text-xs font-semibold text-red-600 hidden"></p>
  <div class="flex justify-end gap-2 pt-1"><button type="button" onclick="closeModal()" class="u-btn">Batal</button><button type="button" onclick="pgMasjidSave('${esc(id)}')" class="u-btn primary">${icon('save','w-4 h-4')} Simpan</button></div></div>`;
 showModal();lucide.createIcons();
}
function pgMasjidSave(id){
 const g=x=>(document.getElementById(x).value||'').trim(),err=t=>{const e=document.getElementById('pmErr');e.textContent=t;e.classList.remove('hidden');};
 const o={kel:g('pmKel'),nama:g('pmNama'),alamat:g('pmAlamat'),maps:g('pmMaps')};
 if(!o.nama)return err('Nama masjid wajib diisi');
 if(o.maps&&!PG_MAPS_RX.test(o.maps))return err('Link harus dari Google Maps (maps.app.goo.gl atau google.com/maps)');
 if(id){const m=PGD.masjid.find(x=>x.id===id);if(m)Object.assign(m,o);}
 else PGD.masjid.push(Object.assign({id:'MJ'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)},o));
 if(!pgSave())return;closeModal();showToast('Data masjid tersimpan');renderPengumuman();
}
async function pgMasjidDel(id){
 const m=PGD.masjid.find(x=>x.id===id);if(!m)return;
 if(!await uiConfirm({title:'Hapus masjid?',message:'“'+m.nama+'” akan dihapus dari database. Pengumuman lama di riwayat tidak berubah.',ok:'Ya, Hapus',tone:'danger'}))return;
 PGD.masjid=PGD.masjid.filter(x=>x.id!==id);PGU.f&&PGU.f.tempat.forEach(t=>{if(t.mid===id)t.mid='';});pgSave();renderPengumuman();
}

/* ---------- kirim massal via Fonnte ---------- */
function pgSumber(){
 const src=[['desa','KMM Desa','muda-mudi-desa'],['kel','KMM Kelompok','muda-mudi-kelompok'],['mbl','Muballigh / Muballighot','mubaligh']];
 return src.map(s=>{let L=[];try{L=mmData(s[2])||[];}catch(e){}return {k:s[0],l:s[1],L:L};});
}
function pgSelOf(){return PGU.sel||(PGU.sel={src:['kel'],grp:[],kel:[],extra:''});}
function pgSelSave(){
 if(!document.getElementById('pgGo'))return pgSelOf();
 const q=c=>[...document.querySelectorAll(c+':checked')].map(x=>x.value);
 PGU.sel={src:q('.pgSrc'),grp:q('.pgGrp'),kel:q('.pgKel'),extra:(document.getElementById('pgExtra')||{}).value||''};
 return PGU.sel;
}
function pgPenerima(){
 const S=pgSelSave(),set=new Set();let tanpa=0;
 pgSumber().forEach(s=>{if(!S.src.includes(s.k))return;s.L.forEach(x=>{
  if(S.kel.length&&s.k!=='mbl'&&!S.kel.includes(x.k))return;
  const n=mmWaNorm(x.wa);if(n)set.add(n);else tanpa++;});});
 (PGD.grup||[]).forEach(g=>{if(S.grp.includes(g.id))set.add(g.target);});
 String(S.extra||'').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>{if(/@g\.us$/i.test(x))set.add(x);else{const n=mmWaNorm(x);if(n)set.add(n);}});
 return {list:[...set],tanpa:tanpa};
}
function pgHitung(){const r=pgPenerima(),e=document.getElementById('pgCount');if(e)e.innerHTML='<b>'+r.list.length+'</b> nomor / grup akan dikirimi'+(r.tanpa?' <span class="text-amber-700">• '+r.tanpa+' pengurus belum punya nomor WA valid</span>':'');}
function pgPreset(p){
 const S=pgSelSave(),g=PGD.grup||[];
 if(p==='generus'){S.src=[];S.grp=g.filter(x=>x.kat==='generus').map(x=>x.id);}
 else if(p==='pengurus'){S.src=['desa','kel'];S.grp=g.filter(x=>x.kat==='pengurus').map(x=>x.id);}
 else if(p==='gabungan'){S.src=['desa','kel'];S.grp=g.map(x=>x.id);}
 else{S.src=[];S.grp=[];S.kel=[];S.extra='';}
 pgKirimRender();
}
function pgGrupTambah(){
 const S=pgSelSave(),v=id=>((document.getElementById(id)||{}).value||'').trim();
 const nama=v('pgGNama'),kat=v('pgGKat')||'generus',t=v('pgGTgt');
 if(!nama){showToast('Isi nama grup / kontak dulu');return;}
 let target='';if(/@g\.us$/i.test(t))target=t;else target=mmWaNorm(t);
 if(!target){showToast('Isi nomor WA yang valid atau ID grup berakhiran @g.us');return;}
 const id='GR'+Date.now().toString(36);
 PGD.grup.push({id:id,nama:nama,kat:kat,target:target});S.grp.push(id);
 if(!pgSave())return;pgKirimRender();
}
function pgGrupHapus(id){
 const S=pgSelSave();PGD.grup=PGD.grup.filter(x=>x.id!==id);S.grp=S.grp.filter(x=>x!==id);pgSave();pgKirimRender();
}
function pgKirimRender(){
 const S=pgSelOf(),c=fonCfg(),inp='mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white';
 const chk=(cls,val,on,lab,extra)=>`<label class="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 cursor-pointer"><input type="checkbox" class="${cls}" value="${esc(val)}" onchange="pgHitung()" ${on?'checked':''}><span class="flex-1 text-sm font-bold">${lab}</span>${extra||''}</label>`;
 const src=pgSumber().map(s=>{const n=s.L.filter(x=>mmWaNorm(x.wa)).length;return chk('pgSrc',s.k,S.src.includes(s.k),s.l,`<span class="text-[11px] text-slate-400">${n} nomor</span>`);}).join('');
 const kels=(typeof kelompokList!=='undefined'?kelompokList:[]).map(k=>`<label class="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold cursor-pointer"><input type="checkbox" class="pgKel" value="${esc(k.nama)}" onchange="pgHitung()" ${S.kel.includes(k.nama)?'checked':''}>${esc(k.nama)}</label>`).join('');
 const katL={generus:'Generus',pengurus:'Pengurus',lain:'Lainnya'};
 const grp=(PGD.grup||[]).map(g=>chk('pgGrp',g.id,S.grp.includes(g.id),esc(g.nama),`<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">${katL[g.kat]||'Lainnya'}</span><button type="button" onclick="event.preventDefault();pgGrupHapus('${g.id}')" class="u-btn danger" aria-label="Hapus ${esc(g.nama)}">${icon('trash-2','w-4 h-4')}</button>`)).join('')||'<p class="text-[11px] text-slate-400">Belum ada grup. Tambahkan grup WhatsApp generus di bawah.</p>';
 const pre=(k,l)=>`<button type="button" onclick="pgPreset('${k}')" class="u-btn">${l}</button>`;
 document.getElementById('modalBody').innerHTML=`<div class="space-y-4">
  <div><span class="text-xs font-bold text-slate-600">Pilih sasaran cepat</span><div class="flex flex-wrap gap-2 mt-1.5">${pre('generus','Generus')}${pre('pengurus','Pengurus')}${pre('gabungan','Generus + Pengurus')}${pre('custom','Kosongkan (custom)')}</div></div>
  <div><span class="text-xs font-bold text-slate-600">Pengurus (nomor dari database)</span><div class="space-y-2 mt-1.5">${src}</div>
   ${kels?`<div class="mt-2"><span class="text-[11px] text-slate-500">Batasi kelompok (kosong = semua kelompok). Tidak berlaku untuk Muballigh.</span><div class="flex flex-wrap gap-1.5 mt-1.5">${kels}</div></div>`:''}</div>
  <div><span class="text-xs font-bold text-slate-600">Grup &amp; kontak tersimpan</span><div class="space-y-2 mt-1.5">${grp}</div>
   <div class="rounded-xl border border-line p-3 mt-2 bg-slate-50/60"><div class="grid sm:grid-cols-[1fr_130px] gap-2"><input id="pgGNama" placeholder="Nama grup, mis. Generus Ngamban Timur" class="${inp} !mt-0"><select id="pgGKat" class="${inp} !mt-0"><option value="generus">Generus</option><option value="pengurus">Pengurus</option><option value="lain">Lainnya</option></select></div>
   <input id="pgGTgt" placeholder="ID grup (…@g.us) atau nomor WA" class="${inp} !mt-2"><button type="button" onclick="pgGrupTambah()" class="u-btn mt-2">${icon('plus','w-4 h-4')} Simpan grup / kontak</button></div></div>
  <label class="block"><span class="text-xs font-bold text-slate-600">Nomor / ID grup tambahan sekali pakai (opsional)</span><textarea id="pgExtra" rows="3" oninput="pgHitung()" class="${inp}" placeholder="08123456789&#10;120363xxxxxxxxxx@g.us">${esc(S.extra)}</textarea><span class="block text-[11px] text-slate-400 mt-1">Pisahkan dengan baris baru atau koma.</span></label>
  <div class="rounded-xl bg-slate-50 border border-line p-3 text-[12px] text-slate-600"><div id="pgCount"></div><div class="mt-1 text-slate-400">Jeda antar pesan ${esc(c.delay)} detik supaya nomor pengirim tidak mudah diblokir WhatsApp.</div></div>
  <div id="pgProg" class="text-xs font-semibold text-slate-600 hidden"></div>
  <div class="flex justify-end gap-2 pt-1"><button type="button" onclick="closeModal()" class="u-btn">Tutup</button><button id="pgGo" type="button" onclick="pgKirim()" class="u-btn primary">${icon('send','w-4 h-4')} Kirim sekarang</button></div></div>`;
 lucide.createIcons();pgHitung();
}
function pgKirimBuka(){
 if(!pgOk())return;
 const c=fonCfg();
 if(!c.token){uiConfirm({title:'Fonnte belum diatur',message:'Masukkan token Fonnte di menu Pengaturan lebih dulu. Sementara itu Anda tetap bisa memakai Salin teks atau Buka WhatsApp.',ok:'Ke Pengaturan',cancel:'Nanti saja'}).then(ok=>{if(ok)navigate('pengaturan');});return;}
 if(typeof kaWide==='function')kaWide(false);
 document.getElementById('modalTitle').textContent='Kirim via Fonnte';
 document.getElementById('modalDesc').textContent='Pilih sasaran: generus, pengurus, gabungan, atau custom';
 showModal();pgKirimRender();
}
async function pgKirim(){
 const r=pgPenerima(),c=fonCfg();
 if(!r.list.length){showToast('Pilih minimal satu penerima atau isi nomor');return;}
 if(!await uiConfirm({title:'Kirim ke '+r.list.length+' nomor?',message:'Pesan akan dikirim lewat Fonnte dengan jeda '+c.delay+' detik per pesan. Pengiriman tidak bisa dibatalkan setelah dimulai.',ok:'Ya, Kirim'}))return;
 const go=document.getElementById('pgGo'),pr=document.getElementById('pgProg'),teks=pgTeks();
 go.disabled=true;pr.classList.remove('hidden');
 let ok=0,fail=0,msg='';
 for(let i=0;i<r.list.length;i+=20){
  const part=r.list.slice(i,i+20);pr.textContent='Mengirim '+Math.min(i+20,r.list.length)+' dari '+r.list.length+'…';
  try{
   const fd=new FormData();fd.append('target',part.join(','));fd.append('message',teks);fd.append('countryCode','62');fd.append('delay',c.delay);
   const res=await fetch('https://api.fonnte.com/send',{method:'POST',headers:{Authorization:c.token},body:fd}),j=await res.json();
   if(j&&j.status)ok+=part.length;else{fail+=part.length;msg=(j&&j.reason)||'Ditolak Fonnte';}
  }catch(e){fail+=part.length;msg='Tidak bisa terhubung ke Fonnte (periksa internet atau izin CORS browser)';}
 }
 pgSimpanDef();pgRiwayat({ok:ok,fail:fail});
 pr.innerHTML=(ok?'<span class="text-emerald-700">✔ '+ok+' nomor masuk antrean Fonnte.</span> ':'')+(fail?'<span class="text-red-600">✖ '+fail+' gagal: '+esc(msg)+'</span>':'');
 go.disabled=false;
}

/* ---------- Pengaturan: Fonnte ---------- */
function fonInject(){
 const nav=document.querySelector('.st-nav'),tiles=document.querySelector('.st-tiles'),wrap=document.querySelector('#stGem')&&document.getElementById('stGem').parentElement;
 if(!wrap||document.getElementById('stFon'))return;
 const c=fonCfg(),ok=!!c.token;
 if(nav){const b=document.createElement('button');b.type='button';b.setAttribute('onclick',"stGo('stFon',this)");b.innerHTML=icon('message-circle','w-[18px] h-[18px]')+'WhatsApp Fonnte';nav.appendChild(b);}
 if(tiles){const t=document.createElement('div');t.className='st-tile';t.innerHTML=`<span class="st-ico bg-emerald-50 text-emerald-700">${icon('message-circle','w-5 h-5')}</span><div class="min-w-0"><small>WhatsApp Fonnte</small><span id="fonTile" class="st-badge ${ok?'ok':''}"><i></i>${ok?'Token tersimpan':'Belum diatur'}</span></div>`;tiles.appendChild(t);}
 const s=document.createElement('section');s.id='stFon';s.className='st-sec';
 s.innerHTML=`<div class="st-sh"><h2>Pengiriman WhatsApp</h2><p>Kirim pengumuman dan undangan ke banyak nomor sekaligus lewat Fonnte.</p></div>
  <div class="st-card"><div class="st-cb">
   <p class="mb-5 text-[12.5px] leading-relaxed text-slate-500">Daftar di <a href="https://fonnte.com" target="_blank" rel="noopener" class="font-bold text-blue-600 hover:underline">fonnte.com</a>, hubungkan nomor WhatsApp pengirim (scan QR), lalu salin <b>token perangkat</b> dan tempel di bawah.</p>
   <div class="ak-grid">
    <label class="block"><span class="ak-lab">Token Fonnte</span><div class="ak-wrap"><input id="fonToken" type="password" autocomplete="off" value="${esc(c.token)}" placeholder="Token perangkat Fonnte" class="ak-in suf"><button type="button" class="ak-eye" aria-label="Tampilkan token" onclick="acEye('fonToken',this)">${icon('eye','w-4 h-4')}</button></div></label>
    <label class="block"><span class="ak-lab">Jeda antar pesan (detik)</span><div class="ak-wrap"><select id="fonDelay" class="ak-in">${['5-10','10-20','20-40'].map(v=>`<option value="${v}" ${c.delay===v?'selected':''}>${v} detik (acak)</option>`).join('')}</select></div></label></div>
   <div class="st-acts"><button onclick="fonSave()" class="u-btn primary">${icon('save','w-4 h-4')} Simpan</button><button onclick="fonTest()" class="u-btn">${icon('plug-zap','w-4 h-4')} Uji koneksi</button><button onclick="fonClear()" class="u-btn danger">Hapus token</button></div>
   <div class="st-note v">${icon('shield-check','w-4 h-4')}<span>Cukup isi <b>sekali saja</b>: token tersimpan di server dan otomatis terisi di semua perangkat setelah login. Token <b>tidak ikut file cadangan</b>. Jangan bagikan token ke orang lain. Jeda yang lebih panjang lebih aman dari pemblokiran WhatsApp.</span></div>
  </div></div>`;
 wrap.appendChild(s);
}
function fonSave(){
 const t=(document.getElementById('fonToken').value||'').trim(),d=document.getElementById('fonDelay').value;
 if(!t){showToast('Masukkan token Fonnte');return;}
 try{localStorage.setItem(FON_KEY,JSON.stringify({token:t,delay:d}));}catch(e){showToast('Gagal menyimpan');return;}
 showToast('Pengaturan Fonnte tersimpan di server (cukup sekali)');renderPengaturan();
 try{window.simdekaFlush&&window.simdekaFlush();}catch(e){}
}
async function fonClear(){if(!await uiConfirm({title:'Hapus token Fonnte?',message:'Kirim massal tidak bisa dipakai sampai token baru disimpan.',ok:'Ya, Hapus',tone:'danger'}))return;try{localStorage.removeItem(FON_KEY);}catch(e){}showToast('Token dihapus (dari server dan semua perangkat)');renderPengaturan();try{window.simdekaFlush&&window.simdekaFlush();}catch(e){}}
async function fonTest(){
 const t=(document.getElementById('fonToken').value||'').trim();if(!t){showToast('Masukkan token Fonnte');return;}
 try{const r=await fetch('https://api.fonnte.com/device',{method:'POST',headers:{Authorization:t}}),j=await r.json();
  if(j&&j.status)showToast('Terhubung'+(j.device_status?' • perangkat '+j.device_status:''));else showToast((j&&j.reason)||'Token ditolak Fonnte');
 }catch(e){showToast('Tidak bisa terhubung ke Fonnte (periksa internet atau izin CORS browser)');}
}

/* ---------- tautan ke kalender Absensi Pengajian ---------- */
function pgDariJadwal(iso,jn){
 closeModal();PGU.manual=null;PGU.f=pgBaru(jn==='desa'||jn==='daerah'?jn:'kelompok');PGU.f.tgl=iso;PGU.tab='buat';navigate('pengumuman');
}
(function(){
 const _ra=renderAbsensiKmm;
 renderAbsensiKmm=function(){
  _ra.apply(this,arguments);
  try{const a=document.querySelector('.ka-toolbar .u-actions');if(a&&!a.querySelector('[data-pg]')){const b=document.createElement('button');b.className='u-btn';b.dataset.pg='1';b.setAttribute('onclick',"PGU.tab='buat';PGU.f=null;navigate('pengumuman')");b.innerHTML=icon('megaphone','w-4 h-4')+' Pengumuman';a.insertBefore(b,a.firstChild);lucide.createIcons();}}catch(e){}
 };
 const _kp=kaPanel;
 kaPanel=function(y,m,keep){
  _kp.apply(this,arguments);
  try{
   const S=kaSesi(y,m).filter(x=>x.st!=='libur'),box=document.querySelector('#modalBody > div');
   if(!S.length||!box)return;
   const fmt=iso=>{const p=iso.split('-').map(Number);return PG_HARI[new Date(p[0],p[1]-1,p[2]).getDay()].slice(0,3)+', '+p[2]+' '+PG_BLN[p[1]-1].slice(0,3);};
   const d=document.createElement('div');d.className='rounded-2xl border border-line p-4';
   d.innerHTML=`<div class="flex items-center gap-2 mb-1 text-sm font-extrabold">${icon('megaphone','w-4 h-4')} Buat pengumuman dari jadwal</div><p class="text-[11px] text-slate-400 mb-2.5">Pilih pengajian untuk membuat teks pengumuman dengan tanggal terisi otomatis.</p><div class="flex flex-wrap gap-1.5">${S.map(x=>`<button type="button" onclick="pgDariJadwal('${x.tgl}','${x.jn}')" class="px-3 h-9 rounded-xl text-xs font-bold border border-line bg-white text-slate-700 hover:border-navy">${esc(fmt(x.tgl))} • ${esc(kaJnLabel(x.jn))}</button>`).join('')}</div>`;
   box.appendChild(d);lucide.createIcons();
  }catch(e){}
 };
 const _rp=renderPengaturan;
 renderPengaturan=function(){_rp.apply(this,arguments);try{fonInject();lucide.createIcons();}catch(e){}};
})();


