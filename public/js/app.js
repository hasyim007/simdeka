
/* ===== Dialog modern: uiConfirm / uiAlert (menggantikan confirm/alert bawaan) ===== */
(function(){
 const ICON={primary:'help-circle',success:'calendar-plus',danger:'trash-2',warning:'alert-triangle',info:'info'};
 let cur=null;
 const $=id=>document.getElementById(id);
 function paint(name){
  const old=$('udIco'); if(!old)return;
  const el=document.createElement('i'); el.id='udIco'; el.setAttribute('data-lucide',name);
  old.replaceWith(el); if(window.lucide)lucide.createIcons();
 }
 function close(val){
  if(!cur)return; const c=cur; cur=null;
  const d=$('uiDlg'); d.classList.remove('show');
  document.removeEventListener('keydown',c.key,true);
  setTimeout(()=>{d.classList.remove('on'); if(c.prev&&c.prev.focus)try{c.prev.focus()}catch(e){}},200);
  c.res(val);
 }
 window.uiDialog=function(o){
  o=o||{};
  return new Promise(res=>{
   if(cur)close(false);
   const d=$('uiDlg'), tone=o.tone||'primary';
   d.dataset.tone=(tone==='info'?'primary':tone);
   $('udTitle').textContent=o.title||'Konfirmasi';
   $('udMsg').textContent=o.message||'';
   $('udOk').textContent=o.ok||'Oke';
   const no=$('udNo'); no.textContent=o.cancel||'Batal'; no.style.display=o.alertOnly?'none':'';
   d.querySelector('.ud-hint').style.display=o.alertOnly?'none':'';
   paint(o.icon||ICON[tone]||'help-circle');
   const key=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(o.alertOnly?true:false);}
    else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();close(true);}
    else if(e.key==='Tab'){ // fokus tetap di dalam dialog
     const b=o.alertOnly?[$('udOk')]:[no,$('udOk')], i=b.indexOf(document.activeElement);
     e.preventDefault(); b[(i+(e.shiftKey?-1:1)+b.length)%b.length].focus();
    }
   };
   cur={res,key,prev:document.activeElement,alertOnly:!!o.alertOnly};
   document.addEventListener('keydown',key,true);
   d.classList.add('on'); void d.offsetWidth; d.classList.add('show');
   setTimeout(()=>$('udOk').focus(),30);
  });
 };
 const bg=document.querySelector('#uiDlg .ud-bg');
 bg.addEventListener('click',()=>close(cur&&cur.alertOnly?true:false));
 $('udNo').addEventListener('click',()=>close(false));
 $('udOk').addEventListener('click',()=>close(true));
 window.uiConfirm=function(o){return window.uiDialog(typeof o==='string'?{message:o}:o);};
 window.uiAlert=function(m,o){return window.uiDialog(Object.assign({title:'Perhatian',message:String(m==null?'':m),ok:'Mengerti',tone:'warning',icon:'info',alertOnly:true},o||{}));};
 window.alert=function(m){window.uiAlert(m);};
})();

;

/* ===== DATA KELOMPOK (master) ===== */
const STORE_KEY='simdeka_kelompok_v2', STORE_GK='sidesa_kelompok_v1_gk';
const defaultKelompok=[]; // sengaja kosong: tambahkan kelompok lewat menu Kelompok
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normNama(s){return String(s||'').replace(/\s+/g,' ').trim();}
function loadKelompok(){
  if(window.ME && !['super_admin','admin_desa'].includes(window.ME.role)) return [];
  try{
    const raw=localStorage.getItem(STORE_KEY);
    if(raw){
      const a=JSON.parse(raw);
      if(Array.isArray(a)) return a.filter(x=>x&&normNama(x.nama)).map(x=>({id:String(x.id),nama:normNama(x.nama),ketua:String(x.ketua||''),pengurus:Number(x.pengurus)||0,generus:Number(x.generus)||0,status:'Aktif'}));
    }
  }catch(e){}
  return defaultKelompok.map(x=>({...x}));
}
let kelompokList=loadKelompok();
function saveKelompok(){
  try{
    localStorage.setItem(STORE_KEY,JSON.stringify(kelompokList));
    const map={}; generus.forEach(g=>{map[g.id]=g.kelompok;});
    localStorage.setItem(STORE_GK,JSON.stringify(map));
  }catch(e){showToast('Penyimpanan penuh — data tidak tersimpan');}
}
function applySavedGenerusKelompok(){
  try{const map=JSON.parse(localStorage.getItem(STORE_GK)||'null'); if(map) generus.forEach(g=>{if(typeof map[g.id]==='string') g.kelompok=map[g.id];});}catch(e){}
}
function activeGroups(){return kelompokList.filter(k=>k.status==='Aktif').map(k=>k.nama);}
function gname(i){const a=activeGroups();return a.length?a[i%a.length]:'—';}
function usedCount(k){return generus.filter(g=>g.kelompok===k.nama).length;}
function usedCountAll(k){return usedCount(k)+['muda-mudi-desa','muda-mudi-kelompok','mubaligh'].reduce((n,t)=>n+mmData(t).filter(x=>x.k===k.nama).length,0);}
/* ===== DATABASE GENERUS — struktur kolom mengikuti Excel Desa Karangmojo ===== */
const GEN_KEY='simdeka_generus_v3';
const GEN_SEED_ROWS=[]; // sengaja kosong: aplikasi mulai tanpa data
function genBlank(){return {id:'',nama:'',jk:'',status:'',kelompok:'',tempat:'',tgl:'',usia:'',smp:'',sma:'',univ:'',kelas:'',pend:'',kerja:'',ayah:'',ayahSt:'',ibu:'',ibuSt:'',cat:''};}
function genClean(x){const b=genBlank();for(const k in b){b[k]=x&&x[k]!=null?String(x[k]).trim():'';}return b;}
const GEN_FIELDS=['nama','jk','status','kelompok','tempat','tgl','smp','sma','univ','kelas','pend','kerja','ayah','ayahSt','ibu','ibuSt','cat'];
function genSeed(){return GEN_SEED_ROWS.map((r,i)=>{const o={id:'G-'+String(i+1).padStart(3,'0')};GEN_FIELDS.forEach((k,j)=>{o[k]=r[j]||'';});return genClean(o);});}
function genLoad(){
  if(window.ME && !['super_admin','admin_desa'].includes(window.ME.role)) return [];
  try{
    const a=JSON.parse(localStorage.getItem(GEN_KEY));
    if(Array.isArray(a)){
      const seen=new Set(),out=[];
      a.forEach(x=>{const g=genClean(x);if(g.nama&&g.id&&!seen.has(g.id)){seen.add(g.id);out.push(g);}});
      return out;
    }
  }catch(e){}
  return genSeed();
}
const generus = genLoad();
function saveGenerus(){try{localStorage.setItem(GEN_KEY,JSON.stringify(generus));}catch(e){showToast('Penyimpanan penuh — data tidak tersimpan');}}

/* ===== NAVIGASI: nama pendek, dikelompokkan ===== */
const navGroups = [
  {label:'', items:[['dashboard','layout-dashboard','Dashboard']]},
  {label:'Pengurus', items:[
    ['muda-mudi-desa','heart-handshake','KMM Desa'],
    ['muda-mudi-kelompok','users-round','KMM Kelompok'],
    ['mubaligh','graduation-cap','Muballigh'],
    ['musyawarah','book-open','Musyawarah'],
    ['absensi-kmm','calendar-check','Absensi Pengajian'],
    ['pengumuman','megaphone','Pengumuman']
  ]},
  {label:'Data', items:[
    ['kelompok','network','Kelompok'],
    ['generus','sprout','Data Generus'],
    ['form','clipboard-list','Form']
  ]},
  {label:'Sistem', items:[
    ['laporan','bar-chart-3','Laporan'],
    ['ganti-password','user-round-cog','Akun Saya'],
    ['pengaturan','settings','Pengaturan']
  ]}
];
/* Izin menu per akun: ME.menus = daftar menu yang dibuka (null = semua). Dashboard & Akun Saya selalu ada; Pengaturan hanya Super Admin. */
const MENU_ROLES_UI=['admin_desa','admin_kelompok'];
function menuAllowed(page){
 const m=window.ME;
 if(!m)return true;
 if(page==='pengaturan')return m.role==='super_admin';
 if(page==='dashboard'||page==='ganti-password')return true;
 if(!MENU_ROLES_UI.includes(m.role)||!Array.isArray(m.menus))return true;
 return m.menus.includes(page);
}
(function(){
 navGroups.forEach(g=>{g.items=g.items.filter(i=>menuAllowed(i[0]));});
 for(let i=navGroups.length-1;i>=0;i--)if(!navGroups[i].items.length)navGroups.splice(i,1);
 document.querySelectorAll('.bottom-item').forEach(b=>{if(!menuAllowed(b.dataset.page))b.remove();});
 const bn=document.querySelector('.mobile-nav .grid');if(bn)bn.style.gridTemplateColumns='repeat('+bn.children.length+',minmax(0,1fr))';
})();
const menuItems = navGroups.flatMap(g=>g.items);
const groupOf = {};
navGroups.forEach(g=>g.items.forEach(i=>{groupOf[i[0]]=g.label;}));

function navMarkup(mobile) {
  return navGroups.map(g=>
    (g.label?`<div class="nav-label">${g.label}</div>`:'') +
    g.items.map(([page,ic,label])=>
      `<button data-page="${page}" class="nav-item nav-btn${page==='dashboard'?' active':''}"><i data-lucide="${ic}" class="w-[18px] h-[18px]"></i><span>${label}</span></button>`
    ).join('')
  ).join('') + (mobile
    ? `<div class="pt-3 mt-3 border-t border-line"><button onclick="logout()" class="nav-btn" style="color:#ef4444"><i data-lucide="log-out" class="w-[18px] h-[18px]"></i><span>Keluar</span></button></div>`
    : '');
}
document.getElementById('mobileNav').innerHTML = navMarkup(true);
document.getElementById('desktopNav').innerHTML = navMarkup(false);

const titles = {
  dashboard:'Dashboard', kelompok:'Kelompok',
  'muda-mudi-desa':'KMM Desa', 'muda-mudi-kelompok':'KMM Kelompok', mubaligh:'Muballigh', 'absensi-kmm':'Absensi Pengajian', musyawarah:'Musyawarah KMM Desa', pengumuman:'Pengumuman & Undangan',
  generus:'Data Generus', form:'Form', laporan:'Laporan', 'ganti-password':'Akun Saya', pengaturan:'Pengaturan'
};

/* ===== KOMPONEN UI BERSAMA (dipakai semua halaman) ===== */
function pageHead(desc, actions){
  return `<div class="u-head"><p class="u-desc">${desc||''}</p>${actions||''}</div>`;
}
/* p = {label,fn,ic} tombol utama; items = [[ikon,label,fn,'danger'?] | '-'] menu "Lainnya" */
function pageActions(p, items, extra){
  const prim = p ? `<button onclick="${p.fn}" class="u-btn primary">${icon(p.ic||'plus','w-4 h-4')} ${p.label}</button>` : '';
  const menu = (items&&items.length) ? `<details class="u-menu"><summary class="u-btn" aria-label="Aksi lainnya">${icon('more-horizontal','w-4 h-4')} Lainnya</summary><div class="u-menu-p">${items.map(it=>it==='-'
    ? '<div class="u-menu-sep"></div>'
    : `<button type="button" onclick="${it[2]}" class="u-menu-i${it[3]==='danger'?' danger':''}">${icon(it[0],'w-4 h-4')}<span>${it[1]}</span></button>`).join('')}</div></details>` : '';
  return `<div class="u-actions">${extra||''}${menu}${prim}</div>`;
}
function uSearch(id, val, oninput, ph){
  return `<label class="u-search">${icon('search','w-4 h-4')}<input ${id?`id="${id}" `:''}type="search" value="${esc(val||'')}" oninput="${oninput}" placeholder="${esc(ph||'Cari...')}" autocomplete="off" aria-label="${esc(ph||'Cari')}"></label>`;
}
/* options: [[value,label],...]; cur: nilai terpilih */
function uSel(onchange, allLabel, options, cur, id){
  return `<select ${id?`id="${id}" `:''}onchange="${onchange}" class="u-sel" aria-label="${esc(allLabel)}"><option value="">${esc(allLabel)}</option>${options.map(o=>`<option value="${esc(o[0])}"${String(o[0])===String(cur||'')?' selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
}
/* acts: [[label,fn,'primary'|'ghost']] */
function emptyState(ic, title, desc, acts){
  return `<div class="u-empty"><div class="ei">${icon(ic,'w-7 h-7')}</div><h3>${title}</h3><p>${desc}</p>${acts&&acts.length?`<div class="ea">${acts.map(a=>`<button type="button" onclick="${a[1]}" class="u-btn${a[2]==='primary'?' primary':''}">${a[0]}</button>`).join('')}</div>`:''}</div>`;
}
/* items: [{v,label,n}], fn: nama fungsi yang menerima nilai */
function kchips(items, cur, fn){
  return `<div class="kchips" role="tablist">${items.map(it=>`<button type="button" role="tab" aria-selected="${it.v===cur}" data-v="${esc(it.v)}" onclick="${fn}(this.dataset.v)" class="kchip${it.v===cur?' on':''}">${esc(it.label)} <i>${it.n}</i></button>`).join('')}</div>`;
}
function rowSkip(e){ return !!(e.target.closest && e.target.closest('button,a,input,label,select,summary,textarea')); }
function detailActions(edit, del){
  return `<div class="flex flex-wrap justify-end gap-2 pt-2"><button type="button" onclick="closeModal()" class="u-btn">Tutup</button><button type="button" onclick="${edit}" class="u-btn">${icon('pencil','w-4 h-4')} Edit</button><button type="button" onclick="${del}" class="u-btn danger">${icon('trash-2','w-4 h-4')} Hapus</button></div>`;
}

function money(n){ return new Intl.NumberFormat('id-ID').format(n); }
function icon(name, cls='w-5 h-5'){ return `<i data-lucide="${name}" class="${cls}"></i>`; }

function statCard(label,value,sub,iconName,theme='blue'){
  const themes = {
    blue:['bg-blue-50','text-blue-700'], green:['bg-emerald-50','text-emerald-600'],
    orange:['bg-amber-50','text-amber-600'], purple:['bg-violet-50','text-violet-600']
  };
  const t=themes[theme]||themes.blue;
  return `<div class="bg-white rounded-2xl border border-line p-5 shadow-card">
    <div class="flex items-start justify-between">
      <div><p class="text-xs font-semibold text-slate-400">${label}</p><div class="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight">${value}</div><p class="text-[11px] text-slate-400 mt-1">${sub}</p></div>
      <div class="w-11 h-11 rounded-2xl ${t[0]} ${t[1]} grid place-items-center">${icon(iconName,'w-5 h-5')}</div>
    </div>
  </div>`;
}

function renderDashboard(){
  document.getElementById('content').innerHTML = `
  <div class="max-w-[1500px] mx-auto fade">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div><h2 class="text-2xl font-extrabold tracking-tight">Selamat datang kembali 👋</h2><p class="text-sm text-slate-500 mt-1">Ringkasan data kepengurusan dan generus terkini.</p></div>
      <button onclick="openAddModal('generus')" class="u-btn primary">${icon('plus','w-4 h-4')} Tambah Generus</button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      ${statCard('Total Kelompok',String(activeGroups().length),'Kelompok aktif','network','green')}
      ${statCard('KMM Desa',String(mmData('muda-mudi-desa').length),'Data terdaftar', 'heart-handshake','orange')}
      ${statCard('Total Generus',String(generus.length),'Semua kategori', 'sprout','purple')}
    </div>

    <div class="grid xl:grid-cols-[1.4fr_.8fr] gap-5 mt-5">
      <div class="bg-white rounded-2xl border border-line p-5 shadow-card">
        <div class="flex items-center justify-between mb-4"><div><h3 class="font-extrabold">Sebaran Generus per Kelompok</h3><p class="text-xs text-slate-400 mt-1">Jumlah generus tiap kelompok berdasarkan kategori</p></div><button onclick="navigate('generus')" class="text-xs font-bold text-navy">Lihat detail</button></div>
        <div class="h-[270px]"><canvas id="generusChart"></canvas></div>
      </div>
      <div class="bg-white rounded-2xl border border-line p-5 shadow-card">
        <div class="flex items-center justify-between mb-5"><div><h3 class="font-extrabold">Komposisi Kategori</h3><p class="text-xs text-slate-400 mt-1">Pra Remaja, Remaja, dan Muda-Mudi</p></div>${icon('more-horizontal','w-4 text-slate-400')}</div>
        <div class="space-y-5">${(()=>{const T=generus.length||1;return [['Pra Remaja','bg-emerald-500'],['Remaja','bg-amber-400'],['Muda-Mudi','bg-violet-500']].map(([s,c])=>{const n=generus.filter(g=>g.status===s).length;return `<div><div class="flex justify-between text-sm mb-2"><span class="font-semibold">${s}</span><b>${n}</b></div><div class="h-2.5 rounded-full bg-slate-100"><div class="h-full rounded-full ${c}" style="width:${Math.round(n/T*100)}%"></div></div></div>`;}).join('');})()}</div>
        <div class="mt-8 grid grid-cols-2 gap-3">${(()=>{const T=generus.length||1,l=generus.filter(g=>g.jk==='Laki-laki').length,p=generus.filter(g=>g.jk==='Perempuan').length;return `<div class="rounded-xl bg-blue-50 p-4"><div class="text-2xl font-extrabold text-blue-700">${l}</div><div class="text-[11px] text-blue-700/70 mt-1">Laki-laki (${Math.round(l/T*100)}%)</div></div><div class="rounded-xl bg-pink-50 p-4"><div class="text-2xl font-extrabold text-pink-600">${p}</div><div class="text-[11px] text-pink-600/70 mt-1">Perempuan (${Math.round(p/T*100)}%)</div></div>`;})()}</div>
      </div>
    </div>

    <div class="grid xl:grid-cols-2 gap-5 mt-5">
      <div class="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
        <div class="p-5 flex justify-between items-center"><div><h3 class="font-extrabold">Generus Terbaru</h3><p class="text-xs text-slate-400 mt-1">Data yang baru ditambahkan</p></div><button onclick="navigate('generus')" class="text-xs text-navy font-bold">Lihat semua</button></div>
        <div class="divide-y divide-line">${generus.slice(-4).reverse().map(g=>`
          <div class="px-5 py-3.5 flex items-center gap-3">
            
            <div class="flex-1 min-w-0"><div class="text-sm font-bold truncate">${esc(g.nama)}</div><div class="text-[11px] text-slate-400">${esc(g.status)} • ${esc(g.kelompok)}</div></div>
            <span class="px-2 py-1 rounded-lg text-[10px] font-bold ${genStCls(g.status)}">${genUsia(g)!==''?genUsia(g)+' th':'—'}</span>
          </div>`).join('')}</div>
      </div>
      <div class="bg-white rounded-2xl border border-line shadow-card p-5">
        <div class="flex items-center justify-between"><div><h3 class="font-extrabold">Ringkasan Kelompok</h3><p class="text-xs text-slate-400 mt-1">Jumlah generus per kelompok</p></div>${icon('arrow-up-right','w-4 text-slate-400')}</div>
        ${(()=>{const a=kelompokList.filter(k=>k.status==='Aktif');
          if(!a.length) return `<div class="mt-5 text-sm text-slate-400 border border-dashed border-line rounded-xl p-6 text-center">Belum ada kelompok aktif. <button onclick="navigate('kelompok')" class="text-navy font-bold">Tambah kelompok</button></div>`;
          return `<div class="grid grid-cols-2 gap-3 mt-5">${a.slice(0,6).map(k=>`
          <div class="border border-line rounded-xl p-4"><div class="text-xs font-bold text-slate-500 truncate">${esc(k.nama)}</div><div class="text-2xl font-extrabold mt-2">${usedCount(k)}</div><div class="text-[10px] text-slate-400 mt-1">generus</div></div>`).join('')}</div>${a.length>6?`<button onclick="navigate('kelompok')" class="mt-4 text-xs font-bold text-navy">Lihat semua ${a.length} kelompok</button>`:''}`;})()}
      </div>
    </div>
  </div>`;
  setTimeout(()=> {
    const a=activeGroups(), S=[['Pra Remaja','#18A66A'],['Remaja','#F59E0B'],['Muda-Mudi','#7C3AED']], cv=document.getElementById('generusChart');
    if(cv&&window.Chart) new Chart(cv,{type:'bar',data:{labels:a,datasets:S.map(([s,c])=>({label:s,data:a.map(k=>generus.filter(g=>g.kelompok===k&&g.status===s).length),backgroundColor:c,borderRadius:6,maxBarThickness:38}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8}}},scales:{x:{stacked:true,grid:{display:false},ticks:{color:'#94a3b8'}},y:{stacked:true,beginAtZero:true,grid:{color:'#eef2f7'},ticks:{color:'#94a3b8',precision:0}}}}});
    lucide.createIcons();
  },20);
}

function toolbar(addType, importText='Import Excel'){
 return `<div class="u-bar" style="padding:0 0 14px">
   ${uSearch('tableSearch','','filterTable()','Cari data...')}
   <select id="filterKelompok" onchange="filterTable()" class="u-sel"><option value="">Semua kelompok</option>${kelompokList.map(k=>`<option value="${esc(k.nama)}">${esc(k.nama)}</option>`).join('')}</select>
   <span class="flex-1"></span>
   <button onclick="showToast('Template Excel diunduh')" class="u-btn">${icon('file-spreadsheet','w-4 h-4')} Template Excel</button>
   <button onclick="openImportModal()" class="u-btn">${icon('upload','w-4 h-4')} ${importText}</button>
 </div>`;
}

/* ===== DATABASE GENERUS: tabel modern (19 kolom sesuai Excel) ===== */
const GEN_HEAD=['No','Nama Lengkap','Kelompok','Jenis Kelamin','Tempat Lahir','Tanggal Lahir','Usia','Status','Pendidikan Terakhir','SMP','SMA/SMK','UNIVERSITAS','STATUS KELAS PENDIDIKAN','Pekerjaan','Nama Ayah','Status Ayah','Nama Ibu','Status Ibu','Catatan SB'];
const GEN_ST=['Pra Remaja','Remaja','Muda-Mudi'];
const GEN_PEND=['SD','SMP','SMA/SMK','Diploma 3','Sarjana','Magister'];
const GEN_ORTU=["Jama'ah","Belum Jama'ah",'Almarhum'];
const GEN_COLS=[
 {k:'no',l:'No',w:52,fixed:1},
 {k:'nama',l:'Nama Lengkap',w:230,fixed:1},
 {k:'kelompok',l:'Kelompok',w:140},
 {k:'jk',l:'Jenis Kelamin',w:125},
 {k:'tempat',l:'Tempat Lahir',w:140},
 {k:'tgl',l:'Tanggal Lahir',w:155},
 {k:'usia',l:'Usia',w:85},
 {k:'status',l:'Status',w:125},
 {k:'pend',l:'Pendidikan Terakhir',w:150},
 {k:'smp',l:'SMP',w:160},
 {k:'sma',l:'SMA/SMK',w:160},
 {k:'univ',l:'UNIVERSITAS',w:190},
 {k:'kelas',l:'Status Kelas Pendidikan',w:200},
 {k:'kerja',l:'Pekerjaan',w:140},
 {k:'ayah',l:'Nama Ayah',w:150},
 {k:'ayahSt',l:'Status Ayah',w:135},
 {k:'ibu',l:'Nama Ibu',w:150},
 {k:'ibuSt',l:'Status Ibu',w:135},
 {k:'cat',l:'Catatan SB',w:240}
];
const GEN_COLS_KEY='simdeka_generus_cols_v1';
function genHideLoad(){try{const raw=localStorage.getItem(GEN_COLS_KEY);if(raw===null)return ['tempat','tgl','smp','sma','univ','kelas','kerja','ayah','ayahSt','ibu','ibuSt','cat'];const a=JSON.parse(raw||'[]');return Array.isArray(a)?a.filter(k=>GEN_COLS.some(c=>c.k===k&&!c.fixed)):[];}catch(e){return [];}}
let gs={q:'',kel:'',st:'',jk:'',pend:'',sk:'no',dir:1,page:1,size:25,dense:false,hide:genHideLoad()};


/* ===== Ringkasan statistik generus (modal) ===== */
const GEN_PEND_LV=['SD','SMP','SMA/SMK','Diploma 3','Sarjana','Magister'];
function genStatCalc(kel){
 const L=generus.filter(g=>!kel||g.kelompok===kel),n=L.length;
 const ages=L.map(genUsia).filter(u=>u!==''&&u!==null&&!isNaN(u)).sort((a,b)=>a-b);
 const sum=a=>a.reduce((x,y)=>x+y,0),med=a=>a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):null;
 const bands=[['<13',0,12],['13–15',13,15],['16–18',16,18],['19–24',19,24],['25+',25,200]].map(b=>[b[0],ages.filter(u=>u>=b[1]&&u<=b[2]).length]);
 const lv=L.map(g=>GEN_PEND_LV.indexOf(g.pend)).filter(i=>i>=0);
 const pc=GEN_PEND_LV.map((p,i)=>[p,lv.filter(x=>x===i).length]);
 const modus=pc.slice().sort((a,b)=>b[1]-a[1])[0];
 const meanLv=lv.length?sum(lv)/lv.length:null;
 const lk=L.filter(g=>g.jk==='Laki-laki').length,pr=L.filter(g=>g.jk==='Perempuan').length;
 const st=GEN_ST.map(s=>[s,L.filter(g=>g.status===s).length]);
 const kl={};L.forEach(g=>{if(g.kelompok)kl[g.kelompok]=(kl[g.kelompok]||0)+1;});
 const fill=f=>n?Math.round(L.filter(f).length/n*100):0;
 return {n,ages,bands,min:ages[0],max:ages[ages.length-1],avg:ages.length?sum(ages)/ages.length:null,med:med(ages),pc,modus:modus&&modus[1]?modus[0]:null,meanLv,nlv:lv.length,lk,pr,st,kl:Object.entries(kl).sort((a,b)=>b[1]-a[1]),
  fill:{tgl:fill(g=>g.tgl||g.usia),jk:fill(g=>g.jk),pend:fill(g=>g.pend)}};
}
function genStatBar(rows,max,color,sfx){sfx=sfx||'';return rows.map(r=>`<div class="flex items-center gap-2 text-[12px] py-[3px]"><span class="w-[74px] shrink-0 text-slate-500 truncate">${esc(r[0])}</span><div class="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div style="width:${max?Math.round(r[1]/max*100):0}%;background:${color}" class="h-full rounded-full"></div></div><b class="w-9 text-right text-slate-700">${r[1]}${sfx}</b></div>`).join('');}
function genStatOpen(){
 const ks=[...new Set(generus.map(g=>g.kelompok).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
 upModal('Ringkasan Generus','Gambaran umum data generus. Pilih kelompok untuk melihat ringkasan per kelompok.',
 `<div class="flex items-center gap-2 mb-4"><select id="genStKel" onchange="genStatRender()" class="u-sel"><option value="">Semua kelompok</option>${ks.map(k=>`<option>${esc(k)}</option>`).join('')}</select></div><div id="genStBody"></div>`);
 genStatRender();
}
function genStatRender(){
 const kel=(document.getElementById('genStKel')||{}).value||'',S=genStatCalc(kel),el=document.getElementById('genStBody');if(!el)return;
 if(!S.n){el.innerHTML='<p class="text-sm text-slate-500 py-8 text-center">Belum ada data generus.</p>';return;}
 const f1=x=>x==null?'—':(Math.round(x*10)/10).toString().replace('.',','),pct=x=>S.n?Math.round(x/S.n*100):0;
 const card=(ttl,ic,body)=>`<div class="rounded-2xl border border-line bg-white p-4"><div class="flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase text-slate-400 mb-3">${icon(ic,'w-3.5 h-3.5')}${ttl}</div>${body}</div>`;
 const mx=a=>Math.max(1,...a.map(r=>r[1]));
 const lvLbl=S.meanLv==null?'—':GEN_PEND_LV[Math.min(GEN_PEND_LV.length-1,Math.round(S.meanLv))];
 const lkp=S.lk+S.pr?Math.round(S.lk/(S.lk+S.pr)*100):0;
 el.innerHTML=`<div class="grid gap-3 sm:grid-cols-2">
  ${card('Rentang usia','calendar-range',`<div class="flex items-end gap-2"><span class="text-3xl font-extrabold text-slate-800 leading-none">${S.min!=null?S.min+'–'+S.max:'—'}</span><span class="text-sm text-slate-400 pb-0.5">tahun</span></div><div class="text-xs text-slate-500 mt-1 mb-3">Rata-rata <b class="text-slate-700">${f1(S.avg)}</b> • Median <b class="text-slate-700">${f1(S.med)}</b> • ${S.ages.length} data usia</div>${genStatBar(S.bands,mx(S.bands),'#6366f1')}`)}
  ${card('Pendidikan terakhir','graduation-cap',`<div class="flex items-end gap-2"><span class="text-3xl font-extrabold text-slate-800 leading-none">${esc(lvLbl)}</span><span class="text-sm text-slate-400 pb-0.5">rata-rata</span></div><div class="text-xs text-slate-500 mt-1 mb-3">Terbanyak: <b class="text-slate-700">${esc(S.modus||'—')}</b> • ${S.nlv} data terisi</div>${genStatBar(S.pc,mx(S.pc),'#f59e0b')}`)}
  ${card('Laki-laki &amp; perempuan','users',`<div class="flex items-end justify-between"><div><div class="text-3xl font-extrabold text-slate-800 leading-none">${S.lk}</div><div class="text-xs text-slate-500 mt-1">Laki-laki (${lkp}%)</div></div><div class="text-right"><div class="text-3xl font-extrabold text-slate-800 leading-none">${S.pr}</div><div class="text-xs text-slate-500 mt-1">Perempuan (${S.lk+S.pr?100-lkp:0}%)</div></div></div><div class="flex h-2 rounded-full overflow-hidden bg-slate-100 mt-3"><div style="width:${lkp}%;background:#3b82f6"></div><div style="width:${S.lk+S.pr?100-lkp:0}%;background:#ec4899"></div></div>${S.n-S.lk-S.pr?`<div class="text-[11px] text-slate-400 mt-2">${S.n-S.lk-S.pr} data belum diisi jenis kelaminnya</div>`:''}`)}
  ${card('Kategori generus','sprout',`<div class="text-xs text-slate-500 mb-2">Total <b class="text-slate-700">${S.n}</b> generus</div>${genStatBar(S.st,mx(S.st),'#10b981')}`)}
  ${kel?'':card('Per kelompok','network',S.kl.length?genStatBar(S.kl.slice(0,6),mx(S.kl),'#0ea5e9')+(S.kl.length>6?`<div class="text-[11px] text-slate-400 mt-1">+${S.kl.length-6} kelompok lainnya</div>`:''):'<p class="text-xs text-slate-400">Belum ada data kelompok.</p>')}
  ${card('Kelengkapan data','badge-check',genStatBar([['Usia / tgl lahir',S.fill.tgl],['Jenis kelamin',S.fill.jk],['Pendidikan',S.fill.pend]],100,'#64748b','%')+'<div class="text-[11px] text-slate-400 mt-2">Persen generus dengan kolom terisi. Makin lengkap, makin akurat statistik di atas.</div>')}
 </div>`;
 try{lucide.createIcons();}catch(e){}
}
function genUsia(g){const u=g.tgl?lhUmur(g.tgl):'';if(u!=='')return u;const n=parseInt(g.usia,10);return isNaN(n)?'':n;}
function genKey(g){return [g.nama,g.kelompok,g.tgl].map(s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim()).join('|');}
function genNextId(){const n=generus.reduce((m,g)=>Math.max(m,parseInt(String(g.id).replace(/\D/g,''),10)||0),0)+1;return 'G-'+String(n).padStart(3,'0');}
function genVal(g,k){if(k==='usia'){const u=genUsia(g);return u===''?null:u;}const v=g[k];return v?String(v):null;}
function genHay(g){return [g.nama,g.id,g.kelompok,g.status,g.jk,g.tempat,g.smp,g.sma,g.univ,g.kelas,g.pend,g.kerja,g.ayah,g.ibu,g.cat].join(' ').toLowerCase();}
function genFiltered(){
 const q=gs.q.trim().toLowerCase();
 let L=generus.map((g,i)=>({g,i})).filter(({g})=>(!gs.kel||g.kelompok===gs.kel)&&(!gs.st||g.status===gs.st)&&(!gs.jk||g.jk===gs.jk)&&(!gs.pend||g.pend===gs.pend)&&(!q||genHay(g).includes(q)));
 if(gs.sk!=='no'){
  L.sort((a,b)=>{
   const x=genVal(a.g,gs.sk),y=genVal(b.g,gs.sk);
   if(x===null&&y===null)return a.i-b.i; if(x===null)return 1; if(y===null)return -1;
   const c=(typeof x==='number'&&typeof y==='number')?x-y:String(x).localeCompare(String(y),'id',{numeric:true,sensitivity:'base'});
   return c?c*gs.dir:a.i-b.i;
  });
 }else if(gs.dir<0)L.reverse();
 return L.map(x=>x.g);
}
function genPill(txt,cls){return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${cls}">${esc(txt)}</span>`;}
function genStCls(s){return s==='Pra Remaja'?'bg-emerald-50 text-emerald-700':s==='Remaja'?'bg-amber-50 text-amber-700':s==='Muda-Mudi'?'bg-violet-50 text-violet-700':'bg-slate-100 text-slate-600';}
function genOrtuCls(s){const k=String(s||'').toLowerCase().replace(/[^a-z]/g,'');return k==='jamaah'?'bg-emerald-50 text-emerald-700':k==='belumjamaah'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-500';}
function genSbCls(s){const k=String(s||'').toLowerCase();return k==='aktif'?'bg-emerald-50 text-emerald-700':k.includes('jarang')?'bg-amber-50 text-amber-700':'';}

function genCell(g,c,no,p){
 const base=`border-b border-line px-3 ${p} whitespace-nowrap text-slate-600`;
 const stk='sticky z-10 bg-white group-hover:bg-slate-50 transition-colors';
 const dash='<span class="text-slate-300">—</span>';
 const t=v=>v?esc(v):dash;
 switch(c.k){
  case 'no': return `<td style="left:44px" class="${stk} ${base} text-slate-400 font-semibold">${no}</td>`;
  case 'nama': return `<td style="left:96px" class="${stk} ${base} border-r"><button onclick="openDetail('${esc(g.id)}')" class="flex items-center gap-3 text-left"><span><span class="block font-bold text-ink group-hover:text-navy transition-colors">${esc(g.nama)}</span><span class="block text-[10px] text-slate-400">${esc(g.id)}</span></span></button></td>`;
  case 'jk': return `<td class="${base}">${g.jk?genPill(g.jk,g.jk==='Perempuan'?'bg-pink-50 text-pink-600':'bg-blue-50 text-blue-700'):dash}</td>`;
  case 'status': return `<td class="${base}">${g.status?genPill(g.status,genStCls(g.status)):dash}</td>`;
  case 'kelompok': return `<td class="${base}">${g.kelompok?`<span class="inline-flex items-center gap-2 font-semibold text-slate-700"><span class="w-1.5 h-1.5 rounded-full bg-navy/60"></span>${esc(g.kelompok)}</span>`:dash}</td>`;
  case 'tgl': return `<td class="${base}">${g.tgl&&lhTgl(g.tgl)?esc(lhTgl(g.tgl)):dash}</td>`;
  case 'usia': {const u=genUsia(g);return `<td class="${base}">${u===''?dash:`<b class="text-slate-800">${u}</b><span class="text-xs text-slate-400"> th</span>`}</td>`;}
  case 'ayahSt': return `<td class="${base}">${g.ayahSt?genPill(g.ayahSt,genOrtuCls(g.ayahSt)):dash}</td>`;
  case 'ibuSt': return `<td class="${base}">${g.ibuSt?genPill(g.ibuSt,genOrtuCls(g.ibuSt)):dash}</td>`;
  case 'cat': return `<td class="${base} max-w-[280px]">${genSbCls(g.cat)?genPill(g.cat,genSbCls(g.cat)):`<div class="truncate" title="${esc(g.cat)}">${t(g.cat)}</div>`}</td>`;
  default: return `<td class="${base}">${t(g[c.k])}</td>`;
 }
}
function genRow(g,no,cols,p){
 return `<tr class="group cursor-pointer" onclick="if(rowSkip(event))return;openDetail('${esc(g.id)}')"><td data-c="chk" class="sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors border-b border-line px-3 ${p} w-11 min-w-[44px]"><input type="checkbox" class="rowChk" data-id="${esc(g.id)}" onchange="bulkChk()"></td>${cols.map(c=>genCell(g,c,no,p).replace('<td ','<td data-c="'+c.k+'" ')).join('')}
 <td data-c="act" class="sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors border-b border-l border-line px-2 ${p} text-right whitespace-nowrap"><button title="Lihat detail" onclick="openDetail('${esc(g.id)}')" class="w-8 h-8 rounded-lg hover:bg-slate-100">${icon('eye','w-4 mx-auto text-slate-500')}</button><button title="Edit" onclick="genOpenForm('${esc(g.id)}')" class="w-8 h-8 rounded-lg hover:bg-slate-100">${icon('pencil','w-4 mx-auto text-slate-500')}</button><button title="Hapus" onclick="bulkAsk('one','${esc(g.id)}')" class="w-8 h-8 rounded-lg hover:bg-red-50">${icon('trash-2','w-4 mx-auto text-red-500')}</button></td></tr>`;
}
function genPageList(cur,pages){
 const s=new Set([1,pages,cur-1,cur,cur+1]);const a=[...s].filter(x=>x>=1&&x<=pages).sort((x,y)=>x-y);const out=[];
 a.forEach((x,i)=>{if(i&&x-a[i-1]>1)out.push('…');out.push(x);});return out;
}
function genActive(){return !!(gs.q||gs.kel||gs.st||gs.jk||gs.pend);}

function genRenderTable(){
 const wrap=document.getElementById('genWrap'); if(!wrap)return;
 const sc=document.getElementById('genScroll'), sl=sc?sc.scrollLeft:0;
 const all=genFiltered(), n=all.length, pages=Math.max(1,Math.ceil(n/gs.size));
 if(gs.page>pages)gs.page=pages; if(gs.page<1)gs.page=1;
 const off=(gs.page-1)*gs.size, rows=all.slice(off,off+gs.size);
 const cols=GEN_COLS.filter(c=>!gs.hide.includes(c.k));
 const hp=gs.dense?'py-2.5':'py-3.5', rp=gs.dense?'py-1.5':'py-3';
 const th=c=>{
  const on=gs.sk===c.k, stick=c.k==='no'?'left:44px;':c.k==='nama'?'left:96px;':'';
  return `<th style="min-width:${c.w}px;${stick}" class="sticky top-0 ${c.fixed?'z-30':'z-20'} bg-slate-50 border-b border-line px-3 ${hp} text-xs font-bold whitespace-nowrap select-none ${c.k==='nama'?'border-r':''}"><button onclick="genSort('${c.k}')" class="inline-flex items-center gap-1 ${on?'text-navy':'text-slate-500 hover:text-navy'}">${c.l}<span class="text-[11px] w-2.5">${on?(gs.dir>0?'↑':'↓'):''}</span></button></th>`;
 };
 let body;
 if(rows.length) body=rows.map((g,i)=>genRow(g,off+i+1,cols,rp)).join('');
 else body=`<tr><td colspan="${cols.length+2}" data-c="empty" style="padding:0">${generus.length?emptyState('search-x','Tidak ada data yang cocok','Coba ubah kata kunci atau atur ulang filter.',[['Atur ulang filter','genResetFilter()','ghost']]):emptyState('inbox','Belum ada data generus','Tambahkan satu per satu, atau impor sekaligus dari Excel.',[['Tambah Generus',"openAddModal('generus')",'primary'],['Impor dari Excel','openImportModal()','ghost']])}</td></tr>`;
 const from=n?off+1:0, to=Math.min(off+gs.size,n);
 const pg=genPageList(gs.page,pages).map(x=>x==='…'?`<span class="w-6 text-center text-slate-300">…</span>`:`<button onclick="genPage(${x})" class="min-w-8 h-8 px-2 rounded-lg text-xs font-bold ${x===gs.page?'bg-navy text-white':'hover:bg-slate-100 text-slate-600'}">${x}</button>`).join('');
 wrap.innerHTML=`<div id="genScroll" class="overflow-auto scrollbar max-h-[68vh]"><table class="min-w-full border-separate border-spacing-0 text-left text-sm">
  <thead><tr><th class="sticky top-0 left-0 z-30 bg-slate-50 border-b border-line px-3 ${hp} w-11 min-w-[44px]"><input type="checkbox" onchange="bulkAll(this)" title="Pilih semua di halaman ini"></th>${cols.map(th).join('')}<th class="sticky top-0 right-0 z-30 bg-slate-50 border-b border-l border-line px-3 ${hp} text-right text-[11px] font-bold uppercase tracking-wide text-slate-500 min-w-[130px]">Aksi</th></tr></thead>
  <tbody id="generusTable">${body}</tbody></table></div>
  <div class="flex flex-col lg:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-line bg-white">
   <div class="flex items-center gap-3 text-xs text-slate-400"><span>Menampilkan <b class="text-slate-600">${from}–${to}</b> dari <b class="text-slate-600">${n}</b> data${n!==generus.length?` <span class="text-slate-300">(total ${generus.length})</span>`:''}</span>
    <select onchange="genSize(this.value)" class="h-8 border border-line rounded-lg px-2 text-xs bg-white text-slate-600">${[10,25,50,100].map(s=>`<option value="${s}" ${s===gs.size?'selected':''}>${s} / halaman</option>`).join('')}</select></div>
   <div class="flex items-center gap-1"><button onclick="genPage(${gs.page-1})" ${gs.page<=1?'disabled':''} class="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">‹ Sebelumnya</button>${pg}<button onclick="genPage(${gs.page+1})" ${gs.page>=pages?'disabled':''} class="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">Berikutnya ›</button></div>
  </div>`;
 const rs=document.getElementById('genReset'); if(rs){rs.classList.toggle('hidden',!genActive());rs.classList.toggle('flex',genActive());}
 lucide.createIcons();
 const sc2=document.getElementById('genScroll'); if(sc2)sc2.scrollLeft=sl;
 bulkChk();
}
function genSort(k){if(gs.sk===k)gs.dir=-gs.dir;else{gs.sk=k;gs.dir=1;}gs.page=1;genRenderTable();}
function genPage(p){gs.page=p;genRenderTable();const s=document.getElementById('genScroll');if(s)s.scrollTop=0;}
function genSize(v){gs.size=parseInt(v,10)||25;gs.page=1;genRenderTable();}
function genSetQ(v){gs.q=v;gs.page=1;genRenderTable();}
function genSetF(k,v){gs[k]=v;gs.page=1;genRenderTable();}
function genResetFilter(){
 gs.q=gs.kel=gs.st=gs.jk=gs.pend='';gs.page=1;
 ['genQ','genFKel','genFSt','genFJk','genFPend'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
 genRenderTable();
}
function genToggleDense(){gs.dense=!gs.dense;const b=document.getElementById('genDense');if(b)b.classList.toggle('on',gs.dense);genRenderTable();}
function genToggleCol(k,on){
 gs.hide=gs.hide.filter(x=>x!==k); if(!on)gs.hide.push(k);
 try{localStorage.setItem(GEN_COLS_KEY,JSON.stringify(gs.hide));}catch(e){}
 genRenderTable();
}
function genShowAllCols(){
 gs.hide=[];try{localStorage.setItem(GEN_COLS_KEY,'[]');}catch(e){}
 document.querySelectorAll('#genColList input').forEach(i=>{i.checked=true;});genRenderTable();
}
document.addEventListener('click',e=>{const d=document.getElementById('genColMenu');if(d&&d.open&&!d.contains(e.target))d.open=false;});

function renderGenerus(){
 const sel='h-10 bg-white border border-line rounded-xl px-3 text-sm text-slate-600 focus:border-navy';
 const pendOpts=[...new Set(GEN_PEND.concat(generus.map(g=>g.pend).filter(Boolean)))];
 const cnt=s=>generus.filter(g=>g.status===s).length;
 document.getElementById('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead('Database seluruh generus Desa Karangmojo dari semua kelompok.',pageActions({label:'Tambah Generus',fn:"openAddModal('generus')"},[['upload','Import massal','openImportModal()'],['file-spreadsheet','Template Excel','genTemplate()'],['download','Export ke Excel','genExport()'],'-',['trash','Hapus semua data',"bulkAsk('all')",'danger']],`<button type="button" onclick="genStatOpen()" class="u-btn" title="Ringkasan statistik generus" aria-label="Statistik generus">${icon('bar-chart-3','w-4 h-4')} Statistik</button>`))}
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
   ${statCard('Total Generus',String(generus.length),'Semua kategori','sprout','blue')}
   ${statCard('Pra Remaja',String(cnt('Pra Remaja')),'Usia sekolah dasar akhir–SMP','baby','green')}
   ${statCard('Remaja',String(cnt('Remaja')),'SMP–SMA','graduation-cap','orange')}
   ${statCard('Muda-Mudi',String(cnt('Muda-Mudi')),'Pelajar akhir, mahasiswa & umum','users-round','purple')}
  </div>
  <div class="u-card">
   <div class="u-bar">
    ${uSearch('genQ',gs.q,'genSetQ(this.value)','Cari nama, sekolah, orang tua...')}
    <select id="genFKel" onchange="genSetF('kel',this.value)" class="u-sel"><option value="">Semua kelompok</option>${kelompokList.map(k=>`<option value="${esc(k.nama)}" ${gs.kel===k.nama?'selected':''}>${esc(k.nama)}</option>`).join('')}</select>
    <select id="genFSt" onchange="genSetF('st',this.value)" class="u-sel"><option value="">Semua status</option>${GEN_ST.map(s=>`<option ${gs.st===s?'selected':''}>${s}</option>`).join('')}</select>
    <select id="genFJk" onchange="genSetF('jk',this.value)" class="u-sel"><option value="">Semua L / P</option><option ${gs.jk==='Laki-laki'?'selected':''}>Laki-laki</option><option ${gs.jk==='Perempuan'?'selected':''}>Perempuan</option></select>
    <select id="genFPend" onchange="genSetF('pend',this.value)" class="u-sel"><option value="">Semua pendidikan</option>${pendOpts.map(s=>`<option ${gs.pend===s?'selected':''}>${esc(s)}</option>`).join('')}</select>
    <button id="genReset" onclick="genResetFilter()" class="hidden u-btn danger" style="border-color:transparent">${icon('x','w-4 h-4')} Reset</button>
    <span class="flex-1"></span>
    <button id="genDense" onclick="genToggleDense()" title="Ringkas / nyaman" aria-label="Ringkas / nyaman" class="u-btn icon ${gs.dense?'on':''}">${icon('rows-3','w-4 h-4')}</button>
    <details id="genColMenu" class="u-menu"><summary class="u-btn">${icon('columns-3','w-4 h-4')} Kolom</summary>
     <div class="u-menu-p" style="width:264px;padding:12px"><div class="flex items-center justify-between mb-1"><b class="text-xs">Tampilkan kolom</b><button onclick="genShowAllCols()" class="text-[11px] font-bold text-navy">Tampilkan semua</button></div>
      <div id="genColList" class="max-h-72 overflow-auto scrollbar">${GEN_COLS.filter(c=>!c.fixed).map(c=>`<label class="flex items-center gap-2 py-1.5 text-sm text-slate-600"><input type="checkbox" ${gs.hide.includes(c.k)?'':'checked'} onchange="genToggleCol('${c.k}',this.checked)">${c.l}</label>`).join('')}</div></div></details>
   </div>
   ${bulkBar('generus')}
   <div class="rc" style="border-top:1px solid #e8ecf3"><div id="genWrap"></div></div>
  </div>
 </div>`;
 genRenderTable();
}

function filterTable(){
 const s=document.getElementById('tableSearch'), f=document.getElementById('filterKelompok');
 const q=(s?s.value:'').toLowerCase(), gv=f?f.value:'';
 document.querySelectorAll('#generusTable tr').forEach(tr=>{
  tr.style.display=(tr.dataset.name.includes(q)&&(!gv||tr.dataset.kelompok===gv))?'':'none';
 });
}

/* ===== HALAMAN MANAJEMEN KELOMPOK (hanya field Nama Kelompok) ===== */
function validateNamaKelompok(nama,exceptId){
 if(!nama) return 'Nama kelompok wajib diisi.';
 if(nama.length>40) return 'Nama kelompok maksimal 40 karakter.';
 if(kelompokList.some(k=>k.id!==exceptId&&k.nama.toLowerCase()===nama.toLowerCase())) return 'Nama kelompok "'+nama+'" sudah ada.';
 return '';
}
function nextKelompokId(){
 const n=kelompokList.reduce((m,k)=>Math.max(m,parseInt(String(k.id).replace(/\D/g,''),10)||0),0)+1;
 return 'K-'+String(n).padStart(3,'0');
}
function showErr(id,msg){const el=document.getElementById(id); if(!el)return; el.textContent=msg||''; el.classList.toggle('hidden',!msg);}

function rowKelompok(k,i){
 return `<tr><td style="width:56px;color:#94a3b8">${i+1}</td><td><div class="nm">${esc(k.nama)}</div><div class="sub">${usedCount(k)} generus</div></td><td class="col-act"><button title="Edit" aria-label="Edit ${esc(k.nama)}" onclick="openEditKelompok('${k.id}')" class="u-ib">${icon('pencil','w-4 h-4')}</button><button title="Hapus" aria-label="Hapus ${esc(k.nama)}" onclick="openDeleteKelompok('${k.id}')" class="u-ib del">${icon('trash-2','w-4 h-4')}</button></td></tr>`;
}

/* Kartu satu kelompok: ikon, nama, ketua, dan jumlah generus serta pengurus. */
function kelCardHtml(k,i){
 const pengurus=mmData('muda-mudi-kelompok').filter(x=>x.k===k.nama).length;
 return `<div class="group flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-md">
  <div class="flex items-start justify-between gap-3">
   <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ${MMK_ICON[i%MMK_ICON.length]}">${icon('users-round','w-5 h-5')}</span>
   <div class="flex gap-0.5">
    <button type="button" title="Ubah" aria-label="Ubah ${esc(k.nama)}" onclick="openEditKelompok('${k.id}')" class="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">${icon('pencil','w-4 h-4')}</button>
    <button type="button" title="Hapus" aria-label="Hapus ${esc(k.nama)}" onclick="openDeleteKelompok('${k.id}')" class="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50">${icon('trash-2','w-4 h-4')}</button>
   </div>
  </div>
  <div class="min-w-0"><h3 class="truncate font-extrabold text-slate-800">${esc(k.nama)}</h3><p class="mt-0.5 truncate text-xs text-slate-500">${k.ketua?'Ketua: '+esc(k.ketua):'Belum ada ketua'}</p></div>
  <div class="grid grid-cols-2 gap-2">
   <div class="rounded-xl border border-line p-2.5 text-center"><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Generus</div><div class="mt-0.5 text-lg font-extrabold text-slate-800">${usedCount(k)}</div></div>
   <div class="rounded-xl border border-line p-2.5 text-center"><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Pengurus</div><div class="mt-0.5 text-lg font-extrabold text-slate-800">${pengurus}</div></div>
  </div>
 </div>`;
}
/* Kartu ringkas Daftar Kelompok: klik untuk membuka daftar nama kelompok. */
function kelSummaryHtml(){
 const n=kelompokList.length;
 return `<div role="button" tabindex="0" onclick="renderKelompokList()" onkeydown="if(event.key==='Enter')this.click()" class="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-md">
  <div class="flex items-start justify-between gap-3">
   <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">${icon('users-round','w-5 h-5')}</span>
  </div>
  <div class="min-w-0"><h3 class="truncate font-extrabold text-slate-800">Daftar Kelompok</h3><p class="mt-0.5 truncate text-xs text-slate-500">Nama kelompok yang dipakai di seluruh menu</p></div>
  <div class="rounded-xl border border-line p-2.5 text-center"><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Kelompok</div><div class="mt-0.5 text-lg font-extrabold text-slate-800">${n}</div></div>
  <div class="mt-auto"><span class="inline-flex items-center gap-1.5 text-xs font-bold text-navy">Kelola kelompok ${icon('arrow-right','w-4 h-4')}</span></div>
 </div>`;
}
/* Halaman Kelompok: hanya dua kartu ringkas (kelompok dan dapukan). */
function renderKelompok(){
 document.getElementById('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead('Nama kelompok dan dapukan di sini otomatis dipakai di dashboard, filter, formulir, dan tabel pengurus.')}
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
   <div id="kelSection" class="contents">${kelSummaryHtml()}</div>
   <div id="dapSection" class="contents">${dapCardHtml()}</div>
  </div>
 </div>`;
 lucide.createIcons();
}
/* Halaman daftar kelompok: nama-nama kelompok dengan tambah, ubah, dan hapus. */
function renderKelompokList(){
 const crumb=`<button type="button" onclick="renderKelompok()" class="inline-flex items-center gap-1.5 font-bold text-navy hover:underline">${icon('arrow-left','w-4 h-4')} Data Kelompok</button><span class="mx-2 text-slate-300">/</span><b class="text-slate-800">Daftar kelompok</b><span class="ml-2 text-slate-400">• ${kelompokList.length} kelompok</span>`;
 const cards=kelompokList.map((k,i)=>kelCardHtml(k,i)).join('');
 document.getElementById('content').innerHTML=`<div id="kelList" class="max-w-[1500px] mx-auto fade">
  ${pageHead(crumb)}
  <form onsubmit="addKelompok(event)" class="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card sm:flex-row sm:items-end">
   <label class="block flex-1">
    <span class="text-sm font-extrabold text-slate-800">Tambah kelompok</span>
    <input id="kelompokBaru" type="text" maxlength="40" autocomplete="off" placeholder="Contoh: Dawan" oninput="showErr('kelompokErr','')" class="mt-1.5 h-11 w-full rounded-xl border border-line px-3.5 text-sm outline-none transition focus:border-navy focus:ring-4 focus:ring-navy/10">
    <p id="kelompokErr" class="hidden mt-2 text-xs font-semibold text-red-600"></p>
   </label>
   <button type="submit" class="u-btn primary">${icon('plus','w-4 h-4')} Tambah kelompok</button>
  </form>
  ${kelompokList.length?`<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">${cards}</div>`:emptyState('network','Belum ada kelompok','Tambahkan nama kelompok pertama lewat kolom di atas.')}
 </div>`;
 lucide.createIcons();
}
function addKelompok(e){
 e.preventDefault();
 const input=document.getElementById('kelompokBaru');
 const nama=normNama(input.value);
 const err=validateNamaKelompok(nama,null);
 if(err){showErr('kelompokErr',err);input.focus();return;}
 kelompokList.push({id:nextKelompokId(),nama,ketua:'',pengurus:0,generus:0,status:'Aktif'});
 saveKelompok(); renderKelompokList(); showToast('Kelompok "'+nama+'" ditambahkan');
 const n=document.getElementById('kelompokBaru'); if(n) n.focus();
}

function openEditKelompok(id){
 const k=kelompokList.find(x=>x.id===id); if(!k)return;
 document.getElementById('modalTitle').textContent='Edit Nama Kelompok';
 document.getElementById('modalDesc').textContent='Perubahan nama otomatis diterapkan ke data generus, KMM, dan muballigh.';
 document.getElementById('modalBody').innerHTML=`<form onsubmit="saveEditKelompok(event,'${k.id}')" class="space-y-4">
  <label class="block"><span class="text-xs font-bold text-slate-600">Nama Kelompok</span><input id="editNama" type="text" maxlength="40" value="${esc(k.nama)}" oninput="showErr('editErr','')" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm"></label>
  <p id="editErr" class="hidden text-xs text-red-600 font-semibold"></p>
  <div class="flex justify-end gap-2 pt-2 border-t border-line"><button type="button" onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button type="submit" class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">Simpan</button></div>
 </form>`;
 showModal();
 const el=document.getElementById('editNama'); if(el){el.focus();el.select();}
}

function saveEditKelompok(e,id){
 e.preventDefault();
 const k=kelompokList.find(x=>x.id===id); if(!k){closeModal();return;}
 const nama=normNama(document.getElementById('editNama').value);
 const err=validateNamaKelompok(nama,id);
 if(err){showErr('editErr',err);return;}
 const lama=k.nama;
 k.nama=nama;
 if(lama!==nama){generus.forEach(g=>{if(g.kelompok===lama) g.kelompok=nama;});saveGenerus();
  ['muda-mudi-desa','muda-mudi-kelompok','mubaligh'].forEach(t=>{const L=mmData(t);let ch=false;L.forEach(x=>{if(x.k===lama){x.k=nama;ch=true;}});if(ch)mmPut(t,L);});}
 saveKelompok(); closeModal(); renderKelompokList(); showToast('Nama kelompok diperbarui');
}

function openDeleteKelompok(id){
 const k=kelompokList.find(x=>x.id===id); if(!k)return;
 const n=usedCountAll(k);
 document.getElementById('modalTitle').textContent='Hapus Kelompok';
 document.getElementById('modalDesc').textContent=k.nama;
 document.getElementById('modalBody').innerHTML=(n>0)
  ? `<div class="space-y-4"><div class="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">Kelompok ini masih dipakai oleh <b>${n} data</b> (generus/KMM/muballigh) sehingga tidak dapat dihapus. Pindahkan datanya ke kelompok lain terlebih dahulu.</div>
     <div class="flex justify-end"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Tutup</button></div></div>`
  : `<div class="space-y-4"><p class="text-sm text-slate-600">Yakin ingin menghapus <b>${esc(k.nama)}</b>? Tindakan ini tidak dapat dibatalkan.</p>
     <div class="flex justify-end gap-2"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button onclick="deleteKelompok('${k.id}')" class="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Hapus</button></div></div>`;
 showModal();
}

function deleteKelompok(id){
 const k=kelompokList.find(x=>x.id===id);
 if(!k||usedCountAll(k)>0){closeModal();return;}
 kelompokList=kelompokList.filter(x=>x.id!==id);
 saveKelompok(); closeModal(); renderKelompokList(); showToast('Kelompok dihapus');
}

/* ===== Helper bersama (id, baca JSON) ===== */
function readJson(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function nextId(prefix,list){
 const n=list.reduce((m,x)=>Math.max(m,parseInt(String(x.id).replace(/\D/g,''),10)||0),0)+1;
 return prefix+'-'+String(n).padStart(3,'0');
}
function fval(id){const el=document.getElementById(id);return el?String(el.value==null?'':el.value):'';}

/* ---- helper tanggal lahir (dipakai semua menu pengurus) ---- */
function lhOk(iso){if(!iso)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;const p=iso.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2]);return d.getFullYear()===p[0]&&d.getMonth()===p[1]-1&&d.getDate()===p[2]&&p[0]>=1900&&iso<=fmIso(new Date());}
function lhUmur(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return '';const p=iso.split('-').map(Number),n=new Date();let u=n.getFullYear()-p[0];const m=n.getMonth()+1-p[1];if(m<0||(m===0&&n.getDate()<p[2]))u--;return u>=0&&u<130?u:'';}
function lhTgl(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return '';const p=iso.split('-');return Number(p[2])+' '+PK_BULAN[Number(p[1])-1]+' '+p[0];}
function lhCell(iso){const t=lhTgl(iso);if(!t)return '<span class="text-slate-300">-</span>';const u=lhUmur(iso);return `<div class="font-semibold text-slate-700">${esc(t)}</div>${u!==''?`<div class="text-[11px] text-slate-400">${u} tahun</div>`:''}`;}
function lhUmurTxt(el,outId){const o=document.getElementById(outId);if(o){const u=lhUmur(el.value);o.textContent=u===''?'':'Umur: '+u+' tahun';}}
function lhFromDate(d){const e=new Date(d.getTime()+12*3600e3);return e.getFullYear()+'-'+String(e.getMonth()+1).padStart(2,'0')+'-'+String(e.getDate()).padStart(2,'0');}
function lhParse(s){
 s=String(s||'').trim(); if(!s)return '';
 let y,m,d,t;
 if((t=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))){y=+t[1];m=+t[2];d=+t[3];}
 else if((t=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))){d=+t[1];m=+t[2];y=+t[3];}
 else if((t=s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/))){d=+t[1];y=+t[3];const mn=t[2].toLowerCase();m=PK_BULAN.findIndex(b=>b.toLowerCase()===mn||b.toLowerCase().slice(0,3)===mn.slice(0,3))+1;if(!m)return null;}
 else return null;
 const iso=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 return lhOk(iso)?iso:null;
}
function lhInput(id,outId,val,errId,inp){const u=lhUmur(val);return `<input id="${id}" type="date" min="1900-01-01" max="${fmIso(new Date())}" value="${esc(val||'')}" oninput="lhUmurTxt(this,'${outId}');showErr('${errId}','')" class="${inp}"><span id="${outId}" class="text-[11px] text-slate-400">${u===''?'':'Umur: '+u+' tahun'}</span>`;}

/* ===== Helper bersama ===== */
const PK_BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function pBtn(cls,ic,label,fn){return `<button onclick="${fn}" class="h-10 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${cls}">${icon(ic,'w-4')} ${label}</button>`;}

/* ===== KELOLA NAMA DAPUKAN (KMM Desa, KMM Kelompok) ===== */
/* ===== DAPUKAN: satu daftar induk, dikelola di menu Data > Kelompok, dipakai semua menu KMM dan formulir ===== */
const DAP_KEY='simdeka_dapukan_v1';
const DAP_PAGES=['muda-mudi-desa','muda-mudi-kelompok'];
function dapGet(){try{const a=JSON.parse(localStorage.getItem(DAP_KEY));if(Array.isArray(a))return a.filter(x=>typeof x==='string'&&x.trim()).slice(0,200);}catch(e){}return MM_DAP_DEFAULT.slice();}
function dapSet(a){try{localStorage.setItem(DAP_KEY,JSON.stringify(a));}catch(e){}}
function dapPakai(n){const k=String(n).toLowerCase();return DAP_PAGES.reduce((s,p)=>s+mmData(p).filter(x=>String(x.d||'').toLowerCase()===k).length,0);}
function dapGanti(a,b){DAP_PAGES.forEach(p=>{const L=mmData(p);let ch=false;L.forEach(x=>{if(String(x.d||'').toLowerCase()===a.toLowerCase()){x.d=b;ch=true;}});if(ch)mmPut(p,L);});}
/* Gabungkan daftar lama (per KMM + daftar khusus) sekali saja ke daftar induk. */
function dapMigrasi(){
 const lama=['simdeka_dap_mmd_v1','simdeka_dap_mmk_v1',MM_DAP_KEY];
 if(localStorage.getItem(DAP_KEY)!==null||!lama.some(k=>localStorage.getItem(k)!==null))return;
 const gab=MM_DAP_DEFAULT.slice();
 lama.forEach(k=>{try{const a=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(a))a.forEach(x=>{const v=typeof x==='string'?x.replace(/\s+/g,' ').trim().slice(0,60):'';if(v&&!gab.some(g=>g.toLowerCase()===v.toLowerCase()))gab.push(v);});}catch(e){}});
 dapSet(gab.slice(0,200));
}
function dxCek(L,nama,idx){
 if(!nama)return 'Nama dapukan wajib diisi.';
 if(nama.length>60)return 'Nama dapukan maksimal 60 karakter.';
 if(L.some((d,i)=>i!==idx&&d.toLowerCase()===nama.toLowerCase()))return 'Nama dapukan "'+nama+'" sudah ada.';
 return '';
}
/* Isi bagian dapukan di halaman Data > Kelompok. */
/* Kartu ringkas di halaman Kelompok: hanya jenis dapukan dan totalnya. Klik untuk membuka daftar. */
function dapCardHtml(){
 const n=dapGet().length;
 return `<div role="button" tabindex="0" onclick="renderDapukan()" onkeydown="if(event.key==='Enter')this.click()" class="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-md">
  <div class="flex items-start justify-between gap-3">
   <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">${icon('tags','w-5 h-5')}</span>
  </div>
  <div class="min-w-0"><h3 class="truncate font-extrabold text-slate-800">Nama Dapukan</h3><p class="mt-0.5 truncate text-xs text-slate-500">Nama jabatan pengurus</p></div>
  <div class="rounded-xl border border-line p-2.5 text-center"><div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Dapukan</div><div class="mt-0.5 text-lg font-extrabold text-slate-800">${n}</div></div>
  <div class="mt-auto"><span class="inline-flex items-center gap-1.5 text-xs font-bold text-navy">Kelola dapukan ${icon('arrow-right','w-4 h-4')}</span></div>
 </div>`;
}
/* Halaman daftar dapukan: tambah, ubah, hapus, dan muat bawaan. */
function renderDapukan(){
 const L=dapGet();
 const crumb=`<button type="button" onclick="renderKelompok()" class="inline-flex items-center gap-1.5 font-bold text-navy hover:underline">${icon('arrow-left','w-4 h-4')} Data Kelompok</button><span class="mx-2 text-slate-300">/</span><b class="text-slate-800">Daftar dapukan</b><span class="ml-2 text-slate-400">• ${L.length} dapukan</span>`;
 const cards=L.map((n,i)=>dapItemHtml(n,i)).join('');
 document.getElementById('content').innerHTML=`<div id="dapList" class="max-w-[1500px] mx-auto fade">
  ${pageHead(crumb,`<button type="button" onclick="dapBawaan()" class="u-btn">${icon('rotate-ccw','w-4 h-4')} Muat bawaan</button>`)}
  <div class="u-card overflow-hidden">
   <form onsubmit="dapAdd(event)" class="flex flex-col gap-2.5 border-b border-line p-4 sm:flex-row sm:items-start">
    <div class="relative flex-1">
     <span class="pointer-events-none absolute left-3.5 top-3 text-slate-400">${icon('tag','w-4 h-4')}</span>
     <input id="dapBaru" type="text" maxlength="60" autocomplete="off" placeholder="Tambah dapukan baru, contoh: Bendahara" aria-label="Nama dapukan baru" oninput="showErr('dapErr','')" class="h-10 w-full rounded-xl border border-line bg-slate-50/60 pl-10 pr-3.5 text-sm outline-none transition focus:border-navy focus:bg-white focus:ring-4 focus:ring-navy/10">
     <p id="dapErr" class="hidden mt-2 text-xs font-semibold text-red-600"></p>
    </div>
    <button type="submit" class="u-btn primary">${icon('plus','w-4 h-4')} Tambah</button>
   </form>
   ${L.length?`<div class="overflow-x-auto"><table class="dap-tbl w-full text-left">
    <thead><tr><th class="w-14 text-center">No</th><th>Nama dapukan</th><th>Dipakai pengurus</th><th class="w-28 text-right">Aksi</th></tr></thead>
    <tbody>${cards}</tbody></table></div>`:emptyState('tags','Belum ada dapukan','Tambahkan dapukan pertama lewat kolom di atas, atau muat dapukan bawaan.',[['Muat bawaan','dapBawaan()','primary']])}
  </div>
 </div>`;
 lucide.createIcons();
}
function dapItemHtml(n,i){
 const k=dapPakai(n);
 return `<tr>
  <td class="text-center text-xs font-semibold text-slate-400">${i+1}</td>
  <td><span class="text-sm font-bold text-slate-800">${esc(n)}</span></td>
  <td>${k?`<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><i class="h-1.5 w-1.5 rounded-full bg-emerald-500"></i>${k} pengurus</span>`:`<span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-400">Belum dipakai</span>`}</td>
  <td class="text-right"><div class="inline-flex gap-0.5"><button type="button" title="Ubah nama" aria-label="Ubah ${esc(n)}" onclick="dapEdit(${i})" class="u-ib">${icon('pencil','w-4 h-4')}</button><button type="button" title="${k?'Masih dipakai pengurus':'Hapus'}" aria-label="Hapus ${esc(n)}" onclick="dapDel(${i})" class="u-ib del ${k?'opacity-40':''}">${icon('trash-2','w-4 h-4')}</button></div></td>
 </tr>`;
}
/* Muat ulang halaman dapukan (atau kartu ringkasnya) dan halaman KMM yang sedang terbuka. */
function dapSegar(){
 if(document.getElementById('dapList'))renderDapukan();
 else if(DAP_PAGES.includes(mmCurPage)&&document.getElementById('generusTable'))renderMM(mmCurPage);
 else{const s=document.getElementById('dapSection'); if(s)s.innerHTML=dapCardHtml();}
 lucide.createIcons();
}
function dapAdd(e){
 e.preventDefault(); const nama=normNama(fval('dapBaru')), L=dapGet(), err=dxCek(L,nama,-1);
 if(err){showErr('dapErr',err);return;}
 L.push(nama); dapSet(L); dapSegar(); showToast('Dapukan "'+nama+'" ditambahkan');
 const el=document.getElementById('dapBaru'); if(el)el.focus();
}
function dapEdit(i){
 const L=dapGet(), n=L[i]; if(n==null)return;
 document.getElementById('modalTitle').textContent='Ubah Nama Dapukan';
 document.getElementById('modalDesc').textContent='Perubahan nama otomatis diterapkan ke semua pengurus yang memakainya.';
 document.getElementById('modalBody').innerHTML=`<form onsubmit="dapEditOk(event,${i})" class="space-y-4"><input id="dapEdit" type="text" maxlength="60" autocomplete="off" value="${esc(n)}" oninput="showErr('dapErr2','')" class="w-full h-11 border border-line rounded-xl px-3 text-sm"><p id="dapErr2" class="hidden text-xs text-red-600 font-semibold"></p><div class="flex justify-end gap-2"><button type="button" onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button type="submit" class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">Simpan</button></div></form>`;
 showModal(); const el=document.getElementById('dapEdit'); if(el){el.focus();el.select();}
}
function dapEditOk(e,i){
 e.preventDefault(); const L=dapGet(), lama=L[i], nama=normNama(fval('dapEdit')), err=dxCek(L,nama,i);
 if(lama==null){closeModal();return;}
 if(err){showErr('dapErr2',err);return;}
 if(lama!==nama){dapGanti(lama,nama);L[i]=nama;dapSet(L);showToast('Nama dapukan diperbarui');}
 closeModal(); dapSegar();
}
function dapDel(i){
 const L=dapGet(), n=L[i]; if(n==null)return; const k=dapPakai(n);
 document.getElementById('modalTitle').textContent='Hapus Nama Dapukan';
 document.getElementById('modalDesc').textContent=n;
 document.getElementById('modalBody').innerHTML=k>0
  ?`<div class="space-y-4"><div class="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">Dapukan ini masih dipakai <b>${k} pengurus</b>, sehingga tidak dapat dihapus. Ubah dapukan mereka terlebih dahulu.</div><div class="flex justify-end"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Tutup</button></div></div>`
  :`<div class="space-y-4"><p class="text-sm text-slate-600">Yakin ingin menghapus dapukan <b>${esc(n)}</b>? Tindakan ini tidak dapat dibatalkan.</p><div class="flex justify-end gap-2"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button onclick="dapDelOk(${i})" class="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Hapus</button></div></div>`;
 showModal();
}
function dapDelOk(i){const L=dapGet(); if(L[i]==null){closeModal();return;} L.splice(i,1); dapSet(L); closeModal(); dapSegar(); showToast('Nama dapukan dihapus');}
function dapBawaan(){
 const L=dapGet(); let n=0;
 MM_DAP_DEFAULT.forEach(d=>{if(!L.some(x=>x.toLowerCase()===d.toLowerCase())){L.push(d);n++;}});
 dapSet(L); dapSegar(); showToast(n?n+' dapukan bawaan ditambahkan':'Semua dapukan bawaan sudah ada');
}

/* ===== Helper impor CSV/Excel (dipakai KMM) ===== */
function impNorm(h){return String(h==null?'':h).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}

function impCsv(t){
 t=t.replace(/^\uFEFF/,''); const first=t.split(/\r?\n/)[0]||''; const d=first.split(';').length>first.split(',').length?';':',';
 const out=[]; let row=[],cur='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
  else if(c==='"')q=true;
  else if(c===d){row.push(cur);cur='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cur);out.push(row);row=[];cur='';}
  else cur+=c;}
 if(cur!==''||row.length){row.push(cur);out.push(row);}
 return out;
}
/* ================= Menu Laporan: kartu modern per kegiatan ================= */
const LAP={forms:[],rep:{},q:'',jenis:'',bln:'',tok:0};
function lapTgl(f){const t=(f.data&&f.data.absen&&f.data.absen.tanggal)||'';return /^\d{4}-\d{2}-\d{2}/.test(t)?t.slice(0,10):'';}
function lapJenis(f){return String((f.data&&f.data.absen&&f.data.absen.jenis)||'').trim()||'Kegiatan';}
function lapBlnLabel(k){if(!k)return 'Tanpa tanggal';const [y,m]=k.split('-');return new Date(+y,+m-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});}
function lapTglShort(t){return t?new Date(t+'T00:00:00').toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'Tanggal belum diatur';}
function lapStat(id){
 const r=LAP.rep[id];if(!r||r.loading)return {state:'load'};
 if(!r.report)return {state:'off',err:r.err||'Laporan publik belum aktif.'};
 const s=r.report.summary||{},T=+s.total||0,H=+s.hadir||0,I=+s.izin||0;
 const pct=s.percentage!=null?Math.round(+s.percentage):(T?Math.round(H/T*100):null);
 const tdk=s.alpa!=null?+s.alpa:Math.max(0,T-H-I);
 return {state:'ok',T:T,H:H,I:I,A:tdk,pct:pct};
}
function lapTone(p){return p==null?{t:'text-slate-400',b:'bg-slate-300'}:p>=85?{t:'text-emerald-700',b:'bg-emerald-500'}:p>=70?{t:'text-amber-600',b:'bg-amber-500'}:{t:'text-red-600',b:'bg-red-500'};}
function lapFiltered(){
 const q=LAP.q.trim().toLowerCase();
 return LAP.forms.filter(f=>{
  if(LAP.jenis&&lapJenis(f)!==LAP.jenis)return false;
  if(LAP.bln&&lapTgl(f).slice(0,7)!==LAP.bln)return false;
  if(q&&!((f.title||'')+' '+lapJenis(f)).toLowerCase().includes(q))return false;
  return true;
 });
}
function lapCardInner(f){
 const st=lapStat(f.id),jn=lapJenis(f),id=esc(f.id),tn=lapTone(st.pct);
 const head=`<div class="flex items-start justify-between gap-2"><span class="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-navy/5 text-navy truncate max-w-[68%]" title="${esc(jn)}">${esc(jn)}</span><span class="text-[11px] text-slate-400 shrink-0">${esc(lapTglShort(lapTgl(f)))}</span></div><h3 class="font-extrabold text-[15px] leading-snug mt-3" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(f.title||'Absensi')}</h3>`;
 let mid='',foot='';
 const menu=`<div class="relative"><button type="button" onclick="lapMenu(event,this)" class="h-9 w-9 rounded-xl border border-line grid place-items-center text-slate-500 hover:bg-slate-50" aria-label="Menu lainnya">${icon('more-horizontal','w-4 h-4')}</button><div class="lap-menu hidden absolute right-0 bottom-11 z-20 w-48 bg-white rounded-xl border border-line shadow-soft p-1.5 text-xs font-bold text-slate-600"><button type="button" onclick="fmOpen('${id}')" class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50">Buka form</button><button type="button" onclick="fmCopyText(location.origin+'/r/'+encodeURIComponent('${id}'),'Link laporan publik disalin')" class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50">Salin link laporan</button><button type="button" onclick="lapReload('${id}')" class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50">Muat ulang kartu ini</button></div></div>`;
 if(st.state==='load'){
  mid=`<div class="mt-4 animate-pulse"><div class="h-8 w-20 rounded-lg bg-slate-100"></div><div class="h-1.5 rounded-full bg-slate-100 mt-3"></div><div class="grid grid-cols-4 gap-2 mt-4">${'<div class="h-10 rounded-xl bg-slate-100"></div>'.repeat(4)}</div></div>`;
  foot=`<div class="flex gap-2 mt-4"><button type="button" disabled class="flex-1 h-9 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold">Memuat…</button>${menu}</div>`;
 }else if(st.state==='off'){
  mid=`<div class="mt-4"><div class="text-3xl font-extrabold text-slate-300 leading-none">—</div><div class="text-[11px] text-slate-400 mt-1">Kehadiran</div><div class="h-1.5 rounded-full bg-slate-100 mt-3"></div><div class="mt-4 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2.5 leading-relaxed">${esc(st.err)}</div></div>`;
  foot=`<div class="flex gap-2 mt-4"><button type="button" onclick="fmOpen('${id}')" class="flex-1 h-9 rounded-xl border border-line text-xs font-bold hover:bg-slate-50">Buka form</button>${menu}</div>`;
 }else{
  const mini=[['Peserta',st.T],['Hadir',st.H],['Izin',st.I],['Tidak hadir',st.A]].map(x=>`<div class="rounded-xl bg-slate-50 px-2 py-2 text-center"><b class="block text-sm">${x[1]}</b><span class="text-[10px] text-slate-400">${x[0]}</span></div>`).join('');
  mid=`<div class="mt-4"><div class="flex items-end justify-between"><div><div class="text-3xl font-extrabold leading-none ${tn.t}">${st.pct!=null?st.pct:'—'}<span class="text-base">${st.pct!=null?'%':''}</span></div><div class="text-[11px] text-slate-400 mt-1">Kehadiran</div></div><span class="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Laporan aktif</span></div><div class="h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden"><div class="h-full rounded-full ${tn.b}" style="width:${Math.max(0,Math.min(100,st.pct||0))}%"></div></div><div class="grid grid-cols-4 gap-2 mt-4">${mini}</div></div>`;
  foot=`<div class="flex gap-2 mt-4"><button type="button" onclick="window.open(location.origin+'/r/'+encodeURIComponent('${id}'),'_blank','noopener')" class="flex-1 h-9 rounded-xl bg-navy text-white text-xs font-bold hover:brightness-110">Buka laporan</button>${menu}</div>`;
 }
 return head+mid+foot;
}
function lapKpiHtml(){
 const L=lapFiltered(),sts=L.map(f=>lapStat(f.id)),ok=sts.filter(s=>s.state==='ok'),wait=sts.some(s=>s.state==='load');
 const pcts=ok.filter(s=>s.pct!=null).map(s=>s.pct),avg=pcts.length?Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length):null;
 const hadir=ok.reduce((a,s)=>a+s.H,0);
 const v=x=>wait&&!ok.length?'…':x;
 const k=(ico,tone,lb,val,sub)=>`<div class="bg-white rounded-2xl border border-line shadow-card p-4 flex items-center gap-3"><div class="w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tone}">${icon(ico,'w-5 h-5')}</div><div class="min-w-0"><div class="text-[11px] text-slate-400 font-bold">${lb}</div><div class="text-xl font-extrabold leading-tight">${val}</div><div class="text-[10.5px] text-slate-400 truncate">${sub}</div></div></div>`;
 return k('calendar-days','bg-navy/5 text-navy','Kegiatan',L.length,'sesuai filter')
  +k('trending-up','bg-emerald-50 text-emerald-700','Rata-rata kehadiran',v(avg!=null?avg+'%':'—'),ok.length+' laporan terbaca')
  +k('users','bg-blue-50 text-blue-700','Total hadir',v(hadir),'dari semua kegiatan')
  +k('badge-check','bg-violet-50 text-violet-700','Laporan aktif',v(ok.length+'/'+L.length),wait?'masih memuat…':'siap dibuka');
}
function lapGridHtml(){
 const L=lapFiltered();
 if(!LAP.forms.length)return '<div class="bg-white rounded-2xl border border-line shadow-card p-10 text-center"><h3 class="font-extrabold">Belum ada form absensi</h3><p class="text-sm text-slate-400 mt-1">Buat form absensi dari menu Form untuk mulai membuat laporan.</p><button onclick="navigate(\'form\')" class="mt-4 h-10 px-4 rounded-xl bg-navy text-white text-xs font-bold">Buka Form</button></div>';
 if(!L.length)return '<div class="bg-white rounded-2xl border border-line shadow-card p-10 text-center"><h3 class="font-extrabold">Tidak ada kegiatan yang cocok</h3><p class="text-sm text-slate-400 mt-1">Ubah kata kunci atau filter yang dipakai.</p><button onclick="lapReset()" class="mt-4 h-10 px-4 rounded-xl border border-line text-xs font-bold">Reset filter</button></div>';
 const groups={},order=[];
 L.forEach(f=>{const k=lapTgl(f).slice(0,7);if(!groups[k]){groups[k]=[];order.push(k);}groups[k].push(f);});
 return order.map(k=>`<section class="mb-6"><h2 class="text-sm font-extrabold text-slate-600 mb-3 flex items-center gap-2">${esc(lapBlnLabel(k))}<span class="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500">${groups[k].length}</span></h2><div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${groups[k].map(f=>`<div data-lap="${esc(f.id)}" class="bg-white rounded-2xl border border-line shadow-card p-5 flex flex-col hover:shadow-soft hover:-translate-y-0.5 transition">${lapCardInner(f)}</div>`).join('')}</div></section>`).join('');
}
function lapChipsHtml(){
 const js=[...new Set(LAP.forms.map(lapJenis))].sort();
 if(js.length<2)return '';
 const c=(v,l)=>`<button type="button" onclick="lapSet('jenis',${JSON.stringify(v).replace(/"/g,'&quot;')})" class="h-8 px-3 rounded-full text-xs font-bold border ${LAP.jenis===v?'bg-navy text-white border-navy':'bg-white text-slate-600 border-line hover:bg-slate-50'}">${esc(l)}</button>`;
 return c('','Semua')+js.map(j=>c(j,j)).join('');
}
function lapRender(){
 const g=document.getElementById('lapGrid');if(!g)return;
 document.getElementById('lapKpi').innerHTML=lapKpiHtml();
 document.getElementById('lapChips').innerHTML=lapChipsHtml();
 g.innerHTML=lapGridHtml();
 lucide.createIcons();
}
function lapUpdateCard(id){
 const el=document.querySelector('[data-lap="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]'),f=LAP.forms.find(x=>x.id===id);
 if(el&&f){el.innerHTML=lapCardInner(f);}
 const k=document.getElementById('lapKpi');if(k)k.innerHTML=lapKpiHtml();
 lucide.createIcons();
}
function lapSet(k,v){LAP[k]=v;lapRender();}
function lapReset(){LAP.q='';LAP.jenis='';LAP.bln='';const q=document.getElementById('lapQ'),b=document.getElementById('lapBln');if(q)q.value='';if(b)b.value='';lapRender();}
function lapMenu(e,btn){
 e.stopPropagation();
 const m=btn.nextElementSibling,open=!m.classList.contains('hidden');
 document.querySelectorAll('.lap-menu').forEach(x=>x.classList.add('hidden'));
 if(!open)m.classList.remove('hidden');
}
document.addEventListener('click',()=>{document.querySelectorAll('.lap-menu').forEach(x=>x.classList.add('hidden'));});
async function lapFetchOne(id,tok){
 LAP.rep[id]={loading:true};
 try{
  const rr=await fetch('/api/public/forms/'+encodeURIComponent(id)+'/report',{cache:'no-store'}),jj=await rr.json();
  LAP.rep[id]=rr.ok?{report:jj}:{err:jj.error||'Laporan publik belum aktif.'};
 }catch(e){LAP.rep[id]={err:e.message||'Gagal memuat laporan.'};}
 if(tok===LAP.tok)lapUpdateCard(id);
}
function lapReload(id){const t=LAP.tok;LAP.rep[id]={loading:true};lapUpdateCard(id);lapFetchOne(id,t);}
async function lapFetchAll(list,tok){
 let i=0;
 const worker=async()=>{while(i<list.length){if(tok!==LAP.tok)return;await lapFetchOne(list[i++].id,tok);}};
 await Promise.all([worker(),worker(),worker(),worker()]);
}
async function lapPubLoad(){
 const tok=++LAP.tok;LAP.rep={};
 const box=document.getElementById('lapPub');if(!box)return;
 box.innerHTML=`<div>
  <div id="lapKpi" class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5"></div>
  <div class="bg-white rounded-2xl border border-line shadow-card p-3 sm:p-4 mb-5 space-y-3">
   <div class="flex flex-col sm:flex-row gap-3"><div class="relative flex-1">${icon('search','w-4 h-4 absolute left-3 top-3 text-slate-400')}<input id="lapQ" type="search" placeholder="Cari nama kegiatan…" oninput="lapSet('q',this.value)" class="w-full h-10 border border-line rounded-xl pl-9 pr-3 text-sm"></div><select id="lapBln" onchange="lapSet('bln',this.value)" class="h-10 border border-line rounded-xl px-3 text-sm bg-white sm:w-56"><option value="">Semua bulan</option></select></div>
   <div id="lapChips" class="flex flex-wrap gap-2"></div></div>
  <div id="lapGrid"><div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${'<div class="bg-white rounded-2xl border border-line shadow-card p-5 animate-pulse"><div class="h-5 w-32 rounded-full bg-slate-100"></div><div class="h-4 w-48 rounded bg-slate-100 mt-4"></div><div class="h-8 w-20 rounded-lg bg-slate-100 mt-5"></div><div class="h-10 rounded-xl bg-slate-100 mt-5"></div></div>'.repeat(3)}</div></div></div>`;
 lucide.createIcons();
 try{
  const r=await fetch('/api/forms',{credentials:'same-origin'}),j=await r.json();if(!r.ok)throw new Error(j.error||'Gagal memuat form');
  if(tok!==LAP.tok)return;
  LAP.forms=(j.forms||[]).filter(f=>f.type==='absensi').sort((a,b)=>(lapTgl(b)||'0').localeCompare(lapTgl(a)||'0'));
  LAP.q='';LAP.jenis='';LAP.bln='';
  const months=[...new Set(LAP.forms.map(f=>lapTgl(f).slice(0,7)).filter(Boolean))];
  document.getElementById('lapBln').innerHTML='<option value="">Semua bulan</option>'+months.map(k=>`<option value="${k}">${esc(lapBlnLabel(k))}</option>`).join('');
  LAP.forms.forEach(f=>{LAP.rep[f.id]={loading:true};});
  lapRender();
  lapFetchAll(LAP.forms,tok);
 }catch(e){const g=document.getElementById('lapGrid');if(g)g.innerHTML=`<div class="bg-white rounded-2xl border border-red-100 p-8 text-center text-sm text-red-600">${esc(e.message||'Gagal memuat laporan.')}</div>`;}
}
/* ================= Menu Laporan: cetak laporan pengajian muda mudi (kelompok, desa, daerah) ================= */
const LP={y:null,per:null,k:'',from:'',to:''};
const LP_ICON={kelompok:'users',desa:'map-pin',daerah:'map'};
function lpInit(){
 const ys=kaYears(),cy=new Date().getFullYear();
 if(LP.y==null||!ys.includes(LP.y))LP.y=ys.includes(cy)?cy:ys[ys.length-1];
 if(LP.per==null)LP.per=String(LP.y===cy?new Date().getMonth():'all');
}
function lpRp(j){return {y:LP.y,per:LP.per,j:j||'',k:LP.k,from:LP.from,to:LP.to};}
function lpPeriodLabel(){return LP.per==='all'?'Tahun '+LP.y:LP.per==='range'?kaRpRangeText(lpRp('')):kaBln(parseInt(LP.per,10))+' '+LP.y;}
function lpFileLabel(){return lpPeriodLabel().replace(/\s*–\s*/,'_sd_').replace(/\s+/g,'-');}
function lpCard(j){
 const D=kaRekapCalc(lpRp(j)),T=D.T,tot=T.H+T.I+T.A+T.N,pct=tot?Math.round(T.H/tot*100):null,tn=lapTone(pct),c=KA_JC[j],has=D.sess.length>0;
 const stat=(l,v)=>`<div class="rounded-xl bg-slate-50 px-2 py-2 text-center"><b class="block text-sm">${v}</b><span class="text-[10px] text-slate-400">${l}</span></div>`;
 const dis=has?'':' disabled',off=has?'hover:brightness-110':'opacity-40 cursor-not-allowed';
 const body=has?`<div><div class="flex items-end justify-between gap-3"><div><div class="text-4xl font-extrabold leading-none ${tn.t}">${pct!=null?pct:'—'}<span class="text-lg">${pct!=null?'%':''}</span></div><div class="text-[11px] text-slate-400 mt-1">Rata-rata kehadiran</div></div><div class="text-right text-[11px] text-slate-500 leading-relaxed"><b class="text-emerald-700">${T.H}</b> hadir · <b class="text-amber-600">${T.I}</b> izin<br><b class="text-red-600">${T.A}</b> alpa · <b class="text-slate-400">${T.N}</b> belum mengisi</div></div><div class="h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden"><div class="h-full rounded-full ${tn.b}" style="width:${Math.max(0,Math.min(100,pct||0))}%"></div></div></div>
  <div class="grid grid-cols-4 gap-2">${stat('Pertemuan',D.sess.length)}${stat('Laporan masuk',D.rep)}${stat('Kelompok',D.nk)}${stat('Peserta',D.rows.length)}</div>
  <p class="text-[11px] text-slate-400 -mt-1">${D.sess.length} pertemuan ber-link dari ${D.planned} yang terjadwal.</p>`
  :`<div class="rounded-xl bg-slate-50 border border-dashed border-line p-4 text-center text-xs text-slate-400 leading-relaxed">Belum ada link atau laporan pada periode ini.<br>${D.planned} pengajian terjadwal.</div>`;
 return `<div class="bg-white rounded-2xl border border-line shadow-card overflow-hidden flex flex-col hover:shadow-soft transition" style="border-top:4px solid ${c}">
  <div class="p-5 flex flex-col gap-4 flex-1">
   <div class="flex items-start gap-3"><div class="w-11 h-11 rounded-xl grid place-items-center shrink-0" style="background:${c}14;color:${c}">${icon(LP_ICON[j],'w-5 h-5')}</div><div class="min-w-0"><h3 class="font-extrabold text-[15px] leading-snug">${KA_JN[j]}</h3><p class="text-[11px] text-slate-400 mt-0.5">${esc(lpPeriodLabel())} · ${LP.k?esc(LP.k):'Semua kelompok'}</p></div></div>
   ${body}</div>
  <div class="px-5 pb-5 flex gap-2"><button type="button"${dis} onclick="lpPrint('${j}')" class="flex-1 h-10 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-2 ${off}" style="background:${c}">${icon('printer','w-4 h-4')} Cetak laporan</button><button type="button"${dis} onclick="lpPreview('${j}')" class="h-10 px-3 rounded-xl border border-line text-xs font-bold ${has?'hover:bg-slate-50':'opacity-40 cursor-not-allowed'}">Pratinjau</button><button type="button"${dis} onclick="lpExcel('${j}')" title="Unduh Excel" aria-label="Unduh Excel" class="h-10 w-10 rounded-xl border border-line grid place-items-center ${has?'hover:bg-slate-50':'opacity-40 cursor-not-allowed'}">${icon('file-spreadsheet','w-4 h-4')}</button><button type="button"${dis} onclick="lpPpt('${j}')" title="Unduh PPT" aria-label="Unduh PPT" class="h-10 w-10 rounded-xl border border-line grid place-items-center ${has?'hover:bg-slate-50':'opacity-40 cursor-not-allowed'}">${icon('presentation','w-4 h-4')}</button></div></div>`;
}
function lpRenderCards(){
 const el=document.getElementById('lpCards');if(!el)return;
 el.innerHTML=kaJns().map(lpCard).join('');
 lucide.createIcons();
}
function lpMode(m){if(m==='range'){LP.per='range';kaRpDefaults(LP);}else if(m==='all')LP.per='all';else if(LP.per==='range'||LP.per==='all')LP.per=String(new Date().getMonth());renderLaporanMenu();}
function lpSet(k,v){LP[k]=k==='y'?parseInt(v,10):v;if(k==='per'){if(v==='range')kaRpDefaults(LP);renderLaporanMenu();return;}lpRenderCards();}
function lpPreview(j){kaRekapOpen(lpRp(j));}
function lpExcel(j){KA_UI.rp=lpRp(j);kaRekapExport();}
function lpDocHtml(j){
 const rp=lpRp(j),D=kaRekapCalc(rp),T=D.T,tot=T.H+T.I+T.A+T.N;
 const judul=j?KA_JN[j]:'Pengajian Muda Mudi Kelompok, Desa, dan Daerah';
 const jl=kaJns().filter(x=>!j||j===x);
 const lab=v=>v.one?(v.n?(v.c.H?'H':v.c.I?'I':v.c.A?'A':'?'):'·'):(v.n?v.c.H+'/'+v.n:'·');
 const tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
 const th=D.cols.map(c=>`<th class="c">${esc(c.lab)}${c.sub?`<br><small>${esc(c.sub)}</small>`:''}</th>`).join('');
 const sum=D.ksum.map((x,i)=>`<tr><td class="c">${i+1}</td><td>${esc(x.k)}</td><td class="c">${x.n}</td><td class="c">${x.rep}/${D.sess.length}</td>${jl.map(z=>`<td class="c">${kaPct(x.per[z].H,x.per[z].d)}</td>`).join('')}<td class="c">${x.t.H}</td><td class="c">${x.t.I}</td><td class="c">${x.t.A}</td><td class="c">${x.t.N}</td><td class="c"><b>${kaPct(x.t.H,x.t.H+x.t.I+x.t.A+x.t.N)}</b></td></tr>`).join('');
 let det='',last=null,kn=0;
 D.rows.forEach(r=>{
  if(r.p.k!==last){last=r.p.k;kn=0;det+=`<tr class="g"><td colspan="${D.cols.length+6}">${esc(last)}</td></tr>`;}
  const tt=r.t.H+r.t.I+r.t.A+r.t.N;
  det+=`<tr><td class="c">${++kn}</td><td>${esc(r.p.n)}</td>${r.cells.map(c=>`<td class="c">${lab(c)}</td>`).join('')}<td class="c">${r.t.H}</td><td class="c">${r.t.I}</td><td class="c">${r.t.A}</td><td class="c">${r.t.N}</td><td class="c"><b>${kaPct(r.t.H,tt)}</b></td></tr>`;
 });
 return `<div class="hd"><div class="k">LAPORAN KEHADIRAN</div><h1>${esc(judul.toUpperCase())}</h1><p>Periode ${esc(lpPeriodLabel())} · ${rp.k?esc(rp.k):'Semua kelompok'}</p></div><div class="rl"></div>
 <table class="sm"><tr><td><b>${D.sess.length}</b><span>Pertemuan dilaporkan</span></td><td><b>${D.rep}</b><span>Laporan masuk</span></td><td><b>${T.H}</b><span>Hadir</span></td><td><b>${T.I}</b><span>Izin</span></td><td><b>${T.A}</b><span>Alpa</span></td><td><b>${T.N}</b><span>Belum mengisi</span></td><td><b>${kaPct(T.H,tot)}</b><span>Persentase hadir</span></td></tr></table>
 <h2>A. Ringkasan per kelompok</h2>
 <table><thead><tr><th class="c" style="width:32px">No</th><th>Kelompok</th><th class="c">Peserta</th><th class="c">Laporan</th>${jl.map(z=>`<th class="c">% Hadir ${kaJnLabel(z)}</th>`).join('')}<th class="c">Hadir</th><th class="c">Izin</th><th class="c">Alpa</th><th class="c">Belum</th><th class="c">% Hadir</th></tr></thead><tbody>${sum}</tbody></table>
 <h2>B. Rincian kehadiran per nama</h2>
 <table><thead><tr><th class="c" style="width:32px">No</th><th>Nama</th>${th}<th class="c">H</th><th class="c">I</th><th class="c">A</th><th class="c">Belum</th><th class="c">%</th></tr></thead><tbody>${det}</tbody></table>
 <p class="lg">Keterangan: H = hadir, I = izin, A = alpa, ? = belum mengisi, · = belum dilaporkan. ${kaRpMonthly(rp)?'Pada rekap setahun atau rentang panjang, kolom bulan berisi jumlah hadir per jumlah pengajian yang dilaporkan.':'Kolom tanggal menunjukkan status kehadiran pada pengajian tersebut.'}</p>
 <div class="sig"><div><p>Mengetahui,</p><p>Pengurus</p><div class="sp"></div><div class="nm">&nbsp;</div></div><div><p>Karangmojo, ${esc(tgl)}</p><p>Penyusun laporan</p><div class="sp"></div><div class="nm">&nbsp;</div></div></div>
 <div class="ft">SIMDEKA • Sistem Informasi dan Manajemen Desa Karangmojo</div>`;
}
function lpPrint(j){
 const D=kaRekapCalc(lpRp(j));
 if(!D.sess.length){showToast('Belum ada data pada periode ini');return;}
 const css=`@page{size:A4 landscape;margin:14mm 12mm 16mm}body{font:11.5px/1.45 Arial,Helvetica,sans-serif;color:#000;margin:0;padding:0 6px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.doc{max-width:1060px;margin:18px auto}.hd{text-align:center}.hd .k{font-size:11px;letter-spacing:.08em;font-weight:700}.hd h1{font-size:17px;margin:4px 0 3px}.hd p{margin:0;font-size:12px}.rl{height:3px;border-top:2px solid #000;border-bottom:.5px solid #000;margin:8px 0 12px}h2{font-size:12.5px;margin:18px 0 6px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #888;padding:3px 5px;vertical-align:middle}th{background:#f0f0f0;font-weight:700}th small{font-weight:400;font-size:9px}.c{text-align:center}thead{display:table-header-group}tr{page-break-inside:avoid}tr.g td{background:#f7f7f7;font-weight:700}table.sm td{text-align:center;padding:6px 4px}table.sm b{display:block;font-size:15px}table.sm span{font-size:10px;color:#333}.lg{font-size:10.5px;margin:8px 0 0}.sig{display:flex;justify-content:space-between;margin-top:26px;page-break-inside:avoid}.sig>div{width:240px;text-align:center}.sig p{margin:0}.sig .sp{height:62px}.sig .nm{border-top:1px solid #000;padding-top:3px}.ft{margin-top:22px;text-align:center;font-size:9.5px;color:#666}@media print{.doc{margin:0;max-width:none}}`;
 const name='Laporan-'+(j?KA_JN[j].replace(/\s+/g,'-'):'Pengajian-Muda-Mudi')+'-'+lpFileLabel();
 const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(name)}</title><style>${css}</style></head><body><div class="doc">${lpDocHtml(j)}</div><script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>`;
 const w=window.open('','_blank');if(!w){showToast('Izinkan pop-up untuk mencetak');return;}
 w.document.open();w.document.write(html);w.document.close();
}
/* ===== Unduh PPT laporan (PptxGenJS dimuat saat dibutuhkan) ===== */
function lpLoadPptx(){return new Promise((ok,no)=>{if(window.PptxGenJS)return ok();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';s.onload=()=>window.PptxGenJS?ok():no(new Error('Pustaka PPT gagal dimuat (butuh internet).'));s.onerror=()=>no(new Error('Pustaka PPT gagal dimuat (butuh internet).'));document.head.appendChild(s);});}
function lpStats(j){
 const D=kaRekapCalc(lpRp(j)),T=D.T,tot=T.H+T.I+T.A+T.N,pc=(h,d)=>d?Math.round(h/d*1000)/10:0;
 const ks=D.ksum.map(x=>{const t=x.t,d=t.H+t.I+t.A+t.N;return {k:x.k,n:x.n,rep:x.rep,H:t.H,I:t.I,A:t.A,N:t.N,p:pc(t.H,d),per:x.per};});
 const trend=D.cols.map((c,i)=>{let h=0,d=0;D.rows.forEach(r=>{const z=r.cells[i].c;h+=z.H;d+=z.H+z.I+z.A+z.N;});return {l:c.lab+(c.sub?' '+c.sub:''),p:pc(h,d)};});
 const ppl=D.rows.map(r=>{const d=r.t.H+r.t.I+r.t.A+r.t.N;return {n:r.p.n,k:r.p.k,H:r.t.H,I:r.t.I,A:r.t.A,d:d,p:pc(r.t.H,d)};}).filter(x=>x.d>0);
 const jn=kaJns().filter(x=>!j||j===x).map(x=>{let h=0,d=0;ks.forEach(k=>{h+=k.per[x].H;d+=k.per[x].d;});return {j:x,l:kaJnLabel(x),p:pc(h,d),d:d};}).filter(x=>x.d>0);
 return {D,T,tot,p:pc(T.H,tot),ks,trend,ppl,jn};
}
function lpNarasi(S,per){
 const L=[],R=[],tot=S.tot||1,r1=v=>Math.round(v*10)/10,ks=S.ks.slice().sort((a,b)=>b.p-a.p),lo=ks[ks.length-1],hi=ks[0];
 L.push('Rata-rata kehadiran '+per+' mencapai '+S.p+'% ('+fmPredikat(S.p)[0].toLowerCase()+') dari '+S.D.sess.length+' pertemuan yang dilaporkan.');
 if(ks.length>1)L.push('Kelompok tertinggi '+hi.k+' ('+hi.p+'%), terendah '+lo.k+' ('+lo.p+'%), selisih '+r1(hi.p-lo.p)+' poin.');
 L.push('Dari seluruh catatan, izin '+Math.round(S.T.I/tot*100)+'%, alpa '+Math.round(S.T.A/tot*100)+'%, dan belum mengisi '+Math.round(S.T.N/tot*100)+'%.');
 if(S.trend.length>1){const a=S.trend[0],b=S.trend[S.trend.length-1],d=r1(b.p-a.p);L.push('Tren '+(d>0?'naik':d<0?'turun':'stabil')+': '+a.p+'% pada '+a.l+' menjadi '+b.p+'% pada '+b.l+'.');}
 const low=S.ppl.filter(x=>x.p<50).length;L.push(low+' peserta berada di bawah 50% kehadiran dan perlu pembinaan.');
 if(ks.length>1)R.push('Beri pendampingan khusus untuk '+lo.k+' agar mendekati capaian '+hi.k+'.');
 if(S.T.N/tot>0.05)R.push('Dorong semua kelompok mengisi laporan tepat waktu agar data tidak berstatus belum mengisi.');
 if(low)R.push('Lakukan pendekatan personal kepada peserta yang kehadirannya di bawah 50%.');
 R.push('Beri apresiasi kepada kelompok dan peserta dengan kehadiran terbaik untuk menjaga semangat.');
 return {L,R,ai:false};
}
async function lpAi(S,judul,per){
 const fb=lpNarasi(S,per);if(!aiCfg().key)return fb;
 try{
  const data={judul,periode:per,pertemuan:S.D.sess.length,hadir:S.T.H,izin:S.T.I,alpa:S.T.A,belum:S.T.N,persen:S.p,kelompok:S.ks.map(x=>({k:x.k,persen:x.p,H:x.H,I:x.I,A:x.A})),tren:S.trend,pesertaDiBawah50:S.ppl.filter(x=>x.p<50).length};
  const c=Object.assign({},aiCfg(),{prompt:'Anda analis laporan pengajian muda mudi. Tulis Bahasa Indonesia formal, hanya berdasar data yang diberikan, jangan mengarang angka. Balas HANYA JSON: {"kesimpulan":[4 sampai 5 kalimat singkat],"rekomendasi":[3 sampai 4 kalimat singkat]}'});
  const t=await aiGen(JSON.stringify(data),c),j=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));
  if((j.kesimpulan||[]).length&&(j.rekomendasi||[]).length)return {L:j.kesimpulan.map(String),R:j.rekomendasi.map(String),ai:true};
 }catch(e){console.warn(e);}
 return fb;
}
function lpLogo(){return new Promise(ok=>{try{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').drawImage(i,0,0,256,256);ok(c.toDataURL('image/png').replace(/^data:/,''));};i.onerror=()=>ok(null);i.src=APP_LOGO;}catch(e){ok(null);}});}
function lpBuildPpt(pres,S,N,judul,per,kel,tgl,logo){
 const C={nv:'0B1F3F',nv2:'173B70',gr:'10A36B',am:'F59E0B',rd:'E5484D',vi:'7C3AED',bl:'3B82F6',go:'C9A227',ink:'0F172A',mu:'64748B',bg:'F8F5EE',ln:'E4DFD3'},F='Calibri',H='Georgia',T=S.T,SH=pres.shapes;
 pres.layout='LAYOUT_WIDE';let no=0;
 const col=p=>p>=85?C.gr:p>=70?C.bl:p>=50?C.am:C.rd,pr=p=>fmPredikat(p)[0];
 const tx=(s,t,o)=>s.addText(t,Object.assign({fontFace:F,margin:0,isTextBox:true,color:C.ink,fontSize:14},o));
 const card=(s,x,y,w,h)=>s.addShape(SH.ROUNDED_RECTANGLE,{x,y,w,h,rectRadius:0.14,fill:{color:'FFFFFF'},line:{color:C.ln,width:0.5},shadow:{type:'outer',color:'0F172A',opacity:0.10,blur:12,offset:3,angle:90}});
 const lg=(s,x,y,w)=>{if(logo)s.addImage({data:logo,x,y,w,h:w});};
 const ORB=[[11.4,-1.3,3.2,0.6,6.3,1.6],[-0.9,-1.1,2.8,11.6,5.7,2.4],[11.9,5.2,3.0,-0.7,-0.6,1.8],[10.6,-1.6,3.6,0.4,6.5,1.4]];
 const base=(eb,t)=>{const s=pres.addSlide();no++;s.background={color:C.bg};const o=ORB[no%ORB.length];
  s.addShape(SH.OVAL,{objectName:'!!orbA',x:o[0],y:o[1],w:o[2],h:o[2],fill:{color:C.go,transparency:86},line:{color:C.go,transparency:100}});
  s.addShape(SH.OVAL,{objectName:'!!orbB',x:o[3],y:o[4],w:o[5],h:o[5],fill:{color:C.nv2,transparency:90},line:{color:C.nv2,transparency:100}});
  s.addShape(SH.RECTANGLE,{objectName:'!!rule',x:0.6,y:1.42,w:0.9,h:0.05,fill:{color:C.go},line:{color:C.go,transparency:100}});
  tx(s,eb.toUpperCase(),{objectName:'!!eyebrow',x:0.6,y:0.38,w:9,h:0.28,fontSize:11,bold:true,color:'8A6D12',charSpacing:4});
  tx(s,t,{objectName:'!!title',x:0.6,y:0.68,w:12.1,h:0.7,fontFace:H,fontSize:30,bold:true,color:C.nv,fit:'shrink',valign:'middle'});
  lg(s,0.6,6.95,0.34);tx(s,'SIMDEKA  |  '+judul+'  |  '+per,{x:1.05,y:6.98,w:10,h:0.3,fontSize:10,color:C.mu,valign:'middle'});
  tx(s,String(no),{x:11.9,y:6.98,w:0.8,h:0.3,fontSize:10,color:C.mu,align:'right',valign:'middle'});return s;};
 const kpi=(s,x,y,w,h,l,v,c)=>{card(s,x,y,w,h);s.addShape(SH.OVAL,{x:x+0.3,y:y+0.28,w:0.18,h:0.18,fill:{color:c},line:{color:c}});
  tx(s,l,{x:x+0.62,y:y+0.2,w:w-0.8,h:0.34,fontSize:13,color:C.mu});tx(s,String(v),{x:x+0.3,y:y+0.7,w:w-0.5,h:0.8,fontFace:H,fontSize:36,bold:true,color:c});};
 const ax={catAxisLabelColor:'475569',valAxisLabelColor:'94A3B8',catAxisLabelFontSize:12,valAxisLabelFontSize:10,catAxisLabelFontFace:F,valAxisLabelFontFace:F,catAxisLineShow:false,valAxisLineShow:false,valGridLine:{color:'EDF1F7',size:0.5},catGridLine:{style:'none'},dataLabelFontFace:F,dataLabelFontSize:12,dataLabelFontBold:true,dataLabelColor:C.ink,legendFontFace:F,legendFontSize:12,legendColor:'475569'};
 const hb=(cx,y,w,h,cats,vals,colors,o)=>Object.assign({},ax,{x:cx,y,w,h,barDir:'bar',chartColors:colors,barGapWidthPct:70,catAxisOrientation:'maxMin',valAxisMinVal:0,valAxisMaxVal:100,valAxisHidden:true,valGridLine:{style:'none'},showLegend:false,showValue:true,dataLabelPosition:'outEnd',dataLabelFormatCode:'0"%"'},o||{});
 /* 1 sampul */
 let s=pres.addSlide();no++;s.background={color:C.nv};
 s.addShape(SH.OVAL,{objectName:'!!orbA',x:8.7,y:-1.4,w:6.2,h:6.2,fill:{color:C.nv2,transparency:45},line:{color:C.nv2,transparency:100}});
 s.addShape(SH.OVAL,{objectName:'!!orbB',x:10.6,y:4.2,w:4.4,h:4.4,fill:{color:C.go,transparency:80},line:{color:C.go,transparency:100}});
 s.addShape(SH.ROUNDED_RECTANGLE,{x:0.9,y:0.8,w:1.25,h:1.25,rectRadius:0.22,fill:{color:'FFFFFF'},line:{color:'FFFFFF',transparency:100}});lg(s,1.0,0.9,1.05);
 tx(s,'SIMDEKA',{x:2.4,y:0.92,w:5,h:0.55,fontFace:H,fontSize:28,bold:true,color:'FFFFFF'});
 tx(s,'Sistem Informasi dan Manajemen Desa Karangmojo',{x:2.4,y:1.48,w:6,h:0.4,fontSize:14,color:'A9B8D4'});
 tx(s,'LAPORAN KEHADIRAN',{x:0.9,y:2.9,w:8,h:0.4,fontSize:16,bold:true,color:C.go,charSpacing:6});
 tx(s,judul,{x:0.9,y:3.4,w:8.2,h:1.9,fontFace:H,fontSize:38,bold:true,color:'FFFFFF',valign:'top'});
 tx(s,'Periode '+per+'  |  '+(kel||'Semua kelompok'),{x:0.9,y:5.5,w:8,h:0.4,fontSize:18,color:'DCE6F5'});
 tx(s,'Karangmojo, '+tgl,{x:0.9,y:6.55,w:8,h:0.35,fontSize:13,color:'A9B8D4'});
 s.addShape(SH.ROUNDED_RECTANGLE,{x:9.4,y:3.0,w:3.3,h:2.7,rectRadius:0.2,fill:{color:'FFFFFF',transparency:90},line:{color:'FFFFFF',transparency:70,width:0.75}});
 tx(s,S.p+'%',{x:9.4,y:3.3,w:3.3,h:1.0,fontFace:H,fontSize:54,bold:true,color:'FFFFFF',align:'center'});
 tx(s,'rata-rata kehadiran',{x:9.4,y:4.35,w:3.3,h:0.4,fontSize:14,color:'DCE6F5',align:'center'});
 tx(s,pr(S.p),{x:9.4,y:4.85,w:3.3,h:0.45,fontSize:18,bold:true,color:C.go,align:'center'});
 /* 2 ringkasan */
 s=base('Ringkasan eksekutif','Gambaran umum kehadiran periode ini');card(s,0.6,1.65,4.6,5.1);
 s.addChart(pres.charts.DOUGHNUT,[{name:'p',labels:['Hadir','Lainnya'],values:[Math.max(S.p,0.1),Math.max(100-S.p,0.1)]}],{x:0.85,y:1.85,w:4.1,h:3.7,holeSize:78,chartColors:[col(S.p),'E5EAF2'],showLegend:false,showPercent:false,showValue:false,showLabel:false,dataBorder:{pt:0,color:'FFFFFF'}});
 tx(s,S.p+'%',{x:0.85,y:3.15,w:4.1,h:0.9,fontFace:H,fontSize:38,bold:true,color:col(S.p),align:'center'});tx(s,'hadir',{x:0.85,y:4.05,w:4.1,h:0.35,fontSize:14,color:C.mu,align:'center'});
 tx(s,pr(S.p),{x:0.85,y:5.65,w:4.1,h:0.45,fontSize:20,bold:true,color:col(S.p),align:'center'});
 tx(s,S.D.sess.length+' pertemuan  |  '+S.ks.length+' kelompok  |  '+S.ppl.length+' peserta',{x:0.85,y:6.15,w:4.1,h:0.35,fontSize:12,color:C.mu,align:'center'});
 [['Pertemuan dilaporkan',S.D.sess.length,C.nv2],['Laporan masuk',S.D.rep,C.vi],['Hadir',T.H,C.gr],['Izin',T.I,C.am],['Alpa',T.A,C.rd],['Belum mengisi',T.N,'94A3B8']].forEach((c,i)=>kpi(s,5.5+(i%2)*3.65,1.65+Math.floor(i/2)*1.75,3.55,1.6,c[0],c[1],c[2]));
 /* 3 komposisi */
 const st=[['Hadir',T.H,C.gr],['Izin',T.I,C.am],['Alpa',T.A,C.rd],['Belum mengisi',T.N,'94A3B8']];
 s=base('Komposisi','Sebaran status seluruh catatan absensi');card(s,0.6,1.65,6.0,5.1);card(s,6.9,1.65,5.8,5.1);
 s.addChart(pres.charts.DOUGHNUT,[{name:'Status',labels:st.map(x=>x[0]),values:st.map(x=>x[1])}],{x:0.8,y:1.85,w:5.6,h:4.7,holeSize:66,chartColors:st.map(x=>x[2]),showLegend:false,showPercent:true,showValue:false,dataLabelColor:'FFFFFF',dataLabelFontSize:13,dataLabelFontBold:true,dataLabelFontFace:F,dataBorder:{pt:2,color:'FFFFFF'}});
 tx(s,String(S.tot),{x:0.8,y:3.7,w:5.6,h:0.7,fontFace:H,fontSize:34,bold:true,color:C.nv,align:'center'});tx(s,'total catatan',{x:0.8,y:4.4,w:5.6,h:0.35,fontSize:13,color:C.mu,align:'center'});
 st.forEach((c,i)=>{const y=2.0+i*1.15,pc=S.tot?c[1]/S.tot:0;
  tx(s,c[0],{x:7.25,y,w:3,h:0.4,fontSize:17,bold:true});tx(s,c[1]+'  ('+Math.round(pc*100)+'%)',{x:9.9,y,w:2.4,h:0.4,fontSize:17,bold:true,color:c[2],align:'right'});
  s.addShape(SH.ROUNDED_RECTANGLE,{x:7.25,y:y+0.55,w:5.05,h:0.16,rectRadius:0.08,fill:{color:'E5EAF2'},line:{color:'E5EAF2'}});
  s.addShape(SH.ROUNDED_RECTANGLE,{x:7.25,y:y+0.55,w:Math.max(0.16,5.05*pc),h:0.16,rectRadius:0.08,fill:{color:c[2]},line:{color:c[2]}});});
 /* 4 tren */
 if(S.trend.length>1){const mx=S.trend.reduce((a,b)=>b.p>a.p?b:a),mn=S.trend.reduce((a,b)=>b.p<a.p?b:a),dd={name:'% Hadir',labels:S.trend.map(x=>x.l),values:S.trend.map(x=>x.p)};
  s=base('Tren','Persentase hadir sepanjang periode');card(s,0.6,1.65,8.4,5.1);
  s.addChart(pres.charts.LINE,[dd],Object.assign({},ax,{x:0.8,y:1.85,w:8.0,h:4.7,chartColors:[C.gr],lineSize:3,lineDataSymbol:'circle',lineDataSymbolSize:10,lineSmooth:true,valAxisMinVal:0,valAxisMaxVal:100,valAxisLabelFormatCode:'0"%"',showLegend:false,showValue:true,dataLabelPosition:'t',dataLabelFormatCode:'0"%"'}));
  kpi(s,9.3,1.65,3.4,1.6,'Rata-rata',S.p+'%',C.nv2);kpi(s,9.3,3.4,3.4,1.6,'Tertinggi: '+mx.l,mx.p+'%',C.gr);kpi(s,9.3,5.15,3.4,1.6,'Terendah: '+mn.l,mn.p+'%',C.rd);}
 /* 5 per kelompok */
 const kd=S.ks.slice().sort((a,b)=>b.p-a.p),hi=kd[0],lo=kd[kd.length-1];
 s=base('Kelompok','Persentase hadir per kelompok');card(s,0.6,1.65,8.4,5.1);
 s.addChart(pres.charts.BAR,[{name:'% Hadir',labels:kd.map(x=>x.k),values:kd.map(x=>x.p)}],hb(0.8,1.85,8.0,4.7,0,0,kd.map(x=>col(x.p))));
 card(s,9.3,1.65,3.4,2.75);tx(s,'Predikat',{x:9.6,y:1.85,w:3,h:0.35,fontSize:14,bold:true,color:C.nv});
 [['85% ke atas  Sangat baik',C.gr],['70 - 84%  Baik',C.bl],['50 - 69%  Cukup',C.am],['Di bawah 50%  Perlu pembinaan',C.rd]].forEach((c,i)=>{s.addShape(SH.OVAL,{x:9.6,y:2.4+i*0.5,w:0.18,h:0.18,fill:{color:c[1]},line:{color:c[1]}});tx(s,c[0],{x:9.95,y:2.32+i*0.5,w:2.65,h:0.35,fontSize:12,color:'334155'});});
 card(s,9.3,4.6,3.4,2.15);tx(s,'Terbaik',{x:9.6,y:4.78,w:3,h:0.3,fontSize:12,color:C.mu});tx(s,hi.k+'  '+hi.p+'%',{x:9.6,y:5.08,w:3,h:0.4,fontSize:16,bold:true,color:C.gr,fit:'shrink'});
 tx(s,'Terendah',{x:9.6,y:5.6,w:3,h:0.3,fontSize:12,color:C.mu});tx(s,lo.k+'  '+lo.p+'%',{x:9.6,y:5.9,w:3,h:0.4,fontSize:16,bold:true,color:C.rd,fit:'shrink'});
 /* 6 stacked */
 s=base('Rincian','Jumlah hadir, izin, dan alpa per kelompok');card(s,0.6,1.65,12.1,5.1);
 s.addChart(pres.charts.BAR,[{name:'Hadir',labels:kd.map(x=>x.k),values:kd.map(x=>x.H)},{name:'Izin',labels:kd.map(x=>x.k),values:kd.map(x=>x.I)},{name:'Alpa',labels:kd.map(x=>x.k),values:kd.map(x=>x.A)}],Object.assign({},ax,{x:0.8,y:1.85,w:11.7,h:4.7,barDir:'bar',barGrouping:'stacked',chartColors:[C.gr,C.am,C.rd],barGapWidthPct:60,catAxisOrientation:'maxMin',valAxisHidden:true,valGridLine:{style:'none'},showLegend:true,legendPos:'b',showValue:true,dataLabelPosition:'ctr',dataLabelColor:'FFFFFF'}));
 /* 7 jenis + 8 peta panas */
 if(S.jn.length>1){const jc=[C.nv2,C.gr,C.vi];s=base('Jenis pengajian','Perbandingan persentase hadir menurut jenis');card(s,0.6,1.65,7.6,5.1);
  s.addChart(pres.charts.BAR,[{name:'% Hadir',labels:S.jn.map(x=>x.l),values:S.jn.map(x=>x.p)}],Object.assign({},ax,{x:0.8,y:1.85,w:7.2,h:4.7,barDir:'col',chartColors:jc,barGapWidthPct:90,valAxisMinVal:0,valAxisMaxVal:100,valAxisLabelFormatCode:'0"%"',showLegend:false,showValue:true,dataLabelPosition:'outEnd',dataLabelFormatCode:'0"%"'}));
  S.jn.forEach((x,i)=>kpi(s,8.5,1.65+i*1.75,4.2,1.6,x.l+'  ('+x.d+' catatan)',x.p+'%',jc[i%3]));
  const pc2=(h,d)=>d?Math.round(h/d*1000)/10:null;
  for(let o=0;o<S.ks.length;o+=8){s=base('Peta panas','Hadir kelompok menurut jenis pengajian'+(S.ks.length>8?' ('+(o/8+1)+'/'+Math.ceil(S.ks.length/8)+')':''));card(s,0.6,1.65,12.1,5.1);
   const hd=['Kelompok'].concat(S.jn.map(x=>x.l),['Total']).map((t,i)=>({text:t,options:{bold:true,color:'FFFFFF',fill:{color:C.nv2},align:i?'center':'left'}}));
   const rows=[hd].concat(S.ks.slice(o,o+8).map(k=>[{text:k.k,options:{bold:true,align:'left',fill:{color:'FFFFFF'}}}].concat(S.jn.map(j=>{const v=pc2(k.per[j.j].H,k.per[j.j].d);return {text:v==null?'-':v+'%',options:{align:'center',bold:true,color:v==null?C.mu:col(v)==C.am?'92400E':col(v),fill:{color:v==null?'F1F5F9':v>=85?'D1FAE5':v>=70?'DBEAFE':v>=50?'FEF3C7':'FEE2E2'}}};}),[{text:k.p+'%',options:{align:'center',bold:true,color:col(k.p),fill:{color:'FFFFFF'}}}])));
   s.addTable(rows,{x:0.9,y:1.95,w:11.5,colW:[11.5-1.6*(S.jn.length+1)].concat(S.jn.map(()=>1.6),[1.6]),rowH:0.52,fontFace:F,fontSize:14,color:C.ink,border:{type:'solid',pt:2,color:'FFFFFF'},valign:'middle'});}}
 /* 9 tabel */
 for(let o=0;o<S.ks.length;o+=8){
  s=base('Rekap','Ringkasan per kelompok'+(S.ks.length>8?' ('+(o/8+1)+'/'+Math.ceil(S.ks.length/8)+')':''));card(s,0.6,1.65,12.1,5.1);
  const hd=['Kelompok','Peserta','Laporan','Hadir','Izin','Alpa','Belum','% Hadir','Predikat'].map((t,i)=>({text:t,options:{bold:true,color:'FFFFFF',fill:{color:C.nv2},align:i?'center':'left'}}));
  const rows=[hd].concat(S.ks.slice(o,o+8).map((x,i)=>[x.k,x.n,x.rep+'/'+S.D.sess.length,x.H,x.I,x.A,x.N,x.p+'%',pr(x.p)].map((v,c)=>({text:String(v),options:{align:c?'center':'left',bold:c===0||c>=7,color:c>=7?col(x.p):C.ink,fill:{color:i%2?'F8FAFC':'FFFFFF'}}}))));
  s.addTable(rows,{x:0.9,y:1.95,w:11.5,colW:[2.5,1.0,1.2,0.9,0.9,0.9,1.0,1.1,2.0],rowH:0.5,fontFace:F,fontSize:14,border:[{type:'none'},{type:'none'},{type:'solid',pt:0.5,color:C.ln},{type:'none'}],valign:'middle'});}
 /* 10 peserta */
 const top=S.ppl.slice().sort((a,b)=>b.p-a.p||b.H-a.H).slice(0,8),bot=S.ppl.slice().sort((a,b)=>a.p-b.p||b.A-a.A).slice(0,8);
 s=base('Peserta','Kehadiran tertinggi dan yang perlu pembinaan');card(s,0.6,1.65,5.95,5.1);card(s,6.75,1.65,5.95,5.1);
 tx(s,'Kehadiran tertinggi',{x:0.95,y:1.9,w:5.3,h:0.4,fontSize:18,bold:true,color:C.gr});tx(s,'Perlu pembinaan',{x:7.1,y:1.9,w:5.3,h:0.4,fontSize:18,bold:true,color:C.rd});
 s.addChart(pres.charts.BAR,[{name:'% Hadir',labels:top.map(x=>x.n),values:top.map(x=>x.p)}],hb(0.8,2.4,5.65,4.25,0,0,[C.gr],{catAxisLabelFontSize:11}));
 s.addChart(pres.charts.BAR,[{name:'% Hadir',labels:bot.map(x=>x.n),values:bot.map(x=>x.p)}],hb(6.9,2.4,5.65,4.25,0,0,[C.rd],{catAxisLabelFontSize:11}));
 /* 11 kesimpulan */
 s=base(N.ai?'Kesimpulan  |  disusun Gemini AI':'Kesimpulan  |  disusun otomatis','Kesimpulan laporan');card(s,0.6,1.65,12.1,5.1);
 const L=N.L.slice(0,5),rh=Math.min(0.95,4.7/L.length);
 L.forEach((t,i)=>{const y=1.85+i*rh;s.addShape(SH.OVAL,{x:0.95,y:y+0.08,w:0.5,h:0.5,fill:{color:C.nv2},line:{color:C.nv2}});
  tx(s,String(i+1),{x:0.95,y:y+0.08,w:0.5,h:0.5,fontSize:16,bold:true,color:'FFFFFF',align:'center',valign:'middle'});
  tx(s,t,{x:1.7,y:y,w:10.7,h:rh-0.1,fontSize:17,valign:'middle',fit:'shrink'});});
 /* 12 rekomendasi */
 s=pres.addSlide();no++;s.background={color:C.nv};
 s.addShape(SH.OVAL,{objectName:'!!orbA',x:9.8,y:-1.8,w:5.6,h:5.6,fill:{color:C.nv2,transparency:45},line:{color:C.nv2,transparency:100}});
 s.addShape(SH.OVAL,{objectName:'!!orbB',x:-1.2,y:5.0,w:3.8,h:3.8,fill:{color:C.go,transparency:84},line:{color:C.go,transparency:100}});
 tx(s,'REKOMENDASI',{x:0.9,y:0.55,w:8,h:0.3,fontSize:12,bold:true,color:C.go,charSpacing:5});tx(s,'Langkah tindak lanjut',{x:0.9,y:0.85,w:9,h:0.75,fontFace:H,fontSize:34,bold:true,color:'FFFFFF'});
 N.R.slice(0,4).forEach((t,i)=>{const x=0.9+(i%2)*5.95,y=1.85+Math.floor(i/2)*1.6;
  s.addShape(SH.ROUNDED_RECTANGLE,{x,y,w:5.75,h:1.4,rectRadius:0.14,fill:{color:'FFFFFF',transparency:90},line:{color:'FFFFFF',transparency:75,width:0.5}});
  tx(s,String(i+1),{x:x+0.25,y:y+0.2,w:0.6,h:0.9,fontFace:H,fontSize:32,bold:true,color:C.go,valign:'middle'});
  tx(s,t,{x:x+0.95,y:y+0.12,w:4.6,h:1.16,fontSize:14,color:'E2E8F0',valign:'middle',fit:'shrink'});});
 tx(s,'Mengetahui,\nPengurus',{x:0.9,y:5.25,w:4.5,h:0.8,fontSize:15,color:'DCE6F5',align:'center'});
 tx(s,'Karangmojo, '+tgl+'\nPenyusun laporan',{x:7.9,y:5.25,w:4.5,h:0.8,fontSize:15,color:'DCE6F5',align:'center'});
 s.addShape(SH.ROUNDED_RECTANGLE,{x:0.9,y:6.35,w:0.7,h:0.7,rectRadius:0.12,fill:{color:'FFFFFF'},line:{color:'FFFFFF',transparency:100}});lg(s,0.95,6.4,0.6);
 tx(s,'SIMDEKA',{x:1.8,y:6.4,w:4,h:0.35,fontFace:H,fontSize:18,bold:true,color:'FFFFFF'});tx(s,'Sistem Informasi dan Manajemen Desa Karangmojo',{x:1.8,y:6.72,w:6,h:0.3,fontSize:11,color:'A9B8D4'});
 return pres;
}
async function lpPpt(j){
 const S=lpStats(j);
 if(!S.D.sess.length){showToast('Belum ada data pada periode ini');return;}
 try{
  showToast('Menyusun PPT…');
  const per=lpPeriodLabel(),judul=j?KA_JN[j]:'Pengajian Muda Mudi Kelompok, Desa, dan Daerah',tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const P=await jrLoadLibs();const N=await lpAi(S,judul,per),lgo=await lpLogo(),pres=new P();
  pres.title='Laporan '+judul+' '+per;lpBuildPpt(pres,S,N,judul,per,LP.k,tgl,lgo);
  const buf=await pres.write({outputType:'arraybuffer'}),blob=await jrMorph(buf,'blob'),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='Laporan-'+(j?KA_JN[j].replace(/\s+/g,'-'):'Pengajian-Muda-Mudi')+'-'+lpFileLabel()+'.pptx';
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
  showToast(N.ai?'PPT selesai (kesimpulan oleh Gemini AI)':'PPT selesai (kesimpulan otomatis; isi API Key Gemini untuk versi AI)');
 }catch(e){console.error(e);showToast(e.message||'Gagal membuat PPT');}
}

/* ===================================================================
   PPT LAPORAN JURNAL KELOMPOK (bahan musyawarah desa) — transisi Morph
   Data: jurnal pengajian muda mudi kelompok (materi, nasehat, kendala, catatan) + kehadiran
   =================================================================== */
const JR_C={nv:'0B1F3F',nv2:'16335F',go:'C9A227',gd:'8A6D12',iv:'F8F5EE',ink:'1B2433',mu:'6B7280',ln:'E4DFD3',gr:'2F8F6B',rd:'C2493B',am:'C98A1B',wh:'FFFFFF',pa:'EFE9DA'};
function jrCut(t,n){t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1).trimEnd()+'…':t;}
function jrTglS(iso){return /^\d{4}-\d{2}-\d{2}$/.test(iso||'')?new Date(iso+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'-';}
function jrTglP(iso){return /^\d{4}-\d{2}-\d{2}$/.test(iso||'')?new Date(iso+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'}):'-';}
function jrPct(h,d){return d?Math.round(h/d*1000)/10:null;}
function jrNasOf(j){
 if(!j)return {st:'',by:'',isi:''};
 const st=(j.nas==='sudah'||j.nas==='belum'||j.nas==='tidak')?j.nas:(j.nasehat?'sudah':'');
 return {st:st,by:j.nsp||'',isi:j.nasehat||''};
}
/* ---------- pengumpul data dari form absensi kelompok ---------- */
function jrCollect(months,rg,onlyKel,sesiOf,formOf,respOf,respTg,ymOf,kelList,aktif){
 const map=new Map(),get=k=>{if(!map.has(k))map.set(k,{k:k,rows:[]});return map.get(k);};
 aktif.forEach(k=>{if(!onlyKel||onlyKel===k)get(k);});if(onlyKel)get(onlyKel);
 let any=0;
 months.forEach(mo=>{
  const y=mo.y,m=mo.m,f=formOf(y,m),ym=ymOf(y,m),sesi=sesiOf(y,m),R=f?respOf(f.id):[];
  const dates=[...new Set(sesi.concat(R.map(r=>respTg(f,r))))].filter(d=>d&&d.slice(0,7)===ym&&(!rg||(d>=rg.from&&d<=rg.to))).sort();
  dates.forEach(tg=>{
   any++;
   const rs=R.filter(r=>respTg(f,r)===tg).sort((a,b)=>(a.ts||0)-(b.ts||0));
   rs.forEach(r=>{if(r.kel&&(!onlyKel||r.kel===onlyKel))get(r.kel);});
   map.forEach(o=>{
    const mine=rs.filter(r=>r.kel===o.k),w=mine.filter(r=>r.j).pop(),j=w?w.j:null;
    const row={tgl:tg,lap:mine.length>0,H:0,I:0,A:0,q:'',h:'',m:'',ns:jrNasOf(j),kd:'',ct:''};
    mine.forEach(r=>Object.keys(r.m||{}).forEach(k=>{const v=r.m[k];if(v==='H'||v==='I'||v==='A')row[v]++;}));
    if(j){row.q=j.surat?('QS. '+j.surat+(j.ayat?', ayat '+j.ayat:'')):'';row.h=j.hadist?(j.hadist+(j.hal?', hal. '+j.hal:'')):'';row.m=(!j.surat&&!j.hadist)?(j.materi||''):'';row.kd=j.kendala||'';row.ct=j.catatan||'';}
    o.rows.push(row);
   });
  });
 });
 const idx=k=>{const i=kelList.indexOf(k);return i<0?999:i;};
 const kel=[...map.values()].sort((a,b)=>idx(a.k)-idx(b.k)||a.k.localeCompare(b.k,'id')).map(o=>{
  const R=o.rows,H=R.reduce((s,r)=>s+r.H,0),I=R.reduce((s,r)=>s+r.I,0),A=R.reduce((s,r)=>s+r.A,0);
  const jur=R.filter(r=>r.q||r.h||r.m||r.ns.st||r.kd||r.ct).length;
  return {k:o.k,rows:R,n:R.length,lap:R.filter(r=>r.lap).length,jur:jur,
   nasS:R.filter(r=>r.ns.st==='sudah').length,nasB:R.filter(r=>r.ns.st==='belum').length,nasT:R.filter(r=>r.ns.st==='tidak').length,nd:R.length-R.filter(r=>r.ns.st==='tidak').length,H:H,I:I,A:A,p:jrPct(H,H+I+A),
   kendala:R.filter(r=>r.kd.trim()).map(r=>({tgl:r.tgl,t:r.kd})),catatan:R.filter(r=>r.ct.trim()).map(r=>({tgl:r.tgl,t:r.ct}))};
 });
 const sum=f=>kel.reduce((s,x)=>s+f(x),0),H=sum(x=>x.H),I=sum(x=>x.I),A=sum(x=>x.A);
 return {any:any,kel:kel,tot:{kel:kel.length,melapor:kel.filter(x=>x.lap>0).length,n:sum(x=>x.n),lap:sum(x=>x.lap),jur:sum(x=>x.jur),nasS:sum(x=>x.nasS),nasB:sum(x=>x.nasB),nasT:sum(x=>x.nasT),nd:sum(x=>x.nd),H:H,I:I,A:A,p:jrPct(H,H+I+A),kendala:sum(x=>x.kendala.length),catatan:sum(x=>x.catatan.length)}};
}
/* ---------- penyusun slide ---------- */
function jrBuildPpt(pres,D,per,tgl,logo){
 const C=JR_C,F='Calibri',H='Georgia',SH=pres.shapes;pres.layout='LAYOUT_WIDE';let no=0;
 const tx=(s,t,o)=>s.addText(t,Object.assign({fontFace:F,margin:0,color:C.ink,fontSize:14,valign:'top'},o));
 const col=p=>p==null?C.mu:p>=85?C.gr:p>=70?'3B6FB6':p>=50?C.am:C.rd;
 const card=(s,x,y,w,h)=>s.addShape(SH.ROUNDED_RECTANGLE,{x,y,w,h,rectRadius:0.12,fill:{color:C.wh},line:{color:C.ln,width:0.75},shadow:{type:'outer',color:'1B2433',opacity:0.07,blur:10,offset:2,angle:90}});
 /* objek bernama '!!' dipasangkan oleh Morph antar slide */
 const MODE={
  cover:{a:{x:8.6,y:-1.8,w:6.8,fill:C.nv2,tr:40},b:{x:10.9,y:4.5,w:3.8,fill:C.go,tr:80},r:{x:0.9,y:3.0,w:1.1},e:{x:0.9,y:2.45,w:9},t:{x:0.9,y:3.25,w:8.2,h:1.9,sz:40,c:C.wh}},
  div:{a:{x:-2.6,y:3.4,w:6.2,fill:C.nv2,tr:55},b:{x:10.2,y:-1.3,w:3.4,fill:C.go,tr:78},r:{x:0.9,y:4.3,w:1.1},e:{x:0.9,y:2.0,w:9},t:{x:0.9,y:4.5,w:8.6,h:0.8,sz:20,c:'DCE6F5'}},
  content:{a:{x:11.5,y:-1.2,w:3.0,fill:C.go,tr:86},b:{x:-0.7,y:6.5,w:1.5,fill:C.nv2,tr:90},r:{x:0.7,y:1.52,w:0.9},e:{x:0.7,y:0.42,w:9},t:{x:0.7,y:0.72,w:9.6,h:0.75,sz:28,c:C.nv}},
  end:{a:{x:9.6,y:-2.0,w:6.0,fill:C.nv2,tr:40},b:{x:-1.4,y:5.2,w:3.6,fill:C.go,tr:82},r:{x:0.9,y:1.45,w:1.1},e:{x:0.9,y:0.55,w:9},t:{x:0.9,y:0.85,w:9,h:0.6,sz:32,c:C.wh}}
 };
 const base=(mode,eb,title,opt)=>{
  opt=opt||{};const M=MODE[mode],dark=mode!=='content',s=pres.addSlide();no++;
  s.background={color:dark?C.nv:C.iv};
  s.addShape(SH.OVAL,{objectName:'!!orbA',x:M.a.x,y:M.a.y,w:M.a.w,h:M.a.w,fill:{color:M.a.fill,transparency:M.a.tr},line:{color:M.a.fill,transparency:100}});
  s.addShape(SH.OVAL,{objectName:'!!orbB',x:M.b.x,y:M.b.y,w:M.b.w,h:M.b.w,fill:{color:M.b.fill,transparency:M.b.tr},line:{color:M.b.fill,transparency:100}});
  s.addShape(SH.RECTANGLE,{objectName:'!!rule',x:M.r.x,y:M.r.y,w:M.r.w,h:0.05,fill:{color:C.go},line:{color:C.go,transparency:100}});
  tx(s,String(eb).toUpperCase(),{objectName:'!!eyebrow',x:M.e.x,y:M.e.y,w:M.e.w,h:0.32,fontSize:11,bold:true,charSpacing:4,color:dark?C.go:C.gd});
  tx(s,title,{objectName:'!!title',x:M.t.x,y:M.t.y,w:M.t.w,h:M.t.h,fontFace:H,fontSize:M.t.sz,bold:mode!=='div',color:M.t.c,fit:'shrink'});
  if(opt.kel){
   if(mode==='div')tx(s,opt.kel,{objectName:'!!kel',x:0.9,y:2.5,w:9.2,h:1.6,fontFace:H,fontSize:54,bold:true,color:C.wh,fit:'shrink'});
   else tx(s,opt.kel,{objectName:'!!kel',x:8.4,y:0.48,w:4.3,h:0.42,fontFace:H,fontSize:15,italic:true,color:C.gd,align:'right',fit:'shrink'});
  }
  if(mode==='content'||opt.foot){
   s.addShape(SH.LINE,{x:0.7,y:6.92,w:11.93,h:0,line:{color:C.ln,width:0.75}});
   tx(s,'SIMDEKA  |  Laporan Jurnal Pengajian Muda Mudi Kelompok  |  '+per,{x:0.7,y:7.02,w:10,h:0.28,fontSize:10,color:C.mu});
   tx(s,String(no),{x:11.6,y:7.02,w:1.03,h:0.28,fontSize:10,color:C.mu,align:'right'});
  }
  return s;
 };
 const stat=(s,x,y,w,v,l,c,dk)=>{tx(s,String(v),{x,y,w,h:0.62,fontFace:H,fontSize:30,bold:true,color:c||C.go,fit:'shrink'});tx(s,l,{x,y:y+0.66,w,h:0.3,fontSize:12,color:dk?'B7C4DD':C.mu});};
 const kpi=(s,x,y,w,h,l,v,sub,c)=>{card(s,x,y,w,h);s.addShape(SH.RECTANGLE,{x:x+0.25,y:y+0.3,w:0.07,h:h-0.6,fill:{color:c},line:{color:c,transparency:100}});
  tx(s,l,{x:x+0.5,y:y+0.2,w:w-0.7,h:0.3,fontSize:12,color:C.mu});tx(s,String(v),{x:x+0.5,y:y+0.5,w:w-0.7,h:0.7,fontFace:H,fontSize:30,bold:true,color:c,fit:'shrink'});
  if(sub)tx(s,sub,{x:x+0.5,y:y+h-0.45,w:w-0.7,h:0.3,fontSize:11,color:C.mu,fit:'shrink'});};
 const hc=(t,al)=>({text:t,options:{bold:true,color:C.wh,fill:{color:C.nv2},align:al||'left',fontSize:12}});
 const T=D.tot,K=D.kel;
 /* 1 sampul */
 let s=base('cover','Laporan jurnal pengajian muda mudi kelompok','Jurnal, capaian, dan kendala setiap kelompok');
 tx(s,'Periode '+per,{x:0.9,y:5.35,w:8,h:0.4,fontSize:18,color:'DCE6F5'});
 tx(s,'Bahan laporan kelompok kepada desa untuk musyawarah',{x:0.9,y:5.8,w:8.5,h:0.4,fontSize:14,color:'A9B8D4'});
 tx(s,'Karangmojo, '+tgl,{x:0.9,y:6.7,w:8,h:0.3,fontSize:12,color:'A9B8D4'});
 s.addShape(SH.ROUNDED_RECTANGLE,{x:0.9,y:0.7,w:0.95,h:0.95,rectRadius:0.18,fill:{color:C.wh},line:{color:C.wh,transparency:100}});
 if(logo)s.addImage({data:logo,x:0.98,y:0.78,w:0.79,h:0.79});
 tx(s,'SIMDEKA',{x:2.1,y:0.78,w:5,h:0.45,fontFace:H,fontSize:24,bold:true,color:C.wh});
 tx(s,'Sistem Informasi dan Manajemen Desa Karangmojo',{x:2.1,y:1.25,w:6,h:0.35,fontSize:13,color:'A9B8D4'});
 /* 2 ringkasan */
 s=base('content','Ringkasan','Gambaran seluruh kelompok');
 const kd=K.filter(x=>x.p!=null).sort((a,b)=>b.p-a.p);
 [['Kelompok melapor',T.melapor+' dari '+T.kel,'jurnal atau absensi masuk',C.nv2],['Pertemuan dijadwalkan',T.n,'per kelompok dijumlahkan',C.nv2],
  ['Jurnal terisi',T.jur+' dari '+T.n,T.n?Math.round(T.jur/T.n*100)+'% pertemuan':'',C.gr],['Nasehat terlaksana',T.nasS+' dari '+T.nd,(T.nasB?T.nasB+' belum terlaksana':'')+(T.nasT?(T.nasB?', ':'')+T.nasT+' tanpa nasehat':''),C.gr],
  ['Kehadiran rata-rata',T.p==null?'-':T.p+'%','hadir dari seluruh catatan',col(T.p)],['Kendala dilaporkan',T.kendala,T.catatan+' catatan untuk desa',T.kendala?C.rd:C.mu]]
  .forEach((c,i)=>kpi(s,0.7+(i%2)*3.05,1.95+Math.floor(i/2)*1.6,2.9,1.45,c[0],c[1],c[2],c[3]));
 card(s,7.0,1.95,5.63,4.75);tx(s,'Kehadiran per kelompok',{x:7.3,y:2.1,w:5,h:0.35,fontFace:H,fontSize:16,bold:true,color:C.nv});
 if(kd.length)s.addChart(pres.charts.BAR,[{name:'% Hadir',labels:kd.map(x=>x.k),values:kd.map(x=>x.p)}],{x:7.15,y:2.5,w:5.35,h:4.1,barDir:'bar',chartColors:kd.map(x=>col(x.p)),barGapWidthPct:55,catAxisOrientation:'maxMin',valAxisMinVal:0,valAxisMaxVal:100,valAxisHidden:true,valGridLine:{style:'none'},catGridLine:{style:'none'},catAxisLineShow:false,catAxisLabelFontFace:F,catAxisLabelFontSize:11,catAxisLabelColor:'475569',showLegend:false,showValue:true,dataLabelPosition:'outEnd',dataLabelFormatCode:'0"%"',dataLabelFontSize:11,dataLabelFontBold:true,dataLabelColor:C.ink});
 else tx(s,'Belum ada data kehadiran.',{x:7.3,y:3.8,w:5,h:0.4,fontSize:14,color:C.mu,align:'center'});
 /* 3 rekap tabel */
 for(let o=0;o<K.length;o+=8){
  s=base('content','Rekap','Capaian jurnal per kelompok'+(K.length>8?' ('+(o/8+1)+'/'+Math.ceil(K.length/8)+')':''));
  const rows=[[hc('Kelompok'),hc('Jurnal terisi','center'),hc('Nasehat terlaksana','center'),hc('Kehadiran','center'),hc('Kendala','center'),hc('Status','center')]];
  K.slice(o,o+8).forEach((x,i)=>{const bg=i%2?'FBF9F4':C.wh,c=(t,al,opt)=>({text:String(t),options:Object.assign({align:al||'center',fill:{color:bg},fontSize:13},opt||{})});
   const st=x.lap===0?['Belum melapor',C.rd]:x.lap<x.n?['Sebagian',C.am]:['Lengkap',C.gr];
   rows.push([c(x.k,'left',{bold:true}),c(x.jur+'/'+x.n),c(x.nd?x.nasS+'/'+x.nd:'-'),c(x.p==null?'-':x.p+'%','center',{bold:true,color:col(x.p)}),c(x.kendala.length?x.kendala.length+' catatan':'Tidak ada','center',{color:x.kendala.length?C.rd:C.mu}),c(st[0],'center',{bold:true,color:st[1]})]);});
  s.addTable(rows,{x:0.7,y:1.95,w:11.93,colW:[3.2,1.6,2.1,1.6,1.8,1.63],rowH:0.52,fontFace:F,color:C.ink,border:[{type:'none'},{type:'none'},{type:'solid',pt:0.5,color:C.ln},{type:'none'}],valign:'middle'});
 }
 /* 4 per kelompok */
 const items=(s,list,x,y,w,hh,max,sz)=>{list.slice(0,max).forEach((it,i)=>{const yy=y+i*hh;
  s.addShape(SH.ROUNDED_RECTANGLE,{x,y:yy,w:1.25,h:0.38,rectRadius:0.19,fill:{color:C.pa},line:{color:C.pa,transparency:100}});
  tx(s,jrTglP(it.tgl),{x,y:yy,w:1.25,h:0.38,fontSize:12,bold:true,color:C.gd,align:'center',valign:'middle'});
  tx(s,jrCut(it.t,300),{x:x+1.45,y:yy,w:w-1.45,h:hh-0.12,fontSize:sz||14,fit:'shrink'});});};
 K.forEach((k,ki)=>{
  const lab='Kelompok '+String(ki+1).padStart(2,'0')+' dari '+K.length;
  s=base('div',lab,'Jurnal, capaian, dan kendala pengajian',{kel:k.k});
  [[k.lap+' / '+k.n,'pertemuan dilaporkan'],[k.jur+' / '+k.n,'jurnal terisi'],[k.nd?k.nasS+' / '+k.nd:'-','nasehat terlaksana'],[k.p==null?'-':k.p+'%','kehadiran']].forEach((c,i)=>stat(s,0.9+i*2.9,5.65,2.7,c[0],c[1],C.go,true));
  s.addShape(SH.LINE,{x:0.9,y:5.5,w:11.2,h:0,line:{color:'FFFFFF',transparency:75,width:0.75}});
  /* jurnal */
  if(k.lap===0){
   s=base('content','Jurnal pengajian','Jurnal pengajian',{kel:k.k});card(s,0.7,1.95,11.93,4.75);
   tx(s,'Belum ada laporan dari kelompok ini pada periode '+per+'.',{x:1.1,y:3.6,w:11.1,h:0.5,fontFace:H,fontSize:20,color:C.mu,align:'center'});
   tx(s,k.n+' pertemuan dijadwalkan. Mohon dilengkapi sebelum musyawarah.',{x:1.1,y:4.2,w:11.1,h:0.4,fontSize:14,color:C.mu,align:'center'});
   return;
  }
  const PG=6,np=Math.ceil(k.rows.length/PG);
  for(let o=0;o<k.rows.length;o+=PG){
   s=base('content','Jurnal pengajian','Jurnal pengajian'+(np>1?' ('+(o/PG+1)+'/'+np+')':''),{kel:k.k});
   const rows=[[hc('Tanggal'),hc("Al-Qur'an"),hc('Al-Hadist'),hc('Nasehat keimaman')]];
   k.rows.slice(o,o+PG).forEach((r,i)=>{const bg=i%2?'FBF9F4':C.wh,c=(t,opt)=>({text:t,options:Object.assign({fill:{color:bg},fontSize:12.5},opt||{})});
    const mut={color:C.mu,italic:true};
    if(!r.lap){rows.push([c(jrTglS(r.tgl),{bold:true}),c('Belum ada laporan',mut),c('-',mut),c('-',mut)]);return;}
    const q=r.q||r.m,ns=r.ns;
    const nas=ns.st==='sudah'?[{text:'Sudah terlaksana',options:{bold:true,color:C.gr,breakLine:!!(ns.by||ns.isi)}}].concat(ns.by?[{text:'Pengisi: '+jrCut(ns.by,60),options:{color:C.mu,fontSize:11,breakLine:false}}]:[]):ns.st==='belum'?[{text:'Belum terlaksana',options:{bold:true,color:C.rd}}]:ns.st==='tidak'?[{text:'Tidak ada nasehat',options:mut}]:[{text:'Belum diisi',options:mut}];
    rows.push([c(jrTglS(r.tgl),{bold:true}),c(q?jrCut(q,90):'-',q?{}:mut),c(r.h?jrCut(r.h,110):'-',r.h?{}:mut),{text:nas,options:{fill:{color:bg},fontSize:12.5}}]);});
   s.addTable(rows,{x:0.7,y:1.95,w:11.93,colW:[1.9,3.1,3.4,3.53],rowH:[0.45].concat(Array(PG).fill(0.7)),fontFace:F,color:C.ink,border:[{type:'none'},{type:'none'},{type:'solid',pt:0.5,color:C.ln},{type:'none'}],valign:'middle'});
  }
  /* capaian dan kendala */
  s=base('content','Capaian dan kendala','Capaian dan kendala pengajian',{kel:k.k});
  card(s,0.7,1.95,4.4,4.75);tx(s,'Capaian',{x:1.0,y:2.1,w:3.8,h:0.35,fontFace:H,fontSize:16,bold:true,color:C.nv});
  [['Kehadiran',k.p==null?'-':k.p+'%',col(k.p)],['Pertemuan dilaporkan',k.lap+'/'+k.n,C.nv2],['Jurnal terisi',k.jur+'/'+k.n,C.nv2],['Nasehat terlaksana',k.nd?k.nasS+'/'+k.nd:'-',k.nasB?C.am:C.gr]].forEach((c,i)=>{
   const x=1.0+(i%2)*2.05,y=2.6+Math.floor(i/2)*1.45;tx(s,c[1],{x,y,w:1.95,h:0.6,fontFace:H,fontSize:28,bold:true,color:c[2],fit:'shrink'});tx(s,c[0],{x,y:y+0.65,w:1.95,h:0.5,fontSize:12,color:C.mu});});
  tx(s,'Hadir '+k.H+'   Izin '+k.I+'   Alpa '+k.A,{x:1.0,y:5.6,w:3.8,h:0.3,fontSize:13,bold:true,color:C.ink});
  tx(s,k.nasB?k.nasB+' pertemuan dilaporkan nasehat belum terlaksana.'+(k.nasT?' '+k.nasT+' pertemuan tanpa nasehat.':''):(k.nd?'Seluruh nasehat yang dilaporkan sudah terlaksana.':'Tidak ada nasehat yang dilaporkan.')+(k.nasT&&k.nd?' '+k.nasT+' pertemuan tanpa nasehat.':''),{x:1.0,y:6.0,w:3.8,h:0.5,fontSize:11,color:C.mu});
  card(s,5.4,1.95,7.23,4.75);tx(s,'Kendala pengajian',{x:5.7,y:2.1,w:6,h:0.35,fontFace:H,fontSize:16,bold:true,color:C.nv});
  if(k.kendala.length){items(s,k.kendala,5.7,2.7,6.65,1.0,4,14);if(k.kendala.length>4)tx(s,'+ '+(k.kendala.length-4)+' kendala lainnya di slide berikutnya',{x:5.7,y:6.35,w:6.6,h:0.3,fontSize:11,italic:true,color:C.mu});}
  else tx(s,'Tidak ada kendala yang dilaporkan pada periode ini.',{x:5.7,y:3.6,w:6.6,h:0.5,fontSize:15,color:C.mu});
  for(let o=4;o<k.kendala.length;o+=6){s=base('content','Capaian dan kendala','Kendala pengajian (lanjutan)',{kel:k.k});card(s,0.7,1.95,11.93,4.75);items(s,k.kendala.slice(o),1.1,2.2,11.1,0.7,6,14);}
  for(let o=0;o<k.catatan.length;o+=5){s=base('content','Catatan','Catatan dan usulan untuk desa'+(k.catatan.length>5?' ('+(o/5+1)+'/'+Math.ceil(k.catatan.length/5)+')':''),{kel:k.k});card(s,0.7,1.95,11.93,4.75);items(s,k.catatan.slice(o,o+5),1.1,2.2,11.1,0.85,5,14);}
 });
 /* 5 rekap kendala semua kelompok */
 const all=[];K.forEach(k=>k.kendala.forEach(x=>all.push({k:k.k,tgl:x.tgl,t:x.t})));
 if(!all.length){s=base('content','Bahan musyawarah','Kendala dari seluruh kelompok');card(s,0.7,1.95,11.93,4.75);tx(s,'Tidak ada kendala yang dilaporkan oleh kelompok pada periode ini.',{x:1.1,y:3.8,w:11.1,h:0.5,fontFace:H,fontSize:20,color:C.mu,align:'center'});}
 for(let o=0;o<all.length;o+=6){
  s=base('content','Bahan musyawarah','Kendala dari seluruh kelompok'+(all.length>6?' ('+(o/6+1)+'/'+Math.ceil(all.length/6)+')':''));
  const rows=[[hc('Kelompok'),hc('Tanggal'),hc('Kendala pengajian')]];
  all.slice(o,o+6).forEach((x,i)=>{const bg=i%2?'FBF9F4':C.wh;rows.push([{text:x.k,options:{bold:true,fill:{color:bg},fontSize:13}},{text:jrTglS(x.tgl),options:{fill:{color:bg},fontSize:13}},{text:jrCut(x.t,260),options:{fill:{color:bg},fontSize:13}}]);});
  s.addTable(rows,{x:0.7,y:1.95,w:11.93,colW:[2.6,1.9,7.43],rowH:[0.45].concat(Array(6).fill(0.7)),fontFace:F,color:C.ink,border:[{type:'none'},{type:'none'},{type:'solid',pt:0.5,color:C.ln},{type:'none'}],valign:'middle'});
 }
 /* 6 penutup */
 s=base('end','Penutup','Mohon arahan dan keputusan musyawarah');
 tx(s,'Laporan ini disusun dari jurnal dan absensi pengajian muda mudi kelompok pada periode '+per+', sebagai bahan pembahasan di musyawarah desa.',{x:0.9,y:2.1,w:8.2,h:1.0,fontSize:17,color:'DCE6F5'});
 [['Pertemuan',T.n],['Kelompok melapor',T.melapor+'/'+T.kel],['Nasehat terlaksana',T.nd?T.nasS+'/'+T.nd:'-'],['Kendala',T.kendala]].forEach((c,i)=>stat(s,0.9+i*2.9,3.5,2.7,c[1],c[0],C.go,true));
 tx(s,'Mengetahui,\nPengurus',{x:0.9,y:5.0,w:4.5,h:0.8,fontSize:15,color:'DCE6F5',align:'center'});
 tx(s,'Karangmojo, '+tgl+'\nPenyusun laporan',{x:7.9,y:5.0,w:4.5,h:0.8,fontSize:15,color:'DCE6F5',align:'center'});
 return pres;
}
/* ---------- transisi Morph: sisipkan ke XML tiap slide (kecuali yang pertama) ---------- */
async function jrMorph(buf,type){
 const z=await JSZip.loadAsync(buf);
 const names=Object.keys(z.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>parseInt(a.match(/(\d+)\.xml/)[1],10)-parseInt(b.match(/(\d+)\.xml/)[1],10));
 const tr='<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159"><p:transition spd="slow" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" p14:dur="1800"><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>';
 for(let i=1;i<names.length;i++){
  let x=await z.file(names[i]).async('string');
  if(x.indexOf('</p:clrMapOvr>')>-1&&x.indexOf('p159:morph')<0){x=x.replace('</p:clrMapOvr>','</p:clrMapOvr>'+tr);z.file(names[i],x);}
 }
 return z.generateAsync({type:type||'blob',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}

/* ---------- glue aplikasi ---------- */
let JR_PPTX=null;
function jrLoadScript(src){return new Promise((ok,no)=>{const e=document.createElement('script');e.src=src;e.onload=ok;e.onerror=()=>no(new Error('Pustaka PPT gagal dimuat (butuh internet).'));document.head.appendChild(e);});}
async function jrLoadLibs(){
 if(JR_PPTX)return JR_PPTX;
 const prev=window.PptxGenJS;delete window.PptxGenJS;
 try{await jrLoadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js');JR_PPTX=window.PptxGenJS;}
 finally{if(prev)window.PptxGenJS=prev;else delete window.PptxGenJS;}
 if(!JR_PPTX)throw new Error('Pustaka PPT gagal dimuat.');
 if(!window.JSZip)await jrLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
 return JR_PPTX;
}
async function lpJurnalPpt(){
 try{
  lpInit();
  const rp=lpRp('');
  const D=jrCollect(kaRpMonths(rp),kaRpRange(rp),LP.k,(y,m)=>kaSesiJ(y,m,'kelompok').filter(x=>x.st!=='libur').map(x=>x.tgl),(y,m)=>kaForm(y,m,'kelompok'),id=>fmResp(id),(f,r)=>fmRespTg(f,r),(y,m)=>kaYm(y,m),kelompokList.map(k=>k.nama),activeGroups());
  if(!D.any||!D.kel.length){showToast('Belum ada pengajian kelompok pada periode ini');return;}
  showToast('Menyusun PPT jurnal kelompok…');
  const P=await jrLoadLibs(),lgo=await lpLogo(),per=lpPeriodLabel(),tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const pres=new P();pres.title='Laporan Jurnal Pengajian Kelompok '+per;
  jrBuildPpt(pres,D,per,tgl,lgo);
  const buf=await pres.write({outputType:'arraybuffer'}),blob=await jrMorph(buf,'blob');
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Laporan-Jurnal-Kelompok-'+lpFileLabel()+(LP.k?'-'+LP.k.replace(/\s+/g,'-'):'')+'.pptx';
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
  showToast('PPT jurnal kelompok selesai ('+D.kel.length+' kelompok)');
 }catch(e){console.error(e);showToast(e.message||'Gagal membuat PPT jurnal');}
}

function lpJurnalData(){
 lpInit();const rp=lpRp('');
 return jrCollect(kaRpMonths(rp),kaRpRange(rp),LP.k,(y,m)=>kaSesiJ(y,m,'kelompok').filter(x=>x.st!=='libur').map(x=>x.tgl),(y,m)=>kaForm(y,m,'kelompok'),id=>fmResp(id),(f,r)=>fmRespTg(f,r),(y,m)=>kaYm(y,m),kelompokList.map(k=>k.nama),activeGroups());
}
async function lpLinkList(){
 const box=document.getElementById('lpLinkList');if(!box)return;
 try{
  const j=await sdFetch('/api/presentations');
  box.innerHTML=(j.items||[]).length?(j.items||[]).map(it=>{const u=location.origin+'/p/'+it.token;return `<div class="flex items-center gap-2 py-2 border-b border-line text-xs"><div class="min-w-0 flex-1"><div class="font-bold truncate">${esc(it.title)}</div><div class="text-slate-400 truncate">${esc(u)} · ${new Date(it.created_at).toLocaleDateString('id-ID')}</div></div><button class="u-btn" onclick="fmCopyText('${u}','Link disalin')">Salin</button><button class="u-btn" onclick="lpLinkOff('${it.token}')">Matikan</button></div>`;}).join(''):'<div class="text-xs text-slate-400">Belum ada link presentasi.</div>';
 }catch(e){box.textContent='Gagal memuat daftar link.';}
}
async function lpLinkOff(t){
 if(!await uiConfirm({title:'Matikan link presentasi?',message:'Link ini tidak bisa dibuka lagi oleh siapa pun.',ok:'Ya, Matikan',tone:'danger'}))return;
 try{await sdFetch('/api/presentations/'+t,{method:'DELETE'});showToast('Link dimatikan');lpLinkList();}catch(e){showToast(e.message);}
}
async function lpJurnalLink(){
 try{
  const D=lpJurnalData();
  if(!D.any||!D.kel.length){showToast('Belum ada pengajian kelompok pada periode ini');return;}
  showToast('Membuat link presentasi…');
  const per=lpPeriodLabel(),tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const j=await sdFetch('/api/presentations',{method:'POST',body:{alias:'laporankelompok',title:'Laporan Jurnal Pengajian Kelompok '+per+(LP.k?' - '+LP.k:''),payload:{D,per,tgl,kel:LP.k||''}}});
  const url=location.origin+'/presentasi/laporankelompok',url2=location.origin+'/p/'+j.token;
  fmEl('modalTitle').textContent='Link presentasi siap';fmEl('modalDesc').textContent='Presentasi laporan jurnal kelompok · '+per+(LP.k?' · '+LP.k:'');
  const row=(lab,u)=>`<div><div class="text-[11px] font-bold text-slate-500 mb-1">${lab}</div><div class="rounded-xl bg-slate-50 border border-line p-3 flex flex-col sm:flex-row sm:items-center gap-2"><input readonly value="${esc(u)}" onclick="this.select()" class="flex-1 h-10 rounded-lg border border-line bg-white px-3 text-sm"><button class="u-btn primary" onclick="fmCopyText('${u}','Link disalin')">Salin link</button><a class="u-btn" href="${u}" target="_blank" rel="noopener">Buka</a></div></div>`;
  fmEl('modalBody').innerHTML=`<div class="space-y-4">${row('Link presentasi (tetap)',url)}${row('Salinan khusus periode ini',url2)}
   <p class="text-xs text-slate-500 leading-relaxed">Link <b>/presentasi/laporankelompok</b> bisa dibuka siapa pun tanpa login dan selalu menampilkan presentasi yang <b>terakhir dibuat</b>. Isinya salinan data saat tombol ini ditekan; jika data berubah, tekan tombol lagi (alamatnya tetap sama). Salinan khusus tidak akan berubah. Navigasi dengan panah keyboard, geser layar, atau tombol; tekan F untuk layar penuh.</p>
   <div><div class="text-sm font-extrabold mb-1">Link presentasi aktif</div><div id="lpLinkList" class="max-h-56 overflow-y-auto"></div></div></div>`;
  showModal();lpLinkList();
 }catch(e){console.error(e);showToast(e.message||'Gagal membuat link presentasi');}
}

function renderLaporanMenu(){
 lpInit();
 const sel='h-10 border border-line rounded-xl px-3 text-sm bg-white font-semibold',rg=LP.per==='range',ks=[...new Set(kelompokList.map(k=>k.nama))];
 fmEl('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  <div class="mb-5"><h2 class="text-2xl font-extrabold">Laporan Pengajian Muda Mudi</h2><p class="text-sm text-slate-500 mt-1">Cetak laporan pengajian muda mudi kelompok, desa, dan daerah. Pilih periode per bulan, setahun, atau rentang tanggal, lalu cetak per jenis pengajian.</p></div>
  <div class="lp-panel">
   <div class="lp-sec-wrap">
    <div class="lp-sec">Periode &amp; kelompok</div>
    <div class="lp-filters">
     <label class="lp-f" ${rg?'style="display:none"':''}><span>Tahun</span><select class="${sel}" onchange="lpSet('y',this.value)" aria-label="Tahun">${kaYears().map(v=>`<option value="${v}" ${v===LP.y?'selected':''}>${v}</option>`).join('')}</select></label>
     <div class="lp-f"><span>Jenis periode</span><div class="lp-seg" role="group" aria-label="Jenis periode">${[['m','Per bulan'],['all','Setahun'],['range','Rentang tanggal']].map(([v,l])=>{const on=v==='range'?LP.per==='range':v==='all'?LP.per==='all':(LP.per!=='range'&&LP.per!=='all');return `<button type="button" onclick="lpMode('${v}')" class="${on?'on':''}">${l}</button>`;}).join('')}</div></div>
     <label class="lp-f" ${rg?'style="display:none"':''}><span>Bulan</span><select class="${sel}" onchange="lpSet('per',this.value)" aria-label="Bulan"><option value="all" ${LP.per==='all'?'selected':''}>Setahun penuh</option>${FM_BLN.map((_,i)=>`<option value="${i}" ${String(i)===LP.per?'selected':''}>${kaBln(i)}</option>`).join('')}<option value="range" ${LP.per==='range'?'selected':''}>Rentang tanggal…</option></select></label>
     ${rg?`<div class="lp-f lp-range"><span>Rentang tanggal</span>${kaRpDateInputs(lpRp(''),'lpSet',sel)}</div>`:''}
     <label class="lp-f"><span>Kelompok</span><select class="${sel}" onchange="lpSet('k',this.value)" aria-label="Kelompok"><option value="">Semua kelompok</option>${ks.map(k=>`<option value="${esc(k)}" ${LP.k===k?'selected':''}>${esc(k)}</option>`).join('')}</select></label>
    </div>
   </div>
   <div class="lp-act">
    <div class="lp-sec">Cetak &amp; bagikan</div>
    <div class="lp-btns">
     <div class="lp-grp"><button type="button" onclick="lpPrint('')" class="u-btn">${icon('printer','w-4 h-4')} Cetak gabungan</button>
      <button type="button" onclick="lpPpt('')" class="u-btn">${icon('presentation','w-4 h-4')} PPT gabungan</button></div>
     <div class="lp-grp"><button type="button" onclick="lpJurnalPpt()" class="u-btn primary">${icon('presentation','w-4 h-4')} PPT jurnal kelompok</button>
      <button type="button" onclick="lpJurnalLink()" class="u-btn primary">${icon('link','w-4 h-4')} Buat link presentasi</button></div>
    </div>
   </div>
  </div>
  <div id="lpCards" class="grid gap-4 md:grid-cols-3"></div>
 </div>`;
 lpRenderCards();
}


function renderGeneric(page){
 const configs={
  'kelompok':['Kelompok','Kelola master kelompok desa.',['Nama Kelompok','Ketua','Jumlah Pengurus','Jumlah Generus','Status']],
  'muda-mudi-desa':['Manajemen Pengurus KMM Desa','Kelola database KMM (Kepengurusan Muda Mudi) tingkat desa.',['Nama','Jenis Kelamin','Asal Kelompok','Nama Dapukan','No. WA','Status']],
  'muda-mudi-kelompok':['Manajemen Pengurus KMM Kelompok','Kelola KMM (Kepengurusan Muda Mudi) berdasarkan kelompok.',['Nama','Jenis Kelamin','Kelompok','Nama Dapukan','No. WA','Status']],
  'laporan':['Laporan','Ringkasan dan keluaran data sistem.',['Jenis Laporan','Periode','Data','Diperbarui']],
  'pengaturan':['Pengaturan','Pengaturan sistem dan master data.',['Pengguna Admin','Kelompok','Hak Akses','Status']]
 };
 const c=configs[page];
 if(!c){renderDashboard();return;}
 document.getElementById('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead(c[1],pageActions({label:'Tambah Data',fn:"openAddModal('"+page+"')"}))}
  <div class="bg-white rounded-2xl border border-line shadow-card p-4 sm:p-5">
   ${toolbar(page)}
   <div class="overflow-x-auto scrollbar"><table class="w-full min-w-[760px]"><thead><tr class="border-y border-line text-[11px] uppercase tracking-wide text-slate-400"><th class="py-3 px-3 w-10"><input type="checkbox"></th>${c[2].map(x=>`<th class="py-3 px-3 text-left">${x}</th>`).join('')}<th class="py-3 px-3 text-right">Aksi</th></tr></thead>
   <tbody>${Array.from({length:0},(_,i)=>`<tr class="border-b border-line text-sm"><td class="py-4 px-3"><input type="checkbox"></td>${c[2].map((x,j)=>`<td class="py-4 px-3 ${j===0?'font-bold':''}">${((page==='muda-mudi-kelompok'||page==='muda-mudi-desa')?mmCell(i,j):j===0?'—':(j===1?gname(i):j===2?(page==='muda-mudi-kelompok'||page==='muda-mudi-desa'?MM_DAP_DEFAULT.concat(mmDapCustom(),['—','—'])[i]:['Ketua','Sekretaris','Bendahara','Seksi Pendidikan','Seksi Pemuda','Seksi Sosial'][i]):j===3?(page==='kelompok'?40+i*4:'Aktif'):(j===4?'Aktif':'—')))}</td>`).join('')}<td class="py-4 px-3 text-right"><button class="w-8 h-8 rounded-lg hover:bg-slate-100">${icon('pencil','w-4 mx-auto text-slate-500')}</button></td></tr>`).join('')}</tbody></table></div>
  </div>
 </div>`;
 lucide.createIcons();
}

const DRIVE_CODE=String.raw`/* SIMDEKA - Jembatan Google Drive (versi 2) */
var VERSI = 2;
var ROOT = 'SIMDEKA';          // folder utama di Drive Anda
var MAX_MB = 10;               // batas ukuran per file
var MAX_PER_HARI = 300;        // batas jumlah unggahan per hari
var BOLEH = {
  'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'image/gif': 1,
  'application/pdf': 1, 'text/plain': 1,
  'application/msword': 1,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 1,
  'application/vnd.ms-excel': 1,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 1,
  'application/vnd.ms-powerpoint': 1,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 1
};

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function root_() {
  var r = DriveApp.getFoldersByName(ROOT);
  return r.hasNext() ? r.next() : DriveApp.createFolder(ROOT);
}
function sub_(parent, name) {
  var s = parent.getFoldersByName(name);
  return s.hasNext() ? s.next() : parent.createFolder(name);
}
function bersih_(s, def) {
  return String(s || '').replace(/[^\w\-. ]/g, '').trim().slice(0, 80) || def;
}
function dalamRoot_(file) {
  var rid = root_().getId(), cur = [file], depth = 0;
  while (cur.length && depth < 6) {
    var nxt = [];
    for (var i = 0; i < cur.length; i++) {
      var ps = cur[i].getParents();
      while (ps.hasNext()) {
        var p = ps.next();
        if (p.getId() === rid) return true;
        nxt.push(p);
      }
    }
    cur = nxt; depth++;
  }
  return false;
}
function hitungHari_() {
  var props = PropertiesService.getScriptProperties();
  var key = 'n_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd');
  var n = Number(props.getProperty(key) || 0);
  if (n >= MAX_PER_HARI) return false;
  props.setProperty(key, String(n + 1));
  return true;
}

function doGet() {
  return out_({ ok: true, msg: 'SIMDEKA Drive aktif', versi: VERSI });
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.action === 'upload') return upload_(d);
    if (d.action === 'delete') return hapus_(d);
    return out_({ ok: false, error: 'Aksi tidak dikenal' });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function upload_(d) {
  var mime = String(d.mime || '').toLowerCase();
  var gambar = d.kind === 'gambar';
  if (!BOLEH[mime]) return out_({ ok: false, error: 'Jenis file tidak diizinkan' });
  if (gambar && mime.indexOf('image/') !== 0) return out_({ ok: false, error: 'File harus berupa gambar' });
  var b64 = String(d.data || '');
  if (!b64) return out_({ ok: false, error: 'File kosong' });
  if (b64.length > MAX_MB * 1400000) return out_({ ok: false, error: 'File terlalu besar (maks ' + MAX_MB + ' MB)' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (!hitungHari_()) return out_({ ok: false, error: 'Batas unggahan harian tercapai' });
  } finally {
    lock.releaseLock();
  }

  var folder = gambar
    ? sub_(root_(), 'Gambar')
    : sub_(sub_(root_(), 'Unggahan'), bersih_(d.form, 'Umum'));
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, bersih_(d.name, 'file'));
  var file = folder.createFile(blob);
  var dibagikan = true;
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (x) {
    dibagikan = false; // akun Workspace yang melarang berbagi publik
  }
  var id = file.getId();
  return out_({
    ok: true, id: id, name: file.getName(), url: file.getUrl(),
    thumb: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1000', shared: dibagikan
  });
}

function hapus_(d) {
  var id = String(d.id || '').replace(/[^\w-]/g, '');
  if (!id) return out_({ ok: false, error: 'ID kosong' });
  var file = DriveApp.getFileById(id);
  if (!dalamRoot_(file)) return out_({ ok: false, error: 'File bukan milik SIMDEKA' });
  file.setTrashed(true);
  return out_({ ok: true });
}`;
let pgDrvOpen=false,pgGemOpen=false;
function pgGemToggle(){pgGemOpen=!pgGemOpen;const a=document.getElementById('pgGemHead'),b=document.getElementById('pgGemBody');if(!a||!b)return;a.classList.toggle('open',pgGemOpen);b.classList.toggle('open',pgGemOpen);a.setAttribute('aria-expanded',pgGemOpen);}
function pgDrvToggle(){pgDrvOpen=!pgDrvOpen;const a=document.getElementById('pgDrvHead'),b=document.getElementById('pgDrvBody');if(!a||!b)return;a.classList.toggle('open',pgDrvOpen);b.classList.toggle('open',pgDrvOpen);a.setAttribute('aria-expanded',pgDrvOpen);}
function stGo(id,b){if(id==='stDrive'&&!pgDrvOpen)pgDrvToggle();if(id==='stGem'&&!pgGemOpen)pgGemToggle();const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:'smooth',block:'start'});document.querySelectorAll('.st-nav button').forEach(x=>x.classList.toggle('on',x===b));}
function renderPengaturan(){
 const u=fmDriveUrl(),c=aiCfg();
 const step=(n,t)=>`<li class="st-step"><span class="st-n">${n}</span><div class="st-t">${t}</div></li>`;
 const tile=(ic,tone,l,id,ok,txt)=>`<div class="st-tile"><span class="st-ico ${tone}">${icon(ic,'w-5 h-5')}</span><div class="min-w-0"><small>${l}</small><span id="${id}" class="st-badge ${ok?'ok':''}"><i></i>${txt}</span></div></div>`;
 const nb=(id,ic,l,on)=>`<button type="button" onclick="stGo('${id}',this)" class="${on?'on':''}">${icon(ic,'w-[18px] h-[18px]')}${l}</button>`;
 const sh=(t,d)=>`<div class="st-sh"><h2>${t}</h2><p>${d}</p></div>`;
 document.getElementById('content').innerHTML=`<div class="max-w-5xl mx-auto fade">
  ${pageHead('Hubungkan layanan AI dan penyimpanan Google untuk SIMDEKA.')}
  <div class="st-tiles">${tile('key-round','bg-violet-50 text-violet-700','Gemini notulensi','pgTileAi',!!c.key,c.key?'Terhubung':'Belum diatur')}${tile('hard-drive','','Google Drive','pgTileDrv',!!u,u?'Terhubung':'Belum terhubung')}${tile('sparkles','bg-amber-50 text-amber-700','Gemini laporan','pgGemTile',false,'Memuat…')}</div>
  <div class="st-layout">
   <nav class="st-nav" aria-label="Bagian pengaturan">${nb('stAI','wand-sparkles','Asisten AI',1)}${nb('stDrive','hard-drive','Google Drive')}${nb('stGem','sparkles','Gemini Laporan')}</nav>
   <div class="space-y-9 min-w-0">
    <section id="stAI" class="st-sec">${sh('Asisten AI untuk notulensi','Atur koneksi dan gaya penulisan AI saat merapikan hasil pembahasan.')}${aiCardsHtml()}</section>
    <section id="stDrive" class="st-sec">${sh('Penyimpanan','Tempat gambar dan file unggahan form disimpan.')}
     <div class="st-card">
      <button type="button" id="pgDrvHead" aria-expanded="${pgDrvOpen}" aria-controls="pgDrvBody" onclick="pgDrvToggle()" class="st-acc ${pgDrvOpen?'open':''}"><div class="st-ch"><span class="st-ico">${icon('hard-drive','w-5 h-5')}</span>
       <div class="flex-1 min-w-0"><h3>Penyimpanan Google Drive</h3><p>Gambar dan file unggahan form disimpan di folder “SIMDEKA” pada Drive Anda.</p></div>
       <span id="pgDrvBadge" class="st-badge ${u?'ok':''}"><i></i>${u?'Terhubung':'Belum terhubung'}</span><span class="st-chev">${icon('chevron-down','w-4 h-4')}</span></div></button>
      <div id="pgDrvBody" class="st-body ${pgDrvOpen?'open':''}"><div>
      <div class="st-cb">
       <p class="mb-5 text-[12.5px] leading-relaxed text-slate-500">Dipakai untuk gambar dan file unggahan (termasuk pertanyaan <b>Unggah file</b> di Manajemen Form). File masuk ke folder “SIMDEKA” di Drive Anda, dengan subfolder Gambar dan Unggahan.</p>
       <ol class="st-steps">
        ${step(1,'Buka <a href="https://script.google.com/home/start" target="_blank" rel="noopener" class="font-bold text-blue-600 hover:underline">script.google.com</a>, klik <b>Proyek baru</b>, lalu hapus semua isi <code>Code.gs</code>.')}
        ${step(2,'Salin kode di bawah ini dan tempel ke <code>Code.gs</code>, lalu klik <b>Simpan</b>.')}
        ${step(3,'Klik <b>Deploy → Deployment baru → jenis: Aplikasi web</b>. Atur <i>Jalankan sebagai</i>: <b>Saya</b>, <i>Yang memiliki akses</i>: <b>Siapa saja</b>. Klik Deploy dan izinkan akses Drive.')}
        ${step(4,'Salin <b>URL aplikasi web</b> (berakhiran <code>/exec</code>) dan tempel di kolom bawah, lalu klik <b>Simpan</b>.')}
       </ol>
       <div class="st-code"><div class="st-code-h"><span class="st-dots"><i></i><i></i><i></i></span><span class="st-fn">Code.gs</span><button type="button" onclick="pgCopyCode()" class="st-copy">${icon('copy','w-3.5 h-3.5')} Salin kode</button></div>
        <textarea id="pgCode" readonly rows="12" onfocus="this.select()" spellcheck="false">${esc(DRIVE_CODE)}</textarea></div>
       <label class="block st-field"><span class="ak-lab">URL aplikasi web (Deployment)</span>
        <div class="ak-wrap"><input id="pgDrvUrl" value="${esc(u)}" placeholder="https://script.google.com/macros/s/.../exec" class="ak-in" style="font-size:13px"></div></label>
       <div class="st-acts"><button onclick="pgSaveDrive()" class="u-btn primary">${icon('save','w-4 h-4')} Simpan</button><button onclick="pgTestDrive()" class="u-btn">${icon('plug-zap','w-4 h-4')} Uji koneksi</button>${u?`<button onclick="pgClearDrive()" class="u-btn danger">Putuskan</button>`:''}</div>
       <div class="st-note g">${icon('info','w-4 h-4')}<span>Alamat ini tersimpan di server dan otomatis dipakai semua admin, perangkat, dan link form, jadi peserta tidak perlu login atau mengatur apa pun. Setelah mengubah kode, buat <b>deployment baru</b> lalu tempel URL barunya di sini.</span></div>
      </div></div></div></section>
    <section id="stGem" class="st-sec">${sh('Laporan','Narasi kesimpulan laporan absensi ditulis oleh Gemini.')}
     <div class="st-card">
      <button type="button" id="pgGemHead" aria-expanded="${pgGemOpen}" aria-controls="pgGemBody" onclick="pgGemToggle()" class="st-acc ${pgGemOpen?'open':''}"><div class="st-ch"><span class="st-ico bg-violet-50 text-violet-700">${icon('sparkles','w-5 h-5')}</span>
       <div class="flex-1 min-w-0"><h3>Kesimpulan Laporan dengan Gemini AI</h3><p>Gemini menulis narasi kesimpulan laporan absensi; angka tetap dihitung SIMDEKA.</p></div>
       <span id="pgGemBadge" class="st-badge"><i></i>Memuat…</span><span class="st-chev">${icon('chevron-down','w-4 h-4')}</span></div></button>
      <div id="pgGemBody" class="st-body ${pgGemOpen?'open':''}"><div>
      <div class="st-cb">
       <p class="mb-5 text-[12.5px] leading-relaxed text-slate-500">Gemini hanya digunakan untuk menulis narasi kesimpulan laporan absensi. Data, statistik, dan persentase tetap dihitung oleh SIMDEKA.</p>
       <div class="ak-grid">
        <label class="block"><span class="ak-lab">Gemini API Key</span><div class="ak-wrap"><input id="pgGemKey" type="password" autocomplete="off" placeholder="Masukkan API Key Gemini" class="ak-in suf"><button type="button" class="ak-eye" aria-label="Tampilkan kata sandi" onclick="acEye('pgGemKey',this)">${icon('eye','w-4 h-4')}</button></div></label>
        <label class="block"><span class="ak-lab">Model Gemini</span><div class="ak-wrap"><input id="pgGemModel" value="gemini-2.5-flash" placeholder="gemini-2.5-flash" class="ak-in"></div></label></div>
       <div class="st-acts"><button onclick="pgSaveGemini()" class="u-btn primary">${icon('save','w-4 h-4')} Simpan API Key</button><button onclick="pgTestGemini()" class="u-btn">${icon('plug-zap','w-4 h-4')} Uji koneksi Gemini</button><button onclick="pgClearGemini()" class="u-btn danger">Hapus Key</button></div>
       <div class="st-note v">${icon('shield-check','w-4 h-4')}<span>API Key disimpan di server dan tidak dikirim ke browser publik. Laporan publik hanya menerima teks kesimpulan yang sudah dibuat Gemini.</span></div>
      </div></div></div></section>
   </div></div></div>`;
 lucide.createIcons();
 pgLoadGemini();
}
async function pgLoadGemini(){
 const set=(ok,t)=>['pgGemBadge','pgGemTile'].forEach(id=>{const b=document.getElementById(id);if(b){b.className='st-badge'+(ok?' ok':'');b.innerHTML='<i></i>'+t;}});
 try{const r=await fetch('/api/settings',{credentials:'same-origin'}),j=await r.json();const c=j.gemini||{};const m=document.getElementById('pgGemModel');if(m)m.value=c.model||'gemini-2.5-flash';set(!!c.configured,c.configured?'Terhubung':'Belum terhubung');}catch(e){set(false,'Gagal memuat');}
}
async function pgSaveGemini(){
 const key=(document.getElementById('pgGemKey')?.value||'').trim(),model=(document.getElementById('pgGemModel')?.value||'').trim()||'gemini-2.5-flash';
 if(!key){showToast('Masukkan API Key Gemini');return;} try{const r=await fetch('/api/settings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({gemini_api_key:key,gemini_model:model})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Gagal menyimpan');showToast('API Key Gemini tersimpan');renderPengaturan();}catch(e){showToast(e.message);}
}
async function pgClearGemini(){if(!await uiConfirm({title:'Hapus API Key Gemini?',message:'Kunci akan dihapus dari server. Fitur pembuat soal AI tidak bisa dipakai sampai kunci baru disimpan.',ok:'Ya, Hapus',tone:'danger'}))return;try{const r=await fetch('/api/settings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({gemini_api_key:''})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Gagal menghapus');showToast('API Key Gemini dihapus');renderPengaturan();}catch(e){showToast(e.message);}}
async function pgTestGemini(){try{const r=await fetch('/api/ai/test',{method:'POST'}),j=await r.json();if(!r.ok)throw new Error(j.error||'Koneksi gagal');showToast('Koneksi Gemini berhasil');}catch(e){showToast(e.message);}}
function pgCopyCode(){fmCopyText(DRIVE_CODE,'Kode Drive disalin');}
function pgSaveDrive(){
 const v=(document.getElementById('pgDrvUrl').value||'').trim();
 if(!FM_DRIVE_RX.test(v)){showToast('URL tidak valid. Harus berakhiran /exec');return;}
 try{localStorage.setItem(FM_DRIVE_KEY,v);}catch(e){showToast('Gagal menyimpan');return;}
 showToast('Drive tersimpan');renderPengaturan();
}
function pgClearDrive(){try{localStorage.removeItem(FM_DRIVE_KEY);}catch(e){}showToast('Drive diputuskan');renderPengaturan();}
async function pgTestDrive(){
 const v=(document.getElementById('pgDrvUrl').value||'').trim();
 if(!FM_DRIVE_RX.test(v)){showToast('URL tidak valid. Harus berakhiran /exec');return;}
 try{const j=await (await fetch(v)).json();showToast(j&&j.ok?'Koneksi berhasil':'Respons tidak dikenali');}
 catch(e){showToast('Gagal terhubung. Cek deployment: akses harus "Siapa saja"');}
}

/* ===== CADANGKAN / PULIHKAN / RESET DATA ===== */
const BK_LAST='simdeka_last_backup';
let bkPending=null;
function bkIsData(k){return /^(simdeka_|sidesa_)/.test(k)&&!/^simdeka_lokal_(user|accounts|su)$/.test(k)&&k!==AUTH_KEY&&k!==BK_LAST&&k.indexOf(FM_DRAFT)!==0;}
function bkKeys(){const ks=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&bkIsData(k))ks.push(k);}}catch(e){}return ks.sort();}
function bkRead(){const d={};bkKeys().forEach(k=>{d[k]=localStorage.getItem(k);});return d;}
function bkSummary(d){
 const n=k=>{try{const v=JSON.parse(d[k]);return Array.isArray(v)?v.length:(v&&typeof v==='object'?Object.keys(v).length:0);}catch(e){return 0;}};
 let tg=0;try{const r=JSON.parse(d[FM_RESP]||'{}');Object.keys(r).forEach(k=>{if(Array.isArray(r[k]))tg+=r[k].length;});}catch(e){}
 let mm=0;Object.keys(d).forEach(k=>{if(k.indexOf(MM_STORE)===0&&k!==MM_DAP_KEY)mm+=n(k);});
 return [['Kelompok',n(STORE_KEY)],['Generus',n(GEN_KEY)],['Muda-Mudi (KMM)',mm],['Form',n(FM_KEY)],['Tanggapan form',tg]];
}
function bkSectionHtml(){return '';}
function bkDownload(){
 const d=bkRead();
 const b={app:'SIMDEKA',format:1,created:new Date().toISOString(),count:Object.keys(d).length,data:d};
 const blob=new Blob([JSON.stringify(b)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Cadangan_SIMDEKA_'+fmToday()+'.json';a.style.display='none';
 document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
 try{localStorage.setItem(BK_LAST,String(Date.now()));}catch(e){}
 showToast('Cadangan diunduh');
 const cur=document.querySelector('.nav-item.active');if(cur&&cur.dataset.page==='pengaturan'&&document.getElementById('bkFile'))renderPengaturan();
}
function bkPick(inp){
 const file=inp.files&&inp.files[0];inp.value='';if(!file)return;
 if(file.size>25*1024*1024){showToast('Berkas terlalu besar untuk dipulihkan');return;}
 const r=new FileReader();
 r.onerror=()=>showToast('Gagal membaca berkas');
 r.onload=()=>{
  let b;try{b=JSON.parse(String(r.result));}catch(e){showToast('Berkas bukan cadangan SIMDEKA yang valid');return;}
  if(!b||b.app!=='SIMDEKA'||!b.data||typeof b.data!=='object'||Array.isArray(b.data)){showToast('Berkas bukan cadangan SIMDEKA yang valid');return;}
  const data={};Object.keys(b.data).forEach(k=>{if(bkIsData(k)&&typeof b.data[k]==='string')data[k]=b.data[k];});
  if(!Object.keys(data).length){showToast('Cadangan kosong atau tidak dikenali');return;}
  bkPending={data:data,created:b.created||''};bkAskRestore();
 };
 r.readAsText(file);
}
function bkAskRestore(){
 const b=bkPending;if(!b)return;
 const t=b.created?new Date(b.created).getTime():0,sm=bkSummary(b.data);
 fmEl('modalTitle').textContent='Pulihkan Cadangan';fmEl('modalDesc').textContent=t&&!isNaN(t)?'Cadangan tanggal '+fmDT(t):'';
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  <div class="rounded-2xl border border-line divide-y divide-line text-sm">${sm.map(x=>`<div class="px-4 py-2 flex justify-between"><span class="text-slate-600">${x[0]}</span><b>${x[1].toLocaleString('id-ID')}</b></div>`).join('')}</div>
  <div class="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800 leading-relaxed"><b>Seluruh data saat ini akan diganti</b> dengan isi cadangan ini. Unduh cadangan data saat ini lebih dulu bila perlu.</div>
  <button onclick="bkDownload()" class="text-xs font-bold text-navy hover:underline">Unduh cadangan data saat ini dulu</button>
  <div class="flex justify-end gap-2 pt-2 border-t border-line"><button onclick="bkPending=null;closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button onclick="bkApply()" class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">Ya, Pulihkan</button></div></div>`;
 showModal();
}
function bkReload(msg){
 clearTimeout(fmSaveT);fmSaveT=null;
 try{sessionStorage.setItem('simdeka_flash',msg);}catch(e){}
 location.reload();
}
function bkApply(){
 const b=bkPending;if(!b)return;
 const old=bkRead();
 try{
  bkKeys().forEach(k=>localStorage.removeItem(k));
  Object.keys(b.data).forEach(k=>localStorage.setItem(k,b.data[k]));
 }catch(e){
  try{bkKeys().forEach(k=>localStorage.removeItem(k));Object.keys(old).forEach(k=>localStorage.setItem(k,old[k]));}catch(_){}
  closeModal();showToast('Gagal memulihkan (penyimpanan penuh). Data lama dikembalikan.');return;
 }
 bkPending=null;bkReload('Cadangan berhasil dipulihkan');
}
function bkAskReset(){
 const sm=bkSummary(bkRead()).filter(x=>x[1]>0);
 fmEl('modalTitle').textContent='Reset Semua Data';fmEl('modalDesc').textContent='Tindakan ini tidak dapat dibatalkan.';
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  <div class="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 leading-relaxed">Seluruh data di perangkat ini akan dihapus permanen${sm.length?': '+sm.map(x=>x[1].toLocaleString('id-ID')+' '+x[0].toLowerCase()).join(', '):''}. Kata sandi login tidak ikut dihapus.</div>
  <button onclick="bkDownload()" class="h-10 px-4 rounded-xl border border-line text-xs font-bold flex items-center gap-2">${icon('download','w-4 h-4')} Unduh cadangan dulu (disarankan)</button>
  <label class="block"><span class="text-xs font-bold text-slate-600">Ketik <b>RESET</b> untuk melanjutkan</span>
   <input id="bkRst" autocomplete="off" oninput="fmEl('bkRstGo').disabled=this.value.trim()!=='RESET'" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm" placeholder="RESET"></label>
  <div class="flex justify-end gap-2 pt-2 border-t border-line"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button id="bkRstGo" disabled onclick="bkDoReset()" class="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">Hapus Semua Data</button></div></div>`;
 showModal();lucide.createIcons();setTimeout(()=>{const e=fmEl('bkRst');if(e)e.focus();},50);
}
function bkDoReset(){
 const e=fmEl('bkRst');if(!e||e.value.trim()!=='RESET')return;
 try{
  bkKeys().forEach(k=>localStorage.removeItem(k));
  for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.indexOf(FM_DRAFT)===0)localStorage.removeItem(k);}
 }catch(x){showToast('Gagal menghapus data');return;}
 bkReload('Semua data telah direset');
}
try{const m=sessionStorage.getItem('simdeka_flash');if(m){sessionStorage.removeItem('simdeka_flash');setTimeout(()=>showToast(m),600);}}catch(e){}

/* ===== HAPUS DATA (satu / terpilih / semua) + DATA MUDA MUDI ===== */
const MM_STORE='simdeka_mm_';let mmCache={},curBulk='';
function mmPut(k,a){mmCache[k]=a;try{localStorage.setItem(MM_STORE+k,JSON.stringify(a));}catch(e){showToast('Penyimpanan penuh — data tidak tersimpan');}}
/* Jenis Dapukan Muballigh (default: Mubaligh Tugasan). Ubah daftar ini bila perlu. */
const MB_JD=['Mubaligh Tugasan','Mubaligh Setempat'],MB_JD_DEF='Mubaligh Tugasan';
function mbJdOf(v){const n=t=>String(t||'').toLowerCase().replace(/[^a-z]/g,''),t=n(v);if(!t)return MB_JD_DEF;return MB_JD.find(o=>n(o)===t)||MB_JD.find(o=>n(o).endsWith(t))||'';}
function mmData(k){
 if(mmCache[k])return mmCache[k];
 if(window.ME && !['super_admin','admin_desa'].includes(window.ME.role))return [];
 try{const a=JSON.parse(localStorage.getItem(MM_STORE+k));if(Array.isArray(a)){if(k==='mubaligh')a.forEach(x=>{if(x&&!x.jd)x.jd=MB_JD_DEF;});mmCache[k]=a;return a;}}catch(e){}
 const a=[];mmCache[k]=a;return a;
}
function bulkEmpty(n){return '';}
function bulkBar(kind){curBulk=kind;return `<div id="bulkBar" class="u-selbar"><span id="bulkInfo"></span><span class="flex-1"></span><button id="bulkSel" type="button" onclick="bulkAsk('sel')" class="u-btn danger">${icon('trash-2','w-4 h-4')}<span id="bulkSelTx">Hapus</span></button><button type="button" onclick="bulkClear()" class="u-btn">Batal</button></div>`;}
function bulkIds(){return [...document.querySelectorAll('#generusTable .rowChk:checked')].map(x=>x.dataset.id);}
function bulkClear(){document.querySelectorAll('#generusTable .rowChk').forEach(c=>{c.checked=false;});const t=document.getElementById('generusTable');if(t){const h=t.closest('table').querySelector('thead input[type=checkbox]');if(h){h.checked=false;h.indeterminate=false;}}bulkChk();}
function bulkChk(){
 const bar=document.getElementById('bulkBar'); if(!bar)return;
 const n=bulkIds().length;
 bar.classList.toggle('show',n>0);
 const tx=document.getElementById('bulkSelTx'),inf=document.getElementById('bulkInfo');
 if(tx)tx.textContent='Hapus terpilih ('+n+')';
 if(inf)inf.textContent=n+' data dipilih';
 const t=document.getElementById('generusTable'), h=t&&t.closest('table')?t.closest('table').querySelector('thead input[type=checkbox]'):null;
 if(h){const all=t.querySelectorAll('.rowChk');h.checked=all.length>0&&n===all.length;h.indeterminate=n>0&&n<all.length;}
}
function bulkAll(cb){document.querySelectorAll('#generusTable tr').forEach(tr=>{if(tr.style.display!=='none'){const c=tr.querySelector('.rowChk');if(c)c.checked=cb.checked;}});bulkChk();}
function bulkList(){return curBulk==='generus'?generus:mmData(curBulk);}
function bulkLabel(){return curBulk==='generus'?'Generus':curBulk==='mubaligh'?'Muballigh':curBulk==='muda-mudi-desa'?'KMM Desa':'KMM Kelompok';}
function bulkAsk(mode,id){
 const L=bulkList(),ids=mode==='one'?[id]:mode==='sel'?bulkIds():L.map(x=>x.id);
 if(!ids.length){showToast('Tidak ada data');return;}
 const one=mode==='one'?L.find(x=>x.id===id):null;
 document.getElementById('modalTitle').textContent=mode==='all'?'Hapus Semua Data':mode==='one'?'Hapus Data':'Hapus Data Terpilih';
 document.getElementById('modalDesc').textContent=bulkLabel();
 document.getElementById('modalBody').innerHTML=`<div class="space-y-4"><p class="text-sm text-slate-600 leading-relaxed">${mode==='one'?`Yakin ingin menghapus <b>${esc(one?(one.n||one.nama||''):'')}</b>?`:`Yakin ingin menghapus <b>${mode==='all'?'SEMUA ':''}${ids.length} data</b> di ${esc(bulkLabel())}?`} Tindakan ini tidak dapat dibatalkan.${curBulk==='generus'?' Daftar peserta pada form absensi yang dibuat sesudahnya juga akan mengikuti perubahan ini.':''}</p>
  <div class="flex justify-end gap-2"><button onclick="closeModal()" class="u-btn">Batal</button><button id="bulkGo" class="u-btn" style="background:#dc2626;border-color:#dc2626;color:#fff">Hapus</button></div></div>`;
 document.getElementById('bulkGo').onclick=()=>bulkDo(ids);
 showModal();
}
function bulkDo(ids){
 const set=new Set(ids);
 if(curBulk==='generus'){
  for(let i=generus.length-1;i>=0;i--)if(set.has(generus[i].id))generus.splice(i,1);
  saveGenerus(); closeModal(); renderGenerus();
 }else{mmPut(curBulk,mmData(curBulk).filter(x=>!set.has(x.id)));closeModal();renderMM(curBulk);}
 showToast(ids.length+' data dihapus');
}
function rowMM(x){
 const stc=x.st==='Menikah'?'bg-blue-50 text-blue-700':'bg-slate-100 text-slate-600', fem=x.jk==='Perempuan', u=lhUmur(x.lh);
 const sub=[x.jk,u!==''?u+' th':''].filter(Boolean).join(' • ');
 return `<tr data-open onclick="if(rowSkip(event))return;mmDetail('${x.id}')" data-id="${x.id}" data-name="${esc(x.n.toLowerCase())}" data-kelompok="${esc(x.k)}" data-st="${esc(x.st)}" data-dap="${esc(String(x.d||'').toLowerCase())}" data-jd="${esc(String(x.jd||'').toLowerCase())}" data-cari="${esc([x.n,x.k,x.d,x.jd,x.wa,x.jk].join(' ').toLowerCase())}">
  <td class="col-chk m-chk"><input type="checkbox" class="rowChk" data-id="${x.id}" onchange="bulkChk()" aria-label="Pilih ${esc(x.n)}"></td>
  <td class="col-no"></td>
  <td class="m-main"><div class="flex items-center gap-3"><div class="min-w-0"><div class="nm truncate">${esc(x.n)}</div>${sub?`<div class="sub">${esc(sub)}</div>`:''}</div></div></td>
  <td class="nowrap">${esc(x.k)||'—'}</td>
  <td>${x.d?`<span class="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold whitespace-nowrap">${esc(x.d)}</span>`:'<span class="text-slate-300">—</span>'}</td>
  ${mmCurPage==='mubaligh'?`<td>${x.jd?`<span class="inline-block px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold whitespace-nowrap">${esc(x.jd)}</span>`:'<span class="text-slate-300">—</span>'}</td>`:''}
  <td class="nowrap">${mmWaCell(x.wa)}</td>
  <td><span class="inline-block px-2.5 py-1 rounded-full ${stc} text-[11px] font-bold whitespace-nowrap">${esc(x.st)}</span></td>
  <td class="col-act m-act"><button title="Edit" aria-label="Edit ${esc(x.n)}" onclick="mmEdit('${x.id}')" class="u-ib">${icon('pencil','w-4 h-4')}</button><button title="Hapus" aria-label="Hapus ${esc(x.n)}" onclick="bulkAsk('one','${x.id}')" class="u-ib del">${icon('trash-2','w-4 h-4')}</button></td></tr>`;
}
function mmDetail(id){
 const pg=curBulk, x=mmData(pg).find(z=>z.id===id); if(!x)return;
 const v=s=>s?esc(s):'—', u=lhUmur(x.lh);
 document.getElementById('modalTitle').textContent=x.n;
 document.getElementById('modalDesc').textContent=(x.d||'Tanpa dapukan')+' • '+(x.k||'Tanpa kelompok');
 document.getElementById('modalBody').innerHTML=`<div class="space-y-4"><div class="grid sm:grid-cols-2 gap-4">
  ${detailCard('Data diri',[['Jenis kelamin',v(x.jk)],['Tanggal lahir',v(lhTgl(x.lh))],['Umur',u!==''?u+' tahun':'—'],['Status',v(x.st)]],'user-round')}
  ${detailCard('Kepengurusan & kontak',[['Kelompok',v(x.k)],[pg==='mubaligh'?'Sebutan':'Dapukan',v(x.d)]].concat(pg==='mubaligh'?[['Jenis dapukan',v(x.jd)]]:[],[['No. WA',mmWaCell(x.wa)]]),'users')}
 </div>${detailActions(`mmEdit('${esc(id)}')`,`bulkAsk('one','${esc(id)}')`)}</div>`;
 showModal(); lucide.createIcons();
}
function dlXlsx(wb,nama){
 try{
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nama+'.xlsx';a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
  return true;
 }catch(e){console.error('Gagal membuat file Excel',e);return false;}
}
const MM_IMP_HEAD=['No','Nama Lengkap','Kelompok','Nama Dapukan','Jenis Kelamin','Tanggal Lahir','No WA','Status'];
const MB_IMP_HEAD=MM_IMP_HEAD.map(h=>h==='Nama Dapukan'?'Jenis Dapukan':h);
const MM_IMP_ALIAS={nama:['nama lengkap','nama'],jk:['jenis kelamin','jk','l p','gender'],kel:['kelompok','asal kelompok'],dap:['nama dapukan','dapukan','jabatan'],lahir:['tanggal lahir','tgl lahir','lahir'],wa:['no wa','no whatsapp','whatsapp','wa','no hp','hp'],st:['status','status pernikahan'],jd:['jenis dapukan','jenis dapukan mubaligh']};
let mmImp={page:'',raw:[],fname:''};
function mmTemplate(page){
 const desa=page==='muda-mudi-desa',kel=activeGroups(),dap=dapGet();
 const mb=page==='mubaligh';
 const rows=[mb?MB_IMP_HEAD:MM_IMP_HEAD,['1','(Contoh) Ahmad Fauzan',kel[0]||'Kelompok A',mb?MB_JD_DEF:(dap[0]||''),'Laki-laki','2002-05-17','081234567890','Masih Lajang']];
 const nama=page==='mubaligh'?'Template_Mubaligh':'Template_Muda_Mudi_'+(desa?'Desa':'Kelompok');
 if(!window.XLSX){fmCsv(nama,rows);showToast('Template CSV diunduh (library Excel belum termuat)');return;}
 const ws=XLSX.utils.aoa_to_sheet(rows);
 ws['!cols']=[{wch:6},{wch:28},{wch:20},{wch:26},{wch:16},{wch:16},{wch:18},{wch:16}];
 for(let r=3;r<=500;r++){ws['F'+r]={t:'s',v:'',z:'@'};ws['G'+r]={t:'s',v:'',z:'@'};}
 ws['!ref']='A1:H500';
 const pet=[['PETUNJUK PENGISIAN'],['1. Isi data mulai baris 2 pada sheet "Data", lalu hapus baris contoh.'],['2. Kolom No boleh dikosongkan (diabaikan saat impor).'],['3. Jenis Kelamin diisi Laki-laki atau Perempuan.'],['4. Kolom Kelompok harus sama persis dengan nama kelompok aktif (lihat daftar di bawah).'],[mb?'5. Jenis Dapukan diisi sesuai daftar di bawah. Jika dikosongkan otomatis menjadi Mubaligh Tugasan. Sebutan (Mubaligh/Mubalighot) otomatis dari jenis kelamin.':'5. Nama Dapukan boleh dikosongkan atau diisi bebas (saran ada di daftar di bawah).'],['6. Tanggal Lahir ditulis YYYY-MM-DD (contoh 2002-05-17) atau DD/MM/YYYY. Boleh dikosongkan.'],['7. No WA ditulis dengan awalan 0, contoh 081234567890. Boleh dikosongkan.'],['8. Status diisi Masih Lajang atau Menikah.'],[],['Kelompok yang tersedia',mb?'Jenis Dapukan yang tersedia':'Nama Dapukan yang tersedia','Jenis Kelamin','Status']];
 const jk=['Laki-laki','Perempuan'],st=['Masih Lajang','Menikah'];
 const dl=mb?MB_JD:dap;for(let i=0;i<Math.max(kel.length,dl.length,2);i++)pet.push([kel[i]||'',dl[i]||'',jk[i]||'',st[i]||'']);
 const w2=XLSX.utils.aoa_to_sheet(pet); w2['!cols']=[{wch:32},{wch:34},{wch:16},{wch:16}];
 const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Data'); XLSX.utils.book_append_sheet(wb,w2,'Petunjuk');
 if(!dlXlsx(wb,nama)){fmCsv(nama,rows);showToast('Gagal membuat file Excel, template CSV diunduh sebagai gantinya');return;}
 showToast('Template Excel '+nama.replace(/^Template_/,'').replace(/_/g,' ')+' diunduh');
}
function mmImpPick(page){
 mmImp.page=page;
 let el=document.getElementById('mmImpFile');
 if(!el){el=document.createElement('input');el.type='file';el.id='mmImpFile';el.accept='.xlsx,.xls,.csv,text/csv';el.className='hidden';el.onchange=mmImpRead;document.body.appendChild(el);}
 el.value='';el.click();
}
function mmImpRead(e){
 const f=e.target.files&&e.target.files[0]; if(!f)return;
 if(f.size>5*1024*1024){showToast('File terlalu besar (maksimal 5 MB)');return;}
 const csv=/\.csv$/i.test(f.name);
 if(!csv&&!window.XLSX){showToast('Library Excel belum termuat. Gunakan file CSV atau periksa koneksi internet.');return;}
 const rd=new FileReader();
 rd.onerror=()=>showToast('Gagal membaca file');
 rd.onload=()=>{
  try{
   let rows;
   if(csv)rows=impCsv(new TextDecoder('utf-8').decode(rd.result));
   else{const wb=XLSX.read(rd.result,{type:'array',cellDates:true});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''}).map(r=>r.map(v=>v instanceof Date?lhFromDate(v):String(v==null?'':v)));}
   mmImpParse(rows,f.name);
  }catch(err){showToast('File tidak dapat dibaca. Pastikan formatnya .xlsx atau .csv');}
 };
 rd.readAsArrayBuffer(f);
}
function mmImpParse(rows,fname){
 let hi=-1,map={};
 for(let r=0;r<Math.min(rows.length,10)&&hi<0;r++){
  const m={};(rows[r]||[]).forEach((h,ci)=>{const k=impNorm(h);for(const key in MM_IMP_ALIAS){if(m[key]===undefined&&MM_IMP_ALIAS[key].includes(k))m[key]=ci;}});
  if(m.nama!==undefined&&m.jk!==undefined&&m.kel!==undefined){hi=r;map=m;}
 }
 if(hi<0){showToast('Header tidak dikenali. Gunakan file dari tombol Template Excel.');return;}
 const raw=[];
 for(let r=hi+1;r<rows.length;r++){
  const g=k=>map[k]===undefined?'':String(rows[r][map[k]]==null?'':rows[r][map[k]]).trim().replace(/\s+/g,' ');
  const x={baris:r+1,nama:normNama(g('nama')),jk:g('jk'),kel:g('kel'),dap:normNama(g('dap')),lahir:g('lahir'),wa:g('wa').replace(/[^\d+\s-]/g,'').trim(),st:g('st'),jd:g('jd')};
  if(!x.nama&&!x.jk&&!x.kel&&!x.dap&&!x.lahir&&!x.wa&&!x.st)continue;
  if(/^\(contoh\)/i.test(x.nama))continue;
  if(/^8\d{7,}$/.test(x.wa.replace(/[\s-]/g,'')))x.wa='0'+x.wa;
  raw.push(x);
 }
 if(!raw.length){showToast('Tidak ada data pada file.');return;}
 if(raw.length>1000){showToast('Maksimal 1000 baris per impor.');return;}
 mmImp.raw=raw;mmImp.fname=fname;mmImpShow();
}
function mmImpEval(){
 const kel=activeGroups(),L=mmData(mmImp.page),seen=new Set();
 return mmImp.raw.map(x=>{
  const r=Object.assign({},x,{ok:'ok',msg:''}),err=m=>{r.ok='err';r.msg=m;return r;};
  if(!x.nama)return err('Nama lengkap kosong');
  if(x.nama.length>60)return err('Nama lebih dari 60 karakter');
  const j=x.jk.toLowerCase().replace(/[^a-z]/g,'');
  r.jk=['l','lk','laki','lakilaki','pria'].includes(j)?'Laki-laki':['p','pr','perempuan','wanita'].includes(j)?'Perempuan':'';
  if(!r.jk)return err('Jenis kelamin harus Laki-laki / Perempuan');
  const ko=kel.find(k=>k.toLowerCase()===x.kel.toLowerCase());
  if(!ko)return err(x.kel?'Kelompok "'+x.kel+'" tidak ada / tidak aktif':'Kelompok kosong');
  r.kel=ko;
  if(x.dap.length>60)return err('Nama dapukan lebih dari 60 karakter');
  if(mmImp.page==='mubaligh'){r.jd=mbJdOf(x.jd);if(!r.jd)return err('Jenis dapukan harus: '+MB_JD.join(' / '));}
  const sj=x.st.toLowerCase().replace(/[^a-z]/g,'');
  r.st=['masihlajang','lajang','belummenikah','belumkawin'].includes(sj)?'Masih Lajang':['menikah','sudahmenikah','kawin','sudahkawin'].includes(sj)?'Menikah':'';
  if(!r.st)return err('Status harus Masih Lajang / Menikah');
  const tg=lhParse(x.lahir); if(tg===null||(tg&&!lhOk(tg)))return err('Tanggal lahir tidak valid'); r.lahir=tg;
  if(x.wa&&!mmWaNorm(x.wa))return err('No. WA tidak valid');
  const key=(r.nama+'|'+r.kel).toLowerCase();
  if(seen.has(key)||L.some(p=>String(p.n).toLowerCase()===r.nama.toLowerCase()&&String(p.k).toLowerCase()===r.kel.toLowerCase())){r.ok='dup';r.msg='Sudah ada (dilewati)';return r;}
  seen.add(key);return r;
 });
}
function mmImpShow(){
 const L=mmImpEval(),n=s=>L.filter(x=>x.ok===s).length,ok=n('ok'),dup=n('dup'),er=n('err');
 const badge=r=>r.ok==='ok'?'<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold whitespace-nowrap">Siap impor</span>':r.ok==='dup'?`<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold whitespace-nowrap">${esc(r.msg)}</span>`:`<span class="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">${esc(r.msg)}</span>`;
 const chip=(c,l,v)=>`<div class="rounded-xl ${c} px-3 py-2 text-center"><div class="text-lg font-extrabold">${v}</div><div class="text-[11px] font-semibold">${l}</div></div>`;
 document.getElementById('modalTitle').textContent=(mmImp.page==='mubaligh'?'Impor Muballigh':'Impor KMM '+(mmImp.page==='muda-mudi-desa'?'Desa':'Kelompok'));
 document.getElementById('modalDesc').textContent=mmImp.fname;
 document.getElementById('modalBody').innerHTML=`<div class="space-y-4">
  <div class="grid grid-cols-3 gap-2">${chip('bg-emerald-50 text-emerald-700','Siap impor',ok)}${chip('bg-amber-50 text-amber-700','Sudah ada',dup)}${chip('bg-red-50 text-red-600','Bermasalah',er)}</div>
  <div class="max-h-[320px] overflow-auto scrollbar border border-line rounded-xl"><table class="w-full min-w-[760px] text-left text-xs"><thead class="bg-slate-50 sticky top-0"><tr class="text-[10px] uppercase tracking-wide text-slate-400"><th class="py-2 px-3">Baris</th><th class="py-2 px-3">Nama</th><th class="py-2 px-3">JK</th><th class="py-2 px-3">Kelompok</th><th class="py-2 px-3">${mmImp.page==='mubaligh'?'Jenis Dapukan':'Dapukan'}</th><th class="py-2 px-3">Tgl Lahir</th><th class="py-2 px-3">No. WA</th><th class="py-2 px-3">Status</th><th class="py-2 px-3">Hasil</th></tr></thead><tbody>${L.map(r=>`<tr class="border-t border-line"><td class="py-2 px-3 text-slate-400">${r.baris}</td><td class="py-2 px-3 font-semibold">${esc(r.nama)||'—'}</td><td class="py-2 px-3">${esc(r.jk)||'—'}</td><td class="py-2 px-3">${esc(r.kel)||'—'}</td><td class="py-2 px-3">${esc(mmImp.page==='mubaligh'?r.jd:r.dap)||'—'}</td><td class="py-2 px-3">${esc(r.lahir||'')||'—'}</td><td class="py-2 px-3">${esc(r.wa)||'—'}</td><td class="py-2 px-3">${esc(r.st)||'—'}</td><td class="py-2 px-3">${badge(r)}</td></tr>`).join('')}</tbody></table></div>
  <p class="text-[11px] text-slate-400">Baris yang sudah ada atau bermasalah dilewati. Hanya baris "Siap impor" yang disimpan.</p>
  <div class="flex justify-end gap-2 pt-2 border-t border-line"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button ${ok?'':'disabled'} onclick="mmImpCommit()" class="px-5 py-2.5 rounded-xl text-sm font-bold ${ok?'bg-navy text-white':'bg-slate-100 text-slate-400 cursor-not-allowed'}">Impor ${ok} data</button></div></div>`;
 showModal();lucide.createIcons();
}
function mmImpCommit(){
 const L=mmImpEval().filter(x=>x.ok==='ok'); if(!L.length)return;
 const pg=mmImp.page,D=mmData(pg); mmType=pg;
 L.forEach(r=>{mmRememberDap(r.dap);D.push({id:'M'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),n:r.nama,jk:r.jk,k:r.kel,d:pg==='mubaligh'?mbSebutan(r.jk):r.dap,wa:r.wa,lh:r.lahir||'',st:r.st,...(pg==='mubaligh'?{jd:r.jd||MB_JD_DEF}:{})});});
 mmPut(pg,D);closeModal();renderMM(pg);showToast(L.length+' data berhasil diimpor');
}
function mmTableHtml(L,desa){
 return `<div id="mmTw" class="u-tw rc"><table class="dt"><thead><tr><th class="col-chk"><input type="checkbox" onchange="bulkAll(this)" title="Pilih semua" aria-label="Pilih semua"></th><th class="col-no">No</th><th>Nama</th><th>${desa?'Asal kelompok':'Kelompok'}</th><th>${mmCurPage==='mubaligh'?'Sebutan':'Dapukan'}</th>${mmCurPage==='mubaligh'?'<th>Jenis Dapukan</th>':''}<th>No. WA</th><th>Status</th><th class="col-act">Aksi</th></tr></thead><tbody id="generusTable">${L.map(rowMM).join('')}</tbody></table></div>
 <div id="mmEmpty0" class="${L.length?'hidden':''}">${emptyState('users-round','Belum ada data','Tambahkan satu per satu, atau impor sekaligus dari Excel.',[['Tambah Data',mmAddFn(mmCurPage),'primary'],['Impor dari Excel',`mmImpPick('${mmCurPage}')`,'ghost']])}</div>
 <div id="mmEmpty1" class="hidden">${emptyState('search-x','Tidak ada data yang cocok','Coba ubah kata kunci atau atur ulang filter yang aktif.',[['Atur ulang filter','mmReset()','ghost']])}</div>`;
}
let mmCurPage='muda-mudi-desa';
function mmAddFn(page){return page==='muda-mudi-kelompok'?'mmkAdd()':`openAddModal('${page}')`;}
function mmReset(){renderMM(mmCurPage);}
function mmMenu(page){return [['file-spreadsheet','Template Excel',`mmTemplate('${page}')`],['upload','Impor dari Excel',`mmImpPick('${page}')`],'-',['trash','Hapus semua data',"bulkAsk('all')",'danger']];}
/* Hitung jumlah baris per nilai kolom tabel (dipakai kartu rincian KMM). */
function kmmCount(L,key){
 const m=new Map();
 L.forEach(x=>{const k=String(x[key]||'').trim()||'—';m.set(k,(m.get(k)||0)+1);});
 return [...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'id'));
}
/* Kartu rincian: daftar nilai kolom dengan jumlah dan batang proporsi. */
function kmmBreakCard(ic,theme,title,sub,pairs){
 const top=pairs.slice(0,8), rest=pairs.length-top.length, max=top.length?Math.max(...top.map(p=>p[1])):1;
 const rows=top.map(([label,n])=>`<div><div class="mb-1.5 flex items-center justify-between gap-3 text-sm"><span class="truncate font-semibold text-slate-700">${esc(label)}</span><span class="shrink-0 font-bold text-slate-800">${n}</span></div><div class="h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full ${theme.bar}" style="width:${n?Math.max(6,Math.round(n/max*100)):0}%"></div></div></div>`).join('');
 return `<div class="rounded-2xl border border-line bg-white p-5 shadow-card">
  <div class="mb-5 flex items-center gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ${theme.icon}">${icon(ic,'w-5 h-5')}</span><div class="min-w-0"><h3 class="font-extrabold text-slate-800">${title}</h3><p class="text-xs text-slate-500">${sub}</p></div></div>
  ${pairs.length?`<div class="space-y-4">${rows}</div>${rest>0?`<p class="mt-4 text-xs text-slate-400">dan ${rest} lainnya</p>`:''}`:'<p class="text-sm text-slate-400">Belum ada data.</p>'}
 </div>`;
}
/* Kartu KMM Desa: semua angka dihitung dari tabel pengurus desa. */
function kmmDesaTop(L){
 const menikah=L.filter(x=>x.st==='Menikah').length, lajang=L.length-menikah;
 const dapukan=kmmCount(L,'d').filter(p=>p[0]!=='—').length;
 const pct=L.length?Math.round(menikah/L.length*100):0;
 return `<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  ${statCard('Total Pengurus',String(L.length),'Pengurus KMM desa','users-round','orange')}
  ${statCard('Menikah',String(menikah),L.length?pct+'% dari pengurus':'Belum ada data','heart-handshake','green')}
  ${statCard('Masih Lajang',String(lajang),L.length?(100-pct)+'% dari pengurus':'Belum ada data','user-round','purple')}
  ${statCard('Dapukan',String(dapukan),'Jenis dapukan yang dipakai','tags','blue')}
 </div>`;
}
/* Kartu KMM Kelompok: semua angka dihitung dari tabel pengurus kelompok. */
function kmmKelTop(L){
 const menikah=L.filter(x=>x.st==='Menikah').length, lajang=L.length-menikah;
 const pct=L.length?Math.round(menikah/L.length*100):0;
  return `<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  ${statCard('Total Pengurus',String(L.length),'Seluruh kelompok','users-round','orange')}
  ${statCard('Menikah',String(menikah),L.length?pct+'% dari pengurus':'Belum ada data','heart-handshake','green')}
  ${statCard('Masih Lajang',String(lajang),L.length?(100-pct)+'% dari pengurus':'Belum ada data','user-round','purple')}
  ${statCard('Kelompok',String(kelompokList.length),'Terdaftar','layers','blue')}
 </div>`;
}
/* ===== MUBALIGH (guru laki-laki) & MUBALIGHOT (guru perempuan) ===== */
function mbSebutan(jk){return jk==='Perempuan'?'Mubalighot':'Mubaligh';}
function mbTop(L){
 const lk=L.filter(x=>x.jk!=='Perempuan').length,pr=L.length-lk,kel=new Set(L.map(x=>x.k).filter(Boolean)).size;
 return `<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  ${statCard('Total',String(L.length),'Muballigh','graduation-cap','orange')}
  ${statCard('Mubaligh',String(lk),'Guru laki-laki','user-round','blue')}
  ${statCard('Mubalighot',String(pr),'Guru perempuan','user-round','purple')}
  ${statCard('Kelompok',String(kel),'Kelompok yang terlayani','layers','green')}
 </div>`;
}
function renderMM(page){
 if(page==='muda-mudi-kelompok')return renderMMK();
 mmCurPage=page; const L=mmData(page);
 mmUi={q:'',k:'',s:'',d:'',j:''};
 document.getElementById('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead(page==='mubaligh'?`Database Muballigh (guru pengajian). Petugas default absensi diatur lewat tombol <b>Petugas Default</b> di menu Absensi Pengajian. <span id="mmTotal" class="font-semibold text-slate-700"></span>`:`Database KMM (Kepengurusan Muda Mudi) tingkat desa. <span id="mmTotal" class="font-semibold text-slate-700"></span>`,pageActions({label:page==='mubaligh'?'Tambah Muballigh':'Tambah Data',fn:mmAddFn(page)},mmMenu(page)))}
  ${page==='muda-mudi-desa'?kmmDesaTop(L):page==='mubaligh'?mbTop(L):''}
  <div class="u-card">
   <div class="u-bar">
    ${uSearch('',  '',"mmFilter('q',this.value)",'Cari nama, dapukan, no. WA...')}
    ${uSel("mmFilter('k',this.value)",'Semua kelompok',kelompokList.map(k=>[k.nama,k.nama]),'')}
    ${page==='mubaligh'?uSel("mmFilter('d',this.value)",'Semua sebutan',[['Mubaligh','Mubaligh'],['Mubalighot','Mubalighot']],''):uSel("mmFilter('d',this.value)",'Semua dapukan',dapGet().map(n=>[n,n]),'')}
    ${page==='mubaligh'?uSel("mmFilter('j',this.value)",'Semua jenis dapukan',MB_JD.map(j=>[j,j]),''):''}
    ${uSel("mmFilter('s',this.value)",'Semua status',[['Masih Lajang','Masih Lajang'],['Menikah','Menikah']],'')}
   </div>
   ${bulkBar(page)}
   ${mmTableHtml(L,true)}
   <div id="mmFoot" class="u-foot"></div>
  </div></div>`;
 mmFilter(); lucide.createIcons();
}

/* ===== AKUN SAYA: ubah nama, username, dan kata sandi =====
   Dipanggil dari renderPage('ganti-password'); sebelumnya fungsi ini tidak ada di berkas ini. */
function renderGantiPassword(){
 const me=window.ME||{};
 const inp='mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-navy focus:ring-4 focus:ring-navy/10';
 document.getElementById('content').innerHTML=`<div class="max-w-2xl mx-auto fade">
  ${pageHead('Atur nama, username login, dan kata sandi akun Anda.')}
  <form id="gpForm" novalidate class="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
   <div class="bg-gradient-to-br from-navy via-[#1f5aa6] to-[#18A66A] p-6 text-white">
    <div class="flex items-center gap-4">
     
     <div class="min-w-0"><div class="truncate text-lg font-extrabold">${esc(me.nama||'Akun')}</div><div class="truncate text-xs text-white/75">@${esc(me.username||'')}</div></div>
    </div>
   </div>
   <div class="space-y-5 p-6">
    <div id="gpErr" role="alert" class="hidden rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"></div>
    <label class="block"><span class="text-xs font-bold text-slate-600">Nama lengkap</span><input id="gpNama" autocomplete="name" maxlength="100" value="${esc(me.nama||'')}" class="${inp}"></label>
    <label class="block"><span class="text-xs font-bold text-slate-600">Username login</span><input id="gpUser" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="32" value="${esc(me.username||'')}" placeholder="huruf kecil, angka, titik, strip, garis bawah" class="${inp}"></label>
    <div class="space-y-4 rounded-2xl border border-line p-4">
     <div><div class="text-sm font-extrabold text-slate-800">Ganti kata sandi</div><p class="mt-0.5 text-xs text-slate-500">Kosongkan jika tidak ingin mengubah kata sandi.</p></div>
     <label class="block"><span class="text-xs font-bold text-slate-600">Kata sandi baru (min. 8 karakter)</span><input id="gpPass" type="password" autocomplete="new-password" class="${inp}"></label>
     <label class="block"><span class="text-xs font-bold text-slate-600">Ulangi kata sandi baru</span><input id="gpPass2" type="password" autocomplete="new-password" class="${inp}"></label>
    </div>
    <div class="flex justify-end pt-1"><button type="submit" class="u-btn primary">${icon('save','w-4 h-4')} Simpan perubahan</button></div>
   </div>
  </form></div>`;
 lucide.createIcons();
 document.getElementById('gpForm').onsubmit=gpSubmit;
}
async function gpSubmit(e){
 e.preventDefault();
 const err=document.getElementById('gpErr'),bad=m=>{err.textContent=m;err.classList.remove('hidden');};
 err.classList.add('hidden');
 const nama=document.getElementById('gpNama').value.trim(),username=document.getElementById('gpUser').value.trim().toLowerCase();
 const a=document.getElementById('gpPass').value,b=document.getElementById('gpPass2').value;
 if(!nama)return bad('Nama akun wajib diisi.');
 if(!/^[a-z0-9._-]{3,32}$/.test(username))return bad('Username 3-32 karakter: huruf kecil, angka, titik, strip, garis bawah.');
 if(a||b){if(a.length<8)return bad('Kata sandi baru minimal 8 karakter.');if(a!==b)return bad('Ulangi kata sandi belum sama.');}
 const body={nama:nama,username:username};if(a)body.baru=a;
 try{
  const r=await fetch('/api/me',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)return bad(j.error||'Gagal menyimpan.');
  window.ME=Object.assign({},window.ME||{},(j&&j.user)||{nama:nama,username:username});
  showToast('Akun berhasil diperbarui');
  renderGantiPassword();
 }catch(x){bad('Tidak dapat terhubung ke server.');}
}
/* ===== KELOLA AKUN (mode lokal): banyak akun, hak akses per menu: tidak / lihat / edit ===== */
const AC_KEY='simdeka_lokal_accounts';let acCur='dashboard',acT=0,acBusy=0,acObs=null;
const AC_DENY=/(tambah|simpan|hapus|edit|ubah|impor|import|unggah|upload|buat |baru|reset|kirim|perbarui|duplikat|pindah|aktifkan|matikan|nonaktif|pulihkan|sinkron)/i;
const AC_OK=/(cetak|print|pratinjau|preview|unduh|download|ekspor|export|excel|csv|pdf|salin|copy|tutup|batal|kembali)/i;
const AC_FN=/\b(add|del|save|remove|create|clear|new|update|import|upload|toggle|edit|set|move|rename|dup)[A-Z0-9_]|(Add|Del|Save|Remove|Create|Clear|New|Update|Import|Upload|Toggle|Edit|Set[A-Z]|Move|Rename|Dup)/;
function acLoad(){try{return JSON.parse(localStorage.getItem(AC_KEY)||'[]');}catch(e){return [];}}
function acSave(a){localStorage.setItem(AC_KEY,JSON.stringify(a));}
function acPages(){return navGroups.flatMap(g=>g.items).filter(i=>!['dashboard','ganti-password','pengaturan'].includes(i[0])).map(i=>({id:i[0],l:i[2]}));}
function acToast(){if(Date.now()-acT>1500){acT=Date.now();showToast('Akun ini hanya bisa melihat, tidak dapat mengubah data.');}}
function acRO(){const m=window.ME;return !!(m&&m.akses&&m.akses[acCur]==='lihat');}
function acDeny(el){const lb=(el.textContent||'').slice(0,100)+' '+(el.title||'')+' '+(el.getAttribute('aria-label')||''),oc=el.getAttribute('onclick')||'';return !AC_OK.test(lb+oc)&&(AC_DENY.test(lb)||AC_FN.test(oc));}
function acApplyRO(){
 const ct=document.getElementById('content');if(!ct)return;let bar=document.getElementById('roBar');
 if(!acRO()){if(bar)bar.remove();return;}
 if(!bar){bar=document.createElement('div');bar.id='roBar';bar.className='mb-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-xs font-bold px-4 py-3';bar.textContent='Mode lihat saja: akun Anda tidak dapat mengubah data di menu ini.';ct.prepend(bar);}
 ct.querySelectorAll('textarea,input:not([type=search]):not([type=date]):not([type=hidden])').forEach(i=>{if(/cari|search|filter/i.test((i.placeholder||'')+i.id+i.className))return;if(i.type==='checkbox'||i.type==='radio')i.disabled=true;else i.readOnly=true;});
 ct.querySelectorAll('button,a[onclick],[role=button]').forEach(b=>{if(acDeny(b))b.classList.add('ro-deny');});
}
function acWatch(){const ct=document.getElementById('content');if(acObs||!ct)return;acObs=new MutationObserver(()=>{if(acRO()&&!acBusy){acBusy=1;requestAnimationFrame(()=>{acBusy=0;acApplyRO();});}});acObs.observe(ct,{childList:true,subtree:true});}
(function(){
 const st=document.createElement('style');st.textContent='.ro-deny{opacity:.35!important;cursor:not-allowed!important}';document.head.appendChild(st);
 document.addEventListener('click',e=>{if(!acRO())return;let el=e.target;
  while(el&&el!==document.body){if(el.matches&&el.matches('button,a,[onclick],[role=button],[type=submit]')&&el.closest('#content,#modal')&&acDeny(el)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();acToast();return;}el=el.parentElement;}
 },true);
 document.addEventListener('submit',e=>{if(acRO()&&e.target.closest&&e.target.closest('#content,#modal')){e.preventDefault();e.stopPropagation();acToast();}},true);
 const si=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===window.localStorage&&acRO()&&!/lokal_user|lokal_accounts|cols|hide|theme|_ai|gemini|drive/i.test(k)){acToast();return;}return si.apply(this,arguments);};
 const fe=window.fetch;window.fetch=function(u,o){const url=typeof u==='string'?u:((u&&u.url)||''),mt=((o&&o.method)||'GET').toUpperCase();
  if(acRO()&&mt!=='GET'&&/\/api\//.test(url)&&!/\/api\/(me|login|logout)/.test(url)){acToast();return Promise.resolve(new Response(JSON.stringify({error:'Akun hanya bisa melihat.'}),{status:403,headers:{'content-type':'application/json'}}));}
  return fe.apply(this,arguments);};
 const rp=renderPage;renderPage=function(p){acCur=p;const r=rp.apply(this,arguments);acWatch();setTimeout(acApplyRO,0);return r;};
 renderGantiPassword=acPage;
})();
function acInit(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();}
const AC_AV=['#173B70','#18A66A','#7C3AED','#D97706','#E5484D','#0EA5E9'];let acTab='profil';
function acAv(n,sz){sz=sz||46;let h=0;String(n).split('').forEach(c=>{h=(h*31+c.charCodeAt(0))>>>0;});return `<div class="ak-av" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz*.33)}px;background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,0)),${AC_AV[h%6]}">${esc(acInit(n))}</div>`;}
function acEye(id,b){const i=document.getElementById(id);if(!i)return;const s=i.type==='password';i.type=s?'text':'password';b.innerHTML=icon(s?'eye-off':'eye','w-4 h-4');b.setAttribute('aria-label',s?'Sembunyikan kata sandi':'Tampilkan kata sandi');lucide.createIcons();}
function acStr(v){const el=document.getElementById('gpStr');if(!el)return;if(!v){el.innerHTML='';return;}let s=0;if(v.length>=8)s++;if(/[A-Z]/.test(v)&&/[a-z]/.test(v))s++;if(/\d/.test(v))s++;if(/[^A-Za-z0-9]/.test(v)||v.length>=12)s++;const c=['','#ef4444','#f59e0b','#3b82f6','#18A66A'],t=['','Lemah','Cukup','Baik','Kuat'];el.innerHTML=[1,2,3,4].map(i=>`<i style="background:${i<=s?c[s]:''}"></i>`).join('')+`<span style="color:${c[s]||'#94a3b8'}">${t[s]||'Lemah'}</span>`;}
function acTabSet(t){acTab=t;renderGantiPassword();}
function acRender(){renderGantiPassword();}
function acPage(){
 const me=window.ME||{},su=me.role==='super_admin',L=su?acLoad():[],pg=acPages();
 if(!su)acTab='profil';
 const rl=me.peran||ROLE_LABEL[me.role]||me.role||'Akun',ak=me.akses||null,cnt=v=>ak?Object.values(ak).filter(x=>x===v).length:0;
 const hs=(ic,l,v)=>`<div class="ak-hstat"><span class="ic">${icon(ic,'w-[18px] h-[18px]')}</span><div class="min-w-0"><small>${l}</small><b>${v}</b></div></div>`;
 const hero=`<section class="ak-hero"><div class="ak-hero-top"><div class="ak-av-lg">${esc(acInit(me.nama||me.username))}</div>
  <div class="min-w-0 flex-1 basis-56"><div class="ak-name">${esc(me.nama||'Akun')}</div><div class="ak-handle">@${esc(me.username||'')}</div>
  <div class="mt-3 flex flex-wrap gap-2"><span class="ak-pill">${icon('shield-check','w-3.5 h-3.5')}${esc(rl)}</span><span class="ak-pill"><span class="ak-dot"></span>Aktif</span></div></div>
  <button type="button" onclick="logout()" class="ak-ghost">${icon('log-out','w-4 h-4')} Keluar</button></div>
  <div class="ak-stats">${hs('shield-check','Peran',esc(rl))}${hs('layout-grid','Akses menu',ak?cnt('edit')+' edit · '+cnt('lihat')+' lihat':'Semua menu')}${hs('circle-check','Status','Aktif')}${su?hs('users','Akun tambahan',L.length):''}</div></section>`;
 const tb=(id,ic,l,n)=>`<button type="button" onclick="acTabSet('${id}')" class="ak-tab ${acTab===id?'on':''}">${icon(ic,'w-4 h-4')}${l}${n!=null?`<span class="n">${n}</span>`:''}</button>`;
 const tabs=su?`<div class="ak-tabs" role="tablist">${tb('profil','user-round','Profil & Keamanan')}${tb('akun','users','Kelola Akun',L.length)}</div>`:'<div class="h-6"></div>';
 const sh=(ic,t,d)=>`<div class="ak-sec-h"><span class="ak-ic">${icon(ic,'w-5 h-5')}</span><div><h3>${t}</h3><p>${d}</p></div></div>`;
 const profil=`<form id="gpForm" novalidate class="ak-card"><div class="ak-sec">
   <div id="gpErr" role="alert" class="hidden mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"></div>
   ${sh('user-round','Informasi akun','Nama tampilan dan username untuk masuk')}
   <div class="ak-grid"><label class="block"><span class="ak-lab">Nama lengkap</span><div class="ak-wrap"><input id="gpNama" autocomplete="name" maxlength="100" value="${esc(me.nama||'')}" class="ak-in"></div></label>
   <label class="block"><span class="ak-lab">Username login</span><div class="ak-wrap"><span class="ak-pre">@</span><input id="gpUser" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="32" value="${esc(me.username||'')}" class="ak-in pre"></div></label></div>
   <p class="ak-hint">Username: huruf kecil, angka, titik, strip, atau garis bawah (3-32 karakter).</p></div>
  <div class="ak-sec">${sh('lock-keyhole','Keamanan','Kosongkan jika tidak ingin mengganti kata sandi')}
   <div class="ak-grid"><label class="block"><span class="ak-lab">Kata sandi baru</span><div class="ak-wrap"><input id="gpPass" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter" oninput="acStr(this.value)" class="ak-in suf"><button type="button" class="ak-eye" aria-label="Tampilkan kata sandi" onclick="acEye('gpPass',this)">${icon('eye','w-4 h-4')}</button></div><div id="gpStr" class="ak-str"></div></label>
   <label class="block"><span class="ak-lab">Ulangi kata sandi baru</span><div class="ak-wrap"><input id="gpPass2" type="password" autocomplete="new-password" placeholder="Ketik ulang kata sandi" class="ak-in suf"><button type="button" class="ak-eye" aria-label="Tampilkan kata sandi" onclick="acEye('gpPass2',this)">${icon('eye','w-4 h-4')}</button></div></label></div></div>
  <div class="ak-foot"><p>${icon('info','w-4 h-4')}Perubahan langsung berlaku di login berikutnya.</p><button type="submit" class="u-btn primary">${icon('save','w-4 h-4')} Simpan perubahan</button></div></form>`;
 const chips=a=>{const l=pg.filter(p=>a.akses[p.id]&&a.akses[p.id]!=='tidak');return l.slice(0,5).map(p=>`<span class="ak-chip ${a.akses[p.id]==='edit'?'bg-emerald-50 text-emerald-700':'bg-blue-50 text-blue-700'}">${esc(p.l)} · ${a.akses[p.id]==='edit'?'Edit':'Lihat'}</span>`).join('')+(l.length>5?`<span class="ak-chip bg-slate-100 text-slate-500">+${l.length-5} lagi</span>`:'');};
 const item=a=>`<div class="ak-row ${a.aktif===false?'opacity-60':''}">${acAv(a.nama,48)}<div class="min-w-0 flex-1 basis-56"><div class="flex flex-wrap items-center gap-2"><b class="text-sm text-slate-900 truncate">${esc(a.nama)}</b>${a.peran?`<span class="ak-chip bg-slate-100 text-slate-600">${esc(a.peran)}</span>`:''}${a.aktif===false?'<span class="ak-chip bg-red-50 text-red-600">Nonaktif</span>':''}</div><div class="text-[12px] text-slate-400 mt-0.5">@${esc(a.username)}</div><div class="mt-2.5 flex flex-wrap gap-1.5">${chips(a)||'<span class="text-[11px] text-slate-400">Belum ada menu dibuka</span>'}</div></div>
  <div class="flex items-center gap-2.5 ml-auto"><button role="switch" aria-checked="${a.aktif!==false}" aria-label="Akun aktif" title="Aktif / nonaktif" onclick="acToggle('${a.id}')" class="gf-sw" style="--fc:#18A66A"><span></span></button><button onclick="acForm('${a.id}')" title="Edit" aria-label="Edit akun" class="ak-ib text-slate-500 hover:bg-slate-50 hover:border-slate-300">${icon('pencil','w-4 h-4')}</button><button onclick="acDel('${a.id}')" title="Hapus" aria-label="Hapus akun" class="ak-ib text-red-500 hover:bg-red-50 hover:border-red-200">${icon('trash-2','w-4 h-4')}</button></div></div>`;
 const act=L.filter(a=>a.aktif!==false).length,kpi=(ic,l,v,bg,tx)=>`<div class="ak-card ak-kpi"><span class="ic ${bg}">${icon(ic,'w-5 h-5')}</span><div><small>${l}</small><b class="${tx}">${v}</b></div></div>`;
 const akun=`<div><div class="ak-top"><div><h3>Kelola Akun</h3><p>Atur akses lihat atau edit untuk tiap menu. Tersimpan di server (database D1).</p></div><button onclick="acForm()" class="u-btn primary">${icon('user-plus','w-4 h-4')} Tambah Akun</button></div>
  <div class="ak-kpis">${kpi('users','Total akun',L.length,'bg-blue-50 text-navy','text-navy')}${kpi('user-check','Aktif',act,'bg-emerald-50 text-emerald-600','text-emerald-600')}${kpi('user-x','Nonaktif',L.length-act,'bg-slate-100 text-slate-400','text-slate-500')}</div>
  ${L.length?`<div class="ak-card ak-list">${L.map(item).join('')}</div>`:`<div class="ak-empty"><div class="mx-auto w-16 h-16 rounded-2xl bg-white border border-line shadow-card text-navy grid place-items-center">${icon('users','w-7 h-7')}</div><h4 class="mt-5 text-base font-extrabold text-slate-800">Belum ada akun tambahan</h4><p class="mt-1.5 mx-auto max-w-sm text-xs leading-relaxed text-slate-500">Tambahkan akun untuk pengurus lain dan tentukan menu yang boleh dilihat atau diedit.</p><button onclick="acForm()" class="u-btn primary mt-5">${icon('user-plus','w-4 h-4')} Tambah Akun</button></div>`}</div>`;
 document.getElementById('content').innerHTML=`<div class="max-w-4xl mx-auto fade">${pageHead('Kelola profil, keamanan, dan akun pengguna.')}${hero}${tabs}${acTab==='akun'&&su?akun:profil}</div>`;
 lucide.createIcons();const f=document.getElementById('gpForm');if(f)f.onsubmit=gpSubmit;
}
function acFill(v){document.querySelectorAll('#acFm input[type=radio][value="'+v+'"]').forEach(r=>{r.checked=true;});}
function acForm(id){
 const a=acLoad().find(x=>x.id===id)||{akses:{}},ids=acPages().map(p=>p.id);
 const seg=(p,v,l,c)=>`<label class="cursor-pointer"><input type="radio" name="acp_${p.id}" value="${v}" class="sr-only" ${(a.akses[p.id]||'tidak')===v?'checked':''}><span class="ak-seg ${c}">${l}</span></label>`;
 const qb=(v,l)=>`<button type="button" onclick="acFill('${v}')" class="px-3 h-8 rounded-lg border border-line bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50">${l}</button>`;
 const fld=(l,i,x)=>`<label class="block"><span class="ak-lab">${l}</span><div class="ak-wrap">${i}</div></label>`;
 const grp=navGroups.map(g=>({l:g.label,it:g.items.filter(i=>ids.includes(i[0]))})).filter(g=>g.it.length).map(g=>`<div>${g.l?`<div class="ak-grp-t">${esc(g.l)}</div>`:''}<div class="ak-grp">${g.it.map(i=>{const p={id:i[0]};return `<div><span class="flex items-center gap-3 text-sm font-semibold text-slate-700"><span class="w-8 h-8 rounded-[10px] bg-slate-50 text-slate-500 grid place-items-center">${icon(i[1],'w-4 h-4')}</span>${esc(i[2])}</span><span class="ak-segs">${seg(p,'tidak','Tidak','t')}${seg(p,'lihat','Lihat','l')}${seg(p,'edit','Edit','e')}</span></div>`;}).join('')}</div></div>`).join('');
 fmEl('modalTitle').textContent=id?'Edit Akun':'Tambah Akun';fmEl('modalDesc').textContent='Atur siapa yang boleh melihat atau mengedit tiap menu';
 fmEl('modalBody').innerHTML=`<div id="acFm" class="space-y-6"><div id="acErr" role="alert" class="hidden rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-4 py-3"></div>
  <div class="ak-grid">${fld('Nama lengkap',`<input id="acNama" maxlength="100" value="${esc(a.nama||'')}" class="ak-in">`)}
  ${fld('Username',`<span class="ak-pre">@</span><input id="acUser" maxlength="32" autocapitalize="none" value="${esc(a.username||'')}" class="ak-in pre">`)}
  ${fld('Jabatan <span class="font-normal text-slate-400">(opsional)</span>',`<input id="acPeran" maxlength="40" value="${esc(a.peran||'')}" placeholder="mis. Sekretaris" class="ak-in">`)}
  ${fld('Kata sandi '+(id?'<span class="font-normal text-slate-400">(kosongkan jika tetap)</span>':'<span class="font-normal text-slate-400">(min. 8 karakter)</span>'),`<input id="acPass" type="password" autocomplete="new-password" class="ak-in suf"><button type="button" class="ak-eye" aria-label="Tampilkan kata sandi" onclick="acEye('acPass',this)">${icon('eye','w-4 h-4')}</button>`)}</div>
  <div class="space-y-3.5"><div class="flex flex-wrap items-center justify-between gap-2"><span class="text-sm font-extrabold text-slate-800">Hak akses per menu</span><span class="flex gap-1.5">${qb('edit','Semua edit')}${qb('lihat','Semua lihat')}${qb('tidak','Kosongkan')}</span></div>${grp}
  <p class="ak-hint">Dashboard dan Akun Saya selalu terbuka. Menu Pengaturan hanya untuk Super Admin.</p></div>
  <div class="flex justify-end gap-2 pt-1"><button onclick="closeModal()" class="u-btn">Batal</button><button onclick="acSubmit('${id||''}')" class="u-btn primary">Simpan</button></div></div>`;
 showModal();
}
function acSubmit(id){
 const L=acLoad(),pg=acPages(),err=document.getElementById('acErr'),bad=m=>{err.textContent=m;err.classList.remove('hidden');};
 const nama=document.getElementById('acNama').value.trim(),user=document.getElementById('acUser').value.trim().toLowerCase(),peran=document.getElementById('acPeran').value.trim(),pw=document.getElementById('acPass').value;
 if(!nama)return bad('Nama wajib diisi.');
 if(!/^[a-z0-9._-]{3,32}$/.test(user))return bad('Username 3-32 karakter: huruf kecil, angka, titik, strip, garis bawah.');
 if(L.some(x=>x.username===user&&x.id!==id))return bad('Username sudah dipakai akun lain.');
 if((!id||pw)&&pw.length<8)return bad('Kata sandi minimal 8 karakter.');
 const ak={};pg.forEach(p=>{const r=document.querySelector('input[name="acp_'+p.id+'"]:checked');ak[p.id]=r?r.value:'tidak';});
 if(!pg.some(p=>ak[p.id]!=='tidak'))return bad('Pilih minimal satu menu dengan akses Lihat atau Edit.');
 const old=L.find(x=>x.id===id),rec={id:id||('a'+Date.now().toString(36)),nama:nama,username:user,peran:peran,akses:ak,aktif:old?old.aktif!==false:true,pass:pw?window.acHash(pw):old.pass};
 if(old)L[L.indexOf(old)]=rec;else L.push(rec);
 acSave(L);closeModal();acRender();showToast('Akun disimpan');
}
function acToggle(id){const L=acLoad(),a=L.find(x=>x.id===id);if(!a)return;a.aktif=a.aktif===false;acSave(L);acRender();}
async function acDel(id){const L=acLoad(),a=L.find(x=>x.id===id);if(!a)return;
 if(!await uiConfirm({title:'Hapus akun?',message:'Akun @'+a.username+' tidak bisa login lagi.',ok:'Ya, Hapus',tone:'danger'}))return;
 acSave(L.filter(x=>x.id!==id));acRender();showToast('Akun dihapus');}

/* ===== MUDA MUDI KELOMPOK: chip per kelompok ===== */
const MMK_ICON=['bg-blue-50 text-blue-700','bg-emerald-50 text-emerald-600','bg-violet-50 text-violet-600','bg-amber-50 text-amber-600','bg-rose-50 text-rose-600','bg-sky-50 text-sky-700','bg-teal-50 text-teal-700','bg-indigo-50 text-indigo-700'];
/* KMM Kelompok: langsung tabel pengurus yang modern. Filter kelompok ada di toolbar. */
function renderMMK(){
 const page='muda-mudi-kelompok', L=mmData(page);
 mmCurPage=page;
 mmUi={q:'',k:'',s:'',d:''};
 const menikah=L.filter(x=>x.st==='Menikah').length;
 document.getElementById('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead(`Kepengurusan Muda Mudi (KMM) per kelompok. <span class="font-semibold text-slate-700">${L.length} pengurus</span> • ${kelompokList.length} kelompok`,pageActions({label:'Tambah Pengurus',fn:'mmkAdd()'},mmMenu(page)))}
  ${kmmKelTop(L)}
  <div id="mmkWrap" class="mmk-modern u-card">
   <div class="u-bar">
    ${uSearch('','',"mmFilter('q',this.value)",'Cari nama, dapukan, no. WA...')}
    ${uSel("mmFilter('k',this.value)",'Semua kelompok',kelompokList.map(k=>[k.nama,k.nama]),'')}
    ${uSel("mmFilter('d',this.value)",'Semua dapukan',dapGet().map(n=>[n,n]),'')}
    ${uSel("mmFilter('s',this.value)",'Semua status',[['Masih Lajang','Masih Lajang'],['Menikah','Menikah']],'')}
   </div>
   ${bulkBar(page)}
   ${mmTableHtml(L,false)}
   <div id="mmFoot" class="u-foot"></div>
  </div></div>`;
 mmFilter(); lucide.createIcons();
}
function mmkAdd(){
 openMmModal('muda-mudi-kelompok');
 const s=document.getElementById('mmKel'); if(s&&mmUi.k)s.value=mmUi.k;
}

/* ===== EDIT DATA MUDA MUDI (desa & kelompok) ===== */
function mmEdit(id){
 const pg=curBulk, x=mmData(pg).find(z=>z.id===id); if(!x)return; mmType=pg;
 const inp='mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white focus:border-navy focus:ring-2 focus:ring-navy/10',
  lb=t=>`<span class="text-xs font-bold text-slate-600">${t}</span>`,
  opt=(l,v)=>l.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join(''),
  kl=activeGroups().slice(); if(x.k&&!kl.includes(x.k))kl.push(x.k);
 document.getElementById('modalTitle').textContent='Edit '+titles[pg];
 document.getElementById('modalDesc').textContent=x.n;
 document.getElementById('modalBody').innerHTML=`<form onsubmit="mmEditSave(event,'${esc(id)}')" class="space-y-4" novalidate>
  <p id="meErr" class="hidden text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2"></p>
  <datalist id="mmDapList">${dapGet().map(d=>`<option value="${esc(d)}">`).join('')}</datalist>
  <div class="grid sm:grid-cols-2 gap-3">
   <label class="block sm:col-span-2">${lb('Nama Lengkap')}<input id="me_n" maxlength="100" value="${esc(x.n)}" class="${inp}"></label>
   <label class="block">${lb(pg==='muda-mudi-kelompok'?'Kelompok':'Asal Kelompok')}<select id="me_k" class="${inp}"><option value="">Pilih Kelompok</option>${opt(kl,x.k)}</select></label>
   ${pg==='mubaligh'?`<label class="block">${lb('Sebutan')}<div class="${inp} bg-slate-50 text-slate-500">Otomatis dari jenis kelamin</div><input id="me_d" type="hidden" value=""></label>`:`<label class="block">${lb('Nama Dapukan')}<input id="me_d" maxlength="60" list="mmDapList" autocomplete="off" value="${esc(x.d||'')}" class="${inp}"></label>`}
   ${pg==='mubaligh'?`<label class="block">${lb('Jenis Dapukan')}<select id="me_jd" class="${inp}">${opt(MB_JD.concat(x.jd&&!MB_JD.includes(x.jd)?[x.jd]:[]),x.jd||MB_JD_DEF)}</select></label>`:''}
   <label class="block">${lb('Jenis Kelamin')}<select id="me_jk" class="${inp}"><option value="">Pilih</option>${opt(['Laki-laki','Perempuan'],x.jk)}</select></label>
   <label class="block">${lb('Status')}<select id="me_st" class="${inp}"><option value="">Pilih</option>${opt(['Masih Lajang','Menikah'],x.st)}</select></label>
   <label class="block">${lb('Tanggal Lahir')}<input id="me_lh" type="date" min="1900-01-01" max="${fmIso(new Date())}" value="${esc(x.lh||'')}" class="${inp}"></label>
   <label class="block">${lb('No. WA')}<input id="me_wa" type="tel" maxlength="20" value="${esc(x.wa||'')}" class="${inp}" placeholder="08xxxxxxxxxx"></label>
  </div>
  <div class="flex justify-end gap-2 pt-3 border-t border-line"><button type="button" onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">Simpan Perubahan</button></div></form>`;
 showModal();lucide.createIcons();
}
function mmEditSave(e,id){
 e.preventDefault(); const pg=mmType, L=mmData(pg), x=L.find(z=>z.id===id); if(!x){closeModal();return;}
 const g=k=>(document.getElementById('me_'+k).value||'').replace(/\s+/g,' ').trim(), er=document.getElementById('meErr'),
  bad=m=>{er.textContent=m;er.classList.remove('hidden');};
 const o={n:g('n'),k:g('k'),d:g('d'),jk:g('jk'),st:g('st'),lh:g('lh'),wa:g('wa')};
 if(pg==='mubaligh'){o.d=mbSebutan(o.jk);o.jd=g('jd')||MB_JD_DEF;}
 if(!o.n)return bad('Nama wajib diisi.');
 if(!o.k)return bad('Kelompok wajib dipilih.');
 if(!o.jk||!o.st)return bad('Jenis kelamin dan status wajib dipilih.');
 if(o.wa&&!mmWaNorm(o.wa))return bad('Nomor WA tidak valid. Contoh: 081234567890.');
 if(o.lh&&!lhOk(o.lh))return bad('Tanggal lahir tidak valid.');
 mmRememberDap(o.d); Object.assign(x,o); mmPut(pg,L); closeModal(); renderMM(pg); showToast('Data diperbarui');
}
let mmUi={q:'',k:'',s:'',d:'',j:''};
function mmFilter(key,val){
 if(key)mmUi[key]=String(val||'');
 const q=mmUi.q.trim().toLowerCase(); let tampil=0,total=0;
 document.querySelectorAll('#generusTable tr[data-id]').forEach(tr=>{
  total++;
  const ok=(!q||tr.dataset.cari.includes(q))&&(!mmUi.k||tr.dataset.kelompok===mmUi.k)&&(!mmUi.s||tr.dataset.st===mmUi.s)&&(!mmUi.d||tr.dataset.dap===mmUi.d.toLowerCase())&&(!mmUi.j||tr.dataset.jd===mmUi.j.toLowerCase());
  tr.style.display=ok?'':'none'; if(ok)tampil++;
  if(!ok){const c=tr.querySelector('.rowChk');if(c)c.checked=false;}
 });
 const f=document.getElementById('mmFoot'),t=document.getElementById('mmTotal'),tw=document.getElementById('mmTw'),e0=document.getElementById('mmEmpty0'),e1=document.getElementById('mmEmpty1');
 if(f){f.innerHTML=(tampil===total?'Total <b>'+total+'</b> data':'Menampilkan <b>'+tampil+'</b> dari '+total+' data');f.classList.toggle('hidden',!tampil);}
 if(t)t.textContent='\u2022 '+total+' data';
 if(tw)tw.classList.toggle('hidden',tampil===0);
 if(e0)e0.classList.toggle('hidden',total>0);
 if(e1)e1.classList.toggle('hidden',!(total>0&&tampil===0));
 if(typeof bulkChk==='function')bulkChk();
}


function renderPage(page){
 if(!menuAllowed(page))page='dashboard';
 document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
 document.querySelectorAll('.bottom-item').forEach(x=>{x.classList.toggle('text-navy',x.dataset.page===page);x.classList.toggle('text-slate-400',x.dataset.page!==page);});
 document.getElementById('pageTitle').textContent=titles[page];
 {const bc=document.getElementById('breadcrumb'),gl=groupOf[page]||'';bc.textContent=gl;bc.classList.toggle('hidden',!gl);}
 if(page==='dashboard') renderDashboard();
 else if(page==='generus') renderGenerus();
 else if(page==='kelompok') renderKelompok();
 else if(page==='form') renderFormPage();
 else if(page==='pengaturan') renderPengaturan();
 else if(page==='ganti-password') renderGantiPassword();
 else if(page==='laporan') renderLaporanMenu();
 else if(page==='muda-mudi-desa') renderMM(page);
 else if(page==='muda-mudi-kelompok') renderMM(page);
 else if(page==='mubaligh') renderMM(page);
 else if(page==='absensi-kmm') renderAbsensiKmm();
 else if(page==='musyawarah') renderMusyawarah();
 else if(page==='pengumuman') renderPengumuman();
 else renderGeneric(page);
 closeDrawer();
}

function navigate(page){ renderPage(page); window.scrollTo({top:0,behavior:'smooth'}); }
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-page]');
 if(btn) navigate(btn.dataset.page);
});

function openDrawer(){ document.getElementById('drawerOverlay').classList.remove('hidden');document.getElementById('mobileDrawer').classList.remove('-translate-x-full'); }
function closeDrawer(){ document.getElementById('drawerOverlay').classList.add('hidden');document.getElementById('mobileDrawer').classList.add('-translate-x-full'); }
document.getElementById('drawerOverlay').onclick=closeDrawer;


function openDetail(id){
 const g=generus.find(x=>x.id===id); if(!g)return;
 const v=x=>x?esc(x):'—', u=genUsia(g);
 document.getElementById('modalTitle').textContent=g.nama;
 document.getElementById('modalDesc').textContent=`${g.status} • ${g.kelompok} • ID ${g.id}`;
 document.getElementById('modalBody').innerHTML=`<div class="space-y-4">
  <div class="grid sm:grid-cols-2 gap-4">
   ${detailCard('Identitas',[['Jenis Kelamin',v(g.jk)],['Tempat Lahir',v(g.tempat)],['Tanggal Lahir',v(lhTgl(g.tgl))],['Usia',u===''?'—':u+' tahun']],'user-round')}
   ${detailCard('Pendidikan',[['SMP',v(g.smp)],['SMA/SMK',v(g.sma)],['Universitas',v(g.univ)],['Status Kelas',v(g.kelas)],['Pendidikan Terakhir',v(g.pend)]],'graduation-cap')}
   ${detailCard('Pekerjaan & Orang Tua',[['Pekerjaan',v(g.kerja)],['Nama Ayah',v(g.ayah)],['Status Ayah',v(g.ayahSt)],['Nama Ibu',v(g.ibu)],['Status Ibu',v(g.ibuSt)]],'users')}
   <div class="rounded-2xl border border-line p-4"><div class="flex items-center gap-2 mb-4"><div class="w-8 h-8 rounded-lg bg-navy/5 text-navy grid place-items-center">${icon('activity','w-4')}</div><h4 class="font-extrabold text-sm">Catatan SB</h4></div><p class="text-xs text-slate-600 whitespace-pre-line leading-relaxed">${g.cat?esc(g.cat):'—'}</p></div>
  </div>
  <div class="flex justify-end gap-2 pt-2"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Tutup</button><button onclick="curBulk='generus';bulkAsk('one','${esc(g.id)}')" class="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold">Hapus</button><button onclick="genOpenForm('${esc(g.id)}')" class="px-4 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">Edit Data</button></div>
 </div>`;
 showModal(); lucide.createIcons();
}


function detailCard(title,rows,ico){
 return `<div class="rounded-2xl border border-line p-4"><div class="flex items-center gap-2 mb-4"><div class="w-8 h-8 rounded-lg bg-navy/5 text-navy grid place-items-center">${icon(ico,'w-4')}</div><h4 class="font-extrabold text-sm">${title}</h4></div><div class="space-y-2.5">${rows.map(r=>`<div class="flex justify-between gap-3 text-xs"><span class="text-slate-400">${r[0]}</span><b class="text-right">${r[1]}</b></div>`).join('')}</div></div>`;
}

const MM_DAP_KEY='simdeka_mm_dapukan';
const MM_DAP_DEFAULT=['Ketua Muda Mudi','Wakil Ketua Muda Mudi','Penerobos Muda Mudi','Keputrian Kelompok'];
function mmDapCustom(){try{const a=JSON.parse(localStorage.getItem(MM_DAP_KEY)||'[]');return Array.isArray(a)?a.filter(x=>typeof x==='string'&&x&&!MM_DAP_DEFAULT.some(d=>d.toLowerCase()===x.toLowerCase())).slice(0,60):[];}catch(e){return [];}}
dapMigrasi();
function mmDapukanField(){
 const all=dapGet();
 return `<input id="mmDapukan" type="text" maxlength="60" autocomplete="off" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm" placeholder="Pilih di bawah atau ketik nama dapukan">
  <div class="flex flex-wrap gap-1.5 mt-2">${all.map(x=>`<button type="button" onclick="mmPickDap(this)" data-v="${esc(x)}" class="px-2.5 py-1 rounded-full border border-line text-[11px] font-semibold text-slate-600 hover:bg-navy hover:text-white hover:border-navy transition">${esc(x)}</button>`).join('')}</div>
  <span class="block text-[11px] text-slate-400 mt-1.5">Boleh diisi manual. Nama baru akan muncul sebagai pilihan berikutnya.</span>`;
}
function mmWaNorm(v){let d=String(v||'').replace(/\D/g,'');if(d.startsWith('0'))d='62'+d.slice(1);else if(d.startsWith('8'))d='62'+d;return /^62\d{8,13}$/.test(d)?d:'';}
function mmWaCell(v){const n=mmWaNorm(v);return n?`<a href="https://wa.me/${n}" target="_blank" rel="noopener" title="Chat via WhatsApp" class="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:underline">${icon('message-circle','w-4 h-4')}${esc(v)}</a>`:'—';}
function mmCell(i,j){return '—';}
let mmType='muda-mudi-kelompok';
function mmDesa(){return mmType!=='muda-mudi-kelompok';}
function mmRowHtml(){
 const inp='w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white',lb=t=>`<span class="text-[11px] font-bold text-slate-500 ">${t}</span>`;
 const F={
  n:c=>`<label class="${c} block">${lb('Nama Lengkap')}<input type="text" data-f="n" maxlength="100" class="${inp}" placeholder="Nama Lengkap"></label>`,
  k:c=>`<label class="${c} block">${lb('Asal Kelompok')}<select data-f="k" class="${inp}"><option value="">Pilih Kelompok</option>${activeGroups().map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>`,
  jk:c=>`<label class="${c} block">${lb('Jenis Kelamin')}<select data-f="jk" class="${inp}"><option value="">Jenis Kelamin</option><option>Laki-laki</option><option>Perempuan</option></select></label>`,
  d:c=>`<label class="${c} block">${lb('Nama Dapukan')}<input type="text" data-f="d" maxlength="60" list="mmDapList" autocomplete="off" class="${inp}" placeholder="Pilih / ketik dapukan"></label>`,
  lh:c=>`<label class="${c} block">${lb('Tanggal Lahir')}<input type="date" data-f="lh" min="1900-01-01" max="${fmIso(new Date())}" class="${inp}"></label>`,
  jd:c=>`<label class="${c} block">${lb('Jenis Dapukan')}<select data-f="jd" class="${inp}">${MB_JD.map(j=>`<option ${j===MB_JD_DEF?'selected':''}>${esc(j)}</option>`).join('')}</select></label>`,
  wa:c=>`<label class="${c} block">${lb('No. WA')}<input type="tel" inputmode="tel" data-f="wa" maxlength="20" autocomplete="off" class="${inp}" placeholder="08xxxxxxxxxx"></label>`,
  st:c=>`<label class="${c} block">${lb('Status')}<select data-f="st" class="${inp}"><option value="">Status</option><option>Menikah</option><option>Masih Lajang</option></select></label>`};
 const del=`<button type="button" title="Hapus baris" onclick="mmDelRow(this)" class="sm:col-span-1 h-[42px] self-end rounded-xl hover:bg-red-50 text-red-500 grid place-items-center justify-self-end sm:justify-self-center">${icon('trash-2','w-4 h-4')}</button>`;
 if(mmType==='mubaligh')return `<div class="mmRow grid sm:grid-cols-12 gap-2 rounded-2xl border border-line p-3">${F.n('sm:col-span-4')}${F.k('sm:col-span-3')}${F.jk('sm:col-span-2')}${F.st('sm:col-span-2')}${del}${F.jd('sm:col-span-4')}${F.wa('sm:col-span-4')}${F.lh('sm:col-span-4')}</div>`;
 if(mmDesa())return `<div class="mmRow grid sm:grid-cols-12 gap-2 rounded-2xl border border-line p-3">${F.n('sm:col-span-4')}${F.k('sm:col-span-3')}${F.jk('sm:col-span-2')}${F.st('sm:col-span-2')}${del}${F.d('sm:col-span-4')}${F.wa('sm:col-span-4')}${F.lh('sm:col-span-4')}</div>`;
 return `<div class="mmRow grid sm:grid-cols-12 gap-2 rounded-2xl border border-line p-3">${F.n('sm:col-span-5')}${F.jk('sm:col-span-3')}${F.st('sm:col-span-3')}${del}${F.d('sm:col-span-4')}${F.wa('sm:col-span-4')}${F.lh('sm:col-span-4')}</div>`;
}
function mmHeadHtml(){return '';}
function mmCount(){const n=document.querySelectorAll('#mmRows .mmRow').length,e=document.getElementById('mmCnt');if(e)e.textContent=n+' baris';}
function mmAddRow(){
 const box=document.getElementById('mmRows');box.insertAdjacentHTML('beforeend',mmRowHtml());lucide.createIcons();mmCount();
 const r=box.lastElementChild;r.scrollIntoView({block:'nearest',behavior:'smooth'});r.querySelector('input').focus();
}
function mmDelRow(b){const box=document.getElementById('mmRows');if(box.children.length<=1){showToast('Minimal satu baris');return;}b.closest('.mmRow').remove();mmCount();}
function openMmModal(type){
 mmType=type||'muda-mudi-kelompok';const desa=mmDesa();
 document.getElementById('modalTitle').textContent='Tambah '+titles[mmType];
 document.getElementById('modalDesc').textContent=desa?'Isi beberapa nama sekaligus, pilih asal kelompok tiap nama.':'Pilih kelompok sekali, lalu isi beberapa nama sekaligus.';
 document.getElementById('modalBody').innerHTML=`<form onsubmit="mmSave(event)" class="space-y-4">
  ${desa?'':`<label class="block max-w-sm"><span class="text-xs font-bold text-slate-600">Kelompok</span><select id="mmKel" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white"><option value="">Pilih Kelompok</option>${activeGroups().map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>`}
  <datalist id="mmDapList">${dapGet().map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
  <div><div class="flex items-center justify-between mb-2"><div class="text-xs font-bold text-slate-600">Daftar nama <span id="mmCnt" class="font-normal text-slate-400"></span></div>
   <button type="button" onclick="mmAddRow()" class="h-8 px-3 rounded-lg border border-line text-xs font-bold text-navy flex items-center gap-1.5">${icon('plus','w-3.5 h-3.5')} Tambah nama</button></div>
   ${mmHeadHtml()}<div id="mmRows" class="space-y-2 mt-1 max-h-[46vh] overflow-y-auto pr-1">${mmRowHtml()}</div>
   <p class="text-[11px] text-slate-400 mt-2">${mmType==='mubaligh'?'Sebutan otomatis: Mubaligh untuk laki-laki dan Mubalighot untuk perempuan. Jenis Dapukan default Mubaligh Tugasan. Baris yang kosong diabaikan.':'Nama Dapukan boleh dipilih dari saran (Ketua Muda Mudi, Wakil Ketua Muda Mudi, Penerobos Muda Mudi, Keputrian Kelompok) atau diketik manual. Baris yang kosong diabaikan.'}</p></div>
  <p id="mmErr" class="text-xs font-semibold text-red-600 hidden"></p>
  <div class="flex justify-end gap-2 pt-2 border-t border-line"><button type="button" onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">${icon('save','w-4 inline mr-1')} Simpan Data</button></div></form>`;
 showModal();lucide.createIcons();mmCount();
}
function mmSave(e){
 e.preventDefault();const desa=mmDesa(),er=document.getElementById('mmErr'),bad=m=>{er.textContent=m;er.classList.remove('hidden');};
 const kel=desa?'':document.getElementById('mmKel').value;if(!desa&&!kel)return bad('Pilih kelompok terlebih dahulu.');
 const rows=[...document.querySelectorAll('#mmRows .mmRow')].map(r=>{const g=k=>{const el=r.querySelector('[data-f="'+k+'"]');return el?(el.value||'').replace(/\s+/g,' ').trim():'';};return {n:g('n'),k:g('k'),jk:g('jk'),d:g('d'),jd:g('jd'),wa:g('wa'),lh:g('lh'),st:g('st')};}).filter(x=>x.n||x.k||x.jk||x.d||x.wa||x.lh||x.st);
 if(!rows.length)return bad('Isi minimal satu nama.');
 const i=rows.findIndex(x=>!x.n||!x.jk||!x.st||(desa&&!x.k));if(i>=0)return bad('Baris ke-'+(i+1)+': nama, '+(desa?'asal kelompok, ':'')+'jenis kelamin, dan status wajib diisi.');
 const w=rows.findIndex(x=>x.wa&&!mmWaNorm(x.wa));if(w>=0)return bad('Baris ke-'+(w+1)+': nomor WA tidak valid. Contoh: 081234567890.');
 const lt=rows.findIndex(x=>x.lh&&!lhOk(x.lh));if(lt>=0)return bad('Baris ke-'+(lt+1)+': tanggal lahir tidak valid.');
 rows.forEach(x=>mmRememberDap(x.d));
 const L=mmData(mmType);rows.forEach(x=>L.push({id:'M'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),n:x.n,jk:x.jk,k:desa?x.k:kel,d:mmType==='mubaligh'?mbSebutan(x.jk):x.d,wa:x.wa,lh:x.lh,st:x.st,...(mmType==='mubaligh'?{jd:x.jd||MB_JD_DEF}:{})}));mmPut(mmType,L);
 closeModal();renderMM(mmType);showToast(rows.length+' data '+(desa?'':kel+' ')+'berhasil disimpan');
}
function mmPickDap(b){const i=document.getElementById('mmDapukan');i.value=b.dataset.v;i.focus();}
function mmRememberDap(val){
 const v=String(val||'').replace(/\s+/g,' ').trim().slice(0,60); if(!v||/^mubalighot?$/i.test(v))return;
 const a=dapGet(); if(a.some(d=>d.toLowerCase()===v.toLowerCase()))return;
 a.push(v); dapSet(a);
}
/* ===== FORM TAMBAH / EDIT ===== */
function gfIn(id,label,val,o){o=o||{};return `<label class="block ${o.span?'sm:col-span-2':''}"><span class="text-xs font-bold text-slate-600">${label}${o.req?' <span class="text-red-500">*</span>':''}</span><input id="gf_${id}" type="${o.type||'text'}" value="${esc(val)}" ${o.attr||''} placeholder="${esc(o.ph||'')}" oninput="${o.on||"showErr('gfErr','')"}" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:border-navy focus:ring-2 focus:ring-navy/10"></label>`;}
function gfSel(id,label,val,list,req){
 const l=list.slice(); if(val&&!l.includes(val))l.push(val);
 return `<label class="block"><span class="text-xs font-bold text-slate-600">${label}${req?' <span class="text-red-500">*</span>':''}</span><select id="gf_${id}" onchange="showErr('gfErr','')" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white focus:border-navy focus:ring-2 focus:ring-navy/10"><option value="">Pilih ${label}</option>${l.map(x=>`<option value="${esc(x)}" ${x===val?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
}
function gfGroup(t,ic,body){return `<div class="rounded-2xl border border-line p-4"><div class="flex items-center gap-2 mb-3"><div class="w-8 h-8 rounded-lg bg-navy/5 text-navy grid place-items-center">${icon(ic,'w-4')}</div><h4 class="font-extrabold text-sm">${t}</h4></div><div class="grid sm:grid-cols-2 gap-3">${body}</div></div>`;}
function genFormTgl(){
 const t=document.getElementById('gf_tgl'),u=document.getElementById('gf_usia'); if(!t||!u)return;
 const v=lhUmur(t.value);
 if(v!==''){u.value=v;u.readOnly=true;u.classList.add('bg-slate-50');}else{u.readOnly=false;u.classList.remove('bg-slate-50');}
 showErr('gfErr','');
}
function genOpenForm(id){
 const ed=id?generus.find(x=>x.id===id):null; if(id&&!ed)return;
 const g=ed||genBlank(), us=genUsia(g);
 document.getElementById('modalTitle').textContent=ed?'Edit Generus':'Tambah Generus';
 document.getElementById('modalDesc').textContent=ed?(g.nama+' • ID '+g.id):'Lengkapi data lalu simpan. Kolom bertanda * wajib diisi.';
 document.getElementById('modalBody').innerHTML=`<form onsubmit="genSave(event,'${ed?esc(ed.id):''}')" class="space-y-4" novalidate>
  <p id="gfErr" class="hidden text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2"></p>
  ${gfGroup('Identitas','user-round',
   gfIn('nama','Nama Lengkap',g.nama,{req:1,span:1,attr:'maxlength="80" autocomplete="off"'})+
   gfSel('jk','Jenis Kelamin',g.jk,['Laki-laki','Perempuan'],1)+
   gfSel('status','Status',g.status,GEN_ST,1)+
   gfSel('kelompok','Kelompok',g.kelompok,activeGroups(),1)+
   gfIn('tempat','Tempat Lahir',g.tempat,{attr:'maxlength="60"'})+
   gfIn('tgl','Tanggal Lahir',g.tgl,{type:'date',attr:`min="1900-01-01" max="${fmIso(new Date())}"`,on:'genFormTgl()'})+
   gfIn('usia','Usia',us,{type:'number',attr:'min="0" max="99"'}))}
  ${gfGroup('Pendidikan','graduation-cap',
   gfIn('smp','SMP',g.smp,{attr:'maxlength="80"'})+
   gfIn('sma','SMA/SMK',g.sma,{attr:'maxlength="80"'})+
   gfIn('univ','Universitas',g.univ,{attr:'maxlength="80"'})+
   gfIn('kelas','Status Kelas Pendidikan',g.kelas,{ph:'Contoh: Kelas XI SMA / Semester 6',attr:'maxlength="60"'})+
   gfSel('pend','Pendidikan Terakhir',g.pend,GEN_PEND))}
  ${gfGroup('Pekerjaan','briefcase',gfIn('kerja','Pekerjaan',g.kerja,{span:1,attr:'maxlength="60"'}))}
  ${gfGroup('Orang Tua','users',
   gfIn('ayah','Nama Ayah',g.ayah,{attr:'maxlength="80"'})+gfSel('ayahSt','Status Ayah',g.ayahSt,GEN_ORTU)+
   gfIn('ibu','Nama Ibu',g.ibu,{attr:'maxlength="80"'})+gfSel('ibuSt','Status Ibu',g.ibuSt,GEN_ORTU))}
  ${gfGroup('Catatan SB','activity',`<label class="block sm:col-span-2"><span class="text-xs font-bold text-slate-600">Catatan SB</span><textarea id="gf_cat" rows="3" maxlength="500" oninput="showErr('gfErr','')" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:border-navy focus:ring-2 focus:ring-navy/10" placeholder="Catatan tambahan...">${esc(g.cat)}</textarea></label>`)}
  <div class="flex justify-end gap-2 pt-3 border-t border-line"><button type="button" onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button type="submit" class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold flex items-center gap-2">${icon('save','w-4')} ${ed?'Simpan Perubahan':'Simpan Data'}</button></div>
 </form>`;
 showModal(); lucide.createIcons(); genFormTgl();
 const f=document.getElementById('gf_nama'); if(f)f.focus();
}
function genSave(e,id){
 e.preventDefault();
 const v=k=>normNama(fval('gf_'+k));
 const fail=m=>{showErr('gfErr',m);const b=document.getElementById('modalBody');if(b)b.scrollTop=0;};
 const o=genBlank();
 o.nama=v('nama');o.jk=fval('gf_jk');o.status=fval('gf_status');o.kelompok=fval('gf_kelompok');
 o.tempat=v('tempat');o.tgl=fval('gf_tgl').trim();o.smp=v('smp');o.sma=v('sma');o.univ=v('univ');o.kelas=v('kelas');
 o.pend=fval('gf_pend');o.kerja=v('kerja');o.ayah=v('ayah');o.ayahSt=fval('gf_ayahSt');o.ibu=v('ibu');o.ibuSt=fval('gf_ibuSt');o.cat=fval('gf_cat').trim();
 if(!o.nama)return fail('Nama lengkap wajib diisi.');
 if(!o.jk)return fail('Jenis kelamin wajib dipilih.');
 if(!o.status)return fail('Status generus wajib dipilih.');
 if(!o.kelompok)return fail('Kelompok wajib dipilih. Tambahkan dulu di menu Kelompok bila belum ada.');
 if(o.tgl&&!lhOk(o.tgl))return fail('Tanggal lahir tidak valid.');
 const us=fval('gf_usia').trim();
 if(!o.tgl&&us!==''){const n=parseInt(us,10);if(isNaN(n)||n<0||n>99)return fail('Usia harus berupa angka 0–99.');o.usia=String(n);}
 const key=genKey(o);
 if(generus.some(x=>x.id!==id&&genKey(x)===key))return fail('Data dengan nama, kelompok, dan tanggal lahir yang sama sudah ada.');
 if(id){const ed=generus.find(x=>x.id===id);if(!ed){closeModal();return;}Object.assign(ed,o,{id:ed.id});}
 else{o.id=genNextId();generus.push(o);gs.page=1e9;}
 saveGenerus();closeModal();
 const cur=document.querySelector('.nav-item.active');renderPage(cur?cur.dataset.page:'generus');
 showToast(id?'Data generus diperbarui':'Data generus ditambahkan');
}


function openAddModal(type){
 if(type==='generus')return genOpenForm();
 if(type==='muda-mudi-kelompok'||type==='muda-mudi-desa'||type==='mubaligh')return openMmModal(type);
 const labels = type==='generus' ? ['Nama Lengkap','Jenis Kelamin','Status Generus','Kelompok','Tempat Lahir','Tanggal Lahir','SMP','SMA','Universitas','Kelas / Status Pendidikan','Pendidikan Terakhir','Pekerjaan','Nama Ayah','Status Ayah','Nama Ibu','Status Ibu','Status Sabilillah','Catatan'] :
 type==='muda-mudi-kelompok'?['Nama Lengkap','Jenis Kelamin','Kelompok','Nama Dapukan','Status']:['Nama Lengkap','Kelompok','Nama Dapukan','Status'];
 document.getElementById('modalTitle').textContent='Tambah '+(type==='generus'?'Generus':titles[type]||'Data');
 document.getElementById('modalDesc').textContent='Lengkapi data lalu simpan.';
 document.getElementById('modalBody').innerHTML=`<form onsubmit="saveForm(event)" class="space-y-4">
   <div class="grid sm:grid-cols-2 gap-4">${labels.map((l,i)=>`
     <label class="${l==='Catatan'?'sm:col-span-2':''} block"><span class="text-xs font-bold text-slate-600">${l}</span>
     ${l==='Nama Dapukan'?mmDapukanField():l==='Catatan'?`<textarea rows="3" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm" placeholder="Catatan tambahan..."></textarea>`:
     ['Jenis Kelamin','Status Generus','Kelompok','Status Ayah','Status Ibu','Status Sabilillah','Nama Dapukan','Status','Pendidikan Terakhir'].includes(l)?
     `<select class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white"><option>Pilih ${l}</option>${(l==='Kelompok'?activeGroups():l==='Jenis Kelamin'?['Laki-laki','Perempuan']:l==='Status Generus'?['Pra Remaja','Remaja','Muda Mudi']:l==='Status Sabilillah'?['Aktif','Jarang Aktif']:(l==='Status'&&type==='muda-mudi-kelompok')?['Menikah','Masih Lajang']:['Jamaah','Belum Jamaah','Aktif','Nonaktif']).map(x=>`<option>${esc(x)}</option>`).join('')}</select>`:
     `<input ${l==='Tanggal Lahir'?'type="date"':l==='Umur'?'type="number"':'type="text"'} class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm" placeholder="${l}">`}
     </label>`).join('')}</div>
   <div class="flex justify-end gap-2 pt-2 border-t border-line"><button type="button" onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">${icon('save','w-4 inline mr-1')} Simpan Data</button></div>
 </form>`;
 showModal(); lucide.createIcons();
}

/* ===== TEMPLATE & EXPORT EXCEL ===== */
function genRowArr(g,no){const u=genUsia(g);return [no,g.nama,g.kelompok,g.jk,g.tempat,g.tgl,u,g.status,g.pend,g.smp,g.sma,g.univ,g.kelas,g.kerja,g.ayah,g.ayahSt,g.ibu,g.ibuSt,g.cat];}
const GEN_WCH=[6,28,18,15,18,15,7,14,20,24,24,28,26,18,22,15,22,15,36];
function genTemplate(){
 const kel=kelompokList.map(k=>k.nama);
 const rows=[GEN_HEAD,['1','(Contoh) Ahmad Fauzan',kel[0]||'Dawan','Laki-laki','Karanganyar','2010-03-14','','Remaja','SMP','SMP N 1 Tasikmadu','SMK N 2 Karanganyar','','KELAS 2','Pelajar','Ahmad',"Jama'ah",'Siti',"Jama'ah",'Aktif']];
 const nama='Template_Database_Generus';
 if(!window.XLSX){fmCsv(nama,rows);showToast('Template CSV diunduh (library Excel belum termuat)');return;}
 const ws=XLSX.utils.aoa_to_sheet(rows); ws['!cols']=GEN_WCH.map(w=>({wch:w}));
 for(let r=3;r<=1000;r++){ws['F'+r]={t:'s',v:'',z:'@'};}
 ws['!ref']='A1:S1000';
 const pet=[['PETUNJUK PENGISIAN'],['1. Isi data mulai baris 2 pada sheet "Data", lalu hapus baris contoh (diawali "(Contoh)").'],['2. Kolom No boleh dikosongkan (diabaikan saat impor). Urutan kolom jangan diubah.'],['3. Kolom wajib: Nama Lengkap, Jenis Kelamin, Status, Kelompok.'],['4. Jenis Kelamin: Laki-laki atau Perempuan (boleh L / P).'],['5. Status: Pra Remaja, Remaja, atau Muda-Mudi.'],['6. Kelompok harus sama dengan nama di Manajemen Kelompok. Kelompok baru bisa dibuat otomatis saat impor.'],['7. Tanggal Lahir ditulis YYYY-MM-DD (contoh 2010-03-14) atau DD/MM/YYYY. Usia dihitung otomatis bila tanggal lahir terisi; bila kosong, Usia dipakai apa adanya.'],["8. Status Ayah / Status Ibu: Jama'ah, Belum Jama'ah, atau Almarhum."],['9. Pendidikan Terakhir: SD, SMP, SMA/SMK, Diploma 3, Sarjana, Magister.'],[],['Kelompok yang tersedia']];
 kel.forEach(k=>pet.push([k]));
 const w2=XLSX.utils.aoa_to_sheet(pet); w2['!cols']=[{wch:110}];
 const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Data'); XLSX.utils.book_append_sheet(wb,w2,'Petunjuk');
 if(!dlXlsx(wb,nama)){fmCsv(nama,rows);showToast('Gagal membuat file Excel, template CSV diunduh sebagai gantinya');return;}
 showToast('Template Excel Database Generus diunduh');
}
function genExport(){
 const L=genFiltered(); if(!L.length){showToast('Tidak ada data untuk diekspor');return;}
 const rows=[GEN_HEAD].concat(L.map((g,i)=>genRowArr(g,i+1)));
 const nama='Database_Generus_Karangmojo_'+fmToday();
 if(!window.XLSX){fmCsv(nama,rows);showToast('Export CSV diunduh');return;}
 const ws=XLSX.utils.aoa_to_sheet(rows); ws['!cols']=GEN_WCH.map(w=>({wch:w}));
 const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Data');
 if(!dlXlsx(wb,nama)){fmCsv(nama,rows);showToast('Gagal membuat Excel, CSV diunduh');return;}
 showToast(L.length+' data diekspor');
}

/* ===== IMPORT EXCEL / CSV / TEMPEL ===== */
const GEN_ALIAS={nama:['nama lengkap','nama'],jk:['jenis kelamin','jk','l p','gender'],status:['status','status generus','kategori'],kelompok:['kelompok','asal kelompok'],tempat:['tempat lahir','tempat'],tgl:['tanggal lahir','tgl lahir','lahir'],usia:['usia','umur'],smp:['smp'],sma:['sma smk','sma k','sma','smk'],univ:['universitas','univ'],kelas:['status kelas pendidikan','status kelas','kelas pendidikan','kelas'],pend:['pendidikan terakhir','pend terakhir','pendidikan'],kerja:['pekerjaan'],ayah:['nama ayah','ayah'],ayahSt:['status ayah'],ibu:['nama ibu','ibu'],ibuSt:['status ibu'],cat:['catatan sb','status sb','catatan sabilillah','catatan']};
let gi={rows:[],fname:'',mode:'tambah',auto:true};
function openImportModal(){gi={rows:[],fname:'',mode:'tambah',auto:true};genImpRender();showModal();}
function genImpSteps(n){return `<div class="grid grid-cols-3 gap-2 text-[11px] font-bold">${['1. Upload','2. Validasi','3. Simpan'].map((x,i)=>`<div class="rounded-xl ${i<n?'bg-navy text-white':'bg-slate-50 text-slate-400'} p-3 text-center">${x}</div>`).join('')}</div>`;}
function genImpRender(){
 document.getElementById('modalTitle').textContent='Import Data Massal';
 const b=document.getElementById('modalBody');
 if(!gi.rows.length){
  document.getElementById('modalDesc').textContent='Upload Excel/CSV atau tempel data dari Excel.';
  b.innerHTML=`<div class="space-y-5">${genImpSteps(1)}
   <div class="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/70">
    <div class="w-14 h-14 mx-auto rounded-2xl bg-white shadow-card text-navy grid place-items-center">${icon('file-spreadsheet','w-7')}</div>
    <h4 class="font-extrabold mt-4">Upload file Excel</h4><p class="text-xs text-slate-400 mt-1">.xlsx, .xls, atau .csv • Maksimal 5 MB • 19 kolom sesuai database Desa Karangmojo</p>
    <div class="flex flex-wrap justify-center gap-2 mt-4"><button onclick="genImpPick()" class="px-4 py-2.5 rounded-xl bg-navy text-white text-xs font-bold">Pilih File</button><button onclick="genTemplate()" class="px-4 py-2.5 rounded-xl border border-line bg-white text-xs font-bold">Unduh Template Excel</button></div>
   </div>
   <div class="rounded-2xl border border-line p-4"><div class="flex items-center justify-between"><div><b class="text-sm">Atau tempel data dari Excel</b><p class="text-[11px] text-slate-400 mt-1">Salin baris beserta judul kolomnya, lalu tempel di sini.</p></div>${icon('clipboard-paste','w-5 text-slate-400')}</div>
    <textarea id="genPaste" class="mt-3 w-full h-24 border border-line rounded-xl p-3 text-xs" placeholder="Nama Lengkap&#9;Jenis Kelamin&#9;Status&#9;Kelompok..."></textarea>
    <div class="flex justify-end mt-2"><button onclick="genImpPaste()" class="px-4 py-2 rounded-xl border border-navy/20 bg-navy/5 text-navy text-xs font-bold">Baca Data Tempelan</button></div></div>
   <div class="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex gap-3">${icon('info','w-5 text-blue-600 shrink-0')}<div class="text-xs text-blue-800"><b>Validasi otomatis</b><p class="mt-1 text-blue-700/80">Sistem memeriksa kolom wajib (Nama, Jenis Kelamin, Status, Kelompok), format tanggal, kelompok, dan data duplikat sebelum disimpan.</p></div></div>
   <div class="flex justify-end"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button></div></div>`;
  lucide.createIcons();return;
 }
 const ev=genImpEval(), bad=ev.items.filter(x=>x.st!=='ok'||x.warns.length);
 document.getElementById('modalDesc').textContent=gi.fname||'Data tempelan';
 b.innerHTML=`<div class="space-y-4">${genImpSteps(2)}
  <div class="grid grid-cols-3 gap-2 text-center"><div class="rounded-xl bg-slate-50 p-3"><div class="text-xl font-extrabold">${ev.items.length}</div><div class="text-[11px] text-slate-400">Total baris</div></div><div class="rounded-xl bg-emerald-50 p-3"><div class="text-xl font-extrabold text-emerald-700">${ev.ok}</div><div class="text-[11px] text-emerald-700/70">Siap diimpor</div></div><div class="rounded-xl bg-red-50 p-3"><div class="text-xl font-extrabold text-red-600">${ev.err+ev.dup}</div><div class="text-[11px] text-red-600/70">Dilewati</div></div></div>
  ${bad.length?`<div class="rounded-2xl border border-line max-h-44 overflow-auto scrollbar divide-y divide-line">${bad.slice(0,80).map(x=>`<div class="px-3 py-2 text-xs flex gap-2"><span class="shrink-0 font-bold ${x.st==='ok'?'text-amber-600':'text-red-600'}">Baris ${x.baris}</span><span class="text-slate-500 min-w-0"><b class="text-slate-700">${esc(x.nama||'(tanpa nama)')}</b> — ${esc(x.errs.concat(x.dup?['Duplikat, dilewati']:[]).concat(x.warns).join('; '))}</span></div>`).join('')}${bad.length>80?`<div class="px-3 py-2 text-[11px] text-slate-400">…dan ${bad.length-80} baris lainnya</div>`:''}</div>`:''}
  ${ev.newK.length?`<label class="flex items-start gap-2 rounded-xl border border-line p-3 text-xs cursor-pointer"><input type="checkbox" class="mt-0.5" ${gi.auto?'checked':''} onchange="gi.auto=this.checked;genImpRender()"><span><b>Buat kelompok baru otomatis</b><span class="block text-slate-400 mt-0.5">${esc(ev.newK.join(', '))}</span></span></label>`:`${!gi.auto?`<label class="flex items-start gap-2 rounded-xl border border-line p-3 text-xs cursor-pointer"><input type="checkbox" class="mt-0.5" onchange="gi.auto=this.checked;genImpRender()"><span><b>Buat kelompok baru otomatis</b></span></label>`:''}`}
  <div class="grid sm:grid-cols-2 gap-2">${[['tambah','Tambahkan ke data yang ada','Data duplikat dilewati'],['ganti','Ganti seluruh database','Hapus '+generus.length+' data saat ini']].map(([k,t,s])=>`<label class="flex items-start gap-2 rounded-xl border ${gi.mode===k?(k==='ganti'?'border-red-300 bg-red-50/50':'border-navy bg-navy/5'):'border-line'} p-3 text-xs cursor-pointer"><input type="radio" name="genMode" class="mt-0.5" ${gi.mode===k?'checked':''} onchange="gi.mode='${k}';genImpRender()"><span><b>${t}</b><span class="block text-slate-400 mt-0.5">${s}</span></span></label>`).join('')}</div>
  <div class="flex justify-between gap-2 pt-2 border-t border-line"><button onclick="gi.rows=[];genImpRender()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Ganti File</button><div class="flex gap-2"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button onclick="genImpCommit()" ${ev.ok?'':'disabled'} class="px-5 py-2.5 rounded-xl ${gi.mode==='ganti'?'bg-red-600':'bg-navy'} text-white text-sm font-bold disabled:opacity-40">${gi.mode==='ganti'?'Ganti & Impor':'Impor'} ${ev.ok} data</button></div></div>
 </div>`;
 lucide.createIcons();
}
function genImpPick(){
 let el=document.getElementById('genFile');
 if(!el){el=document.createElement('input');el.type='file';el.id='genFile';el.accept='.xlsx,.xls,.csv,text/csv';el.className='hidden';el.onchange=genImpRead;document.body.appendChild(el);}
 el.value='';el.click();
}
function genImpRead(e){
 const f=e.target.files&&e.target.files[0]; if(!f)return;
 if(f.size>5*1024*1024){showToast('File terlalu besar (maksimal 5 MB)');return;}
 const csv=/\.csv$/i.test(f.name);
 if(!csv&&!window.XLSX){showToast('Library Excel belum termuat. Gunakan file CSV atau periksa koneksi internet.');return;}
 const rd=new FileReader();
 rd.onerror=()=>showToast('Gagal membaca file');
 rd.onload=()=>{
  try{
   let rows;
   if(csv)rows=impCsv(new TextDecoder('utf-8').decode(rd.result));
   else{const wb=XLSX.read(rd.result,{type:'array',cellDates:true});
    const sh=wb.SheetNames.map(n=>[n,XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}).map(r=>r.map(v=>v instanceof Date?lhFromDate(v):String(v==null?'':v)))]);
    genImpParseMulti(sh,f.name);return;}
   genImpParse(rows,f.name);
  }catch(err){showToast('File tidak dapat dibaca. Pastikan formatnya .xlsx atau .csv');}
 };
 rd.readAsArrayBuffer(f);
}
function genImpPaste(){
 const t=(document.getElementById('genPaste')||{}).value||'';
 if(!t.trim()){showToast('Tempel data dari Excel terlebih dahulu');return;}
 genImpParse(t.replace(/\r/g,'').split('\n').map(l=>l.split('\t')),'');
}
const GEN_SHEET_GENERIC=/^(data|sheet\s*\d*|lembar\s*\d*|petunjuk.*)$/i;
function genImpExtract(rows,sheet){
 let hi=-1,map={};
 for(let r=0;r<Math.min(rows.length,10)&&hi<0;r++){
  const m={};(rows[r]||[]).forEach((h,ci)=>{const k=impNorm(h);for(const key in GEN_ALIAS){if(m[key]===undefined&&GEN_ALIAS[key].includes(k)){m[key]=ci;break;}}});
  if(m.nama!==undefined&&(m.kelompok!==undefined||(sheet&&!GEN_SHEET_GENERIC.test(sheet)))){hi=r;map=m;}
 }
 if(hi<0)return null;
 const raw=[];
 for(let r=hi+1;r<rows.length;r++){
  const x={baris:(sheet?sheet+' · ':'')+(r+1)};let any=false;
  for(const k in GEN_ALIAS){const c=map[k];x[k]=c===undefined?'':String(rows[r][c]==null?'':rows[r][c]).trim().replace(/\s+/g,' ');if(x[k])any=true;}
  if(!any||/^\(contoh\)/i.test(x.nama))continue;
  if(!x.kelompok&&sheet&&!GEN_SHEET_GENERIC.test(sheet))x.kelompok=sheet.trim();
  raw.push(x);
 }
 return raw;
}
function genImpParse(rows,fname){
 const raw=genImpExtract(rows,'');
 if(raw===null){showToast('Header tidak dikenali. Gunakan file dari tombol Template Excel.');return;}
 if(!raw.length){showToast('Tidak ada data pada file.');return;}
 if(raw.length>2000){showToast('Maksimal 2000 baris per impor.');return;}
 gi.rows=raw;gi.fname=fname;genImpRender();
}
/* Banyak sheet: tiap sheet boleh berisi satu kelompok (nama sheet = nama kelompok bila kolom Kelompok tidak ada/kosong) */
function genImpParseMulti(sheets,fname){
 let raw=[],used=0;
 sheets.forEach(([n,rows])=>{const r=genImpExtract(rows,n);if(r&&r.length){raw=raw.concat(r);used++;}});
 if(!used){showToast('Header tidak dikenali. Gunakan file dari tombol Template Excel.');return;}
 if(!raw.length){showToast('Tidak ada data pada file.');return;}
 if(raw.length>2000){showToast('Maksimal 2000 baris per impor.');return;}
 gi.rows=raw;gi.fname=fname+(used>1?' ('+used+' sheet)':'');genImpRender();
}
function genCompact(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function genImpEval(){
 const kmap=new Map(kelompokList.map(k=>[k.nama.toLowerCase(),k.nama]));
 const seen=new Set(gi.mode==='ganti'?[]:generus.map(genKey));
 const newK=new Map(),items=[];let ok=0,err=0,dup=0;
 gi.rows.forEach(r=>{
  const errs=[],warns=[],o=genBlank();
  o.nama=normNama(r.nama).slice(0,80); if(!o.nama)errs.push('Nama kosong');
  const jk=genCompact(r.jk);
  o.jk=/^(l|lk|laki|lakilaki|pria)$/.test(jk)?'Laki-laki':/^(p|pr|perempuan|wanita)$/.test(jk)?'Perempuan':'';
  if(!o.jk)errs.push(r.jk?'Jenis kelamin tidak dikenali ("'+r.jk+'")':'Jenis kelamin kosong');
  const st=genCompact(r.status);
  o.status=(st==='praremaja'||st==='pra')?'Pra Remaja':st==='remaja'?'Remaja':(st==='mudamudi'||st==='mumi')?'Muda-Mudi':'';
  if(!o.status)errs.push(r.status?'Status tidak dikenali ("'+r.status+'")':'Status kosong');
  const kn=normNama(r.kelompok);
  if(!kn)errs.push('Kelompok kosong');
  else if(kmap.has(kn.toLowerCase()))o.kelompok=kmap.get(kn.toLowerCase());
  else if(gi.auto){
   if(kn.length>40)errs.push('Nama kelompok terlalu panjang');
   else{const kk=kn.toLowerCase();if(!newK.has(kk))newK.set(kk,kn);o.kelompok=newK.get(kk);}
  }else errs.push('Kelompok "'+kn+'" belum terdaftar');
  o.tempat=normNama(r.tempat).slice(0,60);
  if(r.tgl){const t=lhParse(r.tgl);if(t)o.tgl=t;else warns.push('Tanggal lahir tidak dikenali, dikosongkan');}
  const u=parseInt(r.usia,10);if(!o.tgl&&!isNaN(u)&&u>=0&&u<100)o.usia=String(u);
  ['smp','sma','univ','kelas','kerja','ayah','ibu'].forEach(k=>{o[k]=normNama(r[k]).slice(0,80);});
  const pc=genCompact(r.pend);
  const PM={sma:'SMA/SMK',smk:'SMA/SMK',d3:'Diploma 3',diploma:'Diploma 3',s1:'Sarjana',s2:'Magister',strata1:'Sarjana',strata2:'Magister'};
  o.pend=!pc?'':GEN_PEND.find(p=>genCompact(p)===pc)||PM[pc]||normNama(r.pend).slice(0,40);
  const ot=s=>{const c=genCompact(s);return !c?'':c==='jamaah'?"Jama'ah":c==='belumjamaah'?"Belum Jama'ah":/^(almarhum|almarhumah|alm|almh)$/.test(c)?'Almarhum':normNama(s).slice(0,30);};
  o.ayahSt=ot(r.ayahSt);o.ibuSt=ot(r.ibuSt);
  o.cat=String(r.cat||'').slice(0,500);
  let stt='ok',isDup=false;
  if(errs.length){stt='err';err++;}
  else{const key=genKey(o);if(seen.has(key)){isDup=true;stt='dup';dup++;}else{seen.add(key);ok++;}}
  items.push({baris:r.baris,nama:o.nama,rec:o,errs,warns,st:stt,dup:isDup});
 });
 return {items,ok,err,dup,newK:[...newK.values()]};
}
function genImpCommit(){
 const ev=genImpEval(),good=ev.items.filter(x=>x.st==='ok');
 if(!good.length){showToast('Tidak ada data yang bisa diimpor');return;}
 ev.newK.forEach(n=>{if(!kelompokList.some(k=>k.nama.toLowerCase()===n.toLowerCase()))kelompokList.push({id:nextKelompokId(),nama:n,ketua:'',pengurus:0,generus:0,status:'Aktif'});});
 if(gi.mode==='ganti')generus.length=0;
 good.forEach(x=>{x.rec.id=genNextId();generus.push(x.rec);});
 saveGenerus();saveKelompok();closeModal();
 gs.page=1;gs.q=gs.kel=gs.st=gs.jk=gs.pend='';
 renderGenerus();
 showToast(good.length+' data berhasil diimpor'+(ev.dup||ev.err?' • '+(ev.dup+ev.err)+' dilewati':''));
}

function saveForm(e){e.preventDefault();closeModal();showToast('Data berhasil disimpan');}
function showModal(){document.getElementById('modal').classList.remove('hidden');document.getElementById('modal').classList.add('flex');}
function closeModal(){if(window.msFlush)msFlush();document.getElementById('modal').classList.remove('ms-mode');if(window.kaWide)kaWide(false);document.getElementById('modal').classList.add('hidden');document.getElementById('modal').classList.remove('flex');}
let _toastT;
function showToast(text){
 const t=document.getElementById('toast'),err=/gagal|error|tidak (bisa|dapat|valid)|penuh|masukkan|dulu\b|salah/i.test(String(text));
 document.getElementById('toastText').textContent=text;
 t.classList.toggle('err',err);
 const ic=document.getElementById('toastIco');
 if(ic){const n=document.createElement('i');n.id='toastIco';n.className='w-4';n.setAttribute('data-lucide',err?'alert-circle':'check');ic.replaceWith(n);if(window.lucide)lucide.createIcons();}
 t.classList.remove('hidden');
 const c=t.firstElementChild;if(c){c.style.animation='none';void c.offsetWidth;c.style.animation='';}
 clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.add('hidden'),err?3800:2600);
}

/* =====================================================================
   MANAJEMEN FORM — (1) Form umum ala Google Form, (2) Form Absensi
   Tanpa server: definisi form dikemas ke dalam tautan (#/f/...), tanggapan
   disimpan di perangkat pengisi + dapat dikirim ke admin lewat "Kode Tanggapan".
   Opsional: isi FM_SYNC_URL (mis. Google Apps Script) agar tanggapan masuk otomatis.
   ===================================================================== */
const FM_KEY='simdeka_forms_v1', FM_RESP='simdeka_form_resp_v1', FM_DRAFT='simdeka_form_draft_v1_';
const FM_SYNC_URL=''; /* kosong = mode tanpa server */
const FM_COLORS=['#673AB7','#173B70','#18A66A','#F59E0B','#DB4437','#0F9D9D','#E91E63','#5F6368'];
const FM_DRIVE_RX=/^https:\/\/script\.google\.com\/(?:a\/macros\/[\w.-]+\/|macros\/)s\/[\w-]+\/exec$/;
const FM_DRIVE_KEY='simdeka_drive_url';
function fmDriveUrl(){try{const u=localStorage.getItem(FM_DRIVE_KEY)||'';return FM_DRIVE_RX.test(u)?u:'';}catch(e){return '';}}
function fmStar(on,sz){return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="${on?'var(--fc)':'none'}" stroke="${on?'var(--fc)':'#9aa0a6'}" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z"/></svg>`;}
function fmFileSet(id,k,v){const it=fmItem(id);if(!it)return;it[k]=k==='fMax'?parseInt(v,10):v;fmTouch(fmCur());fmRefreshList();}
function fmAnsHtml(v){const t=Array.isArray(v)?v:[String(v==null?'':v)];return t.map(x=>/^https:\/\/(drive|docs)\.google\.com\//.test(x)?`<a href="${esc(x)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline inline-flex items-center gap-1">${icon('paperclip','w-3.5 h-3.5')} Buka file di Drive</a>`:esc(x)).join('; ');}
const FM_QT=[['short','Jawaban singkat','type'],['long','Paragraf','align-left'],['radio','Pilihan ganda','circle-dot'],['check','Kotak centang','list-checks'],['select','Drop-down','chevron-down'],['scale','Skala linier','sliders-horizontal'],['date','Tanggal','calendar'],['time','Waktu','clock'],['file','Unggah file','upload'],['rating','Rating bintang','star'],['email','Email','mail'],['number','Angka','hash']];
const FM_QTYPES=FM_QT.map(x=>x[0]);
const FM_SRC=[
 {k:'generus',label:'Generus',sub:'Database Generus Desa (per kelompok)',icon:'sprout'},
 {k:'muda-mudi-desa',label:'Pengurus KMM Desa',sub:'Manajemen Pengurus KMM Desa',icon:'heart-handshake'},
 {k:'muda-mudi-kelompok',label:'Pengurus KMM Kelompok',sub:'Manajemen Pengurus KMM Kelompok',icon:'users-round'},
 {k:'mubaligh',label:'Muballigh',sub:'Database Muballigh',icon:'graduation-cap'}
];
const FM_ST={H:'Hadir',I:'Izin',A:'Alpa'};
const FM_CH=['#4285F4','#DB4437','#F4B400','#0F9D58','#AB47BC','#00ACC1','#FF7043','#9E9D24'];
const FM_JENIS=['Pengajian Muda Mudi Kelompok','Pengajian Muda Mudi Desa','Pengajian Muda Mudi Daerah'];

const fmEl=id=>document.getElementById(id);
function fmRid(n){const c='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<n;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function fmToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmDateLong(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return '—';const d=new Date(iso+'T00:00:00');return isNaN(d)?'—':d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function fmDT(ts){return new Date(ts).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function fmKey(n,k){return normNama(n).toLowerCase()+'|'+String(k||'').trim().toLowerCase();}
function fmColor(c){return /^#[0-9a-fA-F]{6}$/.test(c||'')?c:'#673AB7';}
function fmS(v,n){return String(v==null?'':v).slice(0,n||300);}
function fmImgOk(u){u=String(u||'');return (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(u)||/^https:\/\/[^\s"'<>]+$/.test(u))&&u.length<=160000?u:'';}
function fmYt(u){const m=/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(String(u||'').trim());return m?m[1]:'';}
function fmImgCompress(file){return new Promise((res,rej)=>{const im=new Image(),u=URL.createObjectURL(file);
 im.onload=()=>{URL.revokeObjectURL(u);let W=Math.min(760,im.width),q=.7,d='';
  for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=W;c.height=Math.round(im.height*W/im.width);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);d=c.toDataURL('image/jpeg',q);if(d.length<=110000)return res(d);q-=.1;W=Math.round(W*.8);}
  rej(new Error('big'));};im.onerror=()=>rej(new Error('img'));im.src=u;});}
function fmImgPick(id,field){
 const inp=document.createElement('input');inp.type='file';inp.accept='image/*';
 inp.onchange=async()=>{const f=inp.files[0];if(!f)return;try{const d=await fmImgCompress(f),it=fmItem(id);if(!it)return;it[field]=d;fmTouch(fmCur());fmRefreshList();}catch(e){showToast('Gambar gagal diproses / terlalu besar');}};inp.click();
}
function fmImgDel(id,field){const it=fmItem(id);if(!it)return;it[field]='';fmTouch(fmCur());fmRefreshList();}
function fmQImgHtml(it,edit){return it.img?`<div class="mt-3 relative inline-block max-w-full"><img src="${esc(it.img)}" alt="" class="max-h-64 max-w-full rounded-md border border-[#dadce0]">${edit?`<button title="Hapus gambar" onclick="event.stopPropagation();fmImgDel('${it.id}','img')" class="absolute top-1 right-1 w-8 h-8 rounded-full bg-white/90 shadow grid place-items-center">${icon('x','w-4')}</button>`:''}</div>`:'';}
function fmVideoHtml(it){const id=fmYt(it.url);return id?`<div class="mt-3 rounded-lg overflow-hidden bg-black" style="aspect-ratio:16/9"><iframe src="https://www.youtube-nocookie.com/embed/${id}" class="w-full h-full" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`:`<div class="mt-3 rounded-lg bg-slate-100 text-slate-400 text-sm p-8 text-center">Tempel tautan YouTube</div>`;}
function fmMediaItemHtml(it,act){
 const vid=it.kind==='video',ctl=`<div class="flex justify-end gap-1 mt-3 pt-3 border-t border-[#dadce0]">${fmMoveBtns(it.id)}<button title="Hapus" onclick="event.stopPropagation();fmDelItem('${it.id}')" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('trash-2','w-[18px] text-slate-600')}</button></div>`;
 const body=vid?fmVideoHtml(it):(it.src?`<img src="${esc(it.src)}" alt="" class="mt-3 max-h-80 max-w-full rounded-md border border-[#dadce0]">`:`<div class="mt-3 rounded-lg bg-slate-100 text-slate-400 text-sm p-8 text-center">Belum ada gambar</div>`);
 return `<div data-item="${it.id}" class="gf-card ${act?'gf-active':''}" onclick="fmAct('${it.id}')"><div class="p-5 sm:p-6">${fmGripHtml()}
  ${act?`<input id="qt_${it.id}" class="gf-hov text-[15px]" maxlength="200" value="${esc(it.title)}" placeholder="${vid?'Judul video':'Judul gambar'}" oninput="fmField('${it.id}','title',this.value)">
   ${vid?`<input class="gf-hov mt-2 text-sm" maxlength="200" value="${esc(it.url)}" placeholder="https://www.youtube.com/watch?v=..." oninput="fmVidUrl('${it.id}',this.value)">`:`<button onclick="event.stopPropagation();fmImgPick('${it.id}','src')" class="mt-3 h-9 px-4 rounded border border-[#dadce0] text-sm font-semibold text-[color:var(--fc)] hover:bg-slate-50 flex items-center gap-2">${icon('upload','w-4 h-4')} ${it.src?'Ganti gambar':'Pilih gambar'}</button>`}${body}${ctl}`
  :`${it.title?`<div class="text-[15px] text-[#202124]">${esc(it.title)}</div>`:''}${body}`}</div></div>`;
}
function fmVidUrl(id,v){const it=fmItem(id);if(!it)return;it.url=v;fmTouch(fmCur());const c=document.querySelector('#fmQList [data-item="'+id+'"] iframe,#fmQList [data-item="'+id+'"] .bg-slate-100');if(fmYt(v)&&(!c||c.tagName!=='IFRAME'||c.src.indexOf(fmYt(v))<0))fmRefreshList();}
function fmTypeMenu(it){const ti=fmQTinfo(it.type);
 return `<details class="fm-menu relative sm:w-64 shrink-0" onclick="event.stopPropagation()"><summary class="border border-[#dadce0] rounded-md px-4 h-[52px] flex items-center gap-3 text-sm bg-white hover:bg-slate-50">${icon(ti[2],'w-5 h-5 text-slate-600')}<span class="flex-1">${ti[1]}</span>${icon('triangle','w-2.5 h-2.5 text-slate-600 fill-current rotate-180')}</summary>
  <div class="absolute left-0 right-0 top-full mt-1 bg-white border border-[#dadce0] rounded-md shadow-lg py-2 z-30 max-h-[340px] overflow-y-auto scrollbar">${FM_QT.map(t=>`<button onclick="fmType('${it.id}','${t[0]}')" class="w-full flex items-center gap-4 px-4 py-2.5 text-sm text-left hover:bg-slate-100 ${t[0]===it.type?'bg-slate-100 font-semibold':''}">${icon(t[2],'w-5 h-5 text-slate-600')}${t[1]}</button>`).join('')}</div></details>`;}
document.addEventListener('click',e=>{document.querySelectorAll('details.fm-menu[open]').forEach(d=>{if(!d.contains(e.target))d.removeAttribute('open');});});
/* impor pertanyaan dari form lain */
let fmImp={};
function fmImportOpen(){
 const cur=fmCur(),src=fmForms.filter(x=>x.type==='custom'&&x.id!==(cur&&cur.id)&&x.items.some(i=>i.kind==='q'));
 fmImp={};fmEl('modalTitle').textContent='Impor pertanyaan';fmEl('modalDesc').textContent='Pilih pertanyaan dari form lain';
 fmEl('modalBody').innerHTML=src.length?`<div class="space-y-4 max-h-[52vh] overflow-y-auto">${src.map(f=>`<div><div class="text-sm font-bold mb-1">${esc(f.title||'Tanpa judul')}</div>${f.items.filter(i=>i.kind==='q').map(i=>{fmImp[f.id+'|'+i.id]=i;return `<label class="flex items-center gap-3 py-1.5 text-sm cursor-pointer"><input type="checkbox" data-k="${f.id}|${i.id}" style="width:18px;height:18px"><span class="flex-1 truncate">${esc(i.title||'Pertanyaan')}</span><span class="text-[11px] text-slate-400">${fmQTinfo(i.type)[1]}</span></label>`;}).join('')}</div>`).join('')}</div>
  <div class="flex justify-end gap-2 mt-4"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button onclick="fmImportDo()" class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">Impor</button></div>`
  :'<div class="py-8 text-center text-sm text-slate-400">Belum ada form lain yang memiliki pertanyaan.</div>';
 showModal();
}
function fmImportDo(){
 const f=fmCur(),ks=[...document.querySelectorAll('#modalBody input[data-k]:checked')].map(x=>x.dataset.k);if(!f||!ks.length){showToast('Pilih minimal satu pertanyaan');return;}
 let idx=f.items.length;if(fm.active&&fm.active!=='__h'){const i=f.items.findIndex(x=>x.id===fm.active);if(i>=0)idx=i+1;}
 ks.forEach(k=>{const c=JSON.parse(JSON.stringify(fmImp[k]));c.id='q'+fmRid(6);f.items.splice(idx++,0,c);});
 fmTouch(f);closeModal();fmRefreshList();showToast(ks.length+' pertanyaan diimpor');
}
function fmQTinfo(t){return FM_QT.find(x=>x[0]===t)||FM_QT[0];}

/* ---------- penyimpanan ---------- */
function fmLoad(){try{const a=JSON.parse(localStorage.getItem(FM_KEY)||'[]');return Array.isArray(a)?a.filter(f=>f&&f.id&&(f.type==='custom'||f.type==='absensi')):[];}catch(e){return [];}}
let fmForms=fmLoad(), fmSaveT=null;
function fmSaveNow(){try{localStorage.setItem(FM_KEY,JSON.stringify(fmForms));}catch(e){}if(window.simdekaFormSync)window.simdekaFormSync();const s=fmEl('fmSaveState');if(s)s.textContent='Semua perubahan tersimpan';}
function fmSave(now){clearTimeout(fmSaveT);if(now){fmSaveNow();return;}const s=fmEl('fmSaveState');if(s)s.textContent='Menyimpan…';fmSaveT=setTimeout(fmSaveNow,350);}
window.addEventListener('pagehide',()=>{if(fmSaveT){clearTimeout(fmSaveT);fmSaveNow();}});
function fmTouch(f){f.updated=Date.now();fmSave();}
function fmRespAll(){try{const o=JSON.parse(localStorage.getItem(FM_RESP)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
function fmResp(id){const l=fmRespAll()[id];if(!Array.isArray(l))return [];const sup=new Set();l.forEach(x=>{if(x&&x.rep)sup.add(x.rep);});return sup.size?l.filter(x=>!(x&&sup.has(x.id))):l;}
function fmRespPut(id,list){const all=fmRespAll();all[id]=list;try{localStorage.setItem(FM_RESP,JSON.stringify(all));return true;}catch(e){return false;}}
function fmRespAdd(id,r){
 const l=fmResp(id);if(l.some(x=>x.id===r.id))return false;l.push(r);
 const ok=fmRespPut(id,l);
 if(ok&&window.simdekaResponsePush)window.simdekaResponsePush(id,r);
 return ok;
}
/* Simpan tanggapan baru, atau perbarui tanggapan lama (resp.rep = id lama; yang terbaru selalu dipakai). */
function fmRespSave(id,r){
 if(!r.rep)return fmRespAdd(id,r);
 const l=fmResp(id).filter(x=>x.id!==r.rep);l.push(r);
 const ok=fmRespPut(id,l);
 if(ok&&window.simdekaResponsePush)window.simdekaResponsePush(id,r);
 return ok;
}

/* ---------- pabrik data ---------- */
function fmBlank(kind,type){
 return {id:(kind==='q'?'q':kind==='title'?'t':'s')+fmRid(6),kind:kind,type:type||'short',title:kind==='q'?'Pertanyaan Tanpa Judul':'',desc:'',showDesc:kind!=='q',required:false,fMax:10,fType:'any',
  options:(kind==='q'&&['radio','check','select'].includes(type))?['Opsi 1']:[],other:false,sMin:1,sMax:5,sMinL:'',sMaxL:'',img:'',src:'',url:'',vt:'',vmin:'',vmax:'',shuffle:false,branch:false,go:[]};
}
function fmNew(type){
 const now=Date.now(), ab=type==='absensi';
 const f={id:'F'+fmRid(7),type:type,created:now,updated:now,title:ab?'Absensi Kegiatan':'Formulir tanpa judul',desc:'',owner_id:'',shared:false,color:ab?'#173B70':'#673AB7',publicReport:{enabled:true,showNames:false,showGroup:true,showTimes:false,realtime:true},
  confirmMsg:ab?'Absensi berhasil dikirim. Terima kasih.':'Tanggapan Anda telah direkam.',allowAnother:true,allowUpdate:true,deadline:''};
 if(ab){f.absen={jenis:'',tanggal:fmToday(),sumber:['generus'],kelompok:[],peserta:[],mode:'petugas'};f.override={};f.ovr={};f.absen.peserta=fmBuildPeserta(f.absen);}
 else f.items=[fmBlank('q','radio')];
 return f;
}

/* ---------- sumber peserta (dari database yang ada) ---------- */
function fmSourceList(k){
 if(k==='generus') return generus.map(g=>({n:g.nama,k:g.kelompok,d:'Generus'+(g.status?' • '+g.status:'')}));
 /* Modul lain (muda mudi) belum berisi data. Saat modulnya jadi, daftarkan:
    window.FM_EXTRA_SOURCES={'muda-mudi-desa':()=>[{n:'Nama',k:'Kelompok A',d:'Ketua'}], ...} */
 const h=window.FM_EXTRA_SOURCES&&window.FM_EXTRA_SOURCES[k];
 if(typeof h==='function'){try{const r=h();return Array.isArray(r)?r:[];}catch(e){}}
 return [];
}
function fmBuildPeserta(a){
 const map=new Map();
 (a.sumber||[]).forEach(src=>fmSourceList(src).forEach(p=>{
  if(!normNama(p.n))return;
  const kel=normNama(p.k)||'Tanpa Kelompok';
  if(a.kelompok&&a.kelompok.length&&!a.kelompok.includes(kel))return;
  const key=fmKey(p.n,kel), ex=map.get(key);
  if(ex){if(p.d&&!ex.d.split(' / ').includes(p.d))ex.d+=' / '+p.d;}
  else map.set(key,{n:normNama(p.n),k:kel,d:p.d||'—'});
 }));
 const ord=kelompokList.map(k=>k.nama);
 return [...map.values()].sort((x,y)=>{const i=ord.indexOf(x.k),j=ord.indexOf(y.k);return (i<0?999:i)-(j<0?999:j)||x.n.localeCompare(y.n,'id');});
}

function fmNumOrEmpty(v){if(v===''||v==null)return '';const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:'';}
/* ---------- sanitasi (data dari tautan = tidak tepercaya) ---------- */
function fmPetClean(p){const o={};if(p&&typeof p==='object')Object.keys(p).slice(0,200).forEach(k=>{const e=p[k]||{},l=fmS(e.l,100),q=fmS(e.p,100);if(l||q)o[fmS(k,80)]={l:l,p:q};});return o;}
function fmSanitize(f){
 f=f||{};
 const o={id:fmS(f.id,20).replace(/[^A-Za-z0-9]/g,'')||'X',type:f.type==='absensi'?'absensi':'custom',title:fmS(f.title,200),desc:fmS(f.desc,2000),color:fmColor(f.color),
  confirmMsg:fmS(f.confirmMsg,500),deadline:fmS(f.deadline,25),allowAnother:!!f.allowAnother,allowUpdate:f.allowUpdate!==false};
 if(o.type==='absensi'){
  const a=f.absen||{};
  o.absen={jenis:fmS(a.jenis,120),tanggal:fmS(a.tanggal,10),mode:a.mode==='peserta'?'peserta':a.mode==='both'?'both':'petugas',lock:FM_RX.test(a.lock||'')?a.lock:'',rutin:!!a.rutin,sesi:(Array.isArray(a.sesi)?a.sesi:[]).slice(0,400).map(x=>({tgl:/^\d{4}-\d{2}-\d{2}$/.test(x&&x.tgl)?x.tgl:'',st:x&&x.st==='libur'?'libur':'ada',ket:fmS(x&&x.ket,120)})).filter(x=>x.tgl),peserta:(Array.isArray(a.peserta)?a.peserta:[]).slice(0,5000).map(p=>({n:fmS(p&&p.n,100),k:fmS(p&&p.k,80),d:fmS(p&&p.d,120)})),pet:fmPetClean(a.pet)};
 } else {
  const seen={};
  o.items=(Array.isArray(f.items)?f.items:[]).slice(0,200).map((it,i)=>{
   it=it||{};let id=fmS(it.id,20).replace(/[^A-Za-z0-9_-]/g,'')||('q'+i);while(seen[id])id+='x';seen[id]=1;
   const sMax=Math.min(10,Math.max(2,parseInt(it.sMax,10)||5));
   return {id:id,kind:['q','title','section','image','video'].includes(it.kind)?it.kind:'q',img:fmImgOk(it.img),src:fmImgOk(it.src),url:fmYt(it.url)?fmS(it.url,200):'',type:FM_QTYPES.includes(it.type)?it.type:'short',title:fmS(it.title,500),desc:fmS(it.desc,1000),
    showDesc:!!it.showDesc,required:!!it.required,options:(Array.isArray(it.options)?it.options:[]).slice(0,200).map(x=>fmS(x,200)),other:!!it.other,
    sMin:it.sMin===0?0:1,sMax:sMax,sMinL:fmS(it.sMinL,60),sMaxL:fmS(it.sMaxL,60),fMax:[1,5,10,25].includes(+it.fMax)?+it.fMax:10,fType:['any','image','pdf','doc'].includes(it.fType)?it.fType:'any',
    vt:['hp','url','angka'].includes(it.vt)?it.vt:'',vmin:fmNumOrEmpty(it.vmin),vmax:fmNumOrEmpty(it.vmax),shuffle:!!it.shuffle,branch:!!it.branch,
    go:(Array.isArray(it.go)?it.go:[]).slice(0,200).map(x=>String(x==null?'':x).slice(0,20).replace(/[^A-Za-z0-9_-]/g,''))};
  });
  o.drive=FM_DRIVE_RX.test(f.drive||'')?f.drive:'';
 }
 return o;
}

/* ---------- pengemasan tautan / kode ---------- */
function fmB64(b){let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fmUnB64(t){t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';const s=atob(t),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
async function fmPipe(bytes,C){const st=new Blob([bytes]).stream().pipeThrough(new C('deflate-raw'));return new Uint8Array(await new Response(st).arrayBuffer());}
async function fmPack(obj){
 const raw=new TextEncoder().encode(JSON.stringify(obj)), plain=fmB64(raw);
 if(plain.length>1500&&typeof CompressionStream==='function'){try{return 'z'+fmB64(await fmPipe(raw,CompressionStream));}catch(e){}}
 return 'r'+plain;
}
async function fmUnpack(s){
 const k=s.charAt(0), b=fmUnB64(s.slice(1));let raw=b;
 if(k==='z'){if(typeof DecompressionStream!=='function')throw new Error('nodecomp');raw=await fmPipe(b,DecompressionStream);}
 else if(k!=='r')throw new Error('fmt');
 return JSON.parse(new TextDecoder().decode(raw));
}
const FM_ITD={kind:'q',type:'short',title:'',desc:'',showDesc:false,required:false,fMax:10,fType:'any',other:false,sMin:1,sMax:5,sMinL:'',sMaxL:'',img:'',src:'',url:'',vt:'',vmin:'',vmax:'',shuffle:false,branch:false};
function fmCompactItem(it){
 const o={};
 Object.keys(it).forEach(k=>{const v=it[k];
  if(k==='options'){if(Array.isArray(v)&&v.length)o[k]=v;return;}
  if(k==='go'){if(it.branch&&Array.isArray(v)&&v.some(Boolean))o[k]=v;return;}
  if(k in FM_ITD&&FM_ITD[k]===v)return;
  o[k]=v;});
 return o;
}
function fmPayload(f,onlyKel,onlyTg){
 if(f.type==='absensi'){
  const a=f.absen,P=onlyKel?a.peserta.filter(p=>p.k===onlyKel):a.peserta,ks=[...new Set(P.map(p=>p.k))];
  return {v:1,i:f.id,t:'a',ti:f.title,ja:a.jenis,tg:onlyTg||a.tanggal,tl:onlyTg||'',md:a.mode==='peserta'?'p':a.mode==='both'?'b':'',ru:a.rutin?1:0,sj:a.rutin?(a.sesi||[]).filter(x=>!onlyTg||x.tgl===onlyTg).map(x=>[x.tgl,x.st==='libur'?1:0,x.ket||'']):[],c:f.color,cm:f.confirmMsg,dl:fmDlEff(f),al:f.allowAnother?1:0,au:f.allowUpdate===false?0:1,k:ks,p:P.map(p=>[p.n,ks.indexOf(p.k),p.d])};
 }
 return {v:1,i:f.id,t:'c',ti:f.title,ds:f.desc,c:f.color,cm:f.confirmMsg,dl:fmDlEff(f),al:f.allowAnother?1:0,au:f.allowUpdate===false?0:1,it:f.items.map(fmCompactItem),du:f.items.some(x=>x.type==='file')?fmDriveUrl():''};
}
function fmFromPayload(d){
 if(!d||d.v!==1)throw new Error('fmt');
 const base={id:d.i,title:d.ti,color:d.c,confirmMsg:d.cm,deadline:d.dl,allowAnother:!!d.al,allowUpdate:d.au!==0};
 if(d.t==='a'){const ks=Array.isArray(d.k)?d.k:[];return Object.assign(base,{type:'absensi',absen:{jenis:d.ja,tanggal:d.tg,mode:d.md==='p'?'peserta':d.md==='b'?'both':'petugas',lock:FM_RX.test(d.tl||'')?d.tl:'',rutin:!!d.ru,sesi:(Array.isArray(d.sj)?d.sj:[]).map(r=>({tgl:r[0],st:r[1]?'libur':'ada',ket:r[2]||''})),peserta:(Array.isArray(d.p)?d.p:[]).map(r=>({n:r[0],k:ks[r[1]]||'',d:r[2]}))}});}
 return Object.assign(base,{type:'custom',desc:d.ds,items:d.it,drive:d.du||''});
}
const FM_BLN=['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
function fmSlug(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);}
function fmTgParts(f,tg){
 const y=tg.slice(0,4),m=+tg.slice(5,7)-1,d=+tg.slice(8,10),dup=fmSesi(f).filter(x=>x.tgl.slice(0,7)===tg.slice(0,7)).length>1;
 return {bln:FM_BLN[m]||'',y:y,d:d,dup:dup};
}
function fmSesiLabel(f,tg){const q=fmTgParts(f,tg),j=f.absen.jenis||f.title||'Absensi',B=q.bln.charAt(0).toUpperCase()+q.bln.slice(1);return j+' — '+(q.dup?q.d+' ':'')+B+' '+q.y;}
function fmLinkSlug(f,onlyKel,onlyTg){
 const a=[fmSlug(f.absen&&f.absen.jenis||f.title)||'absensi'];
 if(onlyTg){const q=fmTgParts(f,onlyTg);a.push((q.dup?q.d+'-':'')+q.bln+'-'+q.y);}
 if(onlyKel)a.push(fmSlug(onlyKel));
 return a.filter(Boolean).join('-').slice(0,90);
}
async function fmLink(f,onlyKel,onlyTg){
 if(!f.shared){f.shared=true;fmSave();}
 let path='/f/'+encodeURIComponent(f.id);
 if(onlyKel)path+='/'+(fmSlug(onlyKel)||encodeURIComponent(onlyKel));
 if(onlyTg)path+='/'+onlyTg;
 return kaOrigin()+path;
}
/* ---------- QR Code untuk tautan form / absensi ---------- */
let fmQrCur=null;
function fmQrBuild(url){
 if(typeof qrcode==='undefined')return {err:'lib'};
 for(const lv of ['M','L']){try{const q=qrcode(0,lv);q.addData(url,'Byte');q.make();return {q:q};}catch(e){}}
 return {err:'long'};
}
function fmQrCanvas(q,px,caption){
 const n=q.getModuleCount(),quiet=4,cell=Math.max(2,Math.floor(px/(n+quiet*2))),qs=(n+quiet*2)*cell;
 const capH=caption?Math.round(qs*0.14):0,c=document.createElement('canvas');c.width=qs;c.height=qs+capH;
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#000';
 for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))x.fillRect((k+quiet)*cell,(r+quiet)*cell,cell,cell);
 if(caption){let fs=Math.round(capH*0.36),t=caption;x.fillStyle='#173B70';x.textAlign='center';x.textBaseline='middle';
  x.font='700 '+fs+'px "Plus Jakarta Sans",Arial,sans-serif';
  while(x.measureText(t).width>qs*0.92&&t.length>8){t=t.slice(0,-2);}
  if(t!==caption)t=t.replace(/\s+$/,'')+'…';
  x.fillText(t,qs/2,qs+capH*0.42);}
 return c;
}
function fmQrShow(url,label,back){
 fmQrCur={url:url,label:label||'',back:back||''};
 const r=fmQrBuild(url),bk=back?`<button onclick="fmQrBack()" class="h-10 px-4 rounded-xl border border-line text-xs font-bold flex items-center gap-2">${icon('arrow-left','w-4')} Kembali</button>`:'';
 fmEl('modalTitle').textContent='QR Code Absensi';fmEl('modalDesc').textContent=label||'';
 if(!r.q){
  fmEl('modalBody').innerHTML=`<div class="space-y-4"><div class="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800 leading-relaxed">${r.err==='lib'?'Library QR belum termuat (periksa koneksi internet lalu coba lagi).':`<b>Tautan terlalu panjang untuk dijadikan QR</b> (${url.length.toLocaleString('id-ID')} karakter; batas sekitar 2.900). Tautan memuat seluruh daftar peserta. Gunakan <b>tautan per kelompok</b> atau <b>link per sesi</b> yang lebih pendek, atau batasi peserta pada form.`}</div><div class="flex justify-end gap-2">${bk}</div></div>`;
  showModal();lucide.createIcons();return;
 }
 const c=fmQrCanvas(r.q,1000,'');
 fmEl('modalBody').innerHTML=`<div class="space-y-4"><div class="flex justify-center"><div id="fmQrBox" class="rounded-2xl border border-line bg-white p-3 shadow-card" style="width:min(100%,340px)"></div></div>
  <p class="text-center text-xs text-slate-500">Pindai QR ini untuk membuka formulir absensi.${url.length>1200?'<br><span class="text-amber-600 font-semibold">QR cukup padat — tampilkan cukup besar atau cetak agar mudah dipindai.</span>':''}</p>
  <div class="flex flex-wrap justify-center gap-2">${bk}
   <button onclick="fmQrDownload()" class="h-10 px-4 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-2">${icon('download','w-4')} Unduh PNG</button>
   <button onclick="fmQrPrint()" class="h-10 px-4 rounded-xl border border-line text-xs font-bold flex items-center gap-2">${icon('printer','w-4')} Cetak</button>
   <button onclick="fmCopyText(fmQrCur.url,'Tautan disalin')" class="h-10 px-4 rounded-xl border border-line text-xs font-bold flex items-center gap-2">${icon('copy','w-4')} Salin tautan</button></div></div>`;
 c.style.cssText='width:100%;height:auto;display:block;image-rendering:pixelated';fmEl('fmQrBox').appendChild(c);
 showModal();lucide.createIcons();
}
function fmQrBack(){if(fmQrCur&&fmQrCur.back==='share')fmShare();else closeModal();}
function fmQrPng(){const r=fmQrBuild(fmQrCur.url);return r.q?fmQrCanvas(r.q,1000,fmQrCur.label):null;}
function fmQrDownload(){
 const c=fmQrPng();if(!c)return;
 c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);
  a.download='QR-'+(fmSlug(fmQrCur.label)||'absensi')+'.png';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);showToast('QR code diunduh');},'image/png');
}
function fmQrPrint(){
 const c=fmQrPng();if(!c)return;
 const w=window.open('','_blank');if(!w){showToast('Pop-up diblokir. Gunakan Unduh PNG.');return;}
 w.document.write('<!doctype html><title>QR Absensi</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;text-align:center}img{width:min(80vw,600px);height:auto}h2{margin:0 0 12px;color:#173B70}p{color:#555;font-size:14px}@media print{@page{margin:12mm}}</style><h2>'+esc(fmQrCur.label)+'</h2><img src="'+c.toDataURL('image/png')+'"><p>Pindai untuk mengisi absensi</p>');
 w.document.close();w.onload=()=>{w.focus();w.print();};setTimeout(()=>{try{w.focus();w.print();}catch(e){}},600);
}
function fmQrPick(kind,i){
 const f=fmCur();if(!f)return;
 if(kind==='main')fmQrShow(fmShareLinks[0].url,f.title||'Formulir','share');
 else if(kind==='kel'){const l=fmShareLinks[i];fmQrShow(l.url,(f.title||'Formulir')+' — '+l.name,'share');}
 else if(kind==='sesi'){const l=fmSesiLinks[i];fmQrShow(l.url,l.label,'share');}
}
/* Salin tautan satu sesi absensi (dipanggil dari tombol "Link" di Jadwal Kegiatan). */
async function fmCopySesi(i){
 const f=fmCur(),x=f&&(f.absen.sesi||[])[i];if(!x||!x.tgl)return;
 f.absen.peserta=fmBuildPeserta(f.absen);fmSave(true);
 try{fmCopyText(await fmLink(f,null,x.tgl),'Link sesi disalin');}catch(e){showToast('Gagal membuat tautan');}
}
async function fmQrSesi(i){
 const f=fmCur(),x=(f.absen.sesi||[])[i];if(!x)return;
 f.absen.peserta=fmBuildPeserta(f.absen);fmSave(true);
 try{fmQrShow(await fmLink(f,null,x.tgl),fmSesiLabel(f,x.tgl),'');}catch(e){showToast('Gagal membuat QR');}
}
async function fmListQr(id){
 const f=fmForms.find(x=>x.id===id);if(!f)return;
 if(f.type==='absensi'){f.absen.peserta=fmBuildPeserta(f.absen);fmSave(true);}
 try{fmQrShow(await fmLink(f),f.title||'Formulir','');}catch(e){showToast('Gagal membuat QR');}
}
function fmCleanResp(f,r){
 if(!r||typeof r!=='object')return null;
 const o={id:fmS(r.id,20).replace(/[^A-Za-z0-9]/g,''),ts:Number(r.ts)||Date.now()};if(!o.id)return null;
 if(f.type==='absensi'){
  o.kel=fmS(r.kel,80);o.pj=fmS(r.pj,80);o.tg=/^\d{4}-\d{2}-\d{2}$/.test(r.tg||'')?r.tg:'';o.m={};
  Object.keys(r.m||{}).slice(0,5000).forEach(k=>{if(FM_ST[r.m[k]])o.m[fmS(k,220)]=r.m[k];});
  if(!Object.keys(o.m).length)return null;
  if(r.j&&typeof r.j==='object'){const jj={materi:fmS(r.j.materi,1500),nasehat:fmS(r.j.nasehat,1500),catatan:fmS(r.j.catatan,1500),surat:fmS(r.j.surat,120),ayat:fmS(r.j.ayat,60),hadist:fmS(r.j.hadist,160),hal:fmS(r.j.hal,60),nas:(r.j.nas==='sudah'||r.j.nas==='belum'||r.j.nas==='tidak')?r.j.nas:'',nsp:fmS(r.j.nsp,120),kendala:fmS(r.j.kendala,1500)};if(jj.materi||jj.nasehat||jj.catatan||jj.surat||jj.hadist||jj.nas||jj.kendala)o.j=jj;}
 } else {
  o.a={};
  (f.items||[]).forEach(it=>{if(it.kind!=='q')return;const v=(r.a||{})[it.id];if(v===undefined)return;o.a[it.id]=Array.isArray(v)?v.slice(0,200).map(x=>fmS(x,500)):fmS(v,2000);});
 }
 return o;
}
async function fmCode(fid,resp){return 'SDK1.'+fid+'.'+await fmPack(resp);}
function fmSyncSend(fid,resp){
 if(!FM_SYNC_URL)return;
 try{fetch(FM_SYNC_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({form:fid,resp:resp})}).catch(()=>{});}catch(e){}
}

/* ---------- util UI ---------- */
function fmCopyText(t,okMsg){
 const done=()=>showToast(okMsg||'Disalin ke clipboard');
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>fmCopyFallback(t,done));}
 else fmCopyFallback(t,done);
}
function fmCopyFallback(t,done){const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0;top:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){showToast('Salin manual dari kolom teks');}ta.remove();}
function fmCsvCell(v){let s=Array.isArray(v)?v.join('; '):String(v==null?'':v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function fmCsv(name,rows){
 const blob=new Blob(['\ufeff'+rows.map(r=>r.map(fmCsvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name.replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'_')+'.csv';document.body.appendChild(a);a.click();
 setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
function fmXlsx(name,rows,sheet){
 const nama=name.replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'_')||'Data';
 if(!window.XLSX){fmCsv(name,rows);showToast('Library Excel belum termuat, CSV diunduh');return;}
 const clean=rows.map(r=>r.map(v=>Array.isArray(v)?v.join('; '):(v==null?'':v)));
 const ws=XLSX.utils.aoa_to_sheet(clean),w=[];
 clean.forEach(r=>r.forEach((v,i)=>{w[i]=Math.min(50,Math.max(w[i]||8,String(v).length+2));}));
 ws['!cols']=w.map(x=>({wch:x}));
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,(sheet||'Data').replace(/[\\\/?*\[\]:]/g,'').slice(0,31)||'Data');
 if(!dlXlsx(wb,nama)){fmCsv(name,rows);showToast('Gagal membuat Excel, CSV diunduh');}
}
function fmPdf(name,rows){
 const w=window.open('','_blank');
 if(!w){showToast('Pop-up diblokir. Izinkan pop-up untuk membuat PDF');return;}
 const head=rows.findIndex(r=>r.length>=4),cell=v=>esc(Array.isArray(v)?v.join('; '):(v==null?'':v));
 const info=(head<0?rows:rows.slice(0,head)).filter(r=>r.length).map(r=>`<p>${r.map(cell).join(' &nbsp; ')}</p>`).join('');
 const tb=head<0?[]:rows.slice(head).filter(r=>r.length);
 const wide=tb.length&&tb[0].length>7;
 w.document.open();
 w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(name)}</title><style>@page{size:A4 ${wide?'landscape':'portrait'};margin:14mm}body{font:12px/1.4 Arial,sans-serif;color:#111}h1{font-size:16px;margin:0 0 6px}p{margin:2px 0}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eee}thead{display:table-header-group}tr{page-break-inside:avoid}</style></head><body><h1>${esc(name)}</h1>${info}${tb.length?`<table><thead><tr>${tb[0].map(c=>`<th>${cell(c)}</th>`).join('')}</tr></thead><tbody>${tb.slice(1).map(r=>`<tr>${r.map(c=>`<td>${cell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:''}<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
 w.document.close();
}
function fmOut(name,rows,fmt,sheet){if(fmt==='csv')fmCsv(name,rows);else if(fmt==='pdf')fmPdf(name,rows);else fmXlsx(name,rows,sheet);}
let fmCb=null;
function fmConfirm(title,desc,label,cb){
 fmCb=cb;
 uiConfirm({title:title,message:desc||'',ok:label||'Hapus',tone:'danger'}).then(y=>{if(y&&fmCb)fmCb();});
}

/* ---------- toast "Urungkan" ---------- */
let fmUndoT=null,fmUndoFn=null;
function fmUndo(msg,fn){
 clearTimeout(fmUndoT);fmUndoFn=fn;
 let el=document.getElementById('undoToast');
 if(!el){el=document.createElement('div');el.id='undoToast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.className='fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 z-[85] bg-slate-900 text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 max-w-[92vw]';document.body.appendChild(el);}
 el.innerHTML='<span class="min-w-0 truncate"></span><button type="button" class="font-extrabold text-amber-300 hover:underline shrink-0">Urungkan</button>';
 el.firstChild.textContent=msg;
 el.lastChild.onclick=()=>{const f=fmUndoFn;fmUndoFn=null;clearTimeout(fmUndoT);el.classList.add('hidden');if(f)f();};
 el.classList.remove('hidden');
 fmUndoT=setTimeout(()=>{fmUndoFn=null;el.classList.add('hidden');},8000);
}

/* ---------- status, urutan, sematan daftar form ---------- */
const FM_STL={aktif:['Aktif','bg-emerald-50 text-emerald-700'],tutup:['Ditutup','bg-red-50 text-red-700'],draft:['Draft','bg-slate-100 text-slate-600']};
function fmStatus(f){
 if(f.closed)return 'tutup';
 if(f.deadline){const t=new Date(f.deadline).getTime();if(!isNaN(t)&&t<Date.now())return 'tutup';}
 if(!f.shared&&!fmResp(f.id).length)return 'draft';
 return 'aktif';
}
function fmStBadge(f){const m=FM_STL[fmStatus(f)];return `<span class="px-2 py-1 rounded-lg ${m[1]} font-bold">${m[0]}</span>`;}
function fmDeadlineLine(f){
 if(!f.deadline)return '';const t=new Date(f.deadline).getTime();if(isNaN(t))return '';const late=t<Date.now();
 return `<div class="mt-2 text-[11px] ${late?'text-red-600':'text-slate-500'} flex items-center gap-1">${icon('clock','w-3.5 h-3.5')} ${late?'Ditutup sejak':'Batas pengisian'} ${esc(fmDT(t))}</div>`;
}
function fmDlEff(f){return f.closed?'2000-01-01T00:00':(f.deadline||'');}
function fmListFiltered(){
 const q=fm.q.trim().toLowerCase();
 const l=fmForms.filter(f=>!kaIsKmm(f)&&(!q||(f.title||'').toLowerCase().includes(q))&&(fm.st==='all'||fmStatus(f)===fm.st));
 const cmp={upd:(a,b)=>b.updated-a.updated,old:(a,b)=>a.created-b.created,az:(a,b)=>(a.title||'').localeCompare(b.title||'','id'),resp:(a,b)=>fmResp(b.id).length-fmResp(a.id).length||b.updated-a.updated}[fm.so]||((a,b)=>b.updated-a.updated);
 return l.sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)||cmp(a,b));
}
function fmListBar(){
 const cnt=k=>fmForms.filter(f=>k==='all'||fmStatus(f)===k).length;
 const chip=(k,l)=>`<button onclick="fmSetSt('${k}')" class="px-3 h-9 rounded-full text-xs font-bold border ${fm.st===k?'bg-navy text-white border-navy':'bg-white border-line text-slate-600 hover:bg-slate-50'}">${l} <span class="${fm.st===k?'text-white/70':'text-slate-400'}">${cnt(k)}</span></button>`;
 return `<div class="flex flex-col lg:flex-row lg:items-center gap-3 mb-4"><div class="u-search flex-1" style="margin-bottom:0">${icon('search','w-4 text-slate-400')}<input value="${esc(fm.q)}" oninput="fm.q=this.value;fmRenderListCards()" class="w-full text-sm bg-transparent" placeholder="Cari form..."></div>
  <div class="flex flex-wrap items-center gap-2">${chip('all','Semua')}${chip('aktif','Aktif')}${chip('draft','Draft')}${chip('tutup','Ditutup')}
  <select aria-label="Urutkan form" onchange="fm.so=this.value;fmRenderListCards()" class="h-9 border border-line rounded-xl px-3 text-xs font-bold bg-white">${[['upd','Terbaru diubah'],['old','Terlama dibuat'],['az','Judul A–Z'],['resp','Tanggapan terbanyak']].map(o=>`<option value="${o[0]}" ${fm.so===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div></div>`;
}
function fmSetSt(k){fm.st=k;fmRenderList();}
function fmTogglePin(id){const f=fmForms.find(x=>x.id===id);if(!f)return;f.pin=!f.pin;fmSave(true);fmRenderListCards();showToast(f.pin?'Form disematkan':'Sematan dilepas');}

/* ---------- state halaman admin ---------- */
let fm={view:'list',id:null,tab:'q',rTab:'sum',ind:0,active:null,q:'',pq:'',pk:'',rq:'',rk:'',rs:'',st:'all',so:'upd'};
function fmCur(){return fmForms.find(f=>f.id===fm.id);}
function renderFormPage(){if(fm.view==='edit'&&fmCur())fmRenderEditor();else{fm.view='list';fmRenderList();}}

/* ---------- daftar form ---------- */
function fmRenderList(){
 const q=fm.q.trim().toLowerCase();
 const list=fmListFiltered();
 const nAb=fmForms.filter(f=>f.type==='absensi'&&!kaIsKmm(f)).length,nAll=fmForms.filter(f=>!kaIsKmm(f)).length;
 fmEl('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead('Buat formulir umum seperti Google Form atau form absensi kegiatan, lalu bagikan tautannya.',pageActions({label:'Buat Form',fn:'fmOpenCreate()'}))}
  <div class="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
   ${statCard('Total Form',nAll,'Semua jenis','clipboard-list','blue')}
   ${statCard('Form Umum',nAll-nAb,'Seperti Google Form','file-text','purple')}
   ${statCard('Form Absensi',nAb,'Kegiatan & kehadiran','calendar-check','green')}
  </div>
  ${fmForms.length?fmListBar():''}
  <div id="fmCards"></div></div>`;
 fmRenderListCards();
}
function fmRenderListCards(){
 const box=fmEl('fmCards');if(!box)return;
 const q=fm.q.trim().toLowerCase();
 const list=fmListFiltered();
 if(!fmForms.length){
  box.innerHTML=`<div class="bg-white rounded-3xl border-2 border-dashed border-line p-8 sm:p-12 text-center">
   <div class="w-14 h-14 mx-auto rounded-2xl bg-navy/5 text-navy grid place-items-center">${icon('clipboard-list','w-7')}</div>
   <h3 class="font-extrabold mt-4">Belum ada form</h3><p class="text-sm text-slate-400 mt-1">Pilih salah satu jenis form untuk memulai.</p>
   <div class="mt-6 grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">${fmCreateOptions()}</div></div>`;
  lucide.createIcons();return;
 }
 if(!list.length){box.innerHTML='<div class="bg-white rounded-2xl border border-line p-10 text-center text-sm text-slate-400">Tidak ada form yang cocok.</div>';return;}
 box.innerHTML=`<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">${list.map(f=>{
  const ab=f.type==='absensi',n=fmResp(f.id).length;
  const meta=ab?`${esc(f.absen.jenis||'Jenis kegiatan belum diisi')} • ${f.absen.rutin?(f.absen.sesi||[]).length+' sesi terjadwal':esc(fmDateLong(f.absen.tanggal))}`:`${f.items.filter(x=>x.kind==='q').length} pertanyaan`;
  return `<div onclick="fmOpen('${f.id}')" class="bg-white rounded-2xl border border-line shadow-card hover:shadow-soft hover:-translate-y-0.5 transition overflow-hidden cursor-pointer flex flex-col">
   <div class="h-1.5" style="background:${fmColor(f.color)}"></div>
   <div class="p-5 flex-1">
    <div class="flex items-start gap-3"><div class="w-11 h-11 rounded-2xl grid place-items-center shrink-0 text-white" style="background:${fmColor(f.color)}">${icon(ab?'calendar-check':'file-text','w-5')}</div>
     <div class="min-w-0"><h3 class="font-extrabold truncate">${f.pin?icon('pin','w-3.5 h-3.5 inline text-amber-500 mr-1'):''}${esc(f.title||'Tanpa judul')}</h3><p class="text-[11px] text-slate-400 mt-0.5">${ab?(f.absen.mode==='peserta'?'Form Absensi • Diisi peserta':f.absen.mode==='both'?'Form Absensi • Peserta atau petugas':'Form Absensi • Diisi petugas'):'Form Umum'}</p></div></div>
    <p class="text-xs text-slate-500 mt-3 truncate">${meta}</p>
    <div class="mt-3 flex items-center gap-2 text-[11px] text-slate-400">${fmStBadge(f)}<span class="px-2 py-1 rounded-lg bg-slate-100 font-bold text-slate-600">${n} tanggapan</span><span>Diubah ${esc(fmDT(f.updated))}</span></div>${fmDeadlineLine(f)}
   </div>
   <div class="px-3 py-2 border-t border-line flex items-center gap-1" onclick="event.stopPropagation()">
    <button title="Salin tautan" aria-label="Salin tautan" onclick="fmListCopy('${f.id}')" class="h-8 px-2.5 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-600 flex items-center gap-1.5">${icon('link','w-3.5')} Tautan</button>
    ${ab?`<button title="Lihat laporan publik" aria-label="Lihat laporan publik" onclick="fmPublicReport('${f.id}')" class="h-8 px-2.5 rounded-lg hover:bg-blue-50 text-xs font-bold text-blue-700 flex items-center gap-1.5">${icon('bar-chart-3','w-3.5')} Laporan</button>`:''}
    <button title="QR Code" aria-label="QR Code" onclick="fmListQr('${f.id}')" class="h-8 px-2.5 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-600 flex items-center gap-1.5">${icon('qr-code','w-3.5')} QR</button>
    <button title="${f.pin?'Lepas sematan':'Sematkan'}" aria-label="${f.pin?'Lepas sematan':'Sematkan'}" onclick="fmTogglePin('${f.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 grid place-items-center">${icon('pin','w-4 '+(f.pin?'text-amber-500':'text-slate-500'))}</button>
    <button title="Duplikat" aria-label="Duplikat form" onclick="fmDupForm('${f.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 grid place-items-center">${icon('copy','w-4 text-slate-500')}</button>
    <button title="Hapus" aria-label="Hapus form" onclick="fmAskDelForm('${f.id}')" class="w-8 h-8 rounded-lg hover:bg-red-50 grid place-items-center ml-auto">${icon('trash-2','w-4 text-red-500')}</button>
   </div></div>`;}).join('')}</div>`;
 lucide.createIcons();
}
function fmCreateOptions(){
 return `<button onclick="closeModal();fmCreate('custom')" class="text-left rounded-2xl border border-line hover:border-violet-300 hover:bg-violet-50/40 p-5 transition">
   <div class="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 grid place-items-center">${icon('file-text','w-5')}</div>
   <div class="font-extrabold mt-3">Form Umum</div><p class="text-xs text-slate-500 mt-1 leading-relaxed">Persis seperti Google Form: pilihan ganda, kotak centang, isian singkat, skala, tanggal, bagian, dan ringkasan tanggapan.</p></button>
  <button onclick="fmPickMode()" class="text-left rounded-2xl border border-line hover:border-emerald-300 hover:bg-emerald-50/40 p-5 transition">
   <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">${icon('calendar-check','w-5')}</div>
   <div class="font-extrabold mt-3">Form Absensi</div><p class="text-xs text-slate-500 mt-1 leading-relaxed">Daftar peserta diambil dari database generus & pengurus. Diisi oleh petugas per kelompok, atau peserta absen sendiri lewat tautan.</p></button>`;
}
function fmOpenCreate(){
 fmEl('modalTitle').textContent='Buat Form Baru';fmEl('modalDesc').textContent='Pilih jenis form.';
 fmEl('modalBody').innerHTML=`<div class="grid sm:grid-cols-2 gap-3">${fmCreateOptions()}</div>`;
 showModal();lucide.createIcons();
}
function fmPickMode(){
 fmEl('modalTitle').textContent='Siapa yang mengisi absensi?';fmEl('modalDesc').textContent='Bisa diubah lagi kapan saja di pengaturan form.';
 fmEl('modalBody').innerHTML=`<div class="grid sm:grid-cols-2 gap-3">
  <button onclick="closeModal();fmCreate('absensi','petugas')" class="text-left rounded-2xl border border-line hover:border-emerald-300 hover:bg-emerald-50/40 p-5 transition">
   <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">${icon('users','w-5')}</div>
   <div class="font-extrabold mt-3">Diisi petugas absensi</div><p class="text-xs text-slate-500 mt-1 leading-relaxed">Petugas memilih kelompok lalu menandai Hadir, Izin, atau Alpa untuk semua nama sekaligus.</p></button>
  <button onclick="closeModal();fmCreate('absensi','peserta')" class="text-left rounded-2xl border border-line hover:border-emerald-300 hover:bg-emerald-50/40 p-5 transition">
   <div class="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center">${icon('user-check','w-5')}</div>
   <div class="font-extrabold mt-3">Diisi langsung peserta</div><p class="text-xs text-slate-500 mt-1 leading-relaxed">Peserta membuka tautan, memilih kelompok dan namanya, lalu mengetuk Hadir atau Izin.</p></button></div>
  <button onclick="fmOpenCreate()" class="mt-4 text-xs font-bold text-slate-500 hover:underline">← Kembali</button>`;
 lucide.createIcons();
}
function fmSetMode(m){const f=fmCur();if(!f)return;f.absen.mode=(m==='peserta'||m==='both')?m:'petugas';fmTouch(f);fmRenderAbsenForm(f);lucide.createIcons();}
function fmCreate(type,mode){
 const f=fmNew(type);if(type==='absensi'&&mode==='peserta')f.absen.mode='peserta';fmForms.push(f);fmSave(true);
 fm.view='edit';fm.id=f.id;fm.tab='q';fm.rTab='sum';fm.ind=0;fm.pq='';fm.pk='';fm.active=type==='custom'?f.items[0].id:null;
 fmRenderEditor();window.scrollTo({top:0});
}
function fmOpen(id){fm.view='edit';fm.id=id;fm.tab='q';fm.rTab='sum';fm.ind=0;fm.pq='';fm.pk='';fm.rq='';fm.rk='';fm.rs='';fm.active=null;fmRenderEditor();window.scrollTo({top:0});}
function fmBack(){fmSave(true);fm.view='list';fmRenderList();}
async function fmPublicReport(id){const f=fmForms.find(x=>x.id===id);if(!f)return;window.open(location.origin+'/r/'+encodeURIComponent(id),'_blank','noopener');}
function fmPublicReportCopy(id){fmCopyText(location.origin+'/r/'+encodeURIComponent(id),'Link laporan publik disalin');}
async function fmListCopy(id){
 const f=fmForms.find(x=>x.id===id);if(!f)return;
 if(f.type==='absensi'){f.absen.peserta=fmBuildPeserta(f.absen);fmSave(true);}
 try{fmCopyText(await fmLink(f),'Tautan form disalin');}catch(e){showToast('Gagal membuat tautan');}
}
function fmDupForm(id){
 const f=fmForms.find(x=>x.id===id);if(!f)return;
 const c=JSON.parse(JSON.stringify(f));c.id='F'+fmRid(7);c.title=(f.title||'Tanpa judul')+' (salinan)';c.created=c.updated=Date.now();if(c.override)c.override={};
 fmForms.push(c);fmSave(true);fmRenderList();showToast('Form diduplikat');
}
function fmAskDelForm(id){fmDelForm(id);}
function fmDelForm(id){
 const idx=fmForms.findIndex(f=>f.id===id);if(idx<0)return;
 const form=fmForms[idx],resp=fmResp(id).slice();
 fmForms.splice(idx,1);fmSave(true);if(window.simdekaFormDelete)window.simdekaFormDelete(id);
 const all=fmRespAll();delete all[id];try{localStorage.setItem(FM_RESP,JSON.stringify(all));localStorage.removeItem(FM_DRAFT+id);}catch(e){}
 closeModal();fm.view='list';fmRenderList();
 fmUndo('Form "'+(form.title||'Tanpa judul')+'" dihapus',async()=>{
  fmForms.splice(Math.min(idx,fmForms.length),0,form);fmSave(true);if(window.simdekaFormSyncNow)await window.simdekaFormSyncNow();if(resp.length&&window.simdekaResponsePush)await Promise.all(resp.map(r=>window.simdekaResponsePush(id,r)));else if(resp.length)fmRespPut(id,resp);
  if(fmEl('fmCards'))fmRenderList();showToast('Form dikembalikan');});
}

/* ---------- kerangka editor ---------- */
function fmRenderEditor(){
 const f=fmCur();if(!f){fmBack();return;}
 fmEl('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade" style="--fc:${fmColor(f.color)}">${fmTopBar(f)}<div id="fmBody"></div></div>`;
 fmRenderBody();lucide.createIcons();
}
function fmTopBar(f){
 const ab=f.type==='absensi',n=fmResp(f.id).length;
 const tabs=[['q',ab?'Formulir':'Pertanyaan'],['r',ab?'Rekap Sesi':'Jawaban'],...(ab?[['l','Laporan']]:[]),['s','Setelan']];
 return `<div class="bg-white border border-line rounded-2xl shadow-card px-3 sm:px-4 pt-3">
  <div class="flex items-center gap-2">
   <button title="Kembali" onclick="fmBack()" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center shrink-0">${icon('arrow-left','w-5 text-slate-600')}</button>
   <div class="w-9 h-9 rounded-lg grid place-items-center text-white shrink-0" style="background:var(--fc)">${icon(ab?'calendar-check':'file-text','w-5')}</div>
   <input id="fmTT" value="${esc(f.title)}" maxlength="120" oninput="fmSetTitle(this.value,'fmTT')" placeholder="Formulir tanpa judul" class="flex-1 min-w-0 text-base sm:text-lg font-semibold bg-transparent border-0 border-b border-transparent hover:border-slate-200 rounded-none px-1 py-1">
   <span id="fmSaveState" class="hidden md:inline text-[11px] text-slate-400 whitespace-nowrap">Semua perubahan tersimpan</span>
   <div class="relative shrink-0">
    <button title="Warna tema" onclick="fmEl('fmPal').classList.toggle('hidden')" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('palette','w-5 text-slate-600')}</button>
    <div id="fmPal" class="hidden absolute right-0 top-11 z-20 bg-white border border-line rounded-xl shadow-soft p-3 w-44"><div class="text-[11px] font-bold text-slate-400 mb-2">Warna tema</div><div class="grid grid-cols-4 gap-2">${FM_COLORS.map(c=>`<button onclick="fmSetColor('${c}')" class="w-8 h-8 rounded-full border-2 ${c===fmColor(f.color)?'border-slate-800':'border-white shadow'}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div>
   </div>
   <button title="Pratinjau" onclick="fmPreview()" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center shrink-0">${icon('eye','w-5 text-slate-600')}</button>
   <button onclick="fmShare()" class="h-9 px-4 rounded-lg text-white text-sm font-bold flex items-center gap-2 shrink-0" style="background:var(--fc)">${icon('send','w-4')}<span class="hidden sm:inline">Kirim</span></button>
  </div>
  <div class="flex justify-center gap-1 mt-1 overflow-x-auto">${tabs.map(t=>`<button onclick="fmTab('${t[0]}')" class="fm-tab ${fm.tab===t[0]?'on':''}">${t[1]}${t[0]==='r'&&n?` <span class="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">${n}</span>`:''}</button>`).join('')}</div>
 </div>`;
}
function fmTab(t){fm.tab=t;fm.ind=0;fmRenderEditor();}
function fmRenderBody(){
 const f=fmCur(),b=fmEl('fmBody');if(!f||!b)return;
 if(fm.tab==='q')f.type==='absensi'?fmRenderAbsenForm(f):fmRenderQ(f);
 else if(fm.tab==='r')f.type==='absensi'?fmRenderRekap(f):fmRenderResp(f);
 else if(fm.tab==='l'&&f.type==='absensi')fmRenderLaporan(f);
 else fmRenderSettings(f);
 lucide.createIcons();
}
function fmSetTitle(v,src){
 const f=fmCur();if(!f)return;f.title=v;fmTouch(f);
 ['fmTT','fmHT'].forEach(id=>{if(id!==src){const e=fmEl(id);if(e)e.value=v;}});
}
function fmSetColor(c){const f=fmCur();if(!f)return;f.color=c;fmTouch(f);fmRenderEditor();}

/* ---------- editor pertanyaan (Form Umum) ---------- */
function fmItem(id){const f=fmCur();return f?f.items.find(x=>x.id===id):null;}
function fmRenderQ(f){
 fmEl('fmBody').innerHTML=`<div class="mt-4 rounded-3xl p-3 sm:p-6" style="background:color-mix(in srgb,var(--fc) 9%,#fff)">
  <div class="grid lg:grid-cols-[minmax(0,1fr)_52px] gap-3 max-w-[830px] mx-auto">
   <div id="fmQList" class="order-2 lg:order-1 space-y-3 min-w-0"></div>
   <div class="order-1 lg:order-2"><div class="sticky top-[88px] z-10 flex lg:flex-col justify-center gap-1 bg-white border border-[#dadce0] rounded-lg shadow-sm p-1 w-fit mx-auto lg:mx-0">
    <button title="Tambahkan pertanyaan" onclick="fmAddItem('q')" class="w-10 h-10 rounded-full hover:bg-slate-100 grid place-items-center">${icon('circle-plus','w-5 text-slate-600')}</button>
    <button title="Impor pertanyaan" onclick="fmImportOpen()" class="w-10 h-10 rounded-full hover:bg-slate-100 grid place-items-center">${icon('file-input','w-5 text-slate-600')}</button>
    <button title="Tambahkan judul dan deskripsi" onclick="fmAddItem('title')" class="w-10 h-10 rounded-full hover:bg-slate-100 grid place-items-center">${icon('type','w-5 text-slate-600')}</button>
    <button title="Tambahkan gambar" onclick="fmAddItem('image')" class="w-10 h-10 rounded-full hover:bg-slate-100 grid place-items-center">${icon('image','w-5 text-slate-600')}</button>
    <button title="Tambahkan video" onclick="fmAddItem('video')" class="w-10 h-10 rounded-full hover:bg-slate-100 grid place-items-center">${icon('square-play','w-5 text-slate-600')}</button>
    <button title="Tambahkan bagian" onclick="fmAddItem('section')" class="w-10 h-10 rounded-full hover:bg-slate-100 grid place-items-center">${icon('rows-2','w-5 text-slate-600')}</button>
   </div></div></div></div>`;
 const box=fmEl('fmQList');fmBindDnD(box);fmRefreshList();
}
function fmRefreshList(){
 const f=fmCur(),box=fmEl('fmQList');if(!f||!box)return;
 const sec=f.items.filter(x=>x.kind==='section').length+1;let n=1,h='';
 const hAct=fm.active==='__h';
 h+=`<div class="gf-card ${hAct?'gf-active':''}" style="border-top:10px solid var(--fc)" onclick="fmAct('__h')"><div class="p-5 sm:p-6">
   <input id="fmHT" class="gf-h1" maxlength="120" value="${esc(f.title)}" placeholder="Judul formulir" oninput="fmSetTitle(this.value,'fmHT')">
   <textarea id="fmHD" rows="1" class="gf-hov mt-2 resize-none" placeholder="Deskripsi formulir" oninput="fmDesc(this.value);fmGrow(this)">${esc(f.desc)}</textarea></div></div>`;
 f.items.forEach((it,i)=>{if(it.kind==='section')n++;h+=fmItemHtml(f,it,i,n,sec);});
 box.innerHTML=h;lucide.createIcons();
 box.querySelectorAll('textarea').forEach(fmGrow);
}
function fmGrow(t){t.style.height='auto';t.style.height=(t.scrollHeight+2)+'px';}
function fmDesc(v){const f=fmCur();if(!f)return;f.desc=v;fmTouch(f);}
function fmAct(id){
 if(fm.active===id)return;
 fm.active=id;fmRefreshList();
 const el=fmEl(id==='__h'?'fmHT':'qt_'+id);if(el){el.focus();}
}
function fmGrip(el,on){const c=el.closest('[data-item]');if(c)c.draggable=on;}
function fmGripHtml(){return `<div class="flex justify-center -mt-2 mb-1 text-slate-300 hover:text-slate-500 cursor-grab select-none" title="Seret untuk memindahkan" onmousedown="fmGrip(this,true)" onmouseup="fmGrip(this,false)" onmouseleave="fmGrip(this,false)">${icon('grip-horizontal','w-5')}</div>`;}
function fmItemHtml(f,it,i,secN,secTotal){
 const act=fm.active===it.id, on=act?'gf-active':'';
 if(it.kind==='section'){
  return `<div data-item="${it.id}" class="rounded-lg" onclick="fmAct('${it.id}')">
   <div class="inline-block px-3 py-1 text-xs font-semibold text-white rounded-t-lg" style="background:var(--fc)">Bagian ${secN} dari ${secTotal}</div>
   <div class="gf-card ${on}" style="border-top-left-radius:0;border-top:1px solid var(--fc)"><div class="p-5 sm:p-6">${fmGripHtml()}
    ${act?`<input id="qt_${it.id}" class="gf-h1" style="font-size:22px" maxlength="120" value="${esc(it.title)}" placeholder="Judul bagian (opsional)" oninput="fmField('${it.id}','title',this.value)">
     <textarea rows="1" class="gf-hov mt-1 resize-none" placeholder="Deskripsi (opsional)" oninput="fmField('${it.id}','desc',this.value);fmGrow(this)">${esc(it.desc)}</textarea>
     <div class="flex justify-end gap-1 mt-3 pt-3 border-t border-[#dadce0]">${fmMoveBtns(it.id)}<button title="Hapus bagian" onclick="event.stopPropagation();fmDelItem('${it.id}')" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('trash-2','w-[18px] text-slate-600')}</button></div>`
     :`<div class="text-[22px] text-[#202124]">${esc(it.title)||'<span class="text-slate-400">Bagian tanpa judul</span>'}</div>${it.desc?`<div class="text-sm text-slate-500 mt-1 whitespace-pre-line">${esc(it.desc)}</div>`:''}`}
   </div></div></div>`;
 }
 if(it.kind==='image'||it.kind==='video')return fmMediaItemHtml(it,act);
 if(it.kind==='title'){
  return `<div data-item="${it.id}" class="gf-card ${on}" onclick="fmAct('${it.id}')"><div class="p-5 sm:p-6">${fmGripHtml()}
   ${act?`<input id="qt_${it.id}" class="gf-h1" style="font-size:22px" maxlength="200" value="${esc(it.title)}" placeholder="Judul tanpa nama" oninput="fmField('${it.id}','title',this.value)">
    <textarea rows="1" class="gf-hov mt-1 resize-none" placeholder="Deskripsi" oninput="fmField('${it.id}','desc',this.value);fmGrow(this)">${esc(it.desc)}</textarea>
    <div class="flex justify-end gap-1 mt-3 pt-3 border-t border-[#dadce0]">${fmMoveBtns(it.id)}<button title="Hapus" onclick="event.stopPropagation();fmDelItem('${it.id}')" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('trash-2','w-[18px] text-slate-600')}</button></div>`
    :`<div class="text-[22px] text-[#202124]">${esc(it.title)||'<span class="text-slate-400">Judul tanpa nama</span>'}</div>${it.desc?`<div class="text-sm text-slate-500 mt-1 whitespace-pre-line">${esc(it.desc)}</div>`:''}`}
  </div></div>`;
 }
 /* pertanyaan */
 if(!act){
  return `<div data-item="${it.id}" class="gf-card cursor-pointer" onclick="fmAct('${it.id}')"><div class="p-5 sm:p-6">${fmGripHtml()}
   <div class="text-[15px] text-[#202124]">${esc(it.title)||'<span class="text-slate-400">Pertanyaan</span>'}${it.required?' <span class="text-red-600">*</span>':''}</div>
   ${it.showDesc&&it.desc?`<div class="text-xs text-slate-500 mt-1 whitespace-pre-line">${esc(it.desc)}</div>`:''}${fmQImgHtml(it,false)}${fmQPrev(it)}</div></div>`;
 }
 return `<div data-item="${it.id}" class="gf-card gf-active" onclick="fmAct('${it.id}')"><div class="p-5 sm:p-6">${fmGripHtml()}
  <div class="flex flex-col sm:flex-row gap-3">
   <input id="qt_${it.id}" class="gf-qt flex-1 min-w-0" maxlength="300" value="${esc(it.title)}" placeholder="Pertanyaan" oninput="fmField('${it.id}','title',this.value)">
   <button title="Tambahkan gambar" onclick="event.stopPropagation();fmImgPick('${it.id}','img')" class="w-10 h-10 self-center rounded-full hover:bg-slate-100 grid place-items-center shrink-0">${icon('image','w-5 text-slate-600')}</button>
   ${fmTypeMenu(it)}
  </div>
  ${fmQImgHtml(it,true)}
  ${it.showDesc?`<input class="gf-hov mt-2 text-sm" maxlength="300" value="${esc(it.desc)}" placeholder="Deskripsi" oninput="fmField('${it.id}','desc',this.value)">`:''}
  <div class="mt-4">${fmQEdit(it)}</div>
  <div class="flex flex-wrap items-center justify-end gap-1 mt-5 pt-3 border-t border-[#dadce0]">
   ${fmMoveBtns(it.id)}
   <button title="Duplikat" onclick="event.stopPropagation();fmDupItem('${it.id}')" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('copy','w-[18px] text-slate-600')}</button>
   <button title="Hapus" onclick="event.stopPropagation();fmDelItem('${it.id}')" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('trash-2','w-[18px] text-slate-600')}</button>
   <span class="w-px h-7 bg-[#dadce0] mx-2"></span>
   <span class="text-sm text-slate-700">Wajib diisi</span>
   <button role="switch" aria-checked="${it.required}" onclick="event.stopPropagation();fmReq('${it.id}')" class="gf-sw ml-1"><span></span></button>
   <details class="fm-menu relative ml-1" onclick="event.stopPropagation()"><summary class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('ellipsis-vertical','w-[18px] text-slate-600')}</summary>
    <div class="absolute right-0 bottom-full mb-1 w-64 bg-white border border-[#dadce0] rounded-lg shadow-lg py-1 z-20 text-sm">
     <button onclick="fmToggleDesc('${it.id}')" class="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between">Deskripsi ${it.showDesc?icon('check','w-4'):''}</button>
     ${['radio','check','select'].includes(it.type)?`<button onclick="fmToggleOpt('${it.id}','shuffle')" class="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between">Acak urutan opsi ${it.shuffle?icon('check','w-4'):''}</button>`:''}
     ${['radio','select'].includes(it.type)?`<button onclick="fmToggleOpt('${it.id}','branch')" class="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between">Lompat bagian sesuai jawaban ${it.branch?icon('check','w-4'):''}</button>`:''}
     <button onclick="fmMove('${it.id}',-1)" class="w-full text-left px-4 py-2 hover:bg-slate-50">Pindah ke atas</button>
     <button onclick="fmMove('${it.id}',1)" class="w-full text-left px-4 py-2 hover:bg-slate-50">Pindah ke bawah</button>
    </div></details>
  </div></div></div>`;
}
function fmMoveBtns(id){return `<button title="Naik" aria-label="Pindah ke atas" onclick="event.stopPropagation();fmMove('${id}',-1)" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('arrow-up','w-[18px] text-slate-600')}</button><button title="Turun" aria-label="Pindah ke bawah" onclick="event.stopPropagation();fmMove('${id}',1)" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center">${icon('arrow-down','w-[18px] text-slate-600')}</button>`;}
function fmMarker(t,i){
 if(t==='radio')return '<span class="w-[18px] h-[18px] rounded-full border-2 border-slate-400 shrink-0"></span>';
 if(t==='check')return '<span class="w-[18px] h-[18px] rounded-[3px] border-2 border-slate-400 shrink-0"></span>';
 return `<span class="w-[18px] text-sm text-slate-500 shrink-0 text-center">${i+1}.</span>`;
}
function fmQPrev(it){
 const t=it.type,o=it.options||[];
 const line=(w,txt)=>`<div class="mt-4 ${w} border-b border-dotted border-slate-400 pb-1 text-sm text-slate-400">${txt}</div>`;
 if(t==='short')return line('w-1/2','Teks jawaban singkat');
 if(t==='long')return line('w-full','Teks jawaban panjang');
 if(t==='email')return line('w-1/2','Email');
 if(t==='number')return line('w-1/3','Angka');
 if(t==='rating')return `<div class="mt-4 flex gap-1">${[1,2,3,4,5].map(()=>fmStar(false,28)).join('')}</div>`;
 if(t==='file')return `<div class="mt-4 inline-flex items-center gap-2 border border-[#dadce0] rounded px-4 py-2 text-sm text-slate-600">${icon('upload','w-4 h-4')} Tambahkan file</div>`;
 if(t==='date')return line('w-44','Bulan, hari, tahun');
 if(t==='time')return line('w-28','Jam : menit');
 if(t==='scale'){const r=[];for(let n=it.sMin;n<=it.sMax;n++)r.push(n);
  return `<div class="mt-4 flex items-end gap-3 sm:gap-5 text-xs text-slate-500 overflow-x-auto"><span class="pb-0.5">${esc(it.sMinL)}</span>${r.map(n=>`<span class="flex flex-col items-center gap-1.5">${n}<span class="w-[18px] h-[18px] rounded-full border-2 border-slate-400"></span></span>`).join('')}<span class="pb-0.5">${esc(it.sMaxL)}</span></div>`;}
 return `<div class="mt-3 space-y-2">${o.map((x,i)=>`<div class="flex items-center gap-3 text-sm text-slate-700">${fmMarker(t,i)}<span class="truncate">${esc(x)||'<span class="text-slate-400">Opsi</span>'}</span></div>`).join('')}${it.other&&t!=='select'?`<div class="flex items-center gap-3 text-sm text-slate-500">${fmMarker(t,0)}Lainnya…</div>`:''}</div>`;
}
function fmQEdit(it){
 const t=it.type;
 if(['short','long','date','time','email','number','rating'].includes(t))return fmQPrev(it).replace('mt-4','mt-1')+(['short','long','number'].includes(t)?fmValHtml(it):'');
 if(t==='file'){const du=fmDriveUrl(),sel=(k,arr)=>arr.map(a=>`<option value="${a[0]}" ${String(it[k])===String(a[0])?'selected':''}>${a[1]}</option>`).join('');
  return `<div class="space-y-3 text-sm">${fmQPrev(it)}
   <div class="flex flex-wrap gap-3 pt-1"><label class="block"><span class="text-[11px] text-slate-500">Jenis file</span><select onchange="fmFileSet('${it.id}','fType',this.value)" class="mt-1 block border border-[#dadce0] rounded-md px-3 py-2 bg-white">${sel('fType',[['any','Semua jenis'],['image','Gambar'],['pdf','PDF'],['doc','Dokumen (PDF/Office/TXT)']])}</select></label>
   <label class="block"><span class="text-[11px] text-slate-500">Ukuran maksimum</span><select onchange="fmFileSet('${it.id}','fMax',this.value)" class="mt-1 block border border-[#dadce0] rounded-md px-3 py-2 bg-white">${sel('fMax',[[1,'1 MB'],[5,'5 MB'],[10,'10 MB'],[25,'25 MB']])}</select></label></div>
   ${du?`<p class="text-xs text-emerald-700 flex items-center gap-1.5">${icon('circle-check','w-4 h-4')} File akan tersimpan otomatis di Google Drive (folder “SIMDEKA”).</p>`:`<p class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">Google Drive belum terhubung. Buka <button onclick="event.stopPropagation();navigate('pengaturan')" class="font-bold underline">Pengaturan</button> lalu tempel kode Drive agar unggahan file berfungsi.</p>`}</div>`;}
 if(t==='scale'){
  const mx=[];for(let n=2;n<=10;n++)mx.push(n);
  return `<div class="space-y-3 text-sm">
   <div class="flex items-center gap-3"><select onchange="fmScale('${it.id}','sMin',this.value)" class="border border-[#dadce0] rounded-md px-3 py-2 bg-white"><option value="0" ${it.sMin===0?'selected':''}>0</option><option value="1" ${it.sMin===1?'selected':''}>1</option></select><span>sampai</span>
    <select onchange="fmScale('${it.id}','sMax',this.value)" class="border border-[#dadce0] rounded-md px-3 py-2 bg-white">${mx.map(n=>`<option value="${n}" ${it.sMax===n?'selected':''}>${n}</option>`).join('')}</select></div>
   <div class="flex items-center gap-3"><span class="w-4 text-slate-500 text-center">${it.sMin}</span><input class="gf-hov" maxlength="60" placeholder="Label (opsional)" value="${esc(it.sMinL)}" oninput="fmField('${it.id}','sMinL',this.value)"></div>
   <div class="flex items-center gap-3"><span class="w-4 text-slate-500 text-center">${it.sMax}</span><input class="gf-hov" maxlength="60" placeholder="Label (opsional)" value="${esc(it.sMaxL)}" oninput="fmField('${it.id}','sMaxL',this.value)"></div></div>`;
 }
 const rows=it.options.map((o,i)=>`<div class="flex items-center gap-3" data-oi="${i}">${fmMarker(t,i)}
   <input class="gf-hov flex-1" maxlength="200" value="${esc(o)}" placeholder="Opsi ${i+1}" oninput="fmOpt('${it.id}',${i},this.value)" onkeydown="fmOptKey(event,'${it.id}',${i})">${it.branch&&(t==='radio'||t==='select')?fmGoSel(it,i):''}
   ${it.options.length>1||it.other?`<button title="Hapus opsi" onclick="fmOptDel('${it.id}',${i})" class="w-8 h-8 rounded-full hover:bg-slate-100 grid place-items-center shrink-0">${icon('x','w-4 text-slate-500')}</button>`:''}</div>`).join('');
 const other=it.other&&t!=='select'?`<div class="flex items-center gap-3">${fmMarker(t,0)}<span class="flex-1 text-sm text-slate-500 border-b border-dotted border-slate-300 py-1.5">Lainnya…</span><button title="Hapus" onclick="fmOtherOff('${it.id}')" class="w-8 h-8 rounded-full hover:bg-slate-100 grid place-items-center shrink-0">${icon('x','w-4 text-slate-500')}</button></div>`:'';
 const add=`<div class="flex items-center gap-3">${fmMarker(t,it.options.length)}<div class="text-sm text-slate-500"><button onclick="fmOptAdd('${it.id}')" class="py-1.5 hover:text-slate-800">Tambahkan opsi</button>${(!it.other&&t!=='select')?` <span>atau</span> <button onclick="fmOtherOn('${it.id}')" class="py-1.5 font-semibold text-blue-600 hover:bg-blue-50 rounded px-1">tambahkan "Lainnya"</button>`:''}</div></div>`;
 return `<div class="space-y-1">${rows}${other}${add}</div>`;
}

/* ---------- validasi, acak, lompat bagian (editor) ---------- */
function fmValHtml(it){
 const t=it.type,vts=[['','Tanpa validasi'],['hp','Nomor HP'],['url','Tautan (URL)'],['angka','Hanya angka']];
 const inp=(k,ph)=>`<input type="number" inputmode="decimal" value="${it[k]===''?'':esc(String(it[k]))}" placeholder="${ph}" aria-label="${ph}" oninput="fmVal('${it.id}','${k}',this.value)" class="w-20 border border-[#dadce0] rounded-md px-2 py-1.5 bg-white text-xs">`;
 return `<div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600" onclick="event.stopPropagation()">${icon('shield-check','w-4 h-4 text-slate-400')}
  ${t==='short'?`<select aria-label="Jenis validasi" onchange="fmVal('${it.id}','vt',this.value)" class="border border-[#dadce0] rounded-md px-2 py-1.5 bg-white text-xs">${vts.map(a=>`<option value="${a[0]}" ${it.vt===a[0]?'selected':''}>${a[1]}</option>`).join('')}</select>`:''}
  <span>${t==='number'?'Nilai':'Panjang (karakter)'}</span>${inp('vmin','min')}<span>–</span>${inp('vmax','maks')}</div>`;
}
function fmVal(id,k,v){const it=fmItem(id);if(!it)return;it[k]=(k==='vt')?v:fmNumOrEmpty(v);fmTouch(fmCur());}
function fmToggleOpt(id,k){const it=fmItem(id);if(!it)return;it[k]=!it[k];if(k==='branch'&&it.branch&&!Array.isArray(it.go))it.go=[];fmTouch(fmCur());fmRefreshList();}
function fmGoSel(it,i){
 const f=fmCur(),idx=f.items.findIndex(x=>x.id===it.id);let n=1;const opts=[];
 f.items.forEach((x,j)=>{if(x.kind==='section'){n++;if(j>idx)opts.push([x.id,'Bagian '+n+(x.title?' — '+x.title.slice(0,28):'')]);}});
 const cur=(it.go||[])[i]||'',all=[['','Lanjut ke bagian berikutnya']].concat(opts).concat([['end','Kirim formulir']]);
 return `<select title="Setelah memilih opsi ini" aria-label="Tindakan setelah memilih opsi ${i+1}" onchange="fmGo('${it.id}',${i},this.value)" class="border border-[#dadce0] rounded-md px-2 py-1.5 bg-white text-xs max-w-[130px] sm:max-w-[200px]">${all.map(a=>`<option value="${esc(a[0])}" ${cur===a[0]?'selected':''}>${esc(a[1])}</option>`).join('')}</select>`;
}
function fmGo(id,i,v){const it=fmItem(id);if(!it)return;if(!Array.isArray(it.go))it.go=[];while(it.go.length<it.options.length)it.go.push('');it.go[i]=v;fmTouch(fmCur());}

/* ---------- aksi pertanyaan ---------- */
function fmField(id,k,v){const it=fmItem(id),f=fmCur();if(!it)return;it[k]=v;fmTouch(f);}
function fmReq(id){const it=fmItem(id);if(!it)return;it.required=!it.required;fmTouch(fmCur());fmRefreshList();}
function fmToggleDesc(id){const it=fmItem(id);if(!it)return;it.showDesc=!it.showDesc;fmTouch(fmCur());fmRefreshList();}
function fmType(id,t){
 const it=fmItem(id);if(!it)return;it.type=t;
 if(['radio','check','select'].includes(t)){if(!it.options.length)it.options=['Opsi 1'];if(t==='select')it.other=false;}
 fmTouch(fmCur());fmRefreshList();
}
function fmScale(id,k,v){const it=fmItem(id);if(!it)return;it[k]=parseInt(v,10);if(it.sMax<=it.sMin)it.sMax=it.sMin+1;fmTouch(fmCur());fmRefreshList();}
function fmOpt(id,i,v){const it=fmItem(id);if(!it)return;it.options[i]=v;fmTouch(fmCur());}
function fmFocusOpt(id,i){const e=document.querySelector('#fmQList [data-item="'+id+'"] [data-oi="'+i+'"] input');if(e)e.focus();}
function fmOptAdd(id,at){
 const it=fmItem(id);if(!it)return;const i=at==null?it.options.length:at;
 it.options.splice(i,0,'Opsi '+(it.options.length+1));if(Array.isArray(it.go)&&it.go.length)it.go.splice(i,0,'');fmTouch(fmCur());fmRefreshList();fmFocusOpt(id,i);
 const e=document.querySelector('#fmQList [data-item="'+id+'"] [data-oi="'+i+'"] input');if(e)e.select();
}
function fmOptKey(e,id,i){if(e.key==='Enter'){e.preventDefault();fmOptAdd(id,i+1);}}
function fmOptDel(id,i){const it=fmItem(id);if(!it)return;if(it.options.length>1||it.other){it.options.splice(i,1);if(Array.isArray(it.go)&&it.go.length)it.go.splice(i,1);if(!it.options.length&&!it.other)it.options=['Opsi 1'];}fmTouch(fmCur());fmRefreshList();}
function fmOtherOn(id){const it=fmItem(id);if(!it)return;it.other=true;fmTouch(fmCur());fmRefreshList();}
function fmOtherOff(id){const it=fmItem(id);if(!it)return;it.other=false;fmTouch(fmCur());fmRefreshList();}
function fmAddItem(kind){
 const f=fmCur();if(!f)return;
 const it=fmBlank(kind,kind==='q'?'radio':'short');
 let idx=f.items.length;
 if(fm.active&&fm.active!=='__h'){const i=f.items.findIndex(x=>x.id===fm.active);if(i>=0)idx=i+1;}
 else if(fm.active==='__h')idx=0;
 f.items.splice(idx,0,it);fm.active=it.id;fmTouch(f);fmRefreshList();if(kind==='image')setTimeout(()=>fmImgPick(it.id,'src'),50);
 const el=fmEl('qt_'+it.id);if(el){el.focus({preventScroll:true});el.scrollIntoView({block:'center',behavior:'smooth'});}
}
function fmDupItem(id){
 const f=fmCur(),i=f.items.findIndex(x=>x.id===id);if(i<0)return;
 const c=JSON.parse(JSON.stringify(f.items[i]));c.id=(c.kind==='q'?'q':c.kind==='title'?'t':'s')+fmRid(6);
 f.items.splice(i+1,0,c);fm.active=c.id;fmTouch(f);fmRefreshList();
}
function fmDelItem(id){
 const f=fmCur(),i=f.items.findIndex(x=>x.id===id);if(i<0)return;
 const it=f.items.splice(i,1)[0];
 const nx=f.items[Math.min(i,f.items.length-1)];fm.active=nx?nx.id:null;fmTouch(f);fmRefreshList();
 fmUndo(it.kind==='q'?'Pertanyaan dihapus':'Elemen dihapus',()=>{const g=fmCur();if(!g||g.id!==f.id)return;g.items.splice(Math.min(i,g.items.length),0,it);fm.active=it.id;fmTouch(g);if(fmEl('fmQList'))fmRefreshList();});
}
function fmMove(id,d){
 const f=fmCur(),i=f.items.findIndex(x=>x.id===id),j=i+d;if(i<0||j<0||j>=f.items.length)return;
 const t=f.items[i];f.items[i]=f.items[j];f.items[j]=t;fmTouch(f);fmRefreshList();
}
function fmMoveTo(from,to){
 const f=fmCur(),i=f.items.findIndex(x=>x.id===from),j=f.items.findIndex(x=>x.id===to);if(i<0||j<0||i===j)return;
 const it=f.items.splice(i,1)[0];f.items.splice(j,0,it);fmTouch(f);fmRefreshList();
}
function fmBindDnD(box){
 let drag=null;
 box.addEventListener('dragstart',e=>{const el=e.target.closest&&e.target.closest('[data-item]');if(!el||!el.draggable){e.preventDefault();return;}drag=el.dataset.item;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',drag);}catch(x){}el.style.opacity='.5';});
 box.addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();const el=e.target.closest('[data-item]');box.querySelectorAll('.fm-over').forEach(x=>x.classList.remove('fm-over'));if(el&&el.dataset.item!==drag)el.classList.add('fm-over');});
 box.addEventListener('drop',e=>{if(!drag)return;e.preventDefault();const el=e.target.closest('[data-item]'),d=drag;drag=null;if(el&&el.dataset.item!==d)fmMoveTo(d,el.dataset.item);});
 box.addEventListener('dragend',()=>{drag=null;box.querySelectorAll('[data-item]').forEach(x=>{x.draggable=false;x.style.opacity='';x.classList.remove('fm-over');});});
}

/* ---------- Form Absensi: pengaturan ---------- */
function fmRenderAbsenForm(f){
 const a=f.absen;a.peserta=fmBuildPeserta(a);fmSave();
 const kels=kelompokList.map(k=>k.nama);
 const kelPick=a.kelompok||[];
 const kelCount=[...new Set(a.peserta.map(p=>p.k))].length;
 const md=a.mode==='peserta'?'peserta':a.mode==='both'?'both':'petugas';
 const mdCard=(k,ic,t,d)=>`<button onclick="fmSetMode('${k}')" class="text-left flex items-start gap-3 rounded-2xl border p-4 transition ${md===k?'border-navy bg-navy/5':'border-line hover:bg-slate-50'}">
   <span class="mt-0.5 w-[18px] h-[18px] rounded-full border-2 grid place-items-center shrink-0 ${md===k?'border-navy':'border-slate-300'}">${md===k?'<span class="w-2 h-2 rounded-full bg-navy"></span>':''}</span>
   <span class="w-9 h-9 rounded-xl bg-white border border-line grid place-items-center text-navy shrink-0">${icon(ic,'w-4')}</span>
   <span class="min-w-0"><span class="block text-sm font-bold">${t}</span><span class="block text-[11px] text-slate-500 leading-relaxed mt-0.5">${d}</span></span></button>`;
 fmEl('fmBody').innerHTML=`<div class="mt-4 max-w-[920px] mx-auto space-y-4">
  <section class="bg-white rounded-2xl border border-line shadow-card p-5 sm:p-6">
   <div class="flex items-center gap-2"><div class="w-8 h-8 rounded-lg bg-navy/5 text-navy grid place-items-center">${icon('user-check','w-4')}</div><div><h3 class="font-extrabold">Siapa yang mengisi absensi?</h3><p class="text-[11px] text-slate-400">Menentukan tampilan yang dilihat pengisi saat membuka tautan.</p></div></div>
   <div class="grid sm:grid-cols-3 gap-3 mt-4">${mdCard('petugas','users','Diisi petugas absensi','Pilih kelompok, lalu tandai Hadir / Izin / Alpa untuk semua nama sekaligus.')}${mdCard('peserta','user-check','Diisi langsung peserta','Peserta pilih kelompok dan namanya, lalu ketuk Hadir atau Izin. Yang belum mengisi tampil sebagai "Belum diisi".')}${mdCard('both','layers','Dua-duanya','Pengisi memilih sendiri di halaman: sebagai peserta (diri sendiri) atau sebagai petugas (satu kelompok).')}</div></section>
  <section class="bg-white rounded-2xl border border-line shadow-card overflow-hidden"><div class="h-2" style="background:var(--fc)"></div><div class="p-5 sm:p-6">
   <div class="flex items-center gap-2"><div class="w-8 h-8 rounded-lg bg-navy/5 text-navy grid place-items-center">${icon('clipboard-pen','w-4')}</div><h3 class="font-extrabold">Informasi Kegiatan</h3></div>
   <div class="grid sm:grid-cols-2 gap-4 mt-4">
    <label class="block"><span class="text-xs font-bold text-slate-600">Jenis Kegiatan <span class="text-red-500">*</span></span>
     <input id="abJenis" list="abJenisList" maxlength="120" value="${esc(a.jenis)}" oninput="fmAbField('jenis',this.value)" placeholder="Contoh: Pengajian Muda Mudi Kelompok" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white">
     <datalist id="abJenisList">${FM_JENIS.map(j=>`<option value="${esc(j)}">`).join('')}</datalist></label>
    <label class="block ${a.rutin?'hidden':''}"><span class="text-xs font-bold text-slate-600">Tanggal Kegiatan <span class="text-red-500">*</span></span>
     <input id="abTgl" type="date" value="${esc(a.tanggal)}" oninput="fmAbField('tanggal',this.value)" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white"></label>
   </div></div></section>

  ${fmJadwalHtml(a)}
  <section class="bg-white rounded-2xl border border-line shadow-card p-5 sm:p-6">
   <div class="flex items-center gap-2"><div class="w-8 h-8 rounded-lg bg-navy/5 text-navy grid place-items-center">${icon('users','w-4')}</div><div><h3 class="font-extrabold">Peserta Kegiatan</h3><p class="text-[11px] text-slate-400">Jenis peserta boleh dipilih lebih dari satu. Daftar diambil otomatis dari database.</p></div></div>
   <div class="grid sm:grid-cols-2 gap-3 mt-4">${FM_SRC.map(s=>{const on=a.sumber.includes(s.k),n=fmSourceList(s.k).length;
    return `<button onclick="fmToggleSumber('${s.k}')" class="text-left flex items-center gap-3 rounded-2xl border p-3.5 transition ${on?'border-navy bg-navy/5':'border-line hover:bg-slate-50'}">
     <span class="w-[18px] h-[18px] rounded-[4px] border-2 grid place-items-center shrink-0 ${on?'bg-navy border-navy text-white':'border-slate-300'}">${on?icon('check','w-3 h-3'):''}</span>
     <span class="w-9 h-9 rounded-xl bg-white border border-line grid place-items-center text-navy shrink-0">${icon(s.icon,'w-4')}</span>
     <span class="min-w-0 flex-1"><span class="block text-sm font-bold truncate">${s.label}</span><span class="block text-[11px] text-slate-400 truncate">${s.sub}</span></span>
     <span class="px-2 py-1 rounded-lg text-[10px] font-bold ${n?'bg-slate-100 text-slate-600':'bg-amber-50 text-amber-700'}">${n} nama</span></button>`;}).join('')}</div>
   ${FM_SRC.some(s=>a.sumber.includes(s.k)&&!fmSourceList(s.k).length)?`<div class="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">Sebagian jenis peserta yang dipilih belum memiliki data di database, sehingga belum menambah nama ke daftar.</div>`:''}
   <div class="mt-5"><div class="text-xs font-bold text-slate-600 mb-2">Batasi kelompok <span class="font-normal text-slate-400">(opsional)</span></div>
    <div class="flex flex-wrap gap-2"><button onclick="fmToggleKel(-1)" class="px-3 py-1.5 rounded-full text-xs font-bold border ${!kelPick.length?'bg-navy text-white border-navy':'border-line text-slate-600 hover:bg-slate-50'}">Semua kelompok</button>
    ${kels.map((k,i)=>`<button onclick="fmToggleKel(${i})" class="px-3 py-1.5 rounded-full text-xs font-bold border ${kelPick.includes(k)?'bg-navy text-white border-navy':'border-line text-slate-600 hover:bg-slate-50'}">${esc(k)}</button>`).join('')}</div></div>
  </section>

  <section class="bg-white rounded-2xl border border-line shadow-card p-5 sm:p-6">
   <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div><h3 class="font-extrabold">Daftar Peserta</h3><p id="abCount" class="text-[11px] text-slate-400 mt-0.5">${a.peserta.length} peserta dari ${kelCount} kelompok • tampilan yang akan dilihat penanggung jawab</p></div>
    <div class="flex gap-2"><div class="u-search" style="margin-bottom:16px">${icon('search','w-4 text-slate-400')}<input value="${esc(fm.pq)}" oninput="fm.pq=this.value;fmRenderPT()" class="w-full text-sm bg-transparent" placeholder="Cari nama..."></div>
    <select onchange="fm.pk=this.value;fmRenderPT()" class="u-sel"><option value="">Semua Kelompok</option>${[...new Set(a.peserta.map(p=>p.k))].map(k=>`<option value="${esc(k)}" ${fm.pk===k?'selected':''}>${esc(k)}</option>`).join('')}</select></div></div>
   <div class="overflow-auto scrollbar mt-4 max-h-[440px] border border-line rounded-xl"><table class="w-full min-w-[640px] text-left">
    <thead class="sticky top-0 bg-slate-50"><tr class="text-[11px] uppercase tracking-wide text-slate-400"><th class="py-3 px-3 w-12">No</th><th class="py-3 px-3">Nama Lengkap</th><th class="py-3 px-3">Kelompok</th><th class="py-3 px-3">Dapukan</th><th class="py-3 px-3 text-center">Kehadiran</th></tr></thead>
    <tbody id="fmPT"></tbody></table></div>
  </section></div>`;
 fmRenderPT();
}
function fmAbField(k,v){const f=fmCur();if(!f)return;f.absen[k]=v;fmTouch(f);
 if(k==='jenis'&&/^pengajian (muda mudi )?kelompok$/i.test(String(v).trim())&&!f.absen.rutin){f.absen.rutin=true;if(!f.absen.sesi)f.absen.sesi=[];fmTouch(f);fmRenderAbsenForm(f);lucide.createIcons();}}
function fmToggleSumber(k){
 const f=fmCur(),a=f.absen,i=a.sumber.indexOf(k);
 if(i>=0){if(a.sumber.length===1){showToast('Pilih minimal satu jenis peserta');return;}a.sumber.splice(i,1);}else a.sumber.push(k);
 fmTouch(f);fmRenderAbsenForm(f);lucide.createIcons();
}
function fmToggleKel(i){
 const f=fmCur(),a=f.absen,names=kelompokList.map(k=>k.nama);
 if(i<0)a.kelompok=[];else{const n=names[i],j=a.kelompok.indexOf(n);if(j>=0)a.kelompok.splice(j,1);else a.kelompok.push(n);}
 fmTouch(f);fmRenderAbsenForm(f);lucide.createIcons();
}
function fmPill(cls,label,on){return `<label class="pf-pill dis"><input type="radio" disabled ${on?'checked':''}><span class="${cls}">${label}</span></label>`;}
function fmRenderPT(){
 const f=fmCur(),tb=fmEl('fmPT');if(!f||!tb)return;
 const q=fm.pq.trim().toLowerCase(),rows=f.absen.peserta.filter(p=>(!fm.pk||p.k===fm.pk)&&(!q||p.n.toLowerCase().includes(q)));
 tb.innerHTML=rows.length?rows.map((p,i)=>`<tr class="border-t border-line text-sm"><td class="py-2.5 px-3 text-slate-400">${i+1}</td><td class="py-2.5 px-3 font-bold">${esc(p.n)}</td><td class="py-2.5 px-3 text-slate-600">${esc(p.k)}</td><td class="py-2.5 px-3 text-slate-600">${esc(p.d)}</td>
  <td class="py-2 px-3"><div class="flex justify-center gap-1.5">${fmPill('h','Hadir')}${fmPill('i','Izin')}${fmPill('a','Alpa')}</div></td></tr>`).join('')
  :`<tr><td colspan="5" class="py-10 text-center text-sm text-slate-400">${f.absen.peserta.length?'Tidak ada nama yang cocok.':'Belum ada peserta. Pilih jenis peserta yang sudah memiliki data.'}</td></tr>`;
}

/* ---------- Laporan periodik ---------- */
function fmPer(f){
 const y=+fm.ly||new Date().getFullYear(),Y=String(y),p=fm.lp||'th',nl=d=>fmDateLong(d).replace(/^[^,]+, /,'');
 if(p==='s1')return{from:Y+'-01-01',to:Y+'-06-30',label:'Semester I (Januari–Juni) '+Y};
 if(p==='s2')return{from:Y+'-07-01',to:Y+'-12-31',label:'Semester II (Juli–Desember) '+Y};
 if(p==='kus'){const a=fm.lf||Y+'-01-01',b=fm.lt||fmToday();return{from:a,to:b,label:nl(a)+' s.d. '+nl(b)};}
 return{from:Y+'-01-01',to:Y+'-12-31',label:'Tahun '+Y};
}
function fmPredikat(pct){return pct>=85?['Sangat baik','text-emerald-700 bg-emerald-50']:pct>=70?['Baik','text-blue-700 bg-blue-50']:pct>=50?['Cukup','text-amber-700 bg-amber-50']:['Perlu pembinaan','text-red-700 bg-red-50'];}
function fmCalc(f,per){
 const a=f.absen;a.peserta=fmBuildPeserta(a);
 const t=fmToday(),ns=a.nofill||(a.mode!=='petugas'?'alpa':'skip'),PM={};
 const P=a.peserta.map(p=>{const x={p:p,H:0,I:0,A:0,run:0,maxA:0,seq:[]};PM[fmKey(p.n,p.k)]=x;return x;});
 const KL=[...new Set(a.peserta.map(p=>p.k))],K={};KL.forEach(k=>K[k]={H:0,I:0,A:0,n:P.filter(x=>x.p.k===k).length});
 const all=fmSesi(f).filter(x=>x.tgl>=per.from&&x.tgl<=per.to),rows=[];
 all.forEach(x=>{
  const r={s:x,H:0,I:0,A:0,N:0,state:x.st==='libur'?'libur':(x.tgl>t?'akan':'')};
  if(!r.state){
   const R=fmResp(f.id).filter(q=>q&&q.m&&fmRespTg(f,q)===x.tgl),st=fmStatusAt(f,x.tgl).st,rep=new Set(R.map(q=>q.kel));
   Object.keys(st).forEach(k=>{if(PM[k])rep.add(PM[k].p.k);});
   if(!Object.keys(st).length)r.state='kosong';
   else{r.state='ok';P.forEach(y=>{let v=st[fmKey(y.p.n,y.p.k)];if(!v&&ns==='alpa'&&rep.has(y.p.k))v='A';
     if(v){y[v]++;K[y.p.k][v]++;r[v]++;y.run=v==='A'?y.run+1:0;y.maxA=Math.max(y.maxA,y.run);}else{r.N++;y.run=0;}y.seq.push(v||'');});}
  }
  rows.push(r);
 });
 const T={H:0,I:0,A:0};P.forEach(x=>{T.H+=x.H;T.I+=x.I;T.A+=x.A;});
 const pc=o=>{const n=o.H+o.I+o.A;return n?Math.round(o.H/n*1000)/10:null;};
 let nOvr=0;all.forEach(x=>{nOvr+=Object.keys((f.ovr||{})[x.tgl]||{}).length;});
 const nResp=fmResp(f.id).filter(q=>{const d=fmRespTg(f,q);return d>=per.from&&d<=per.to;}).length;
 return{all:all,rows:rows,P:P,K:K,KL:KL,T:T,pc:pc,ns:ns,nOvr:nOvr,nResp:nResp,ok:rows.filter(r=>r.state==='ok'),libur:rows.filter(r=>r.state==='libur'),kosong:rows.filter(r=>r.state==='kosong'),akan:rows.filter(r=>r.state==='akan')};
}
function fmRekapBulan(c,hd,th,bar){
 const M={};
 c.rows.forEach(r=>{const k=r.s.tgl.slice(0,7),m=M[k]=M[k]||{k:k,n:0,ok:0,lb:0,H:0,I:0,A:0};
  if(r.state==='libur'){m.lb++;return;}m.n++;if(r.state==='ok'){m.ok++;m.H+=r.H;m.I+=r.I;m.A+=r.A;}});
 const L=Object.values(M).sort((x,y)=>x.k<y.k?-1:1);
 if(!L.length)return '';
 const rows=L.map(m=>{const v=c.pc(m),q=m.k.split('-');
  return `<tr class="border-t border-line text-sm"><td class="py-2.5 px-3 font-bold whitespace-nowrap">${PK_BULAN[Number(q[1])-1]} ${q[0]}</td><td class="py-2.5 px-3 text-center">${m.n}${m.n>=5?' <span class="text-[10px] font-bold text-blue-600">(5 pekan)</span>':''}</td><td class="py-2.5 px-3 text-center">${m.ok}</td><td class="py-2.5 px-3 text-center text-amber-600">${m.lb||'–'}</td><td class="py-2.5 px-3 text-center font-bold text-emerald-600">${m.ok?m.H:'–'}</td><td class="py-2.5 px-3 text-center font-bold text-amber-600">${m.ok?m.I:'–'}</td><td class="py-2.5 px-3 text-center font-bold text-red-600">${m.ok?m.A:'–'}</td><td class="py-2.5 px-3 w-40">${m.ok?`<div class="flex items-center gap-2"><div class="flex-1">${bar(v)}</div><span class="text-xs font-bold w-11 text-right">${v==null?'–':v+'%'}</span></div>`:'<span class="text-[11px] text-slate-400">Belum ada data</span>'}</td></tr>`;}).join('');
 return `<div class="bg-white rounded-2xl border border-line shadow-card p-5"><h3 class="font-extrabold text-sm">Rekap per Bulan</h3><div class="ov overflow-x-auto mt-3"><table class="w-full min-w-[640px] text-left"><thead><tr class="${hd}">${th('Bulan')}${th('Pertemuan','text-center')}${th('Terlaksana','text-center')}${th('Libur','text-center')}${th('Hadir','text-center')}${th('Izin','text-center')}${th('Alpa','text-center')}${th('% Hadir')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function fmLapSet(k,v){fm[k]=v;fmRenderLaporan(fmCur());lucide.createIcons();}
function fmRenderLaporan(f){
 const a=f.absen,per=fmPer(f),c=fmCalc(f,per),yrs=[...new Set([new Date().getFullYear(),...fmSesi(f).map(x=>+x.tgl.slice(0,4))])].sort(),y=+fm.ly||new Date().getFullYear(),p=fm.lp||'th';
 const tot=c.pc(c.T),bar=(v,col)=>`<div class="h-2 rounded bg-slate-100 min-w-[60px]"><div class="h-2 rounded" style="width:${v||0}%;background:${col||'#18A66A'}"></div></div>`;
 const pill=(id,l)=>`<button onclick="fmLapSet('lp','${id}')" class="px-3 py-1.5 rounded-full text-xs font-bold border ${p===id?'bg-navy text-white border-navy':'border-line text-slate-600 hover:bg-slate-50'}">${l}</button>`;
 const stl={ok:'',libur:'<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">Libur</span>',akan:'<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">Belum berlangsung</span>',kosong:'<span class="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">Belum ada data</span>'};
 const sRows=c.rows.map((r,i)=>{const v=c.pc(r);return `<tr class="border-t border-line text-sm"><td class="py-2.5 px-3 text-slate-400">${i+1}</td><td class="py-2.5 px-3 font-semibold whitespace-nowrap">${esc(fmDateLong(r.s.tgl))}${r.s.ket?`<div class="text-[11px] font-normal text-slate-400">${esc(r.s.ket)}</div>`:''}</td>
  <td class="py-2.5 px-3 text-center font-bold text-emerald-600">${r.state==='ok'?r.H:'–'}</td><td class="py-2.5 px-3 text-center font-bold text-amber-600">${r.state==='ok'?r.I:'–'}</td><td class="py-2.5 px-3 text-center font-bold text-red-600">${r.state==='ok'?r.A:'–'}</td>
  <td class="py-2.5 px-3 w-40">${r.state==='ok'?`<div class="flex items-center gap-2"><div class="flex-1">${bar(v)}</div><span class="text-xs font-bold w-11 text-right">${v==null?'–':v+'%'}</span></div>`:stl[r.state]}</td></tr>`;}).join('')||'<tr><td colspan="6" class="py-8 text-center text-sm text-slate-400">Belum ada sesi pada periode ini.</td></tr>';
 const kRows=c.KL.map((k,ix)=>{const o=c.K[k],v=c.pc(o);return `<tr class="border-t border-line text-sm"><td class="py-2.5 px-3 text-slate-400">${ix+1}</td><td class="py-2.5 px-3 font-bold">${esc(k)}</td><td class="py-2.5 px-3 text-center">${o.n}</td><td class="py-2.5 px-3 text-center text-emerald-600 font-bold">${o.H}</td><td class="py-2.5 px-3 text-center text-amber-600 font-bold">${o.I}</td><td class="py-2.5 px-3 text-center text-red-600 font-bold">${o.A}</td><td class="py-2.5 px-3 w-40"><div class="flex items-center gap-2"><div class="flex-1">${bar(v)}</div><span class="text-xs font-bold w-11 text-right">${v==null?'–':v+'%'}</span></div></td></tr>`;}).join('');
 const pRows=c.P.map(x=>({x:x,v:c.pc(x)})).sort((m,n)=>(n.v==null?-1:n.v)-(m.v==null?-1:m.v)||m.x.p.n.localeCompare(n.x.p.n,'id')).map((r,i)=>{const x=r.x,pr=r.v==null?null:fmPredikat(r.v);
  return `<tr class="border-t border-line text-sm"><td class="py-2 px-3 text-slate-400">${i+1}</td><td class="py-2 px-3 font-bold">${esc(x.p.n)}</td><td class="py-2 px-3 text-slate-600">${esc(x.p.k)}</td><td class="py-2 px-3 text-center text-emerald-600 font-bold">${x.H}</td><td class="py-2 px-3 text-center text-amber-600 font-bold">${x.I}</td><td class="py-2 px-3 text-center text-red-600 font-bold">${x.A}</td><td class="py-2 px-3 text-center font-bold">${r.v==null?'–':r.v+'%'}</td><td class="py-2 px-3">${pr?`<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${pr[1]}">${pr[0]}</span>`:'–'}</td><td class="py-2 px-3 text-[11px] ${x.maxA>=3?'text-red-600 font-bold':'text-slate-400'}">${x.maxA>=3?'Alpa '+x.maxA+'× berturut-turut':''}</td></tr>`;}).join('');
 const th=(l,c2)=>`<th class="py-2 px-3 ${c2||''}">${l}</th>`,hd='text-[11px] uppercase tracking-wide text-slate-400';
 const warn=[c.kosong.length?`${c.kosong.length} sesi sudah lewat tetapi belum ada data absensi (tidak dihitung).`:'',c.akan.length?`${c.akan.length} sesi belum berlangsung.`:''].filter(Boolean).join(' ');
 fmEl('fmBody').innerHTML=`<div class="mt-4 max-w-[1100px] mx-auto space-y-4">
  <div class="no-print bg-white rounded-2xl border border-line shadow-card p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
   <div class="flex flex-wrap items-center gap-2"><select onchange="fmLapSet('ly',this.value)" class="h-9 border border-line rounded-xl px-3 text-xs font-bold bg-white">${yrs.map(v=>`<option ${v===y?'selected':''}>${v}</option>`).join('')}</select>${pill('th','Setahun')}${pill('s1','Semester I')}${pill('s2','Semester II')}${pill('kus','Kustom')}
    ${p==='kus'?`<input type="date" value="${esc(fm.lf||y+'-01-01')}" onchange="fmLapSet('lf',this.value)" class="h-9 border border-line rounded-xl px-2 text-xs"> <span class="text-xs text-slate-400">s.d.</span> <input type="date" value="${esc(fm.lt||fmToday())}" onchange="fmLapSet('lt',this.value)" class="h-9 border border-line rounded-xl px-2 text-xs">`:''}</div>
   <div class="flex gap-2"><button onclick="fmExportLap()" class="h-9 px-3 rounded-xl border border-line bg-white text-xs font-bold flex items-center gap-2">${icon('download','w-4')} Ekspor Excel</button><button onclick="fmExportLap('csv')" class="h-9 px-3 rounded-xl border border-line bg-white text-xs font-bold flex items-center gap-2">CSV</button><button onclick="window.print()" class="h-9 px-3 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-2">${icon('printer','w-4')} Cetak / PDF</button></div></div>
  <div id="fmLap" class="space-y-4">
   <div class="bg-white rounded-2xl border border-line shadow-card p-5"><div class="text-[11px] uppercase tracking-wider font-bold text-slate-400">Laporan Kehadiran</div><h3 class="text-xl font-extrabold mt-1">${esc(a.jenis||f.title)}</h3><p class="text-sm text-slate-500">Periode: ${esc(per.label)}</p></div>
   <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">${statCard('Sesi Terjadwal',c.all.length,c.libur.length+' libur','calendar-check','blue')}${statCard('Terlaksana',c.ok.length,'Ada data absensi','check','green')}${statCard('Rata-rata Hadir',tot==null?'–':tot+'%',fmPredikat(tot||0)[0],'users','green')}${statCard('Izin / Alpa',c.T.I+' / '+c.T.A,'Total catatan','mail','orange')}${statCard('Peserta',c.P.length,c.KL.length+' kelompok','users','blue')}</div>
   ${warn?`<div class="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">${esc(warn)}</div>`:''}
   ${fmRekapBulan(c,hd,th,bar)}
   <div class="bg-white rounded-2xl border border-line shadow-card p-5"><h3 class="font-extrabold text-sm">Kehadiran per Sesi</h3><div class="ov overflow-x-auto mt-3"><table class="w-full min-w-[560px] text-left"><thead><tr class="${hd}">${th('No')}${th('Tanggal')}${th('Hadir','text-center')}${th('Izin','text-center')}${th('Alpa','text-center')}${th('Persentase')}</tr></thead><tbody>${sRows}</tbody></table></div></div>
   <div class="bg-white rounded-2xl border border-line shadow-card p-5"><h3 class="font-extrabold text-sm">Rekap per Kelompok</h3><div class="ov overflow-x-auto mt-3"><table class="w-full min-w-[560px] text-left"><thead><tr class="${hd}">${th('No')}${th('Kelompok')}${th('Peserta','text-center')}${th('Hadir','text-center')}${th('Izin','text-center')}${th('Alpa','text-center')}${th('Persentase')}</tr></thead><tbody>${kRows||'<tr><td colspan="7" class="py-6 text-center text-sm text-slate-400">Belum ada peserta.</td></tr>'}</tbody></table></div></div>
   <div class="bg-white rounded-2xl border border-line shadow-card p-5"><h3 class="font-extrabold text-sm">Kehadiran per Peserta</h3><div class="ov overflow-auto max-h-[520px] mt-3 border border-line rounded-xl"><table class="w-full min-w-[720px] text-left"><thead class="bg-slate-50"><tr class="${hd}">${th('No')}${th('Nama')}${th('Kelompok')}${th('H','text-center')}${th('I','text-center')}${th('A','text-center')}${th('%','text-center')}${th('Predikat')}${th('Catatan')}</tr></thead><tbody>${pRows}</tbody></table></div></div>
   <div class="bg-white rounded-2xl border border-line shadow-card p-5 text-[11px] text-slate-500 leading-relaxed space-y-1"><div class="font-bold text-slate-600 text-xs">Dasar perhitungan &amp; keterangan data</div>
    <p>Persentase = Hadir ÷ (Hadir + Izin + Alpa). Sesi libur, sesi belum berlangsung, dan sesi tanpa data tidak masuk perhitungan. Predikat: ≥85% Sangat baik, 70–84% Baik, 50–69% Cukup, &lt;50% Perlu pembinaan.</p>
    <p>Peserta yang tidak mengisi pada kelompok yang sudah melapor: ${c.ns==='alpa'?'dihitung Alpa':'tidak dihitung'}. Sumber data: ${c.nResp} tanggapan diterima, ${c.nOvr} status diubah manual oleh admin. Dicetak ${esc(fmDT(Date.now()))} dari SIMDEKA.</p></div>
   <div class="hidden print:grid grid-cols-2 gap-10 pt-8 text-sm text-center"><div>Mengetahui,<br>Ketua<div class="h-16"></div>( ................................ )</div><div>Petugas / Sekretaris<div class="h-[4.5rem]"></div>( ................................ )</div></div>
  </div></div>`;
}
function fmExportLap(fmt){
 const f=fmCur(),per=fmPer(f),c=fmCalc(f,per),okr=c.ok;
 const rows=[['Laporan Kehadiran',f.absen.jenis||f.title],['Periode',per.label],['Sesi terjadwal',c.all.length,'Libur',c.libur.length,'Terlaksana',c.ok.length,'Belum ada data',c.kosong.length],[],
  ['No','Nama','Kelompok','Dapukan',...okr.map(r=>r.s.tgl),'Hadir','Izin','Alpa','Persentase','Predikat']];
 c.P.forEach((x,i)=>{const v=c.pc(x);rows.push([i+1,x.p.n,x.p.k,x.p.d,...x.seq.map(q=>q?FM_ST[q]:'-'),x.H,x.I,x.A,v==null?'':v+'%',v==null?'':fmPredikat(v)[0]]);});
 fmOut('Laporan '+(f.absen.jenis||f.title)+' '+per.from+' sd '+per.to,rows,fmt,'Laporan');
}

/* ---------- Jadwal / sesi: pengaturan ---------- */
function fmSetRutin(b){const f=fmCur();f.absen.rutin=!!b;if(!f.absen.sesi)f.absen.sesi=[];fmTouch(f);fmRenderAbsenForm(f);lucide.createIcons();}
function fmGen(){
 const f=fmCur(),a=f.absen,st=fmEl('sgStart').value,en=fmEl('sgEnd').value,pol=fmEl('sgPol').value,hr=fmEl('sgHari').value;
 if(!FM_RX.test(st)){showToast('Isi tanggal mulai dahulu');return;}
 if(!FM_RX.test(en)||en<st){showToast('Isi tanggal akhir (setelah tanggal mulai)');return;}
 a.sesi=a.sesi||[];const have=new Set(a.sesi.map(x=>x.tgl)),d0=new Date(st+'T00:00:00');let add=0;
 if(hr!=='')while(d0.getDay()!==Number(hr))d0.setDate(d0.getDate()+1);
 const nth=Math.ceil(d0.getDate()/7);
 for(let i=0;i<400&&a.sesi.length<400;i++){const d=new Date(d0);
  if(pol==='bln'&&hr!==''){/* bulanan + hari: minggu ke-N, hari terpilih (mis. Senin ke-2) */
   d.setDate(1);d.setMonth(d0.getMonth()+i);const w=Number(hr);
   let dd=1+((w-new Date(d.getFullYear(),d.getMonth(),1).getDay()+7)%7)+(nth-1)*7;
   const dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();while(dd>dim)dd-=7;d.setDate(dd);}
  else if(pol==='bln'){d.setDate(1);d.setMonth(d0.getMonth()+i);d.setDate(Math.min(d0.getDate(),new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}
  else d.setDate(d0.getDate()+i*(pol==='2mg'?14:7));
  const iso=fmIso(d);if(iso>en)break;if(!have.has(iso)){a.sesi.push({tgl:iso,st:'ada',ket:''});have.add(iso);add++;}}
 a.sesi.sort((x,y)=>x.tgl<y.tgl?-1:1);fmTouch(f);fmRenderAbsenForm(f);lucide.createIcons();showToast(add+' tanggal ditambahkan');
}
function fmSesiSet(i,k,v){const f=fmCur(),x=f.absen.sesi[i];if(!x)return;
 if(k==='tgl'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')){showToast('Tanggal tidak valid, dikembalikan ke semula');fmRenderAbsenForm(f);lucide.createIcons();return;}
  if(f.absen.sesi.some((y,j)=>j!==i&&y.tgl===v)){showToast('Tanggal '+fmDateLong(v)+' sudah ada di jadwal. Perubahan dibatalkan.');fmRenderAbsenForm(f);lucide.createIcons();return;}
 }
 if(k==='libur')x.st=x.st==='libur'?'ada':'libur';else x[k]=v;
 if(k==='tgl')f.absen.sesi.sort((m,n)=>m.tgl<n.tgl?-1:1);
 fmTouch(f);if(k!=='ket'){fmRenderAbsenForm(f);lucide.createIcons();}}
function fmSesiDel(i){
 const f=fmCur(),x=f.absen.sesi.splice(i,1)[0];if(!x)return;fmTouch(f);fmRenderAbsenForm(f);lucide.createIcons();
 fmUndo('Sesi '+fmDateLong(x.tgl)+' dihapus',()=>{const g=fmCur();if(!g||g.id!==f.id)return;g.absen.sesi.push(x);g.absen.sesi.sort((m,n)=>m.tgl<n.tgl?-1:1);fmTouch(g);if(fmEl('fmBody')){fmRenderAbsenForm(g);lucide.createIcons();}});
}
function fmSesiAdd(){const f=fmCur(),a=f.absen;a.sesi=a.sesi||[];const l=a.sesi[a.sesi.length-1];const have=new Set(a.sesi.map(y=>y.tgl));let d=new Date((l&&l.tgl?l.tgl:fmToday())+'T00:00:00');if(l&&l.tgl)d.setDate(d.getDate()+1);let iso=fmIso(d);for(let n=0;have.has(iso)&&n<800;n++){d.setDate(d.getDate()+1);iso=fmIso(d);}
 a.sesi.push({tgl:iso,st:'ada',ket:''});a.sesi.sort((m,n)=>m.tgl<n.tgl?-1:1);fmTouch(f);fmRenderAbsenForm(f);lucide.createIcons();}
function fmJadwalHtml(a){
 const S=a.sesi||[],seg=(b,l)=>`<button onclick="fmSetRutin(${b})" class="flex-1 px-3 py-2 rounded-lg text-xs font-bold ${!!a.rutin===b?'bg-white shadow text-navy':'text-slate-500'}">${l}</button>`;
 const nf=a.nofill||(a.mode!=='petugas'?'alpa':'skip');
 return `<section class="bg-white rounded-2xl border border-line shadow-card p-5 sm:p-6">
  <div class="flex items-center gap-2"><div class="w-8 h-8 rounded-lg bg-navy/5 text-navy grid place-items-center">${icon('calendar-range','w-4')}</div><div><h3 class="font-extrabold">Jadwal Kegiatan</h3><p class="text-[11px] text-slate-400">Satu form bisa dipakai berulang. Laporan &amp; persentase dihitung otomatis dari semua sesi.</p></div></div>
  <div class="mt-4 flex gap-1 p-1 rounded-xl bg-slate-100 max-w-sm">${seg(false,'Satu kali')}${seg(true,'Rutin / berulang')}</div>
  ${a.rutin?`<div class="mt-4 rounded-2xl border border-line p-4"><div class="text-xs font-bold text-slate-600 mb-2">Buat jadwal otomatis</div>
   <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
    <label class="block"><span class="text-[11px] text-slate-400">Mulai tanggal</span><input id="sgStart" type="date" value="${esc(S[0]?S[0].tgl:a.tanggal)}" class="mt-1 w-full border border-line rounded-xl px-2 py-2 text-xs"></label>
    <label class="block"><span class="text-[11px] text-slate-400">Pola</span><select id="sgPol" class="mt-1 w-full border border-line rounded-xl px-2 py-2 text-xs bg-white">${(()=>{const pk=/pengajian (muda mudi )?kelompok/i.test(a.jenis||'');return `<option value="bln">Setiap bulan</option><option value="2mg">Setiap 2 minggu</option><option value="mg" ${pk?'selected':''}>Setiap minggu</option>`;})()}</select></label>
    <label class="block"><span class="text-[11px] text-slate-400">Hari</span><select id="sgHari" class="mt-1 w-full border border-line rounded-xl px-2 py-2 text-xs bg-white"><option value="">Sesuai tgl mulai</option><option value="1">Senin</option><option value="2">Selasa</option><option value="3">Rabu</option><option value="4">Kamis</option><option value="5">Jumat</option><option value="6">Sabtu</option><option value="0">Minggu</option></select></label>
    <label class="block"><span class="text-[11px] text-slate-400">Sampai tanggal</span><input id="sgEnd" type="date" value="${esc((S[0]?S[0].tgl:(a.tanggal||fmToday())).slice(0,4)+'-12-31')}" class="mt-1 w-full border border-line rounded-xl px-2 py-2 text-xs"></label>
    <button onclick="fmGen()" class="h-[38px] rounded-xl bg-navy text-white text-xs font-bold">Buat jadwal</button></div></div>
   <div class="mt-4 flex items-center justify-between"><div class="text-xs font-bold text-slate-600">${S.length} sesi • ${S.filter(x=>x.st==='libur').length} libur</div><button onclick="fmSesiAdd()" class="text-xs font-bold text-navy hover:underline">+ Tambah tanggal</button></div>
   <div class="mt-2 max-h-[320px] overflow-auto border border-line rounded-xl divide-y divide-line">${S.length?S.map((x,i)=>`<div class="flex flex-wrap items-center gap-2 px-3 py-2"><span class="w-6 text-xs text-slate-400">${i+1}</span><span class="basis-full sm:basis-auto sm:order-last sm:w-full text-[11px] text-slate-400 truncate">${esc(x.tgl?'/f/…/'+x.tgl:'')}</span>
    <input type="date" value="${esc(x.tgl)}" onchange="fmSesiSet(${i},'tgl',this.value)" class="border border-line rounded-lg px-2 py-1.5 text-xs">
    <button onclick="fmSesiSet(${i},'libur')" class="px-3 py-1.5 rounded-full text-[11px] font-bold border ${x.st==='libur'?'bg-amber-50 text-amber-700 border-amber-200':'border-line text-slate-500'}">${x.st==='libur'?'Libur':'Berlangsung'}</button>
    ${x.st==='libur'?`<input value="${esc(x.ket||'')}" oninput="fmSesiSet(${i},'ket',this.value)" maxlength="120" placeholder="Alasan (mis. Idul Fitri)" class="flex-1 min-w-[140px] border border-line rounded-lg px-2 py-1.5 text-xs">`:'<span class="flex-1"></span>'}
    <button onclick="fmCopySesi(${i})" title="Salin link sesi ini" class="h-8 px-2.5 rounded-lg border border-line text-[11px] font-bold text-navy flex items-center gap-1">${icon('link','w-3.5 h-3.5')}Link</button>
    <button onclick="fmQrSesi(${i})" title="QR code sesi ini" class="h-8 px-2.5 rounded-lg border border-line text-[11px] font-bold text-navy flex items-center gap-1">${icon('qr-code','w-3.5 h-3.5')}QR</button>
    <button onclick="fmSesiDel(${i})" title="Hapus" class="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 grid place-items-center">${icon('trash-2','w-4')}</button></div>`).join(''):'<div class="p-6 text-center text-sm text-slate-400">Belum ada sesi. Buat jadwal otomatis di atas.</div>'}</div>`:''}
  <label class="block mt-4 max-w-sm"><span class="text-xs font-bold text-slate-600">Peserta yang tidak mengisi (di kelompok yang sudah melapor)</span>
   <select onchange="fmAbField('nofill',this.value)" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white"><option value="alpa" ${nf==='alpa'?'selected':''}>Dihitung Alpa</option><option value="skip" ${nf==='skip'?'selected':''}>Tidak dihitung</option></select></label></section>`;
}

/* ---------- Form Absensi: rekap ---------- */
/* ---------- Sesi (pertemuan) & status per tanggal ---------- */
function fmIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const FM_RX=/^\d{4}-\d{2}-\d{2}$/;
function fmRespTg(f,r){return FM_RX.test(r.tg||'')?r.tg:f.absen.tanggal;}
function fmSesi(f){
 const a=f.absen,m={};
 (a.rutin?(a.sesi||[]):[{tgl:a.tanggal,st:'ada',ket:''}]).forEach(x=>{if(x.tgl)m[x.tgl]={tgl:x.tgl,st:x.st==='libur'?'libur':'ada',ket:x.ket||'',jd:1};});
 fmResp(f.id).forEach(r=>{const t=fmRespTg(f,r);if(t&&!m[t])m[t]={tgl:t,st:'ada',ket:'',jd:0};});
 return Object.values(m).sort((x,y)=>x.tgl<y.tgl?-1:1);
}
function fmCurTg(f){
 const S=fmSesi(f),t=fmToday();if(fm.tg&&S.some(x=>x.tgl===fm.tg))return fm.tg;
 const ok=S.filter(x=>x.st!=='libur'),past=ok.filter(x=>x.tgl<=t);
 return (past.length?past[past.length-1]:(ok[0]||S[0]||{tgl:f.absen.tanggal})).tgl;
}
function fmStatusAt(f,tg){
 const st={},by={};
 if(f.override&&Object.keys(f.override).length){f.ovr=f.ovr||{};f.ovr[f.absen.tanggal]=Object.assign({},f.override,f.ovr[f.absen.tanggal]||{});f.override={};}
 fmResp(f.id).filter(r=>r&&r.m&&fmRespTg(f,r)===tg).sort((x,y)=>x.ts-y.ts).forEach(r=>{Object.keys(r.m).forEach(k=>{st[k]=r.m[k];by[k]={pj:r.pj||'',ts:r.ts};});});
 const o=(f.ovr||{})[tg]||{};Object.keys(o).forEach(k=>{if(FM_ST[o[k]]){st[k]=o[k];by[k]={pj:'Admin (manual)',ts:0,manual:true};}});
 return {st:st,by:by};
}
function fmAbsenStatus(f){return fmStatusAt(f,fmCurTg(f));}
function fmSetTg(t){fm.tg=t;fmRenderRekap(fmCur());lucide.createIcons();}
function fmTgSelect(f){
 const S=fmSesi(f),c=fmCurTg(f);
 if(!f.absen.rutin&&S.length<2)return `<p class="text-xs text-slate-400">${esc(fmDateLong(c))}</p>`;
 return `<select onchange="fmSetTg(this.value)" class="mt-1 h-9 border border-line rounded-xl px-3 text-xs font-bold bg-white max-w-full">${S.map(x=>`<option value="${x.tgl}" ${x.tgl===c?'selected':''}>${esc(fmDateLong(x.tgl))}${x.st==='libur'?' — LIBUR':''}${x.jd?'':' — tidak terjadwal'}</option>`).join('')}</select>`;
}
function fmRenderRekap(f){
 const a=f.absen;a.peserta=fmBuildPeserta(a);
 const {st}=fmAbsenStatus(f);
 const tot=a.peserta.length,c={H:0,I:0,A:0,N:0};
 a.peserta.forEach(p=>{const s=st[fmKey(p.n,p.k)];if(s)c[s]++;else c.N++;});
 const R=fmResp(f.id).filter(r=>fmRespTg(f,r)===fmCurTg(f));
 const kels=[...new Set(a.peserta.map(p=>p.k))];
 const kRows=kels.map((k,ix)=>{const P=a.peserta.filter(p=>p.k===k),cc={H:0,I:0,A:0,N:0};P.forEach(p=>{const s=st[fmKey(p.n,p.k)];if(s)cc[s]++;else cc.N++;});
  const last=R.filter(r=>r.kel===k).sort((x,y)=>y.ts-x.ts)[0];
  return `<tr class="border-t border-line text-sm"><td class="py-3 px-3 text-slate-400">${ix+1}</td><td class="py-3 px-3 font-bold">${esc(k)}</td><td class="py-3 px-3 text-center">${P.length}</td><td class="py-3 px-3 text-center font-bold text-emerald-600">${cc.H}</td><td class="py-3 px-3 text-center font-bold text-amber-600">${cc.I}</td><td class="py-3 px-3 text-center font-bold text-red-600">${cc.A}</td><td class="py-3 px-3 text-center text-slate-500">${cc.N}</td>
   <td class="py-3 px-3 text-xs">${a.mode!=='petugas'?`<span class="font-bold ${P.length-cc.N===P.length?'text-emerald-700':'text-slate-600'}">${P.length-cc.N} dari ${P.length}</span> <span class="text-slate-400">sudah absen</span>`:(last?`<span class="text-emerald-700 font-bold">Sudah</span> <span class="text-slate-400">• ${esc(last.pj||'-')} • ${esc(fmDT(last.ts))}</span>`:'<span class="text-slate-400">Belum mengisi</span>')}</td></tr>`;}).join('');
 fmEl('fmBody').innerHTML=`<div class="mt-4 max-w-[1100px] mx-auto space-y-4">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
   <div><h3 class="font-extrabold text-lg">${esc(a.jenis||'Kegiatan')}</h3>${fmTgSelect(f)}</div>
   <div class="flex flex-wrap gap-2">${FM_SYNC_URL?`<button onclick="fmSyncPull()" class="h-10 px-3 rounded-xl border border-line bg-white text-xs font-bold flex items-center gap-2">${icon('refresh-cw','w-4')} Sinkronkan</button>`:''}
    <button onclick="fmOpenImport()" class="h-10 px-3 rounded-xl border border-navy/20 bg-navy/5 text-navy text-xs font-bold flex items-center gap-2">${icon('upload','w-4')} Impor Kode Tanggapan</button>
    <button onclick="fmExportRekap()" class="h-10 px-3 rounded-xl border border-line bg-white text-xs font-bold flex items-center gap-2">${icon('download','w-4')} Ekspor Excel</button><button onclick="fmExportRekap('csv')" class="h-10 px-3 rounded-xl border border-line bg-white text-xs font-bold flex items-center gap-2">CSV</button><button onclick="fmExportRekap('pdf')" class="h-10 px-3 rounded-xl border border-line bg-white text-xs font-bold flex items-center gap-2">PDF</button></div></div>
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">${statCard('Total Peserta',tot,'Sesuai daftar','users','blue')}${statCard('Hadir',c.H,tot?Math.round(c.H/tot*100)+'%':'—','check','green')}${statCard('Izin',c.I,tot?Math.round(c.I/tot*100)+'%':'—','mail','orange')}${statCard('Alpa',c.A,tot?Math.round(c.A/tot*100)+'%':'—','x','purple')}${statCard('Belum Diisi',c.N,'Menunggu kelompok','clock','blue')}</div>
  <div class="bg-white rounded-2xl border border-line shadow-card p-5"><h3 class="font-extrabold text-sm">Progres per Kelompok</h3>
   <div class="overflow-x-auto scrollbar mt-3"><table class="w-full min-w-[720px] text-left"><thead><tr class="text-[11px] uppercase tracking-wide text-slate-400"><th class="py-2 px-3 w-12">No</th><th class="py-2 px-3">Kelompok</th><th class="py-2 px-3 text-center">Peserta</th><th class="py-2 px-3 text-center">Hadir</th><th class="py-2 px-3 text-center">Izin</th><th class="py-2 px-3 text-center">Alpa</th><th class="py-2 px-3 text-center">Belum</th><th class="py-2 px-3">Pengisian</th></tr></thead>
   <tbody>${kRows||'<tr><td colspan="8" class="py-8 text-center text-sm text-slate-400">Belum ada peserta.</td></tr>'}</tbody></table></div></div>
  <div class="bg-white rounded-2xl border border-line shadow-card p-5">
   <div class="flex flex-col lg:flex-row gap-2 justify-between mb-3"><h3 class="font-extrabold text-sm self-center">Rincian Kehadiran</h3>
    <div class="flex flex-col sm:flex-row gap-2">
     <div class="u-search" style="margin-bottom:16px">${icon('search','w-4 text-slate-400')}<input value="${esc(fm.rq)}" oninput="fm.rq=this.value;fmRenderRT()" class="w-full text-sm bg-transparent" placeholder="Cari nama..."></div>
     <select onchange="fm.rk=this.value;fmRenderRT()" class="u-sel"><option value="">Semua Kelompok</option>${kels.map(k=>`<option value="${esc(k)}" ${fm.rk===k?'selected':''}>${esc(k)}</option>`).join('')}</select>
     <select onchange="fm.rs=this.value;fmRenderRT()" class="u-sel"><option value="">Semua Status</option><option value="H" ${fm.rs==='H'?'selected':''}>Hadir</option><option value="I" ${fm.rs==='I'?'selected':''}>Izin</option><option value="A" ${fm.rs==='A'?'selected':''}>Alpa</option><option value="N" ${fm.rs==='N'?'selected':''}>Belum diisi</option></select></div></div>
   <div class="overflow-auto scrollbar max-h-[460px] border border-line rounded-xl"><table class="w-full min-w-[720px] text-left"><thead class="sticky top-0 bg-slate-50"><tr class="text-[11px] uppercase tracking-wide text-slate-400"><th class="py-3 px-3 w-12">No</th><th class="py-3 px-3">Nama Lengkap</th><th class="py-3 px-3">Kelompok</th><th class="py-3 px-3">Dapukan</th><th class="py-3 px-3">Status</th><th class="py-3 px-3">Diisi oleh</th></tr></thead><tbody id="fmRT"></tbody></table></div>
   <p class="text-[11px] text-slate-400 mt-2">Status bisa diubah manual lewat kolom Status (mengalahkan isian kelompok). Pilih "—" untuk kembali mengikuti isian kelompok.</p></div></div>`;
 fmRenderRT();
}
function fmRenderRT(){
 const f=fmCur(),tb=fmEl('fmRT');if(!f||!tb)return;
 const {st,by}=fmAbsenStatus(f),q=fm.rq.trim().toLowerCase();
 const rows=f.absen.peserta.map((p,i)=>({p:p,i:i,s:st[fmKey(p.n,p.k)]||'N'})).filter(x=>(!fm.rk||x.p.k===fm.rk)&&(!fm.rs||x.s===fm.rs)&&(!q||x.p.n.toLowerCase().includes(q)));
 const col={H:'text-emerald-700 bg-emerald-50 border-emerald-200',I:'text-amber-700 bg-amber-50 border-amber-200',A:'text-red-700 bg-red-50 border-red-200',N:'text-slate-500 bg-slate-50 border-line'};
 tb.innerHTML=rows.length?rows.map((x,n)=>{const k=fmKey(x.p.n,x.p.k),b=by[k];
  return `<tr class="border-t border-line text-sm"><td class="py-2.5 px-3 text-slate-400">${n+1}</td><td class="py-2.5 px-3 font-bold">${esc(x.p.n)}</td><td class="py-2.5 px-3 text-slate-600">${esc(x.p.k)}</td><td class="py-2.5 px-3 text-slate-600">${esc(x.p.d)}</td>
   <td class="py-2 px-3"><select onchange="fmOverride(${x.i},this.value)" class="h-8 rounded-lg border px-2 text-xs font-bold ${col[x.s]}">${x.s==='N'?'<option value="" selected>Belum diisi</option>':'<option value="">—</option>'}<option value="H" ${x.s==='H'?'selected':''}>Hadir</option><option value="I" ${x.s==='I'?'selected':''}>Izin</option><option value="A" ${x.s==='A'?'selected':''}>Alpa</option></select></td>
   <td class="py-2.5 px-3 text-xs text-slate-500">${b?esc(b.pj||'-'):'—'}</td></tr>`;}).join('')
  :'<tr><td colspan="6" class="py-10 text-center text-sm text-slate-400">Tidak ada data yang cocok.</td></tr>';
}
function fmOverride(i,v){
 const f=fmCur(),p=f.absen.peserta[i];if(!p)return;
 const tg=fmCurTg(f),k=fmKey(p.n,p.k);fmStatusAt(f,tg);
 f.ovr=f.ovr||{};f.ovr[tg]=f.ovr[tg]||{};
 if(v)f.ovr[tg][k]=v;else delete f.ovr[tg][k];
 fmSave(true);fmRenderRekap(f);lucide.createIcons();
}
function fmExportRekap(fmt){
 const f=fmCur(),{st,by}=fmAbsenStatus(f);
 const rows=[['Jenis Kegiatan',f.absen.jenis],['Tanggal',fmCurTg(f)],[],['No','Nama Lengkap','Kelompok','Dapukan','Status','Diisi oleh','Waktu isi']];
 f.absen.peserta.forEach((p,i)=>{const k=fmKey(p.n,p.k),s=st[k],b=by[k];rows.push([i+1,p.n,p.k,p.d,s?FM_ST[s]:'Belum diisi',b?b.pj:'',b&&b.ts?fmDT(b.ts):'']);});
 fmOut('Rekap '+(f.absen.jenis||f.title)+' '+fmCurTg(f),rows,fmt,'Rekap');
}

/* ---------- Tanggapan (Form Umum) ---------- */
let fmCharts=[];
function fmAnsText(v){return Array.isArray(v)?v.join('; '):String(v==null?'':v);}
function fmHasAns(v){return Array.isArray(v)?v.length>0:(v!==undefined&&v!==null&&String(v).trim()!=='');}
function fmRenderResp(f){
 fmCharts.forEach(c=>{try{c.destroy();}catch(e){}});fmCharts=[];
 const R=fmResp(f.id).sort((a,b)=>a.ts-b.ts), n=R.length;
 fm.ind=Math.min(Math.max(0,fm.ind),Math.max(0,n-1));
 const head=`<div class="bg-white border border-[#dadce0] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
   <div><div class="text-xl font-normal">${n} tanggapan</div><div class="text-xs text-slate-400 mt-0.5">Tersimpan di perangkat ini${FM_SYNC_URL?' & server':''}. Tanggapan dari perangkat lain masuk lewat Kode Tanggapan.</div></div>
   <div class="flex flex-wrap gap-2">${FM_SYNC_URL?`<button onclick="fmSyncPull()" class="h-9 px-3 rounded-lg border border-line bg-white text-xs font-bold flex items-center gap-2">${icon('refresh-cw','w-4')} Sinkronkan</button>`:''}
    <button onclick="fmOpenImport()" class="h-9 px-3 rounded-lg border border-[#dadce0] bg-white text-xs font-bold flex items-center gap-2">${icon('upload','w-4')} Impor Kode</button>
    <button onclick="fmExportResp()" class="h-9 px-3 rounded-lg border border-[#dadce0] bg-white text-xs font-bold flex items-center gap-2 ${n?'':'opacity-40 pointer-events-none'}">${icon('download','w-4')} Ekspor Excel</button><button onclick="fmExportResp('csv')" class="h-9 px-3 rounded-lg border border-[#dadce0] bg-white text-xs font-bold flex items-center gap-2 ${n?'':'opacity-40 pointer-events-none'}">CSV</button><button onclick="fmExportResp('pdf')" class="h-9 px-3 rounded-lg border border-[#dadce0] bg-white text-xs font-bold flex items-center gap-2 ${n?'':'opacity-40 pointer-events-none'}">PDF</button></div></div>`;
 const tabs=`<div class="flex justify-center gap-1 bg-white border border-[#dadce0] rounded-lg">${[['sum','Ringkasan'],['ind','Individu']].map(t=>`<button onclick="fm.rTab='${t[0]}';fmRenderBody()" class="fm-tab ${fm.rTab===t[0]?'on':''}">${t[1]}</button>`).join('')}</div>`;
 let body;
 if(!n)body=`<div class="bg-white border border-[#dadce0] rounded-lg p-10 text-center"><div class="w-14 h-14 mx-auto rounded-2xl bg-slate-50 text-slate-400 grid place-items-center">${icon('inbox','w-7')}</div><h4 class="font-bold mt-3">Belum ada tanggapan</h4><p class="text-sm text-slate-400 mt-1">Bagikan tautan formulir lewat tombol Kirim.</p></div>`;
 else if(fm.rTab==='ind')body=fmIndHtml(f,R);
 else body=fmSumHtml(f,R);
 fmEl('fmBody').innerHTML=`<div class="mt-4 rounded-3xl p-3 sm:p-6" style="background:color-mix(in srgb,var(--fc) 9%,#fff)"><div class="max-w-[770px] mx-auto space-y-3">${head}${n?tabs:''}${body}</div></div>`;
 lucide.createIcons();
 if(n&&fm.rTab==='sum')fmDrawCharts();
}
let fmChartCfg=[];
function fmSumHtml(f,R){
 fmChartCfg=[];
 return f.items.filter(it=>it.kind==='q').map(it=>{
  const vals=R.map(r=>r.a&&r.a[it.id]).filter(fmHasAns);
  let inner='';
  if(it.type==='radio'||it.type==='select'||it.type==='check'){
   const labels=it.options.slice(),cnt=labels.map(()=>0);let other=0;
   vals.forEach(v=>(Array.isArray(v)?v:[v]).forEach(x=>{const i=it.options.indexOf(x);if(i>=0)cnt[i]++;else other++;}));
   if(other){labels.push('Lainnya');cnt.push(other);}
   const pie=it.type!=='check';
   fmChartCfg.push({idx:fmChartCfg.length,kind:pie?'pie':'bar',labels:labels,data:cnt});
   const cid=fmChartCfg.length-1;
   inner=pie?`<div class="grid sm:grid-cols-2 gap-4 items-center"><div class="h-[200px]"><canvas id="fmCv${cid}"></canvas></div><div class="space-y-1.5 text-sm">${labels.map((l,i)=>`<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm shrink-0" style="background:${FM_CH[i%FM_CH.length]}"></span><span class="truncate flex-1">${esc(l)}</span><span class="text-slate-500 text-xs">${cnt[i]} (${vals.length?Math.round(cnt[i]/vals.length*100):0}%)</span></div>`).join('')}</div></div>`
    :`<div style="height:${Math.max(120,labels.length*34+30)}px"><canvas id="fmCv${cid}"></canvas></div>`;
  } else if(it.type==='scale'){
   const labels=[],cnt=[];for(let x=it.sMin;x<=it.sMax;x++){labels.push(String(x));cnt.push(vals.filter(v=>String(v)===String(x)).length);}
   const avg=vals.length?(vals.reduce((s,v)=>s+(Number(v)||0),0)/vals.length):0;
   fmChartCfg.push({idx:fmChartCfg.length,kind:'col',labels:labels,data:cnt});
   inner=`<div class="text-xs text-slate-500 mb-2">Rata-rata: <b>${avg.toFixed(2)}</b></div><div class="h-[200px]"><canvas id="fmCv${fmChartCfg.length-1}"></canvas></div>`;
  } else {
   inner=vals.length?`<div class="max-h-[240px] overflow-y-auto scrollbar space-y-2">${vals.map(v=>`<div class="bg-slate-50 rounded px-3 py-2 text-sm whitespace-pre-line break-words">${fmAnsHtml(v)}</div>`).join('')}</div>`:'<div class="text-sm text-slate-400">Belum ada jawaban.</div>';
  }
  return `<div class="bg-white border border-[#dadce0] rounded-lg p-5"><div class="text-[15px] font-medium">${esc(it.title||'Pertanyaan tanpa judul')}</div><div class="text-xs text-slate-400 mb-3">${vals.length} jawaban</div>${inner}</div>`;
 }).join('')||'<div class="bg-white border border-[#dadce0] rounded-lg p-8 text-center text-sm text-slate-400">Formulir ini belum memiliki pertanyaan.</div>';
}
function fmDrawCharts(){
 if(typeof Chart==='undefined')return;
 fmChartCfg.forEach((c,i)=>{
  const cv=fmEl('fmCv'+i);if(!cv)return;
  try{
   const colors=c.labels.map((_,k)=>FM_CH[k%FM_CH.length]);
   const cfg=c.kind==='pie'?{type:'pie',data:{labels:c.labels,datasets:[{data:c.data,backgroundColor:colors}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}
    :{type:'bar',data:{labels:c.labels,datasets:[{data:c.data,backgroundColor:c.kind==='col'?'#4285F4':colors}]},options:{indexAxis:c.kind==='bar'?'y':'x',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{precision:0},beginAtZero:true},y:{ticks:{precision:0},beginAtZero:true}}}};
   fmCharts.push(new Chart(cv,cfg));
  }catch(e){}
 });
}
function fmIndHtml(f,R){
 const r=R[fm.ind];
 const nav=`<div class="bg-white border border-[#dadce0] rounded-lg p-3 flex items-center justify-between gap-2">
  <div class="flex items-center gap-1"><button onclick="fm.ind--;fmRenderBody()" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center ${fm.ind<=0?'opacity-30 pointer-events-none':''}">${icon('chevron-left','w-5')}</button><span class="text-sm px-1">${fm.ind+1} dari ${R.length}</span><button onclick="fm.ind++;fmRenderBody()" class="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center ${fm.ind>=R.length-1?'opacity-30 pointer-events-none':''}">${icon('chevron-right','w-5')}</button></div>
  <div class="flex items-center gap-2 text-xs text-slate-400"><span>${esc(fmDT(r.ts))}</span><button title="Hapus tanggapan" onclick="fmAskDelResp('${esc(r.id)}')" class="w-9 h-9 rounded-full hover:bg-red-50 grid place-items-center">${icon('trash-2','w-4 text-red-500')}</button></div></div>`;
 const cards=f.items.filter(it=>it.kind==='q').map(it=>{const v=r.a&&r.a[it.id];
  return `<div class="bg-white border border-[#dadce0] rounded-lg p-5"><div class="text-[15px] font-medium">${esc(it.title||'Pertanyaan tanpa judul')}</div><div class="mt-2 text-sm ${fmHasAns(v)?'text-[#202124]':'text-slate-400'} whitespace-pre-line break-words">${fmHasAns(v)?fmAnsHtml(v):'(tidak dijawab)'}</div></div>`;}).join('');
 return nav+cards;
}
function fmAskDelResp(id){
 const f=fmCur();if(!f)return;const list=fmResp(f.id),i=list.findIndex(x=>x.id===id);if(i<0)return;const r=list[i];
 fmRespPut(f.id,list.filter(x=>x.id!==id));if(window.simdekaResponseDelete)window.simdekaResponseDelete(f.id,id);fmRenderEditor();
 fmUndo('Tanggapan dihapus',async()=>{const l=fmResp(f.id).slice();l.splice(Math.min(i,l.length),0,r);fmRespPut(f.id,l);if(window.simdekaResponsePush)await window.simdekaResponsePush(f.id,r);const c=fmCur();if(c&&c.id===f.id&&fmEl('fmBody'))fmRenderEditor();});
}
function fmExportResp(fmt){
 const f=fmCur(),R=fmResp(f.id).sort((a,b)=>a.ts-b.ts),qs=f.items.filter(it=>it.kind==='q');
 const rows=[['Waktu'].concat(qs.map(q=>q.title||'Pertanyaan'))];
 R.forEach(r=>rows.push([fmDT(r.ts)].concat(qs.map(q=>fmAnsText(r.a&&r.a[q.id])))));
 fmOut(f.title||'Tanggapan',rows,fmt,'Tanggapan');
}

/* ---------- Impor kode tanggapan / sinkronisasi ---------- */
function fmOpenImport(){
 fmEl('modalTitle').textContent='Impor Kode Tanggapan';fmEl('modalDesc').textContent='Tempel kode yang dikirim pengisi (boleh banyak, satu per baris).';
 fmEl('modalBody').innerHTML=`<div class="space-y-4"><textarea id="fmImpTxt" rows="7" class="w-full border border-line rounded-xl px-3 py-2.5 text-xs font-mono" placeholder="SDK1.F1abc23.z..."></textarea>
  <p id="fmImpMsg" class="hidden text-xs font-semibold"></p>
  <div class="flex justify-end gap-2 pt-2 border-t border-line"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Tutup</button><button onclick="fmDoImport()" class="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">Impor</button></div></div>`;
 showModal();
}
async function fmDoImport(){
 const f=fmCur(),txt=fmEl('fmImpTxt').value,msg=fmEl('fmImpMsg');
 let ok=0,dup=0,bad=0;
 for(const t of txt.split(/\s+/).filter(Boolean)){
  const m=/^SDK1\.([A-Za-z0-9]+)\.([A-Za-z0-9_-]+)$/.exec(t);
  if(!m||m[1]!==f.id){bad++;continue;}
  try{const r=fmCleanResp(f,await fmUnpack(m[2]));if(!r){bad++;continue;}if(fmRespAdd(f.id,r))ok++;else dup++;}catch(e){bad++;}
 }
 msg.classList.remove('hidden');
 msg.className='text-xs font-semibold '+(ok?'text-emerald-600':'text-red-600');
 msg.textContent=(ok?ok+' tanggapan diimpor. ':'')+(dup?dup+' sudah ada. ':'')+(bad?bad+' kode tidak valid / bukan untuk form ini.':'')||'Tidak ada kode yang ditempel.';
 if(ok){setTimeout(()=>{closeModal();fmRenderEditor();showToast(ok+' tanggapan diimpor');},700);}
}
async function fmSyncPull(){
 if(!FM_SYNC_URL)return;const f=fmCur();
 try{
  const res=await fetch(FM_SYNC_URL+(FM_SYNC_URL.includes('?')?'&':'?')+'form='+encodeURIComponent(f.id));
  const arr=await res.json();let n=0;
  (Array.isArray(arr)?arr:[]).forEach(x=>{const r=fmCleanResp(f,x);if(r&&fmRespAdd(f.id,r))n++;});
  fmRenderEditor();showToast(n+' tanggapan baru');
 }catch(e){showToast('Gagal sinkronisasi');}
}

/* ---------- Setelan ---------- */
function fmRenderSettings(f){
 const n=fmResp(f.id).length;
 fmEl('fmBody').innerHTML=`<div class="mt-4 max-w-[720px] mx-auto space-y-4">
  <section class="bg-white rounded-2xl border border-blue-100 shadow-card p-5 sm:p-6 space-y-5">
   <div class="flex items-start justify-between gap-4"><div><h3 class="font-extrabold">Laporan Publik</h3><p class="text-xs text-slate-500 mt-1 leading-relaxed">Buat halaman laporan absensi yang dapat dibuka siapa saja tanpa login. Data sensitif tidak ditampilkan.</p></div>${f.type==='absensi'?`<button onclick="fmPublicReport('${f.id}')" class="h-9 px-3 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-2">${icon('external-link','w-4')} Buka Laporan</button>`:''}</div>
   ${f.type==='absensi'?`<div class="space-y-4">
    <div class="flex items-center justify-between gap-4"><div><div class="text-sm font-bold">Aktifkan laporan publik</div><div class="text-[11px] text-slate-400">Laporan dapat dibagikan ke masyarakat.</div></div><button role="switch" aria-checked="${f.publicReport?.enabled!==false}" onclick="fmSetReport('enabled',!(fmCur().publicReport?.enabled!==false));fmRenderBody()" class="gf-sw"><span></span></button></div>
    <div class="grid sm:grid-cols-3 gap-3">
      <label class="rounded-xl border border-line p-3 flex items-center justify-between gap-3"><span><b class="text-xs">Nama peserta</b><small class="block text-[10px] text-slate-400 mt-0.5">Tampilkan daftar nama</small></span><input type="checkbox" ${f.publicReport?.showNames?'checked':''} onchange="fmSetReport('showNames',this.checked)" class="w-4 h-4"></label>
      <label class="rounded-xl border border-line p-3 flex items-center justify-between gap-3"><span><b class="text-xs">Kelompok</b><small class="block text-[10px] text-slate-400 mt-0.5">Rekap per kelompok</small></span><input type="checkbox" ${f.publicReport?.showGroup!==false?'checked':''} onchange="fmSetReport('showGroup',this.checked)" class="w-4 h-4"></label>
      <label class="rounded-xl border border-line p-3 flex items-center justify-between gap-3"><span><b class="text-xs">Waktu hadir</b><small class="block text-[10px] text-slate-400 mt-0.5">Tampilkan jam</small></span><input type="checkbox" ${f.publicReport?.showTimes?'checked':''} onchange="fmSetReport('showTimes',this.checked)" class="w-4 h-4"></label>
    </div>
    <div class="rounded-xl bg-slate-50 border border-line p-3 flex flex-col sm:flex-row sm:items-center gap-2"><input readonly value="${esc(location.origin+'/r/'+encodeURIComponent(f.id))}" class="flex-1 min-w-0 bg-transparent text-xs text-slate-600 outline-none"><button onclick="fmPublicReportCopy('${f.id}')" class="h-9 px-3 rounded-lg bg-white border border-line text-xs font-bold">${icon('copy','w-3.5')} Salin Link</button></div><div class="flex flex-wrap gap-2"><button onclick="fmGenerateAIConclusion('${f.id}')" class="h-9 px-3 rounded-lg bg-violet-600 text-white text-xs font-bold">${icon('sparkles','w-3.5')} Buat/Perbarui Kesimpulan AI</button></div>
   </div>`:`<div class="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Laporan publik khusus untuk <b>Form Absensi</b>.</div>`}
  </section>
  <section class="bg-white rounded-2xl border border-line shadow-card p-5 sm:p-6 space-y-5">
   <h3 class="font-extrabold">Pengaturan Formulir</h3>
   <label class="block"><span class="text-xs font-bold text-slate-600">Pesan konfirmasi</span><textarea rows="2" maxlength="300" oninput="fmSet('confirmMsg',this.value)" class="mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm">${esc(f.confirmMsg)}</textarea></label>
   <div class="flex items-center justify-between gap-4"><div><div class="text-sm font-bold">Tampilkan tautan "${f.type==='absensi'?'Isi kelompok lain':'Kirim tanggapan lain'}"</div><div class="text-[11px] text-slate-400">Muncul setelah formulir terkirim.</div></div><button role="switch" aria-checked="${f.allowAnother}" onclick="fmSet('allowAnother',!fmCur().allowAnother);fmRenderBody()" class="gf-sw" style="--fc:${fmColor(f.color)}"><span></span></button></div>
   <div class="flex items-center justify-between gap-4"><div><div class="text-sm font-bold">Boleh diperbarui setelah dikirim</div><div class="text-[11px] text-slate-400">${f.allowUpdate!==false?'Responden bisa menekan "Perbarui form" untuk mengubah isiannya.':'Setelah terkirim, isian tidak bisa diubah lagi oleh responden.'} Berlaku untuk tautan yang dibagikan sesudah ini (bagikan ulang jika sudah terlanjur dikirim).</div></div><button role="switch" aria-checked="${f.allowUpdate!==false}" aria-label="Boleh diperbarui" onclick="fmSet('allowUpdate',fmCur().allowUpdate===false);fmRenderBody()" class="gf-sw" style="--fc:${fmColor(f.color)}"><span></span></button></div>
   <div class="flex items-center justify-between gap-4"><div><div class="text-sm font-bold">Terima tanggapan</div><div class="text-[11px] text-slate-400">Matikan untuk menutup form. Berlaku untuk tautan yang dibagikan sesudah ini (bagikan ulang jika sudah terlanjur dikirim).</div></div><button role="switch" aria-checked="${!f.closed}" aria-label="Terima tanggapan" onclick="fmSet('closed',!fmCur().closed);fmRenderBody()" class="gf-sw" style="--fc:${fmColor(f.color)}"><span></span></button></div>
   <label class="block"><span class="text-xs font-bold text-slate-600">Batas waktu pengisian <span class="font-normal text-slate-400">(opsional)</span></span>
    <div class="flex gap-2 mt-1.5"><input type="datetime-local" value="${esc(f.deadline)}" oninput="fmSet('deadline',this.value)" class="flex-1 border border-line rounded-xl px-3 py-2.5 text-sm bg-white"><button onclick="fmSet('deadline','');fmRenderBody()" class="px-3 rounded-xl border border-line text-xs font-bold">Hapus</button></div>
    <span class="block text-[11px] text-slate-400 mt-1">Berlaku untuk tautan yang dibagikan sesudah pengaturan ini disimpan (dibagikan ulang jika sudah terlanjur dikirim).</span></label>
  </section>
  <section class="bg-white rounded-2xl border border-red-100 shadow-card p-5 sm:p-6">
   <h3 class="font-extrabold text-red-600">Zona Berbahaya</h3>
   <div class="mt-3 flex flex-wrap gap-2"><button onclick="fmAskClearResp()" class="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold ${n?'':'opacity-40 pointer-events-none'}">Hapus semua tanggapan (${n})</button>
   <button onclick="fmAskDelForm('${f.id}')" class="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Hapus form</button></div></section></div>`;
}
function fmSetReport(k,v){const f=fmCur();if(!f)return;f.publicReport=Object.assign({enabled:true,showNames:false,showGroup:true,showTimes:false,realtime:true},f.publicReport||{}, {[k]:v});fmTouch(f);}
async function fmGenerateAIConclusion(id){try{showToast('Menyusun kesimpulan dengan Gemini…');const r=await fetch('/api/ai/attendance-conclusion',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({form_id:id})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Gagal membuat kesimpulan');showToast('Kesimpulan AI berhasil diperbarui');}catch(e){showToast(e.message||'Gagal membuat kesimpulan AI');}}
function fmSet(k,v){const f=fmCur();if(!f)return;f[k]=v;fmTouch(f);}
function fmAskClearResp(){fmConfirm('Hapus Semua Tanggapan','Seluruh tanggapan form ini di perangkat ini akan dihapus.','Hapus semua',()=>{const f=fmCur(),fid=f.id,bak=fmResp(fid).slice(),o1=f.override,o2=f.ovr;fmRespPut(fid,[]);if(window.simdekaResponseClear)window.simdekaResponseClear(fid);f.override={};f.ovr={};fmSave(true);fmRenderEditor();
 fmUndo(bak.length+' tanggapan dihapus',async()=>{const g=fmForms.find(x=>x.id===fid);if(!g)return;fmRespPut(fid,bak);if(o1!==undefined)g.override=o1;if(o2!==undefined)g.ovr=o2;fmSave(true);if(window.simdekaResponsePush)await Promise.all(bak.map(r=>window.simdekaResponsePush(fid,r)));if(fm.id===fid&&fmEl('fmBody'))fmRenderEditor();showToast('Tanggapan dikembalikan');});});}

/* ---------- Bagikan ---------- */
let fmShareLinks=[];
function fmValidateShare(f){
 if(f.type==='absensi'){
  const a=f.absen;a.peserta=fmBuildPeserta(a);fmSave(true);
  if(!normNama(a.jenis))return 'Jenis Kegiatan wajib diisi.';
  if(a.rutin){if(!(a.sesi||[]).some(x=>x.tgl&&x.st!=='libur'))return 'Buat jadwal kegiatan terlebih dahulu.';}else if(!a.tanggal)return 'Tanggal Kegiatan wajib diisi.';
  if(!a.peserta.length)return 'Belum ada peserta. Pilih jenis peserta yang sudah memiliki data.';
 } else if(!f.items.some(it=>it.kind==='q'))return 'Tambahkan minimal satu pertanyaan.';
 return '';
}
function fmLenNote(f,n){
 const k=n.toLocaleString('id-ID')+' karakter';
 if(n<=2900)return k+' — pendek, aman untuk QR dan aplikasi chat.';
 if(n<=6000)return k+' — aman untuk chat, tetapi terlalu panjang untuk QR.';
 return k+(f.type==='absensi'?' — cukup panjang, sebagian aplikasi chat bisa memotongnya. Gunakan tautan per kelompok atau per sesi.':' — cukup panjang, sebagian aplikasi chat bisa memotongnya. Kurangi jumlah pertanyaan atau opsi, atau bagi menjadi beberapa form.');
}
async function fmShare(){
 const f=fmCur();if(!f)return;fmSave(true);if(window.simdekaFormSyncNow){try{await window.simdekaFormSyncNow();}catch(e){showToast('Gagal menyimpan form ke server');return;}}
 const err=fmValidateShare(f);if(err){showToast(err);if(f.type==='absensi'&&fm.tab!=='q'){fm.tab='q';fmRenderEditor();}return;}
 fmEl('modalTitle').textContent='Kirim Formulir';fmEl('modalDesc').textContent=f.title;
 fmEl('modalBody').innerHTML='<div class="py-10 text-center text-sm text-slate-400">Membuat tautan…</div>';showModal();
 try{
  fmShareLinks=[{name:'Semua',url:await fmLink(f)}];
  if(f.type==='absensi'){const ks=[...new Set(f.absen.peserta.map(p=>p.k))];if(ks.length>1)for(const k of ks)fmShareLinks.push({name:k,n:f.absen.peserta.filter(p=>p.k===k).length,url:await fmLink(f,k)});}
  fmSesiLinks=[];
  if(f.type==='absensi'&&f.absen.rutin){for(const x of (f.absen.sesi||[]).filter(x=>x.tgl&&x.st!=='libur'))fmSesiLinks.push({tgl:x.tgl,label:fmSesiLabel(f,x.tgl),slug:fmLinkSlug(f,null,x.tgl),url:await fmLink(f,null,x.tgl)});}
 }catch(e){fmEl('modalBody').innerHTML='<div class="py-10 text-center text-sm text-red-600">Gagal membuat tautan.</div>';return;}
 const main=fmShareLinks[0],ab=f.type==='absensi',wa=t=>'https://wa.me/?text='+encodeURIComponent(t);
 const waText=ab?(f.absen.mode!=='petugas'?`Absensi ${f.absen.jenis} (${fmDateLong(f.absen.tanggal)}). Silakan isi kehadiran Anda lewat tautan ini:\n`:`Absensi ${f.absen.jenis} (${fmDateLong(f.absen.tanggal)}). Silakan isi kehadiran kelompok Anda:\n`):`${f.title}\nSilakan isi formulir berikut:\n`;
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  <div><div class="text-xs font-bold text-slate-600 mb-1.5">Tautan formulir</div>
   <div class="flex gap-2"><input id="fmLinkIn" readonly value="${esc(main.url)}" onfocus="this.select()" class="flex-1 min-w-0 border border-line rounded-xl px-3 py-2.5 text-xs bg-slate-50"><button onclick="fmCopyText(fmShareLinks[0].url,'Tautan disalin')" class="px-4 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-2">${icon('copy','w-4')} Salin</button><button onclick="fmQrPick('main')" class="px-4 rounded-xl border border-line text-navy text-xs font-bold flex items-center gap-2">${icon('qr-code','w-4')} QR</button></div>
   <p class="text-[11px] mt-1.5 ${main.url.length>6000?'text-amber-600 font-semibold':'text-slate-400'}">${fmLenNote(f,main.url.length)}</p></div>
  <div class="flex flex-wrap gap-2"><a target="_blank" rel="noopener" href="${wa(waText+main.url)}" class="h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2">${icon('message-circle','w-4')} Kirim via WhatsApp</a>
   <a target="_blank" rel="noopener" href="${esc(main.url)}" class="h-10 px-4 rounded-xl border border-line text-xs font-bold flex items-center gap-2">${icon('external-link','w-4')} Buka formulir</a></div>
  ${fmSesiLinks.length?`<div class="rounded-2xl border border-line"><div class="px-4 py-3 text-sm font-bold">Link per sesi <span class="font-normal text-slate-400 text-xs">— sudah terkunci ke tanggalnya, peserta tidak perlu memilih tanggal.</span></div>
   <div class="divide-y divide-line border-t border-line max-h-[300px] overflow-auto">${fmSesiLinks.map((l,i)=>`<div class="px-4 py-2.5 flex items-center gap-2 text-sm"><span class="flex-1 min-w-0"><span class="block truncate font-semibold">${esc(l.label)}</span><span class="block truncate text-[11px] text-slate-400">/f/…/${esc(l.tgl)}</span></span>
    <button onclick="fmCopyText(fmSesiLinks[${i}].url,'Link disalin')" class="h-8 px-3 rounded-lg border border-line text-xs font-bold">Salin</button>
    <button onclick="fmQrPick('sesi',${i})" title="QR code" class="h-8 px-3 rounded-lg border border-line text-xs font-bold text-navy flex items-center gap-1">${icon('qr-code','w-3.5 h-3.5')}QR</button>
    <a target="_blank" rel="noopener" href="${wa('Absensi '+esc(l.label).replace(/&amp;/g,'&')+'. Silakan isi kehadiran Anda:\n'+l.url)}" class="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold grid place-items-center">WA</a></div>`).join('')}</div>
   ${fmSesiLinks.some(l=>l.url.length>6000)?'<p class="px-4 py-2 text-[11px] text-amber-600 font-semibold border-t border-line">Sebagian link cukup panjang karena memuat seluruh peserta; batasi kelompok bila terpotong di aplikasi chat.</p>':''}</div>`:''}
  ${fmShareLinks.length>1?`<details class="rounded-2xl border border-line"><summary class="px-4 py-3 text-sm font-bold cursor-pointer">Tautan per kelompok <span class="font-normal text-slate-400 text-xs">— lebih pendek, hanya memuat nama kelompok tsb.</span></summary>
   <div class="divide-y divide-line border-t border-line">${fmShareLinks.slice(1).map((l,i)=>`<div class="px-4 py-2.5 flex items-center gap-2 text-sm"><span class="flex-1 min-w-0 truncate font-semibold">${esc(l.name)} <span class="text-[11px] text-slate-400 font-normal">${l.n} nama</span></span><button onclick="fmCopyText(fmShareLinks[${i+1}].url,'Tautan ${esc(l.name).replace(/'/g,'')} disalin')" class="h-8 px-3 rounded-lg border border-line text-xs font-bold">Salin</button><button onclick="fmQrPick('kel',${i+1})" title="QR code" class="h-8 px-3 rounded-lg border border-line text-xs font-bold text-navy flex items-center gap-1">${icon('qr-code','w-3.5 h-3.5')}QR</button><a target="_blank" rel="noopener" href="${wa(waText.replace('kelompok Anda','kelompok '+l.name)+l.url)}" class="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold grid place-items-center">WA</a></div>`).join('')}</div></details>`:''}
  ${fileModeWarn()}
  <div class="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-900 leading-relaxed space-y-1.5">
   <div class="font-bold flex items-center gap-1.5">${icon('info','w-4')} Cara kerja tautan</div>
   <p>Tautan berbentuk pendek (<code>/f/…</code>) dan membuka formulir lewat alamat aplikasi, jadi bisa dibuka siapa saja tanpa login selama aplikasi diakses lewat server/hosting.${ab?' Daftar peserta adalah kondisi database saat tautan dibuat — bagikan ulang jika ada perubahan data.':''}</p>
   <p>${FM_SYNC_URL?'Tanggapan dikirim otomatis ke server. Klik <b>Sinkronkan</b> di tab tanggapan untuk menariknya.':'Tanggapan disimpan otomatis di server. Setelah mengirim, pengisi mendapat <b>Kode Tanggapan</b> untuk dikirim ke admin (mis. via WhatsApp); admin menempelkannya di <b>Impor Kode</b>.'}</p></div></div>`;
 lucide.createIcons();
}
async function fmPreview(){
 const f=fmCur();if(!f)return;
 if(f.type==='absensi'){f.absen.peserta=fmBuildPeserta(f.absen);fmSave(true);}
 pfOpen(fmSanitize(JSON.parse(JSON.stringify(f))),true);
}

/* =====================================================================
   HALAMAN PUBLIK (dibuka dari tautan #/f/...) — tanpa login
   ===================================================================== */
let pf={};
function pfRoot(){return fmEl('publicForm');}
function fmRoute(){const m=/^#\/f\/(?:[a-z0-9-]+\.)?([A-Za-z0-9_-]+)$/.exec(location.hash);return m?m[1]:null;}
function pfBox(inner,f){
 const c=fmColor(f&&f.color);
 return `<div class="min-h-full py-5 sm:py-8 px-3 pf-modern" style="--fc:${c};background:color-mix(in srgb,${c} 9%,#f8f9fa)">
  ${pf.preview?`<div class="sticky top-0 z-20 -mt-5 sm:-mt-8 mb-4 -mx-3 px-4 py-2.5 bg-slate-900 text-white text-xs flex items-center justify-between gap-3"><span class="font-semibold">Mode pratinjau — tanggapan tidak disimpan</span><button onclick="pfClosePreview()" class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 font-bold">Tutup pratinjau</button></div>`:''}
  <div class="mx-auto space-y-4" style="max-width:${f&&f.type==='absensi'?((f.absen.mode==='petugas'||pf.as==='petugas')?'760':'520'):'640'}px">${f&&f.type==='absensi'?`<div class="pf-brand"><i>${icon('calendar-check','w-4 h-4')}</i>SIMDEKA • ABSENSI PENGAJIAN<span id="pfLive">${pfLiveBadge()}</span></div>`:(pfIsJr(f)?`<div class="pf-brand"><i>${icon('notebook-pen','w-4 h-4')}</i>SIMDEKA • JURNAL PENGAJIAN</div>`:`<div class="pf-brand"><i>${icon('file-text','w-4 h-4')}</i>SIMDEKA • FORMULIR</div>`)}${pf.edit&&!pf.done?pfEditBar():''}${inner}
   <div class="text-center text-[11px] text-slate-400 pt-2">SIMDEKA • Sistem Informasi dan Manajemen Data Desa Karangmojo</div></div></div>`;
}
function pfShow(on){
 pfRoot().classList.toggle('hidden',!on);
 document.body.style.overflow=on&&pf.preview?'hidden':'';
}
function pfOpen(f,preview){pf={f:f,preview:!!preview,page:0,hist:[],shuf:{},ans:{},err:{},done:null,kel:'',pj:'',marks:{},q:'',who:-1,st:'',step:'',tg:'',j:pfJ0()};pfInit();pfShow(true);pfRoot().scrollTop=0;pfLiveStart();}
function pfClosePreview(){clearInterval(PF_T);pfShow(false);pf={};}
function pfInit(){
 const f=pf.f;
 if(f.type==='absensi'){
  const kels=[...new Set(f.absen.peserta.map(p=>p.k))];
  if(kels.length===1)pf.kel=kels[0];
  pfPickTg();
  if(!pf.preview){try{const d=JSON.parse(localStorage.getItem(FM_DRAFT+f.id)||'null');if(d){pf.pj=fmS(d.pj,80);if(kels.includes(d.kel))pf.kel=d.kel;pf.marks=(d.tg===pf.tg&&d.marks&&typeof d.marks==='object')?d.marks:{};if(d.tg===pf.tg&&d.j&&typeof d.j==='object')pf.j=Object.assign(pfJ0(),{materi:fmS(d.j.materi,1500),nasehat:fmS(d.j.nasehat,1500),catatan:fmS(d.j.catatan,1500),surat:fmS(d.j.surat,120),ayat:fmS(d.j.ayat,60),hadist:fmS(d.j.hadist,160),hal:fmS(d.j.hal,60),nas:(d.j.nas==='sudah'||d.j.nas==='belum'||d.j.nas==='tidak')?d.j.nas:'',nsp:fmS(d.j.nsp,120),kendala:fmS(d.j.kendala,1500)});}}catch(e){}}
 } else pf.pages=pfPages(f);
 pfRender();
}
function pfPages(f){const pg=[[]];f.items.forEach(it=>{if(it.kind==='section')pg.push([it]);else pg[pg.length-1].push(it);});return pg;}
function pfClosed(f){return !!(f.deadline&&!pf.preview&&Date.now()>new Date(f.deadline).getTime());}
/* ---------- Halaman jurnal pengajian desa (tautan /desa/jurnal/<bulan><tahun>) ---------- */
function pfIsJr(f){return !!f&&f.type==='custom'&&/^jdesa/.test(String(f.id||''));}
function pfEditBar(){return `<div class="pf-note ok flex flex-wrap items-center justify-between gap-3"><span class="flex items-center gap-2 font-semibold">${icon('pencil','w-4 h-4')} Anda sedang memperbarui isian yang sudah dikirim.</span><button onclick="pfEditCancel()" class="text-xs font-bold underline">Batal</button></div>`;}
function pfEditForm(){
 const d=pf.done;if(!d||!d.resp)return;
 const f=pf.f,r=d.resp;
 if(f.allowUpdate===false){showToast('Form ini tidak bisa diperbarui setelah dikirim.');return;}
 pf.edit={id:r.id,resp:r,code:d.code||'',upd:!!d.upd};pf.done=null;pf.jstep=false;pf.err={};
 if(f.type==='absensi'){
  pf.tg=r.tg||pf.tg;pf.kel=r.kel||pf.kel;pf.q='';
  if(pfEff()==='peserta'){
   const key=Object.keys(r.m||{})[0];
   pf.who=f.absen.peserta.findIndex(p=>fmKey(p.n,p.k)===key);pf.st=(r.m&&r.m[key])||'';pf.step=pf.who>=0?'hadir':'nama';
  }else{
   pf.pj=r.pj||pf.pj;pf.marks=Object.assign({},pf.marks,r.m||{});if(r.j)pf.j=Object.assign(pfJ0(),r.j);
  }
 }else{pf.page=0;pf.hist=[];}
 pfRender();pfTop();
 if(f.type==='absensi')pfLiveRefresh().then(()=>{pfLiveApply(true);pfCounts();});
}
function pfEditCancel(){
 const e=pf.edit;if(!e)return;const f=pf.f;
 if(f.type==='absensi'){Object.keys(e.resp.m||{}).forEach(k=>{delete pf.marks[k];});if(pfEff()!=='peserta')pf.j=pfJ0();pf.st='';}
 pf.done={resp:e.resp,code:e.code,upd:e.upd};pf.edit=null;pfRender();pfTop();
}
function pfChip(ic,t){return `<span class="pf-chip">${ic?icon(ic,'w-3.5 h-3.5'):''}${t}</span>`;}
function pfHero(o){
 return `<div class="pf-hero${o.ok?' ok':''}">
  ${o.ic?`<div class="pf-hero-ic">${icon(o.ic,'w-7 h-7')}</div>`:''}
  ${o.eyebrow?`<div class="pf-eyebrow">${o.eyebrow}</div>`:''}
  <h1>${o.title}</h1>
  ${o.sub?`<p class="pf-sub">${o.sub}</p>`:''}
  ${o.chips&&o.chips.length?`<div class="pf-chips">${o.chips.join('')}</div>`:''}
 </div>`;
}
function pfSec(ic,title,inner,o){
 o=o||{};
 return `<section class="pf-sec"><div class="pf-sec-h"><span class="pf-sec-ic">${icon(ic,'w-5 h-5')}</span><div class="min-w-0">${o.eyebrow?`<div class="pf-eyebrow-d">${o.eyebrow}</div>`:''}<h2>${title}</h2>${o.sub?`<p>${o.sub}</p>`:''}</div></div><div class="${o.cls||'grid gap-4 sm:grid-cols-2'}">${inner}</div></section>`;
}
function pfJenisChips(a){return [pfChip('clipboard-pen',esc(a.jenis||'—')),pfChip('calendar',esc(fmDateLong(pf.tg||a.tanggal)))];}
function pfJrField(it,o){
 o=o||{};
 const id=it.id,v=pf.ans[id]||'',e=pf.err[id],msg=(pf.errm&&pf.errm[id])||'Kolom ini wajib diisi';
 const ctl=o.long
  ?`<textarea rows="4" maxlength="3000" placeholder="${esc(o.ph||'')}" class="mt-1.5 block w-full resize-none leading-relaxed ${e?'pf-bad':''}" oninput="pfSet('${id}',this.value)">${esc(v)}</textarea>`
  :`<input maxlength="500" placeholder="${esc(o.ph||'')}" value="${esc(v)}" class="gf-ul mt-1.5 ${e?'pf-bad':''}" oninput="pfSet('${id}',this.value)">`;
 const tag=it.required?' <span class="text-rose-500">*</span>':' <span class="text-xs font-medium text-slate-400">(opsional)</span>';
 return `<div id="pq_${id}" class="${o.full?'sm:col-span-2':''}">
  <label class="pf-lab">${esc(it.title)}${tag}</label>
  ${ctl}
  ${e?`<p class="pf-err pf-err-t mt-2 flex items-center gap-1.5">${icon('circle-alert','w-3.5 h-3.5')} ${esc(msg)}</p>`:''}
 </div>`;
}
function pfJrSec(n,ic,title,inner){return pfSec(ic,title,inner,{eyebrow:'Bagian '+n});}
function pfJrHtml(){
 const f=pf.f,it=id=>f.items.find(x=>x.id===id)||{id:id,title:id,required:false};
 const tgl=esc(f.desc||'');
 const nErr=Object.keys(pf.err||{}).length;
 const head=pfHero({eyebrow:'Pengajian muda mudi desa',title:'Jurnal Pengajian Muda Mudi Desa',sub:`Lengkapi isian berikut sesuai materi yang disampaikan pada pengajian ${tgl}. Kolom bertanda * wajib diisi.`,chips:[pfChip('calendar-days','Pengajian '+tgl)]});
 const banner=nErr?`<div class="pf-note bad">${nErr} kolom wajib belum diisi. Periksa bagian yang ditandai di bawah.</div>`:'';
 const kit=it('kelas'),kops=kit.options||[],kv=pf.ans.kelas,ke=pf.err.kelas;
 const s0=kops.length?pfJrSec(1,'users-round','Kelas & penerobos',`<div id="pq_kelas" class="sm:col-span-2"><label class="pf-lab">Kelas <span class="text-rose-500">*</span></label><select class="mt-1.5 block w-full border border-[#dadce0] rounded-xl px-3 py-2.5 text-sm bg-white ${ke?'pf-bad':''}" onchange="pfSel('kelas',this.value)"><option value="">Pilih kelas</option>${kops.map((n,i)=>`<option value="${i}" ${kv===i?'selected':''}>${esc(n)}</option>`).join('')}</select>${ke?`<p class="pf-err pf-err-t mt-2 flex items-center gap-1.5">${icon('circle-alert','w-3.5 h-3.5')} Pilih kelas terlebih dahulu</p>`:''}<p class="text-[11px] text-slate-400 mt-1.5">Satu jurnal untuk satu kelas. Jika Anda penerobos beberapa kelas, kirim jurnal lagi untuk kelas berikutnya.</p></div>`+pfJrField(it('pen'),{ph:'Nama penerobos yang mengisi',full:true})):'';
 const n0=kops.length?1:0;
 const s1=pfJrSec(n0+1,'book-open',`Al-Qur'an pada pengajian ${tgl}`,pfJrField(it('surat'),{ph:'Contoh: Al-Baqarah'})+pfJrField(it('ayat'),{ph:'Contoh: 1–5'}));
 const s2=pfJrSec(n0+2,'scroll-text',`Al-Hadist pada pengajian ${tgl}`,pfJrField(it('hadist'),{ph:'Contoh: Hadist tentang niat',full:true})+pfJrField(it('hal'),{ph:'Contoh: 12'}));
 const s3=pfJrSec(n0+3,'hand-coins',`Infaq pada pengajian ${tgl}`,pfJrField(it('infaq'),{ph:'Contoh: Rp 20.000',full:true}));
 const s4=pfJrSec(n0+4,'notebook-pen',`Tambahan keterangan pengajian ${tgl}`,pfJrField(it('ket'),{long:true,full:true,ph:'Kendala, kegiatan lain, atau catatan untuk pengurus…'}));
 const foot=`<div class="pf-actions"><button onclick="pfNext()" class="gf-btn inline-flex items-center gap-2">${pf.edit?'Perbarui jurnal':'Kirim jurnal'} ${icon('send','w-4 h-4')}</button><span id="pfSubErr" class="pf-err-t"></span></div><p class="pf-foot">Setelah dikirim, jurnal tersimpan otomatis di server SIMDEKA.</p>`;
 return `${head}${banner}${s0}${s1}${s2}${s3}${s4}${foot}`;
}
function pfJrDoneHtml(){
 const f=pf.f,upd=!!(pf.done&&pf.done.upd);
 return pfHero({ok:1,ic:'check',eyebrow:'Jurnal pengajian muda mudi desa',title:upd?'Berhasil diperbarui':'Berhasil dikirim',sub:`Terima kasih. Jurnal pengajian ${esc(f.desc||'')} telah direkam.`})
  +`<div class="gf-card"><div class="p-5 sm:p-6 space-y-4"><div class="pf-note ${pf.preview?'mute':'ok'}">${pf.preview?'Pratinjau: tanggapan tidak disimpan.':'<b>Tanggapan tersimpan.</b> Jurnal Anda sudah tersimpan otomatis di server SIMDEKA.'}</div>
  <div class="pf-actions">${f.allowUpdate===false?'':`<button onclick="pfEditForm()" class="gf-btn inline-flex items-center gap-2">${icon('pencil','w-4 h-4')} Perbarui form</button>`}${f.allowAnother&&!pf.preview?`<button onclick="pfAgain()" class="text-sm font-bold hover:underline" style="color:var(--fc)">Kirim jurnal lain</button>`:''}</div>
  ${f.allowUpdate===false?'<p class="pf-foot">Isian yang sudah dikirim tidak dapat diubah lagi.</p>':`<p class="pf-foot">Ada yang keliru? Tekan <b>Perbarui form</b> untuk mengubah isian yang baru dikirim. Datanya langsung diganti, bukan ditambah.</p>`}</div></div>`;
}
function pfRender(){
 const f=pf.f,r=pfRoot();if(!f)return;
 let h;
 if(pfClosed(f))h=pfBox((f.type==='absensi'||pfIsJr(f))?pfHero({ic:'lock',eyebrow:'Ditutup',title:esc(f.title),sub:'Formulir ini sudah tidak menerima tanggapan.'}):`<div class="gf-card overflow-hidden" style="border-top:10px solid var(--fc)"><div class="p-6"><h1 class="text-2xl">${esc(f.title)}</h1><p class="mt-3 text-sm text-slate-600">Formulir ini sudah tidak menerima tanggapan.</p></div></div>`,f);
 else if(pf.done)h=pfBox(pfIsJr(f)?pfJrDoneHtml():pfDoneHtml(),f);
 else h=pfBox(f.type==='absensi'?pfAbsenHtml():(pfIsJr(f)?pfJrHtml():pfCustomHtml()),f);
 r.innerHTML=h;lucide.createIcons();
 r.querySelectorAll('textarea.pf-ta').forEach(fmGrow);
}
function pfTop(){const r=pfRoot();if(r)r.scrollTo({top:0,behavior:'smooth'});}

/* ---------- Form Umum ---------- */
function pfCustomHtml(){
 const f=pf.f,pages=pf.pages,pg=pages[pf.page],last=pf.page===pages.length-1,first=pf.page===0;
 const hasReq=f.items.some(x=>x.kind==='q'&&x.required);
 let h='';
 if(first)h+=`<div class="gf-card overflow-hidden" style="border-top:10px solid var(--fc)"><div class="p-6"><h1 class="text-[28px] leading-tight text-[#202124] break-words">${esc(f.title||'Formulir tanpa judul')}</h1>${f.desc?`<p class="mt-3 text-sm text-slate-600 whitespace-pre-line break-words">${esc(f.desc)}</p>`:''}${hasReq?'<p class="mt-4 text-xs text-red-600">* Menunjukkan pertanyaan yang wajib diisi</p>':''}</div></div>`;
 else{const s=pg[0];h+=`<div class="text-xs text-slate-500 px-1">${esc(f.title)}</div><div class="gf-card overflow-hidden" style="border-top:10px solid var(--fc)"><div class="p-6"><h2 class="text-[22px] text-[#202124]">${esc(s.title||'Bagian '+(pf.page+1))}</h2>${s.desc?`<p class="mt-2 text-sm text-slate-600 whitespace-pre-line">${esc(s.desc)}</p>`:''}</div></div>`;}
 pg.forEach((it,i)=>{if(!first&&i===0)return;h+=it.kind==='title'?`<div class="gf-card"><div class="p-5 sm:p-6"><div class="text-[20px] text-[#202124]">${esc(it.title)}</div>${it.desc?`<div class="text-sm text-slate-600 mt-1 whitespace-pre-line">${esc(it.desc)}</div>`:''}</div></div>`:(it.kind==='image'||it.kind==='video')?pfMedia(it):pfQ(it);});
 h+=`<div class="flex items-center justify-between gap-3 pt-1"><div class="flex gap-2">${first?'':`<button onclick="pfBack()" class="gf-btn-o">Kembali</button>`}<button id="pfNextBtn" onclick="pfNext()" class="gf-btn">${pfGoTarget()<0?(pf.edit?'Perbarui':'Kirim'):'Berikutnya'}</button></div>
  ${pages.length>1?`<div class="flex-1 max-w-[180px] hidden sm:block"><div class="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div class="h-full" style="width:${Math.round((pf.page+1)/pages.length*100)}%;background:var(--fc)"></div></div><div class="text-[11px] text-slate-500 mt-1">Halaman ${pf.page+1} dari ${pages.length}</div></div>`:''}
  <button onclick="pfReset()" class="text-xs font-semibold text-[color:var(--fc)] hover:underline">Kosongkan formulir</button></div>`;
 return h;
}
function pfMedia(it){return `<div class="gf-card"><div class="p-5 sm:p-6">${it.title?`<div class="text-[15px] text-[#202124] mb-2">${esc(it.title)}</div>`:''}${it.kind==='video'?fmVideoHtml(it):(it.src?`<img src="${esc(it.src)}" alt="" class="max-w-full rounded-md">`:'')}</div></div>`;}
function pfQ(it){
 const err=pf.err[it.id];
 return `<div id="pq_${it.id}" class="gf-card" style="${err?'border-color:#d93025':''}"><div class="p-5 sm:p-6">
  <div class="text-[15px] font-medium text-[#202124] leading-snug break-words">${esc(it.title||'Pertanyaan tanpa judul')}${it.required?'<span class="text-red-600"> *</span>':''}</div>
  ${it.showDesc&&it.desc?`<div class="text-xs text-slate-500 mt-1 whitespace-pre-line">${esc(it.desc)}</div>`:''}
  ${fmQImgHtml(it,false)}
  <div class="mt-4">${pfInput(it)}</div>
  ${err?`<div class="pf-err mt-3 text-xs text-[#d93025] flex items-center gap-1.5">${icon('circle-alert','w-4 h-4')} ${esc((pf.errm&&pf.errm[it.id])||'Ini adalah pertanyaan yang wajib diisi')}</div>`:''}</div></div>`;
}
function pfInput(it){
 const id=it.id,v=pf.ans[id],o=esc(pf.ans[id+'o']||'');
 if(it.type==='short')return `<input class="gf-ul sm:w-1/2" maxlength="500" placeholder="Jawaban Anda" value="${esc(v||'')}" oninput="pfSet('${id}',this.value)">`;
 if(it.type==='long')return `<textarea rows="1" class="gf-ul pf-ta resize-none" maxlength="3000" placeholder="Jawaban Anda" oninput="pfSet('${id}',this.value);fmGrow(this)">${esc(v||'')}</textarea>`;
 if(it.type==='email')return `<input type="email" class="gf-ul sm:w-1/2" maxlength="200" placeholder="Jawaban Anda" value="${esc(v||'')}" oninput="pfSet('${id}',this.value)">`;
 if(it.type==='number')return `<input type="text" inputmode="decimal" class="gf-ul sm:w-1/3" maxlength="30" placeholder="Jawaban Anda" value="${esc(v||'')}" oninput="pfSet('${id}',this.value)">`;
 if(it.type==='rating'){const n=parseInt(v,10)||0;return `<div class="flex gap-1">${[1,2,3,4,5].map(k=>`<button type="button" onclick="pfRate('${id}',${k})" class="p-1 rounded hover:bg-slate-100" aria-label="${k} bintang">${fmStar(k<=n,34)}</button>`).join('')}</div>`;}
 if(it.type==='file'){
  const u=(pf.up||{})[id],du=pf.f.drive||fmDriveUrl();
  if(!du&&!pf.preview)return `<div class="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">Unggah file belum tersedia karena penyimpanan Drive belum diatur admin.</div>`;
  const acc={any:'',image:'image/*',pdf:'application/pdf',doc:'.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'}[it.fType]||'',lbl={any:'Semua jenis file',image:'Gambar',pdf:'PDF',doc:'Dokumen'}[it.fType]||'';
  const st=!u?'':u.st==='busy'?`<div class="mt-3 text-sm text-slate-600 flex items-center gap-2">${icon('loader-circle','w-4 h-4 animate-spin')} Mengunggah ${esc(u.name)}…</div>`
   :u.st==='err'?`<div class="mt-3 text-sm text-[#d93025] flex items-center gap-2">${icon('circle-alert','w-4 h-4')} ${esc(u.name)} — ${esc(u.msg||'Gagal')}</div>`
   :`<div class="mt-3 flex items-center gap-2 text-sm bg-slate-50 border border-[#dadce0] rounded-lg px-3 py-2">${icon('file-check','w-4 h-4 text-emerald-600')}<span class="flex-1 min-w-0 truncate">${esc(u.name)}${u.msg?` <span class="text-[11px] text-slate-400">— ${esc(u.msg)}</span>`:''}</span><button type="button" onclick="pfFileDel('${id}')" title="Hapus" class="w-7 h-7 rounded-full hover:bg-slate-200 grid place-items-center">${icon('x','w-4 h-4')}</button></div>`;
  return `<div><label class="gf-btn-o inline-flex items-center gap-2 cursor-pointer">${icon('upload','w-4 h-4')} Tambahkan file<input type="file" class="hidden" accept="${acc}" onchange="pfFile('${id}',this)"></label><div class="text-[11px] text-slate-500 mt-2">${lbl} • maks ${it.fMax||10} MB</div>${st}</div>`;}
 if(it.type==='date')return `<input type="date" class="gf-ul" style="width:auto" value="${esc(v||'')}" oninput="pfSet('${id}',this.value)">`;
 if(it.type==='time')return `<input type="time" class="gf-ul" style="width:auto" value="${esc(v||'')}" oninput="pfSet('${id}',this.value)">`;
 if(it.type==='select')return `<select class="border border-[#dadce0] rounded-md px-3 py-2.5 text-sm bg-white w-full sm:w-64" onchange="pfSel('${id}',this.value)"><option value="">Pilih</option>${pfOrder(it).map(i=>`<option value="${i}" ${v===i?'selected':''}>${esc(it.options[i])}</option>`).join('')}</select>`;
 if(it.type==='scale'){const r=[];for(let n=it.sMin;n<=it.sMax;n++)r.push(n);
  return `<div class="overflow-x-auto"><div class="flex items-end gap-3 sm:gap-5 min-w-max text-xs text-slate-600"><span class="pb-1 max-w-[80px]">${esc(it.sMinL)}</span>${r.map(n=>`<label class="flex flex-col items-center gap-2 cursor-pointer"><span>${n}</span><input type="radio" name="s_${id}" style="accent-color:var(--fc);width:18px;height:18px" ${String(v)===String(n)?'checked':''} onchange="pfSet('${id}','${n}')"></label>`).join('')}<span class="pb-1 max-w-[80px]">${esc(it.sMaxL)}</span></div></div>`;}
 /* radio & check */
 const chk=it.type==='check',arr=chk?(Array.isArray(v)?v:[]):null;
 const on=i=>chk?arr.includes(i):v===i;
 const row=(i,label)=>`<label class="flex items-center gap-3 py-2 cursor-pointer text-sm"><input type="${chk?'checkbox':'radio'}" name="r_${id}" style="accent-color:var(--fc);width:18px;height:18px;flex-shrink:0" ${on(i)?'checked':''} onchange="pf${chk?'Check':'Radio'}('${id}',${i}${chk?',this.checked':''})"><span class="break-words min-w-0">${label}</span></label>`;
 let h=pfOrder(it).map(i=>row(i,esc(it.options[i]))).join('');
 if(it.other)h+=`<div class="flex items-center gap-3 py-2 text-sm"><input type="${chk?'checkbox':'radio'}" name="r_${id}" style="accent-color:var(--fc);width:18px;height:18px;flex-shrink:0" ${on(-1)?'checked':''} onchange="pf${chk?'Check':'Radio'}('${id}',-1${chk?',this.checked':''})"><span>Lainnya:</span><input class="gf-ul flex-1" maxlength="200" value="${o}" oninput="pfOther('${id}',this.value)"></div>`;
 if(!chk&&!it.required&&v!==undefined)h+=`<button onclick="pfClear('${id}')" class="mt-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded px-2 py-1">Kosongkan pilihan</button>`;
 return h;
}
function pfUnerr(id){
 if(!pf.err[id])return;delete pf.err[id];
 const c=fmEl('pq_'+id);if(c){c.style.borderColor='';const e=c.querySelector('.pf-err');if(e)e.remove();}
}
function pfSet(id,v){pf.ans[id]=v;pfUnerr(id);}
function pfSel(id,v){if(v==='')delete pf.ans[id];else pf.ans[id]=parseInt(v,10);pfUnerr(id);pfUpdBtn();}
function pfRadio(id,i){pf.ans[id]=i;pfUnerr(id);const it=pf.f.items.find(x=>x.id===id);if(it&&!it.required)pfRefreshQ(id);pfUpdBtn();}
function pfCheck(id,i,on){const a=Array.isArray(pf.ans[id])?pf.ans[id].slice():[];const j=a.indexOf(i);if(on&&j<0)a.push(i);if(!on&&j>=0)a.splice(j,1);if(a.length)pf.ans[id]=a;else delete pf.ans[id];pfUnerr(id);}
function pfOther(id,v){pf.ans[id+'o']=v;pfUnerr(id);}
function pfRate(id,k){if(pf.ans[id]===String(k))delete pf.ans[id];else pf.ans[id]=String(k);pfUnerr(id);pfRefreshQ(id);}
async function pfFile(id,inp){
 const it=pf.f.items.find(x=>x.id===id),file=inp.files&&inp.files[0];inp.value='';if(!it||!file)return;
 pf.up=pf.up||{};const nm=file.name,lim=(it.fMax||10)*1048576,ty=it.fType||'any';
 const okT=ty==='any'||(ty==='image'&&/^image\//.test(file.type))||(ty==='pdf'&&(file.type==='application/pdf'||/\.pdf$/i.test(nm)))||(ty==='doc'&&/\.(pdf|docx?|xlsx?|pptx?|txt)$/i.test(nm));
 if(!okT){pf.up[id]={name:nm,st:'err',msg:'Jenis file tidak diizinkan'};return pfRefreshQ(id);}
 if(file.size>lim){pf.up[id]={name:nm,st:'err',msg:'Ukuran melebihi '+(it.fMax||10)+' MB'};return pfRefreshQ(id);}
 delete pf.ans[id];
 if(pf.preview){pf.up[id]={name:nm,st:'ok',msg:'pratinjau, tidak diunggah'};return pfRefreshQ(id);}
 pf.up[id]={name:nm,st:'busy'};pfRefreshQ(id);
 try{
  const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(new Error('baca'));r.readAsDataURL(file);});
  const rs=await fetch(pf.f.drive||fmDriveUrl(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'upload',form:pf.f.title||pf.f.id,name:nm,mime:file.type,data:b64})});
  const j=await rs.json();if(!j.ok)throw new Error(j.error||'gagal');
  pf.up[id]={name:nm,st:'ok',url:j.url};pf.ans[id]=[j.url];pfUnerr(id);
 }catch(e){pf.up[id]={name:nm,st:'err',msg:'Gagal mengunggah, coba lagi'};}
 pfRefreshQ(id);
}
function pfFileDel(id){delete pf.ans[id];if(pf.up)delete pf.up[id];pfRefreshQ(id);}
function pfClear(id){delete pf.ans[id];pfRefreshQ(id);pfUpdBtn();}
function pfRefreshQ(id){const it=pf.f.items.find(x=>x.id===id),c=fmEl('pq_'+id);if(!it||!c)return;c.outerHTML=pfQ(it);lucide.createIcons();}
async function pfReset(){if(!await uiConfirm({title:'Kosongkan semua jawaban?',message:'Semua isian di formulir ini akan dihapus dan kamu mulai dari awal.',ok:'Ya, Kosongkan',tone:'warning',icon:'eraser'}))return;pf.up={};pf.ans={};pf.err={};pf.page=0;pf.hist=[];pfRender();pfTop();}
function pfResolve(f){
 const out={};
 f.items.forEach(it=>{
  if(it.kind!=='q')return;const v=pf.ans[it.id],o=normNama(pf.ans[it.id+'o']||'');let r;
  if(it.type==='radio'||it.type==='select')r=v===undefined?'':(v===-1?o:(it.options[v]||''));
  else if(it.type==='check')r=(Array.isArray(v)?v:[]).map(i=>i===-1?o:(it.options[i]||'')).filter(Boolean);
  else if(it.type==='file')r=Array.isArray(v)?v.slice():[];
  else r=v==null?'':String(v).trim();
  out[it.id]=r;
 });
 return out;
}
function pfValidate(){
 const res=pfResolve(pf.f);pf.err={};pf.errm={};let first=null;
 pf.pages[pf.page].forEach(it=>{
  if(it.kind!=='q')return;const r=res[it.id];let bad=false;
  if(it.required)bad=Array.isArray(r)?!r.length:!String(r).trim();
  if(!bad&&(it.type==='radio'||it.type==='check')&&it.other){const v=pf.ans[it.id],hasO=v===-1||(Array.isArray(v)&&v.includes(-1));if(hasO&&!normNama(pf.ans[it.id+'o']||''))bad=true;}
  if(!bad&&(it.type==='email'||it.type==='number')&&String(r).trim()){const t=String(r).trim(),ok=it.type==='email'?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t):/^-?\d+([.,]\d+)?$/.test(t);if(!ok){bad=true;pf.errm[it.id]=it.type==='email'?'Masukkan alamat email yang valid':'Masukkan angka yang valid';}}
  if(!bad&&['short','long','number'].includes(it.type)&&String(r).trim()){const m=pfCheckVal(it,String(r).trim());if(m){bad=true;pf.errm[it.id]=m;}}
  if(!bad&&it.type==='file'&&(pf.up||{})[it.id]&&pf.up[it.id].st==='busy'){bad=true;pf.errm[it.id]='Tunggu unggahan file selesai';}
  if(bad){pf.err[it.id]=1;if(!first)first=it.id;}
 });
 return first;
}
function pfOrder(it){
 const n=it.options.length,a=[];for(let i=0;i<n;i++)a.push(i);
 if(!it.shuffle)return a;
 pf.shuf=pf.shuf||{};
 if(!pf.shuf[it.id]||pf.shuf[it.id].length!==n){for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}pf.shuf[it.id]=a;}
 return pf.shuf[it.id];
}
function pfCheckVal(it,t){
 const L=t.length;
 if(it.type==='number'){const n=parseFloat(t.replace(',','.'));if(it.vmin!==''&&n<it.vmin)return 'Nilai minimal '+it.vmin;if(it.vmax!==''&&n>it.vmax)return 'Nilai maksimal '+it.vmax;return '';}
 if(it.vt==='hp'&&!/^(\+62|62|0)8\d{8,12}$/.test(t.replace(/[\s\-]/g,'')))return 'Masukkan nomor HP yang valid (contoh 081234567890)';
 if(it.vt==='url'&&!/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(t))return 'Masukkan tautan yang valid (diawali http:// atau https://)';
 if(it.vt==='angka'&&!/^\d+$/.test(t))return 'Hanya boleh berisi angka';
 if(it.vmin!==''&&L<it.vmin)return 'Minimal '+it.vmin+' karakter';
 if(it.vmax!==''&&L>it.vmax)return 'Maksimal '+it.vmax+' karakter';
 return '';
}
function pfGoTarget(){
 const pg=pf.pages[pf.page]||[];let tgt='';
 pg.forEach(it=>{if(it.kind!=='q'||!it.branch||!['radio','select'].includes(it.type))return;const v=pf.ans[it.id];if(v===undefined||v<0)return;tgt=(it.go||[])[v]||'';});
 if(tgt==='end')return -1;
 if(tgt){const j=pf.pages.findIndex((q,k)=>k>pf.page&&q[0]&&q[0].id===tgt);if(j>0)return j;}
 return pf.page+1<pf.pages.length?pf.page+1:-1;
}
function pfUpdBtn(){const b=fmEl('pfNextBtn');if(b)b.textContent=pfGoTarget()<0?(pf.edit?'Perbarui':'Kirim'):'Berikutnya';}
function pfNext(){
 const e=pfValidate();if(e){pfRender();const c=fmEl('pq_'+e);if(c)c.scrollIntoView({block:'center',behavior:'smooth'});return;}
 const t=pfGoTarget();if(t<0){pfSubmit();return;}
 pf.hist.push(pf.page);pf.page=t;pfRender();pfTop();
}
function pfBack(){if(pf.page>0){pf.err={};pf.page=pf.hist.length?pf.hist.pop():pf.page-1;pfRender();pfTop();}}
async function pfSubmit(){
 const e=pfValidate();if(e){pfRender();const c=fmEl('pq_'+e);if(c)c.scrollIntoView({block:'center',behavior:'smooth'});return;}
 const ed=pf.edit,resp={id:'R'+fmRid(9),ts:Date.now(),a:pfResolve(pf.f)};if(ed)resp.rep=ed.id;
 if(pf.f.items.some(x=>x.branch)){const keep=new Set();pf.hist.concat([pf.page]).forEach(k=>(pf.pages[k]||[]).forEach(it=>keep.add(it.id)));Object.keys(resp.a).forEach(k=>{if(!keep.has(k))delete resp.a[k];});}
 if(!pf.preview){fmRespSave(pf.f.id,resp);fmSyncSend(pf.f.id,resp);}
 pf.done={resp:resp,code:'',upd:!!ed};pf.edit=null;pfRender();pfTop();
 try{pf.done.code=await fmCode(pf.f.id,resp);const b=fmEl('pfCode');if(b){b.value=pf.done.code;}}catch(x){}
}

/* ---------- Form Absensi ---------- */
function pfKels(){return [...new Set(pf.f.absen.peserta.map(p=>p.k))];}
function pfRows(){return pf.f.absen.peserta.map((p,i)=>({p:p,i:i})).filter(x=>x.p.k===pf.kel);}
function pfPickTg(){
 const a=pf.f.absen,t=fmToday();if(a.lock){pf.tg=a.lock;return;}if(!a.rutin){pf.tg=a.tanggal;return;}
 const S=(a.sesi||[]).filter(x=>x.tgl);if(!S.length){pf.tg=t;return;}
 if(S.some(x=>x.tgl===t)){pf.tg=t;return;}
 const past=S.filter(x=>x.st!=='libur'&&x.tgl<t).sort((x,y)=>x.tgl<y.tgl?1:-1)[0];
 pf.tg=(past||S.find(x=>x.st!=='libur')||S[0]).tgl;
}
function pfSetTg(t){pf.tg=t;pf.who=-1;pf.st='';pf.step='';pf.marks={};pf.q='';pf.srv=[];pfRender();pfLiveRefresh().then(()=>pfLiveApply(true));}
function pfTgBar(){
 const a=pf.f.absen;pf.libur=false;if(!a.rutin)return '';
 const S=(a.sesi||[]).filter(x=>x.tgl).sort((x,y)=>x.tgl<y.tgl?-1:1);if(!S.length)return '';
 const cur=S.find(x=>x.tgl===pf.tg);pf.libur=!!(cur&&cur.st==='libur');
 if(a.lock)return pf.libur?`<div class="gf-card"><div class="p-4 sm:p-5"><div class="pf-note"><b>Kegiatan pada tanggal ini ditiadakan (libur).</b>${cur.ket?' '+esc(cur.ket)+'.':''} Absensi tidak perlu diisi.</div></div></div>`:'';
 const opts=S.filter(x=>x.st!=='libur'||x.tgl===pf.tg).map(x=>`<option value="${x.tgl}" ${x.tgl===pf.tg?'selected':''}>${esc(fmDateLong(x.tgl))}${x.st==='libur'?' (libur)':(x.ket?' — '+esc(x.ket):'')}</option>`).join('');
 const note=pf.libur?`<div class="pf-note mt-3"><b>Kegiatan pada tanggal ini ditiadakan (libur).</b>${cur.ket?' '+esc(cur.ket)+'.':''} Absensi tidak perlu diisi.</div>`:(pf.tg!==fmToday()?`<div class="pf-note mute mt-3">Ini bukan tanggal hari ini. Pastikan tanggalnya sudah benar.</div>`:'');
 return `<div class="gf-card"><div class="p-4 sm:p-5"><label class="pf-lab">Absensi untuk tanggal</label><select onchange="pfSetTg(this.value)" class="mt-1.5 block w-full border border-[#dadce0] rounded-xl px-3 py-2.5 text-sm bg-white font-semibold">${opts}</select>${note}</div></div>`;
}
function pfAbsenHtml(){if(pf.jstep&&pfJurnalOn())return pfJurnalPage();const tb=pfTgBar();if(pf.libur)return tb;const sw=(pf.f.absen.mode==='both'&&pf.as)?`<div class="text-center"><button onclick="pfSetAs('')" class="text-xs font-bold underline" style="color:var(--fc)">Mengisi sebagai ${pf.as==='peserta'?'peserta':'petugas'} • ganti</button></div>`:'';return tb+pfAbsenBody()+sw;}
let PF_T=null;
function pfLiveBadge(){const l=pf.live;if(!l)return '<span class="pf-live">Memeriksa…</span>';return l.ok?'<span class="pf-live on"><i></i>Live</span>':'<span class="pf-live"><i></i>Mode perangkat</span>';}
async function pfLiveRefresh(){
 const f=pf.f;if(!f||f.type!=='absensi')return false;
 const ctl=window.AbortController?new AbortController():null,tm=ctl?setTimeout(()=>ctl.abort(),6000):0;
 try{
  const r=await fetch('/api/public/forms/'+encodeURIComponent(f.id)+'/status?tg='+encodeURIComponent(pf.tg||''),{cache:'no-store',signal:ctl?ctl.signal:undefined});
  if(!r.ok)throw new Error('x');const j=await r.json();
  pf.srv=Array.isArray(j.responses)?j.responses:[];pf.live={ok:true,ts:Date.now()};return true;
 }catch(e){pf.live={ok:false,ts:Date.now()};return false;}
 finally{if(tm)clearTimeout(tm);}
}
function pfLiveMap(){
 const f=pf.f,tg=pf.tg,seen=new Set(),L=[],all=(pf.srv||[]).concat(fmResp(f.id)),sup=new Set();
 all.forEach(r=>{if(r&&r.rep)sup.add(r.rep);});
 all.forEach(r=>{if(!r||!r.m||seen.has(r.id))return;seen.add(r.id);if(sup.has(r.id)||(pf.edit&&r.id===pf.edit.id))return;const t=r.tg||f.absen.tanggal;if(t!==tg)return;L.push(r);});
 L.sort((a,b)=>(a.ts||0)-(b.ts||0));
 const mp={};
 L.forEach(r=>{const multi=Object.keys(r.m).length>1;Object.keys(r.m).forEach(k=>{if(FM_ST[r.m[k]])mp[k]={s:r.m[k],by:multi?'petugas':'peserta',pj:r.pj||'',ts:r.ts||0};});});
 return mp;
}
function pfLockBadge(d){
 const c=d.s==='H'?'bg-emerald-50 text-emerald-700':d.s==='I'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700';
 return `<span class="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${c}">Sudah ${esc(FM_ST[d.s]||'')} • ${d.by==='petugas'?'petugas':'peserta'}</span>`;
}
function pfKelStatus(k){
 const mp=pfLiveMap(),rows=pf.f.absen.peserta.filter(p=>p.k===k);let done=0,by='',ts=0;
 rows.forEach(p=>{const d=mp[fmKey(p.n,p.k)];if(d){done++;if(d.by==='petugas'&&d.ts>=ts){ts=d.ts;by=d.pj;}}});
 return {n:rows.length,done:done,full:rows.length>0&&done===rows.length,by:by};
}
function pfKelOptions(){
 const a=pf.f.absen;
 return '<option value="">Pilih kelompok</option>'+pfKels().map((k,i)=>{const st=pfKelStatus(k);
  return `<option value="${i}" ${k===pf.kel?'selected':''} ${st.full&&k!==pf.kel?'disabled':''}>${esc(k)} (${a.peserta.filter(p=>p.k===k).length} nama)${st.full?' — sudah diisi oleh '+esc(st.by||'peserta'):''}</option>`;}).join('');
}
function pfFlash(){const m=pf.flash;pf.flash='';return m?`<div class="pf-note mb-3 font-semibold">${esc(m)}</div>`:'';}
function pfLiveApply(force){
 if(!pf.f||pf.done||pf.jstep||pf.f.type!=='absensi')return;
 const lv=fmEl('pfLive');if(lv)lv.innerHTML=pfLiveBadge();
 const ae=document.activeElement,typing=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA');
 const sel=fmEl('pfKel');if(sel&&ae!==sel)sel.innerHTML=pfKelOptions();
 const nm=fmEl('pfNames');if(nm&&!(typing&&!force))nm.innerHTML=pfNamesHtml();
 const lb=fmEl('pfListBox');
 if(lb&&pf.kel&&!(typing&&!force)){lb.innerHTML=pfListHtml();pfCounts();}
 lucide.createIcons();
}
function pfLiveStart(){
 clearInterval(PF_T);if(!pf.f||pf.f.type!=='absensi')return;
 pfLiveRefresh().then(()=>pfLiveApply(true));
 PF_T=setInterval(()=>{if(!pf.f){clearInterval(PF_T);return;}if(document.hidden||pf.done)return;pfLiveRefresh().then(()=>pfLiveApply(false));},8000);
}
function pfEff(){const m=pf.f.absen.mode;return m==='both'?(pf.as||''):m;}
function pfSetAs(v){pf.as=v;pf.who=-1;pf.st='';pf.q='';pf.step='';pf.jstep=false;pfRender();pfTop();}
function pfRolePick(){
 const f=pf.f,a=f.absen;
 return pfHero({eyebrow:'Absensi pengajian',title:esc(f.title),chips:pfJenisChips(a)})+`
  <div class="gf-card"><div class="p-5 sm:p-6"><h2 class="text-lg font-extrabold text-[#202124]">Anda mengisi sebagai apa?</h2><p class="text-sm text-slate-500 mt-1">Pilih cara mengisi absensi.</p>
   <div class="grid sm:grid-cols-2 gap-3 mt-4">
    <button onclick="pfSetAs('peserta')" class="pf-tile"><span class="w-10 h-10 rounded-xl grid place-items-center text-white mb-2" style="background:var(--fc)">${icon('user-check','w-5 h-5')}</span><span class="block font-extrabold text-sm">Peserta</span><span class="block text-[11px] text-slate-500 mt-1 leading-relaxed">Absen untuk diri sendiri: pilih kelompok dan nama, lalu Hadir atau Izin.</span></button>
    <button onclick="pfSetAs('petugas')" class="pf-tile"><span class="w-10 h-10 rounded-xl grid place-items-center text-white mb-2" style="background:var(--fc)">${icon('users','w-5 h-5')}</span><span class="block font-extrabold text-sm">Petugas</span><span class="block text-[11px] text-slate-500 mt-1 leading-relaxed">Mengisi absensi satu kelompok sekaligus untuk semua nama.</span></button></div></div></div>`;
}
function pfAbsenBody(){
 if(pf.f.absen.mode==='both'&&!pf.as)return pfRolePick();
 if(pfEff()==='peserta')return pfPesertaHtml();
 const f=pf.f,a=f.absen,kels=pfKels();
 if(pf.kel&&!normNama(pf.pj)){const _p=pfPetOf();if(_p){pf.pj=_p.l||_p.p;pf.pjAuto=true;}}
 let h=pfHero({eyebrow:pfJurnalOn()?'Langkah 1 dari 2 • Absensi':'Absensi pengajian',title:esc(f.title),chips:pfJenisChips(a)})+`
  <div class="gf-card"><div class="p-5 sm:p-6 space-y-5">
   <p class="pf-req">* Menunjukkan isian yang wajib diisi</p>
   <div><label class="pf-lab">Pilih Kelompok <span class="text-red-600">*</span></label>
    <select id="pfKel" onchange="pfSelKel(this.value)" class="mt-2 block w-full sm:w-80 border border-[#dadce0] rounded-md px-3 py-2.5 text-sm bg-white">${pfKelOptions()}</select></div>
   <div><label class="pf-lab">Nama Penanggung Jawab <span class="text-red-600">*</span></label>
    <input id="pfPj" class="gf-ul mt-1 sm:w-80" maxlength="80" placeholder="Nama Anda" value="${esc(pf.pj)}" oninput="pfPj(this.value)"><div id="pfPjErr" class="hidden mt-2 text-xs text-[#d93025]">Nama penanggung jawab wajib diisi</div><div id="pfPetBox">${pfPetBox()}</div></div></div></div>
  <div id="pfListBox">${pf.kel?pfListHtml():`<div class="gf-card"><div class="p-8 text-center text-sm text-slate-400">Pilih kelompok untuk menampilkan daftar nama.</div></div>`}</div>`;
 return h;
}
function pfListHtml(){
 const kst=pfKelStatus(pf.kel);
 if(kst.full)return `<div class="gf-card"><div class="p-8 text-center"><div class="w-14 h-14 mx-auto rounded-full grid place-items-center text-white" style="background:var(--fc)">${icon('lock','w-6 h-6')}</div><h2 class="mt-3 text-lg font-extrabold">${esc(pf.kel)} sudah diisi</h2><p class="text-sm text-slate-500 mt-1">Absensi kelompok ini sudah diisi oleh <b>${esc(kst.by||'peserta')}</b>. Hubungi admin bila perlu mengubahnya.</p></div></div>`;
 return `<div class="gf-card">
  <div class="sticky z-10 bg-white rounded-t-lg border-b border-[#dadce0] p-4 sm:p-5" style="top:${pf.preview?'40':'0'}px">
   <div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-bold text-[15px] truncate">${esc(pf.kel)}</div><div class="text-xs text-slate-500">${pfRows().length} peserta • pilih Hadir, Izin, atau Alpa</div></div>
    <button onclick="pfAllHadir()" class="shrink-0 px-3 py-2 rounded-lg border border-[#dadce0] text-xs font-bold hover:bg-slate-50">Isi sisanya Hadir</button></div>
   <div id="pfCnt" class="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold"></div>
   <input class="gf-ul mt-3" placeholder="Cari nama..." value="${esc(pf.q)}" oninput="pfSearch(this.value)"></div>
  <div id="pfRows">${pfRowsHtml()}</div></div>
  ${pfIsKmm()?'':pfJurnalHtml()}
  <div class="pf-actions"><button onclick="pfSubmitAbsen()" class="gf-btn">${pfJurnalOn()?'Lanjut: Isi Jurnal →':(pf.edit?'Perbarui Absensi':'Kirim Absensi')}</button><span id="pfSubErr" class="pf-err-t"></span></div>`;
}
function pfJurnalHtml(){
 const j=pf.j||{};
 return `<div class="gf-card"><div class="p-5 sm:p-6">
  <div class="text-[15px] font-bold text-[#202124]">Jurnal Kegiatan Kelompok <span class="text-xs font-semibold text-slate-400">(opsional)</span></div>
  <p class="text-xs text-slate-500 mt-1">Laporan ini akan masuk ke notulen musyawarah KMM Desa bulan ini.</p>
  <div class="mt-4 space-y-4">
   <div><label class="pf-lab">Materi yang disampaikan</label><textarea rows="2" maxlength="1500" class="mt-1.5 block w-full" placeholder="Contoh: Bab adab bergaul, halaman 12–15" oninput="pfJ('materi',this.value)">${esc(j.materi||'')}</textarea></div>
   <div><label class="pf-lab">Nasehat keimaman</label><textarea rows="2" maxlength="1500" class="mt-1.5 block w-full" placeholder="Ringkasan nasehat dari imam/pemateri" oninput="pfJ('nasehat',this.value)">${esc(j.nasehat||'')}</textarea></div>
   <div><label class="pf-lab">Catatan / laporan lainnya</label><textarea rows="2" maxlength="1500" class="mt-1.5 block w-full" placeholder="Kendala, kegiatan lain, usulan untuk desa…" oninput="pfJ('catatan',this.value)">${esc(j.catatan||'')}</textarea></div>
  </div></div></div>`;
}
function pfJ(k,v){pf.j=pf.j||{};pf.j[k]=fmS(v,1500);pfDraft();}
function pfJNas(v){
 pf.j=pf.j||{};pf.j.nas=v;if(v!=='sudah')pf.j.nsp='';pfDraft();
 const b=fmEl('pfNsp'),i=fmEl('pfNspIn');if(b)b.classList.toggle('hidden',v!=='sudah');if(i&&v!=='sudah')i.value='';else if(i)i.focus();
}
function pfJurnalOut(){
 const j=pf.j||{},o={materi:normNama(j.materi),nasehat:normNama(j.nasehat),catatan:normNama(j.catatan),surat:normNama(j.surat),ayat:normNama(j.ayat),hadist:normNama(j.hadist),hal:normNama(j.hal),nas:(j.nas==='sudah'||j.nas==='belum'||j.nas==='tidak')?j.nas:'',nsp:j.nas==='sudah'?normNama(j.nsp):'',kendala:normNama(j.kendala)};
 if(!o.materi&&(o.surat||o.hadist)){o.materi=[o.surat?'Al-Qur\'an: QS. '+o.surat+(o.ayat?' ayat '+o.ayat:''):'',o.hadist?'Al-Hadist: '+o.hadist+(o.hal?' hal. '+o.hal:''):''].filter(Boolean).join(' • ');}
 return (o.materi||o.nasehat||o.catatan||o.surat||o.hadist||o.nas||o.kendala)?o:null;
}
const PF_JURNAL_WAJIB=false;
function pfJ0(){return {materi:'',nasehat:'',catatan:'',surat:'',ayat:'',hadist:'',hal:'',nas:'',nsp:'',kendala:''};}
function pfJurnalOn(){const f=pf.f;return !!f&&f.type==='absensi'&&pfEff()==='petugas'&&((f.kmm&&f.kmm.j==='kelompok')||/^kelompok[a-z]+\d{4}$/.test(String(f.id||'')));}
function pfIsKmm(){const f=pf.f;return !!f&&f.type==='absensi'&&(!!f.kmm||/^(kelompok|desa|daerah)[a-z]+\d{4}$/.test(String(f.id||''))||/^musdes\d{8}$/.test(String(f.id||'')));}
function pfJBack(){pf.jstep=false;pfRender();pfCounts();pfTop();}
function pfJurnalPage(){
 const j=pf.j||{},a=pf.f.absen,c={H:0,I:0,A:0};
 pfRows().forEach(x=>{const st=pf.marks[fmKey(x.p.n,x.p.k)];if(st)c[st]++;});
 const inp=(k,lab,ph,mx,cls)=>`<div class="${cls||''}"><label class="pf-lab">${lab}</label><input class="gf-ul mt-1.5" maxlength="${mx}" placeholder="${ph}" value="${esc(j[k]||'')}" oninput="pfJ('${k}',this.value)"></div>`;
 const ta=(k,lab,ph)=>`<div><label class="pf-lab">${lab}</label><textarea rows="3" maxlength="1500" class="mt-1.5 block w-full" placeholder="${ph}" oninput="pfJ('${k}',this.value)">${esc(j[k]||'')}</textarea></div>`;
 const g3='grid gap-4 sm:grid-cols-3';
 const nasOpt=(v,l)=>`<label class="flex items-center gap-2.5 rounded-xl border border-[#dadce0] bg-white px-3.5 py-3 text-sm font-semibold cursor-pointer"><input type="radio" name="pfNas" value="${v}" ${j.nas===v?'checked':''} onchange="pfJNas('${v}')">${l}</label>`;
 return pfHero({eyebrow:'Langkah 2 dari 2',title:'Jurnal Capaian Pembelajaran',sub:esc(pf.kel)+' • '+esc(fmDateLong(pf.tg||a.tanggal)),chips:[pfChip('',`Hadir ${c.H}`),pfChip('',`Izin ${c.I}`),pfChip('',`Alpa ${c.A}`),pfChip('check','Absensi siap dikirim')]})
  +pfSec('book-open','Materi Al-Qur\'an',inp('surat','Surat apa','Contoh: Al-Baqarah',120,'sm:col-span-2')+inp('ayat','Ayat berapa','Contoh: 1–5',60),{cls:g3,eyebrow:'Bagian 1'})
  +pfSec('scroll-text','Materi Al-Hadist',inp('hadist','Hadist apa','Contoh: Hadist tentang niat',160,'sm:col-span-2')+inp('hal','Halaman berapa','Contoh: 12',60),{cls:g3,eyebrow:'Bagian 2'})
  +pfSec('message-circle','Nasehat keimaman',`<div class="grid gap-3 sm:grid-cols-3">${nasOpt('sudah','Sudah terlaksana')}${nasOpt('belum','Belum terlaksana')}${nasOpt('tidak','Tidak ada nasehat')}</div><div id="pfNsp" class="${j.nas==='sudah'?'':'hidden'}"><label class="pf-lab">Siapa pengisinya</label><input id="pfNspIn" class="gf-ul mt-1.5" maxlength="120" placeholder="Nama pengisi nasehat keimaman" value="${esc(j.nsp||'')}" oninput="pfJ('nsp',this.value)"></div>`,{cls:'space-y-4',eyebrow:'Bagian 3'})
  +pfSec('triangle-alert','Kendala pengajian',ta('kendala','Kendala yang dihadapi saat pengajian','Contoh: peserta sedikit, listrik padam, tempat dipakai acara lain. Kosongkan bila tidak ada kendala.'),{cls:'space-y-4',eyebrow:'Bagian 4'})
  +pfSec('notebook-pen','Catatan untuk desa <span class="text-xs font-semibold text-slate-400">(opsional)</span>',ta('catatan','Catatan / usulan lainnya','Kegiatan lain, usulan, atau permohonan bantuan untuk desa…'),{cls:'space-y-4',eyebrow:'Bagian 5'})
  +`<div class="pf-actions"><button onclick="pfJBack()" class="gf-btn-o">← Kembali</button><button onclick="pfSubmitAbsen(true)" class="gf-btn">${pf.edit?'Perbarui Absensi dan Jurnal':'Kirim Absensi dan Jurnal'}</button><span id="pfSubErr" class="pf-err-t"></span></div>`;
}
function pfRowsHtml(){
 const mp=pfLiveMap(),ord={};pfRows().forEach((x,n)=>{ord[x.i]=n+1;});const q=pf.q.trim().toLowerCase(),rows=pfRows().filter(x=>!q||x.p.n.toLowerCase().includes(q));
 if(!rows.length)return '<div class="p-8 text-center text-sm text-slate-400">Tidak ada nama yang cocok.</div>';
 return rows.map(x=>{const kk=fmKey(x.p.n,x.p.k),cur=pf.marks[kk],lk=mp[kk];
  return `<div id="pr_${x.i}" class="pf-row flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 border-b border-[#eee] last:border-0">
   <div class="flex-1 min-w-0 flex items-center gap-3"><span class="pf-no">${ord[x.i]}</span><div class="min-w-0"><div class="text-sm font-bold break-words">${esc(x.p.n)}</div><div class="text-[11px] text-slate-500 break-words">${esc(x.p.d)}</div></div></div>
   <div class="pf-marks">${lk?pfLockBadge(lk):[['H','h','Hadir'],['I','i','Izin'],['A','a','Alpa']].map(s=>`<label class="pf-pill"><input type="radio" name="m_${x.i}" value="${s[0]}" ${cur===s[0]?'checked':''} onchange="pfMark(${x.i},'${s[0]}')"><span class="${s[1]}">${s[2]}</span></label>`).join('')}</div></div>`;}).join('');
}

/* ---------- Form Absensi: diisi langsung peserta ---------- */
function pfSteps(){return pfKels().length>1?['kel','nama','hadir']:['nama','hadir'];}
function pfDoneMap(){const m={},mp=pfLiveMap();Object.keys(mp).forEach(k=>{m[k]=mp[k].s;});return m;}
function pfPesertaHtml(){
 const f=pf.f,a=f.absen,steps=pfSteps(),kels=pfKels(),lbl={kel:'Kelompok',nama:'Nama',hadir:'Kehadiran'};
 let cur=steps.includes(pf.step)?pf.step:steps[0];
 if(cur!=='kel'&&!pf.kel)cur=steps[0];
 if(cur==='hadir'&&!a.peserta[pf.who])cur='nama';
 pf.step=cur;const idx=steps.indexOf(cur);
 const head=pfHero({eyebrow:'Absensi pengajian',title:esc(f.title),chips:pfJenisChips(a)});
  const stepper=`<div class="flex items-center px-1 py-1">${steps.map((s,i)=>{const done=i<idx,on=i===idx,fill=done||on;
  return (i?`<div class="flex-1 h-0.5 mx-2 rounded ${i<=idx?'':'bg-slate-200'}" ${i<=idx?'style="background:var(--fc)"':''}></div>`:'')+
  `<button ${done?`onclick="pfGoStep('${s}')"`:'tabindex="-1"'} class="flex items-center gap-2 ${done?'cursor-pointer':'cursor-default'}"><span class="w-8 h-8 rounded-full grid place-items-center text-xs font-bold border-2 ${fill?'text-white':'text-slate-400 border-slate-300 bg-white'}" ${fill?'style="background:var(--fc);border-color:var(--fc)"':''}>${done?icon('check','w-4 h-4'):i+1}</span><span class="text-xs font-bold ${on?'text-[#202124]':'text-slate-400 hidden sm:inline'}">${lbl[s]}</span></button>`;}).join('')}</div>`;
 let body='';
 if(cur==='kel'){
  body=`<h2 class="text-lg font-extrabold text-[#202124]">Anda dari kelompok mana?</h2><p class="text-sm text-slate-500 mt-1">Ketuk salah satu kelompok.</p>
   <div class="grid grid-cols-2 gap-3 mt-4">${kels.map((k,i)=>`<button onclick="pfPickKel(${i})" class="pf-tile"><span class="block font-extrabold text-sm break-words">${esc(k)}</span><span class="block text-[11px] text-slate-500 mt-1">${a.peserta.filter(p=>p.k===k).length} nama</span></button>`).join('')}</div>`;
 } else if(cur==='nama'){
  body=`${pfFlash()}<div class="flex items-start justify-between gap-3"><div class="min-w-0"><h2 class="text-lg font-extrabold text-[#202124]">Pilih nama Anda</h2><p class="text-sm text-slate-500 mt-1 break-words">${esc(pf.kel)} • ${pfRows().length} nama</p></div>
    ${kels.length>1?`<button onclick="pfGoStep('kel')" class="shrink-0 text-xs font-bold px-3 py-2 rounded-full border border-[#dadce0] bg-white" style="color:var(--fc)">Ganti kelompok</button>`:''}</div>
   <div class="mt-4 h-12 rounded-2xl border border-[#dadce0] bg-white flex items-center px-4 gap-2">${icon('search','w-4 h-4 text-slate-400')}<input id="pfQ" value="${esc(pf.q)}" oninput="pfNameSearch(this.value)" autocomplete="off" placeholder="Ketik untuk mencari nama…" class="w-full text-sm bg-transparent outline-none"></div>
   <div id="pfNames" class="mt-3 rounded-2xl border border-[#eee] overflow-hidden bg-white">${pfNamesHtml()}</div>
   <p class="text-[11px] text-slate-400 mt-3 text-center">Nama Anda tidak ada? Hubungi pengurus.</p>`;
 } else {
  const p=a.peserta[pf.who],prev=pfDoneMap()[fmKey(p.n,p.k)];
  body=`<div class="text-center">
    <h2 class="mt-3 text-xl font-extrabold text-[#202124] break-words">${esc(p.n)}</h2>
    <p class="text-xs text-slate-500 mt-1 break-words">${esc(p.k)}${p.d?' • '+esc(p.d):''}</p>
    <button onclick="pfGoStep('nama')" class="mt-2 text-xs font-bold underline" style="color:var(--fc)">Bukan Anda? Ganti nama</button></div>
   ${prev?`<div class="pf-note mt-4 text-center">Perangkat ini sudah pernah mencatat <b>${FM_ST[prev]}</b> untuk nama ini. Mengirim lagi akan memperbarui.</div>`:''}
   <div class="mt-5 text-sm font-bold text-center text-[#202124]">Bagaimana kehadiran Anda?</div>
   <div class="grid grid-cols-2 gap-3 mt-3">
    <button data-s="H" onclick="pfPickSt('H')" class="pf-st h ${pf.st==='H'?'on':''}"><span class="ic">${icon('check','w-6 h-6')}</span>Hadir</button>
    <button data-s="I" onclick="pfPickSt('I')" class="pf-st i ${pf.st==='I'?'on':''}"><span class="ic">${icon('mail','w-6 h-6')}</span>Izin</button></div>
   <button onclick="pfSubmitSelf()" class="gf-btn w-full mt-5 py-3.5 text-[15px]" style="border-radius:14px">${pf.edit?'Perbarui Absensi':'Kirim Absensi'}</button>
   <div id="pfSubErr" class="text-center text-xs text-[#d93025] font-semibold mt-2 min-h-[1rem]"></div>`;
 }
 return head+`<div class="gf-card"><div class="p-4 sm:p-5">${stepper}</div></div><div class="gf-card"><div class="p-5 sm:p-6">${body}</div></div>`;
}
function pfNamesHtml(){
 const ord={};pfRows().forEach((x,n)=>{ord[x.i]=n+1;});
 const q=pf.q.trim().toLowerCase(),rows=pfRows().filter(x=>!q||x.p.n.toLowerCase().includes(q)),mp=pfLiveMap();
 if(!rows.length)return '<div class="p-8 text-center text-sm text-slate-400">Tidak ada nama yang cocok.</div>';
 return rows.map(x=>{const d=mp[fmKey(x.p.n,x.p.k)];
  return `<button ${d?'disabled':`onclick="pfPickName(${x.i})"`} class="pf-name"><span class="pf-no">${ord[x.i]}</span>
   <span class="flex-1 min-w-0"><span class="block text-sm font-bold break-words">${esc(x.p.n)}</span>${x.p.d?`<span class="block text-[11px] text-slate-500 break-words">${esc(x.p.d)}</span>`:''}</span>
   ${d?pfLockBadge(d):icon('chevron-right','w-4 h-4 text-slate-300 shrink-0')}</button>`;}).join('');
}
function pfGoStep(s){pf.step=s;if(s==='kel'||s==='nama'){pf.who=-1;pf.st='';pf.q='';}pfRender();pfTop();}
function pfPickKel(i){const k=pfKels()[i];if(!k)return;pf.kel=k;pf.q='';pf.who=-1;pf.st='';pf.step='nama';pfRender();pfTop();}
function pfPickName(i){pf.who=i;pf.st='';pf.step='hadir';pfRender();pfTop();}
function pfNameSearch(v){pf.q=v;const b=fmEl('pfNames');if(b){b.innerHTML=pfNamesHtml();lucide.createIcons();}}
function pfPickSt(s){pf.st=s;pfRoot().querySelectorAll('.pf-st').forEach(b=>b.classList.toggle('on',b.dataset.s===s));const e=fmEl('pfSubErr');if(e)e.textContent='';}
async function pfSubmitSelf(){
 const f=pf.f,p=f.absen.peserta[pf.who];
 if(!p||p.k!==pf.kel){pfGoStep('nama');return;}
 if(!pf.st){const e=fmEl('pfSubErr');if(e)e.textContent='Pilih Hadir atau Izin terlebih dahulu.';return;}
 await pfLiveRefresh();
 if(pfLiveMap()[fmKey(p.n,p.k)]){pf.flash='Nama ini baru saja tercatat oleh orang lain, jadi tidak bisa diisi lagi.';pf.st='';pfGoStep('nama');return;}
 const m={};m[fmKey(p.n,p.k)]=pf.st;
 const ed=pf.edit,resp={id:'R'+fmRid(9),ts:Date.now(),kel:p.k,pj:normNama(p.n),tg:pf.tg,m:m};if(ed)resp.rep=ed.id;
 if(!pf.preview){fmRespSave(f.id,resp);fmSyncSend(f.id,resp);}
 pf.done={resp:resp,upd:!!ed};pf.edit=null;pfRender();pfTop();
}

function pfCounts(){
 const el=fmEl('pfCnt');if(!el)return;
 const c={H:0,I:0,A:0,N:0},mp=pfLiveMap();pfRows().forEach(x=>{const kk=fmKey(x.p.n,x.p.k),s=(mp[kk]&&mp[kk].s)||pf.marks[kk];if(s)c[s]++;else c.N++;});
 el.innerHTML=`<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Hadir ${c.H}</span><span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Izin ${c.I}</span><span class="px-2.5 py-1 rounded-full bg-red-50 text-red-700">Alpa ${c.A}</span><span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Belum ${c.N}</span>`;
}
function pfDraft(){if(pf.preview)return;try{localStorage.setItem(FM_DRAFT+pf.f.id,JSON.stringify({pj:pf.pj,kel:pf.kel,tg:pf.tg,marks:pf.marks,j:pf.j}));}catch(e){}}
function pfPj(v){pf.pj=v;pf.pjAuto=false;pfDraft();const e=fmEl('pfPjErr');if(e&&normNama(v))e.classList.add('hidden');}
/* petugas default (Mubaligh / Mubalighot) pada form absensi publik */
function pfPetOf(){const f=pf.f,p=f&&f.absen&&f.absen.pet&&pf.kel?f.absen.pet[pf.kel]:null;return p&&(p.l||p.p)?p:null;}
function pfPetBox(){
 const p=pfPetOf();if(!p)return '';
 const b=(lab,n)=>n?`<button type="button" onclick="pfPetPick(this)" data-n="${esc(n)}" class="px-3 py-1.5 rounded-full border text-xs font-semibold" style="${normNama(pf.pj)===n?'background:var(--fc);color:#fff;border-color:transparent':'border-color:#dadce0;color:#3c4043;background:#fff'}"><span style="opacity:.7">${lab}</span> ${esc(n)}</button>`:'';
 return `<div class="mt-2 flex flex-wrap items-center gap-1.5"><span class="text-[11px] text-slate-400">Petugas default:</span>${b('Mubaligh',p.l)}${b('Mubalighot',p.p)}</div>`;
}
function pfPetFill(){
 const p=pfPetOf();
 if(!normNama(pf.pj)||pf.pjAuto){pf.pj=p?(p.l||p.p):'';pf.pjAuto=!!p;}
 const i=fmEl('pfPj');if(i)i.value=pf.pj;
 const bx=fmEl('pfPetBox');if(bx)bx.innerHTML=pfPetBox();
 pfDraft();
}
function pfPetPick(b){
 pf.pj=b.dataset.n;pf.pjAuto=false;
 const i=fmEl('pfPj');if(i)i.value=pf.pj;
 const e=fmEl('pfPjErr');if(e)e.classList.add('hidden');
 const bx=fmEl('pfPetBox');if(bx)bx.innerHTML=pfPetBox();
 pfDraft();
}
function pfSelKel(i){
 const k=pfKels()[parseInt(i,10)];pf.kel=k||'';pf.q='';pfDraft();pfPetFill();
 const b=fmEl('pfListBox');if(!b)return;
 b.innerHTML=pf.kel?pfListHtml():`<div class="gf-card"><div class="p-8 text-center text-sm text-slate-400">Pilih kelompok untuk menampilkan daftar nama.</div></div>`;
 pfCounts();lucide.createIcons();
}
function pfSearch(v){pf.q=v;const b=fmEl('pfRows');if(b)b.innerHTML=pfRowsHtml();}
function pfMark(i,s){
 const p=pf.f.absen.peserta[i];if(!p)return;
 pf.marks[fmKey(p.n,p.k)]=s;pfDraft();pfCounts();
 const r=fmEl('pr_'+i);if(r)r.classList.remove('err');
}
function pfAllHadir(){
 const mp=pfLiveMap();pfRows().forEach(x=>{const k=fmKey(x.p.n,x.p.k);if(!pf.marks[k]&&!mp[k])pf.marks[k]='H';});
 pfDraft();const b=fmEl('pfRows');if(b)b.innerHTML=pfRowsHtml();pfCounts();
}
async function pfSubmitAbsen(fromJ){
 const f=pf.f,err=fmEl('pfSubErr');
 if(!pf.kel){showToastPf('Pilih kelompok terlebih dahulu');return;}
 if(!normNama(pf.pj)){const e=fmEl('pfPjErr');if(e)e.classList.remove('hidden');const i=fmEl('pfPj');if(i){i.focus();i.scrollIntoView({block:'center',behavior:'smooth'});}return;}
 const before=pfLiveMap();await pfLiveRefresh();const mp=pfLiveMap();
 const allRows=pfRows(),rows=allRows.filter(x=>!mp[fmKey(x.p.n,x.p.k)]);
 const taken=allRows.filter(x=>{const k=fmKey(x.p.n,x.p.k);return mp[k]&&!before[k]&&pf.marks[k];});
 if(taken.length||!rows.length){
  pf.jstep=false;pfRender();pfCounts();pfTop();
  const e2=fmEl('pfSubErr');if(e2)e2.textContent=rows.length?taken.length+' nama baru saja diisi orang lain dan dikunci. Periksa lagi, lalu kirim.':'Semua nama di kelompok ini sudah diisi.';
  return;
 }
 const miss=rows.filter(x=>!pf.marks[fmKey(x.p.n,x.p.k)]);
 if(miss.length){
  if(pf.q){pf.q='';const b=fmEl('pfRows');if(b)b.innerHTML=pfRowsHtml();}
  miss.forEach(x=>{const r=fmEl('pr_'+x.i);if(r)r.classList.add('err');});
  if(err)err.textContent=miss.length+' nama belum dipilih.';
  const r=fmEl('pr_'+miss[0].i);if(r)r.scrollIntoView({block:'center',behavior:'smooth'});return;
 }
 if(pfJurnalOn()&&!fromJ){pf.jstep=true;pfRender();pfTop();return;}
 if(fromJ&&pf.j&&pf.j.nas==='sudah'&&!normNama(pf.j.nsp)){showToastPf('Isi nama pengisi nasehat keimaman.');const i=fmEl('pfNspIn');if(i){i.focus();i.scrollIntoView({block:'center',behavior:'smooth'});}return;}
 if(fromJ&&PF_JURNAL_WAJIB&&!(normNama(pf.j.surat)&&normNama(pf.j.hadist))){showToastPf('Isi surat Al-Qur\'an dan hadist terlebih dahulu.');return;}
 const m={};rows.forEach(x=>{const k=fmKey(x.p.n,x.p.k);m[k]=pf.marks[k];});
 const ed=pf.edit,resp={id:'R'+fmRid(9),ts:Date.now(),kel:pf.kel,pj:normNama(pf.pj),tg:pf.tg,m:m};if(ed)resp.rep=ed.id;
 if(pfJurnalOn()||!pfIsKmm()){const jo=pfJurnalOut();if(jo)resp.j=jo;}
 if(!pf.preview){fmRespSave(f.id,resp);fmSyncSend(f.id,resp);rows.forEach(x=>{delete pf.marks[fmKey(x.p.n,x.p.k)];});pf.j=pfJ0();pfDraft();}
 pf.done={resp:resp,upd:!!ed};pf.edit=null;pfRender();pfTop();
}
function showToastPf(t){const e=fmEl('pfSubErr');if(e)e.textContent=t;else showToast(t);}

/* ---------- layar sukses ---------- */
function pfDoneHtml(){
 const f=pf.f,d=pf.done,ab=f.type==='absensi',upd=!!d.upd;
 let sum='';
 if(ab&&pfEff()==='peserta'){const s=Object.values(d.resp.m)[0],ok=s==='H';sum=`<div class="rounded-2xl border ${ok?'border-emerald-200 bg-emerald-50':'border-amber-200 bg-amber-50'} p-4 flex items-center gap-3"><div class="min-w-0 flex-1"><div class="font-extrabold text-sm break-words">${esc(d.resp.pj)}</div><div class="text-[11px] text-slate-500 break-words">${esc(d.resp.kel)}</div></div><span class="px-3 py-1.5 rounded-full text-xs font-bold ${ok?'bg-emerald-600 text-white':'bg-amber-500 text-white'}">${FM_ST[s]||''}</span></div>`;}
 else if(ab){const c={H:0,I:0,A:0};Object.values(d.resp.m).forEach(s=>c[s]++);sum=`<div class="flex flex-wrap gap-2 text-xs font-bold"><span class="px-3 py-1.5 rounded-full bg-slate-100">${esc(d.resp.kel)}</span><span class="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700">Hadir ${c.H}</span><span class="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">Izin ${c.I}</span><span class="px-3 py-1.5 rounded-full bg-red-50 text-red-700">Alpa ${c.A}</span></div>`;}
 const note=pf.preview?`<div class="pf-note mute">Pratinjau: tanggapan tidak disimpan.</div>`
  :`<div class="pf-note ok"><div class="font-bold mb-1">Tanggapan tersimpan</div><p>Tanggapan Anda sudah tersimpan otomatis di server SIMDEKA dan langsung terlihat oleh pengelola form yang berwenang.</p></div>`;
 const again=f.allowAnother?`<button onclick="pfAgain()" class="text-sm font-bold hover:underline" style="color:var(--fc)">${ab?(pfEff()==='peserta'?'Absen untuk orang lain':'Isi kelompok lain'):'Kirim tanggapan lain'}</button>`:'';
 return pfHero({ok:1,ic:'check',eyebrow:esc(f.title),title:upd?'Berhasil diperbarui':'Berhasil dikirim',sub:esc(f.confirmMsg||'Tanggapan Anda telah direkam.')})
  +`<div class="gf-card"><div class="p-5 sm:p-6 space-y-4">${sum}${note}
  <div class="pf-actions">${f.allowUpdate===false?'':`<button onclick="pfEditForm()" class="gf-btn inline-flex items-center gap-2">${icon('pencil','w-4 h-4')} Perbarui form</button>`}${again}</div>
  ${f.allowUpdate===false?'<p class="pf-foot">Isian yang sudah dikirim tidak dapat diubah lagi.</p>':`<p class="pf-foot">Ada yang keliru? Tekan <b>Perbarui form</b> untuk mengubah isian yang baru dikirim. Datanya langsung diganti, bukan ditambah.</p>`}</div></div>`;
}
function pfCopyCode(){const c=pf.done&&pf.done.code;if(!c){showToast('Kode belum siap');return;}fmCopyText(c,'Kode disalin');}
function pfWaGo(a){const c=pf.done&&pf.done.code;if(!c)return false;a.href='https://wa.me/?text='+encodeURIComponent('Kode tanggapan '+pf.f.title+':\n'+c);a.target='_blank';a.rel='noopener';return true;}
function pfAgain(){
 const f=pf.f;pf.jstep=false;pf.done=null;pf.edit=null;pf.ans={};pf.err={};pf.page=0;pf.q='';
 if(f.type==='absensi'){const ks=pfKels();if(pfEff()==='peserta'){pf.who=-1;pf.st='';pf.step=pf.kel?'nama':'';}else pf.kel=ks.length===1?ks[0]:'';}
 pfRender();pfTop();
}

/* ---------- boot rute publik ---------- */
async function fmBootPublic(s){
 fmEl('loginScreen').classList.add('hidden');fmEl('app').classList.add('hidden');
 pf={preview:false};pfShow(true);
 pfRoot().innerHTML='<div class="min-h-full grid place-items-center text-sm text-slate-400 py-24">Memuat formulir…</div>';
 try{
  const f=fmSanitize(fmFromPayload(await fmUnpack(s)));
  document.title=(f.title||'Formulir')+(f.absen&&f.absen.lock?' — '+fmSesiLabel(f,f.absen.lock).split(' — ').pop():'');
  pfOpen(f,false);
 }catch(e){
  const nocomp=e&&e.message==='nodecomp';
  pfRoot().innerHTML=`<div class="min-h-full grid place-items-center px-4 py-16 bg-[#f5f7fb]"><div class="bg-white rounded-3xl p-9 max-w-md text-center shadow-[0_24px_60px_-20px_rgba(23,59,112,.25)] ring-1 ring-slate-100"><div class="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">${icon('triangle-alert','w-7 h-7')}</div><h1 class="text-xl font-extrabold tracking-tight text-slate-800">Formulir tidak dapat dibuka</h1><p class="text-sm leading-relaxed text-slate-500 mt-3">${nocomp?'Peramban ini terlalu lama untuk membuka tautan ini. Perbarui peramban atau minta admin membagikan tautan per kelompok.':'Tautan tidak lengkap atau rusak. Minta admin mengirim ulang tautannya (pastikan tautan tersalin utuh).'}</p></div></div>`;
 }
}
window.addEventListener('hashchange',()=>{if(fmRoute()||upRoute())location.reload();});

/* ===== LOGIN ===== */
const AUTH_KEY='simdeka_auth_v1'; /* window.ME diisi js/api.js saat memuat; jangan direset di sini */
let authMem=false;
function isAuthed(){
 if(authMem) return true;
 try{return sessionStorage.getItem(AUTH_KEY)==='1'||localStorage.getItem(AUTH_KEY)==='1';}catch(e){return false;}
}
function setAuth(on,remember){
 authMem=!!on;
 try{
  sessionStorage.removeItem(AUTH_KEY);localStorage.removeItem(AUTH_KEY);
  if(on)(remember?localStorage:sessionStorage).setItem(AUTH_KEY,'1');
 }catch(e){}
}
function loginEl(id){return document.getElementById(id);}
function showLoginError(msg){
 const box=loginEl('loginErr'); box.textContent=msg; box.classList.remove('hidden');
 const f=loginEl('loginForm'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
}
function loginInput(){
 loginEl('loginErr').classList.add('hidden');
 loginEl('chkUser').classList.toggle('hidden',!loginEl('loginUser').value.trim());
}
function togglePass(){
 const i=loginEl('loginPass'), show=i.type==='password';
 i.type=show?'text':'password';
 loginEl('eyeOn').classList.toggle('hidden',show);
 loginEl('eyeOff').classList.toggle('hidden',!show);
}
function resetLogin(){
 loginEl('loginUser').value='';loginEl('loginPass').value='';loginEl('loginRemember').checked=false;
 loginEl('loginPass').type='password';loginEl('eyeOn').classList.remove('hidden');loginEl('eyeOff').classList.add('hidden');
 loginEl('loginErr').classList.add('hidden');loginEl('chkUser').classList.add('hidden');
 loginEl('loginUser').focus();
}
async function doLogin(e){
 e.preventDefault();
 const u=loginEl('loginUser').value.trim(), pw=loginEl('loginPass').value;
 if(!u||!pw){showLoginError('Username dan kata sandi wajib diisi.');return;}
 try{
  const r=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:pw,remember:loginEl('loginRemember').checked})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){showLoginError(j.error||'Gagal masuk.');loginEl('loginPass').value='';loginEl('loginPass').focus();return;}
  location.reload();
 }catch(err){showLoginError('Tidak dapat terhubung ke server.');}
}
const ROLE_LABEL={super_admin:'Super Admin',admin_desa:'Admin',admin_kelompok:'Admin Kelompok',pj_kegiatan:'Penanggung Jawab Kegiatan'};
function refreshAccountUi(){
 const m=window.ME;if(!m)return;
 const nm=m.nama||m.username||'Pengguna',set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
 set('sbName',nm);set('tbName',nm);set('sbRole',m.peran||ROLE_LABEL[m.role]||m.role);set('tbRole',m.peran||ROLE_LABEL[m.role]||m.role);

}
window.refreshAccountUi=refreshAccountUi;
function showApp(){
 refreshAccountUi();
 loginEl('loginScreen').classList.add('hidden');
 loginEl('app').classList.remove('hidden');
 closeDrawer(); closeModal(); renderPage('dashboard'); window.scrollTo(0,0);
}
function showLogin(){
 setLoginStep('welcome');
 loginEl('app').classList.add('hidden');
 loginEl('loginScreen').classList.remove('hidden');
 resetLogin(); lucide.createIcons();
}
function logout(){
 Promise.resolve(window.simdekaFlush&&window.simdekaFlush()).then(async()=>{
  if(window.simdekaPending&&window.simdekaPending()&&!await uiConfirm({title:'Ada perubahan belum tersimpan',message:'Perubahan terakhir belum terkirim ke server. Jika keluar sekarang, perubahan itu bisa hilang.',ok:'Tetap Keluar',cancel:'Kembali',tone:'warning',icon:'log-out'}))return;
  return fetch('/api/logout',{method:'POST'}).catch(()=>{}).then(()=>{if(window.simdekaClearCache)window.simdekaClearCache();location.reload();});
 });
}

/* Logo default aplikasi — ganti nilai APP_LOGO untuk mengubah logo di semua tempat */
const APP_LOGO='data:image/webp;base64,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';
document.querySelectorAll('img.app-logo').forEach(i=>i.src=APP_LOGO);
(function(){const l=document.createElement('link');l.rel='icon';l.href=APP_LOGO;document.head.appendChild(l);})();

/* Geser untuk masuk (mobile) */
function setLoginStep(s){
 loginEl('loginScreen').dataset.step=s;
 loginEl('loginScreen').scrollTop=0;
 swSet(0,false);
}
const swTrack=loginEl('swTrack'), swKnob=loginEl('swKnob'), swFill=loginEl('swFill'), swLabel=loginEl('swLabel');
let swStartX=0, swDx=0, swMoved=0, swMax=0, swDrag=false;
function swSet(dx,anim){
 const t=anim?'transform .25s ease, width .25s ease, opacity .25s':'none';
 swKnob.style.transition=t; swFill.style.transition=t;
 swKnob.style.transform='translateX('+dx+'px)';
 swFill.style.width=(dx+52)+'px';
 swLabel.style.opacity=swMax?Math.max(0,1-dx/(swMax*.7)):1;
 swDx=dx;
}
function swDone(){
 swMax=swTrack.clientWidth-swKnob.offsetWidth-8;
 swSet(swMax,true);
 setTimeout(()=>setLoginStep('form'),220);
}
swKnob.addEventListener('pointerdown',e=>{
 swDrag=true; swMoved=0; swStartX=e.clientX; swMax=swTrack.clientWidth-swKnob.offsetWidth-8;
 swKnob.setPointerCapture(e.pointerId);
});
swKnob.addEventListener('pointermove',e=>{
 if(!swDrag) return;
 const raw=e.clientX-swStartX; swMoved=Math.max(swMoved,Math.abs(raw));
 swSet(Math.max(0,Math.min(swMax,raw)),false);
});
function swEnd(){
 if(!swDrag) return; swDrag=false;
 if(swMoved<6||swDx>=swMax*.7) swDone(); else swSet(0,true);
}
swKnob.addEventListener('pointerup',swEnd);
swKnob.addEventListener('pointercancel',()=>{swDrag=false;swSet(0,true);});
swKnob.addEventListener('click',e=>{ if(e.detail===0) swDone(); }); /* keyboard / aksesibilitas */
swKnob.addEventListener('keydown',e=>{ if(e.key==='ArrowRight'){e.preventDefault();swDone();} });


/* judul halaman sudah tampil di topbar -> sembunyikan h2 kembar di dalam konten */
function dedupHead(){
 const c=document.getElementById('content'),pt=document.getElementById('pageTitle'); if(!c||!pt)return;
 const nz=s=>s.toLowerCase().replace(/^manajemen\s+/,'').replace(/\s+/g,' ').trim(), t=nz(pt.textContent);
 c.querySelectorAll('h2').forEach(h=>{ if(nz(h.textContent)===t) h.remove(); });
}
new MutationObserver(dedupHead).observe(document.getElementById('content'),{childList:true,subtree:true});

lucide.createIcons();

/* =====================================================================
   LINK UPDATE DATA — Generus, KMM Desa, KMM Kelompok, Muballigh
   Tautan update menggunakan kode pendek tersimpan di server. Isian orang
   kembali ke admin lewat Kode Tanggapan (SDU1.) atau UP_SYNC_URL bila ada server.
   ===================================================================== */
const UP_CFG='simdeka_up_cfg_v1',UP_QUE='simdeka_up_queue_v1',UP_LOG='simdeka_up_log_v1',UP_SEEN='simdeka_up_seen_v1',UP_SYNC_URL='',UP_INB='simdeka_up_inbox_v1';
const UP_MODES=[['kunci','Terkunci'],['langsung','Langsung berlaku'],['setuju','Perlu persetujuan'],['sembunyi','Disembunyikan']];
const UP_JK=['Laki-laki','Perempuan'],UP_MST=['Masih Lajang','Menikah'];
const UP_MMF=[['n','Nama Lengkap','text'],['k','Kelompok','kel'],['d','Nama Dapukan','text'],['jk','Jenis Kelamin','sel',UP_JK],['lh','Tanggal Lahir','date'],['wa','No. WA','tel'],['st','Status','sel',UP_MST]];
const UP_MMV=[['lh','Tanggal lahir'],['wa','4 digit terakhir no. WA']];
const UP_MBF=UP_MMF.filter(f=>f[0]!=='d');UP_MBF.splice(2,0,['jd','Jenis Dapukan','sel',MB_JD,MB_JD_DEF]); /* Muballigh: sebutan (Mubaligh/Mubalighot) otomatis dari jenis kelamin */
const UP={
 'generus':{t:'Database Generus',n:'nama',k:'kelompok',vk:[['tgl','Tanggal lahir']],F:[['nama','Nama Lengkap','text'],['kelompok','Kelompok','kel'],['jk','Jenis Kelamin','sel',UP_JK],['tempat','Tempat Lahir','text'],['tgl','Tanggal Lahir','date'],['status','Status','sel',GEN_ST],['pend','Pendidikan Terakhir','sel',GEN_PEND],['smp','SMP','text'],['sma','SMA/SMK','text'],['univ','Universitas','text'],['kelas','Status Kelas Pendidikan','text'],['kerja','Pekerjaan','text'],['ayah','Nama Ayah','text'],['ayahSt','Status Ayah','sel',GEN_ORTU],['ibu','Nama Ibu','text'],['ibuSt','Status Ibu','sel',GEN_ORTU]]},
 'muda-mudi-desa':{t:'KMM Desa',n:'n',k:'k',vk:UP_MMV,F:UP_MMF},
 'muda-mudi-kelompok':{t:'KMM Kelompok',n:'n',k:'k',vk:UP_MMV,F:UP_MMF},
 'mubaligh':{t:'Muballigh',n:'n',k:'k',vk:UP_MMV,F:UP_MBF}
};
function upFix(p,x){if(p==='mubaligh'&&x){x.d=mbSebutan(x.jk);if(!x.jd)x.jd=MB_JD_DEF;}}
const upJ=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}};
const upW=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){showToast('Penyimpanan penuh — data tidak tersimpan');}};
function upH(s){let h=2166136261;s='sdk|'+s;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function upList(p){return p==='generus'?generus:mmData(p);}
const upF=(d,f)=>f;
function upCommit(p){if(p==='generus')saveGenerus();else mmPut(p,mmData(p));}
function upFL(p,k){const f=UP[p].F.find(a=>a[0]===k);return f?f[1]:k;}
function upCfg(p){const U=UP[p],c=upJ(UP_CFG,{})[p]||{},m={};
 U.F.forEach(f=>{const k=f[0],core=k===U.n||k===U.k;let v=(c.m&&c.m[k])||(core?'kunci':'setuju');if(core&&v==='sembunyi')v='kunci';m[k]=v;});
 return {m,vk:c.vk||U.vk[0][0],nb:c.nb!==false,v:c.v||1};}
function upCfgSet(p,c){const a=upJ(UP_CFG,{});a[p]=c;upW(UP_CFG,a);}
function upKey(p,x,vk){const v=String(x[vk]||'');return (vk==='wa'||vk==='hp')?mmWaNorm(v).slice(-4):v;}
function upClean(f,v){v=String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,150);const t=f[2];
 if(t==='date')return /^\d{4}-\d{2}-\d{2}$/.test(v)&&lhOk(v)?v:'';
 if(t==='tel')return v&&mmWaNorm(v)?v:'';
 if(t==='sel')return !v||f[3].includes(v)?v:'';
 return v;}
const UP_SLUG={'generus':'generus','muda-mudi-desa':'kmm-desa','muda-mudi-kelompok':'kmm-kelompok','mubaligh':'muballigh'};
const upSlugify=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
async function upLink(p,kel){
 const c=upCfg(p),U=UP[p],vis=U.F.map(f=>f[0]).filter(k=>c.m[k]!=='sembunyi');
 const L=upList(p).filter(x=>!kel||x[U.k]===kel).map(x=>{const o={};vis.forEach(k=>{if(x[k])o[k]=x[k];});const kv=upKey(p,x,c.vk);return [x.id,kv?upH(p+kv):'',o];});
 const d={p,v:c.v,m:c.m,vk:c.vk,nb:c.nb?1:0,kl:activeGroups(),L,sy:upSyncCfg().url||''};
 const resp=await fetch('/api/update-links',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({p,payload:d,slug:UP_SLUG[p]+(kel?'--'+upSlugify(kel):''),menu:UP_SLUG[p],kelompok:kel||''})});
 let result={};try{result=await resp.json();}catch(e){}
 if(!resp.ok||!result.token) throw new Error(result.error||result.message||'Gagal membuat link pendek. Pastikan koneksi server aktif.');
 const loc=location.protocol==='file:';return {url:(loc?location.href.split('#')[0].split('?')[0]+'#':location.origin)+'/'+UP_SLUG[p]+'/update'+(kel?'?kelompok='+encodeURIComponent(kel):''),n:L.length,token:result.token};
}

/* ---------- Halaman publik ---------- */
let U_={};
function upQ(){const h=location.hash.split('?')[1];return new URLSearchParams(location.search||(h?'?'+h:''));}
function upRoute(){const mm=/^\/(generus|kmm-desa|kmm-kelompok|muballigh)\/update\/?$/.exec(location.protocol==='file:'?location.hash.slice(1).split('?')[0]:location.pathname);if(mm){const k=upQ().get('kelompok');return 's-'+mm[1]+(k?'--'+upSlugify(k):'');}
 const p=/^\/u\/([a-z0-9]{6,20})\/?$/.exec(location.pathname);if(p)return 's-'+p[1];const m=/^#\/u\/(?:[a-z0-9-]+\.)?([A-Za-z0-9_-]+)$/.exec(location.hash);return m?m[1]:null;}
const UPX_SVG={
 user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'};
const upxI=(n,c)=>`<svg class="${c||'upx-i'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${UPX_SVG[n]||''}</svg>`;
/* Langkah-langkah alur: Pilih nama → (Verifikasi) → Isi data → Selesai */
function upSteps(){
 const d=U_.d,needV=(U_.who!=null&&U_.who>=0)?!!(d.L[U_.who]&&d.L[U_.who][1]):U_.who===-1?false:true;
 const L=['Pilih nama'].concat(needV?['Verifikasi']:[],['Isi data','Selesai']);
 const key={pilih:'Pilih nama',verif:'Verifikasi',form:'Isi data',done:'Selesai'}[U_.st]||'Selesai';
 return {L,cur:Math.max(0,L.indexOf(key))};
}
function upStepper(){
 const S=upSteps();
 return `<ol class="upx-steps" aria-label="Langkah pengisian">${S.L.map((t,i)=>`<li class="${i<S.cur?'done':i===S.cur?'on':''}"${i===S.cur?' aria-current="step"':''}><span class="upx-dot">${i<S.cur?upxI('check','upx-i sm'):i+1}</span><span class="upx-lab">${t}</span></li>`).join('')}</ol>`;
}
function upShell(inner,hero){
 const d=U_.d,F=d&&UP[d.p];
 const head=hero?`<div class="upx-hero"><div class="upx-brand"><img src="/img/logo.webp" alt="" width="34" height="34" onerror="this.style.display='none'"><span>SIMDEKA</span></div>
  <h1>${hero.t}</h1><p>${hero.s}</p></div>`:`<div class="upx-hero"><div class="upx-brand"><span>SIMDEKA</span></div></div>`;
 return `<div class="upx-page">${head}<div class="upx-card">${hero?upStepper():''}<div class="upx-body">${inner}</div></div>
  <p class="upx-foot">SIMDEKA • Sistem Informasi dan Manajemen Data Desa Karangmojo</p></div>`;
}
async function upBoot(s){
 fmEl('loginScreen').classList.add('hidden');fmEl('app').classList.add('hidden');
 const r=fmEl('publicForm');r.classList.remove('hidden');
 try{
  let d;
  if(s.startsWith('s-')){const token=s.slice(2);const res=await fetch('/api/public/update-links/'+encodeURIComponent(token),{cache:'no-store'});if(!res.ok)throw new Error('Link tidak aktif');const body=await res.json();d=body.payload;}
  else d=await fmUnpack(s);
  if(!d||!UP[d.p]||!Array.isArray(d.L))throw 0;U_={d,st:'pilih',q:'',who:null};{const kq=upQ().get('kelompok');if(kq)U_.kel=kq;}document.title='Update data — SIMDEKA';upRender();
 }catch(e){r.innerHTML=upShell('<h1 class="text-lg font-extrabold">Tautan tidak dapat dibuka</h1><p class="text-sm text-slate-500 mt-2">Link mungkin sudah dimatikan atau server belum diperbarui. Minta pengurus membuat link baru.</p>');}
}
function upIn(f,val,dis,kl){const k=f[0],t=f[2],a=`id="upf_${k}" ${dis?'disabled':''} class="upx-in"`;
 if(t==='sel'||t==='kel'){const L=t==='kel'?kl:f[3],A=val&&!L.includes(val)?[val].concat(L):L;return `<select ${a}><option value="">Pilih</option>${A.map(x=>`<option ${x===val?'selected':''}>${esc(x)}</option>`).join('')}</select>`;}
 return `<input ${a} type="${t==='date'?'date':t==='tel'?'tel':'text'}" maxlength="120" value="${esc(val)}">`;}
function upRender(){
 const d=U_.d,F=UP[d.p],r=fmEl('publicForm'),btn='upx-btn primary',ghost='upx-btn ghost';let h='',hero;
 const who=U_.who>=0&&d.L[U_.who]?esc(d.L[U_.who][2][F.n]||''):'';
 if(U_.st==='pilih'){
  hero={t:'Update data '+esc(F.t),s:'Perbarui data Anda agar database tetap akurat. Hanya butuh sekitar satu menit.'};
  h=`<h2 class="upx-h">Siapa Anda?</h2><p class="upx-sub">Pilih kelompok, lalu pilih nama Anda dari daftar.</p>
  ${upPilih(d,F)}
  ${d.nb?'<button onclick="upNew()" class="upx-link">Nama saya belum ada di daftar</button>':''}
  <div class="upx-how"><div class="upx-how-t">Alurnya mudah</div>
   <div class="upx-how-i">${upxI('user','upx-i')}<div><b>Pilih nama</b><span>Temukan nama Anda di daftar kelompok.</span></div></div>
   <div class="upx-how-i">${upxI('shield','upx-i')}<div><b>Verifikasi singkat</b><span>Memastikan data hanya diubah oleh yang bersangkutan.</span></div></div>
   <div class="upx-how-i">${upxI('edit','upx-i')}<div><b>Periksa dan kirim</b><span>Ubah bagian yang perlu, lalu kirim.</span></div></div></div>`;
 }else if(U_.st==='verif'){
  const dt=d.vk!=='wa'&&d.vk!=='hp';
  hero={t:'Verifikasi identitas',s:'Satu langkah singkat sebelum data dibuka.'};
  h=`<div class="upx-who"><span class="upx-av">${upxI('user','upx-i')}</span><div><div class="upx-who-n">${who}</div><div class="upx-who-s">${esc(U_.kel||'')}</div></div></div>
  <h2 class="upx-h">${dt?'Tanggal lahir':'4 digit terakhir no. WA'}</h2><p class="upx-sub">Masukkan ${dt?'tanggal lahir':'4 digit terakhir no. WA'} yang terdaftar atas nama ini.</p>
  <input id="upVk" ${dt?'type="date"':'type="tel" inputmode="numeric" maxlength="4" placeholder="• • • •"'} class="upx-in ${dt?'':'upx-pin'}">
  <p id="upErr" class="upx-err hidden"></p>
  <div class="upx-act"><button onclick="U_.st='pilih';upRender()" class="${ghost}">Kembali</button><button onclick="upVerif()" class="${btn}">Lanjut</button></div>`;
 }else if(U_.st==='form'){
  const row=U_.who>=0?d.L[U_.who]:null,o=row?row[2]:(U_.kel?{[F.k]:U_.kel}:{});
  hero={t:row?'Periksa data Anda':'Pendaftaran baru',s:row?'Ubah bagian yang perlu, lalu kirim.':'Isi data Anda dengan lengkap.'};
  const rows=F.F.map(f0=>{const f=upF(d,f0);const m=d.m[f[0]];if(m==='sembunyi')return '';const dis=row&&m==='kunci';
   return `<label class="upx-fld"><span class="upx-fl">${f[1]}${dis?upxI('lock','upx-i sm mute'):''}</span>${upIn(f,o[f[0]]||f[4]||'',dis,d.kl)}${dis?'<span class="upx-hint">Hanya admin yang dapat mengubah.</span>':''}</label>`;}).join('');
  h=(who?`<div class="upx-who"><span class="upx-av">${upxI('user','upx-i')}</span><div><div class="upx-who-n">${who}</div><div class="upx-who-s">${esc(U_.kel||'')}</div></div></div>`:'')+`<div class="upx-grid">${rows}</div><p id="upErr" class="upx-err hidden"></p>
  <div class="upx-act"><button onclick="U_.st='pilih';upRender()" class="${ghost}">Kembali</button><button onclick="upSubmit()" class="${btn}">Kirim data</button></div>`;
 }else{
  hero=null;
  h=U_.sent?`<div class="upx-done"><span class="upx-ok">${upxI('check','upx-i lg')}</span><h2>Data terkirim</h2><p>Terima kasih. Data Anda sudah diterima dan menunggu persetujuan pengurus. Tidak ada yang perlu dikirim lagi.</p>
  <button onclick="U_.st='pilih';upRender()" class="${ghost}">Isi untuk orang lain</button></div>`
  :`<div class="upx-done warn"><span class="upx-ok">${upxI('clock','upx-i lg')}</span><h2>Data belum terkirim otomatis</h2><p>${U_.d.sy?'Server sedang tidak dapat dihubungi. ':''}Kirim kode di bawah ini ke pengurus agar data Anda diproses.</p></div>
  <textarea readonly onclick="this.select()" class="upx-code">${esc(U_.code)}</textarea>
  <div class="upx-act"><button onclick="fmCopyText(U_.code,'Kode disalin')" class="${btn}">Salin kode</button><a onclick="this.href='https://wa.me/?text='+encodeURIComponent('Kode update data SIMDEKA:\\n'+U_.code)" target="_blank" rel="noopener" class="${ghost}">Kirim lewat WhatsApp</a></div>
  <button onclick="U_.st='pilih';upRender()" class="upx-link">Isi untuk orang lain</button>`;
  hero={t:U_.sent?'Selesai':'Satu langkah lagi',s:U_.sent?'Terima kasih sudah memperbarui data.':'Kirim kode agar data Anda diproses.'};
 }
 r.innerHTML=upShell(h,hero);r.scrollTop=0;
}
function upPilih(d,F){
 const sel='upx-in',g=d.p==='generus',cmp=(x,y)=>String(x||'').localeCompare(String(y||''),'id',{sensitivity:'base'});
 const ks=[...new Set(d.L.map(r=>r[2][F.k]).filter(Boolean).concat(Array.isArray(d.kl)?d.kl:[]))].sort(cmp);
 if(ks.length===1)U_.kel=ks[0];
 const kh=ks.length>1?`<label class="upx-fld"><span class="upx-fl">Kelompok</span><select id="upKel" onchange="U_.kel=this.value;upRender()" class="${sel}"><option value="">Pilih kelompok</option>${ks.map(k=>`<option ${k===U_.kel?'selected':''}>${esc(k)}</option>`).join('')}</select></label>`:'';
 if(ks.length>1&&!U_.kel)return kh;
 const A=d.L.map((r,i)=>[r,i]).filter(x=>x[0][2][F.k]===U_.kel).sort((x,y)=>cmp(x[0][2][F.n],y[0][2][F.n]));
 return kh+`<label class="upx-fld"><span class="upx-fl">Nama Anda</span><select id="upSel" onchange="if(this.value!=='')upPick(+this.value)" class="${sel}"><option value="">Pilih nama Anda</option>${A.map(x=>`<option value="${x[1]}">${esc(x[0][2][F.n]||'')}</option>`).join('')}</select></label>`;
}
function upPick(i){U_.who=i;U_.st=U_.d.L[i][1]?'verif':'form';upRender();}
function upNew(){U_.who=-1;U_.st='form';upRender();}
function upErr(m){const e=fmEl('upErr');if(e){e.textContent=m;e.classList.remove('hidden');}}
function upVerif(){const d=U_.d,v=fmEl('upVk').value,x=(d.vk==='wa'||d.vk==='hp')?v.replace(/\D/g,'').slice(-4):v;
 if(x&&upH(d.p+x)===d.L[U_.who][1]){U_.st='form';upRender();}else upErr('Data tidak cocok. Periksa lagi atau hubungi pengurus.');}
async function upSubmit(){
 const d=U_.d,F=UP[d.p],row=U_.who>=0?d.L[U_.who]:null,o=row?row[2]:{},ch={},nf={};let err='';
 for(const f0 of F.F){const f=upF(d,f0);const k=f[0],m=d.m[k];if(m==='sembunyi'||(row&&m==='kunci'))continue;
  const el=fmEl('upf_'+k),raw=el?el.value.trim():'',v=upClean(f,raw);
  if(raw&&!v){err=f[1]+' tidak valid.';break;}
  if(row){if(v!==String(o[k]||''))ch[k]=[String(o[k]||''),v];}else nf[k]=v;}
 if(!err&&!row)err=!nf[F.n]?'Nama wajib diisi.':!nf[F.k]?'Kelompok wajib dipilih.':'';
 if(!err&&row&&!Object.keys(ch).length)err='Tidak ada data yang berubah.';
 if(err)return upErr(err);
 const rec=row?{i:fmRid(8),k:'u',p:d.p,v:d.v,id:row[0],t:Date.now(),ch}:{i:fmRid(8),k:'n',p:d.p,v:d.v,t:Date.now(),f:nf};
 U_.code='SDU1.'+await fmPack(rec);
 let sent=false;
 if(d.sy){try{const rs=await fetch(d.sy,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'submit',up:rec})});const jj=await rs.json();sent=!!(jj&&jj.ok);}catch(e){}}
 if(!d.sy){try{const ib=upJ(UP_INB,[]);ib.push(rec);localStorage.setItem(UP_INB,JSON.stringify(ib));sent=true;}catch(e){}}
 U_.sent=sent;
 U_.st='done';upRender();
}

/* ---------- Sisi admin ---------- */
function upModal(t,d,h){fmEl('modalTitle').textContent=t;fmEl('modalDesc').textContent=d;fmEl('modalBody').innerHTML=h;showModal();lucide.createIcons();}
function upQueue(p){return upJ(UP_QUE,[]).filter(x=>!p||x.p===p);}
function upBar(p){
 const c=fmEl('content');if(!c||!UP[p])return;
 const n=upQueue(p).length,pan=c.querySelector('.u-actions .u-menu-p'),sm=c.querySelector('.u-actions .u-menu>summary');
 if(pan){
  pan.querySelectorAll('[data-up]').forEach(x=>x.remove());
  const bd=n?`<span class="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-extrabold grid place-items-center">${n}</span>`:'';
  const mk=(ic,lb,fn,ex)=>`<button type="button" data-up="1" onclick="${fn}" class="u-menu-i">${icon(ic,'w-4 h-4')}<span>${lb}</span>${ex||''}</button>`;
  pan.insertAdjacentHTML('afterbegin',mk('link','Link Update Data',`upOpenLink('${p}')`)+mk('inbox','Usulan &amp; Riwayat',`upOpenInbox('${p}')`,bd)+'<div class="u-menu-sep" data-up="1"></div>');
  if(sm){const o=sm.querySelector('.up-dot');if(o)o.remove();if(n)sm.insertAdjacentHTML('beforeend','<span class="up-dot" style="width:8px;height:8px;border-radius:9999px;background:#ef4444;display:inline-block"></span>');}
  lucide.createIcons();
 }
 if(!upBar.busy){upBar.busy=1;upPull(true).then(r=>{upBar.busy=0;const a=document.querySelector('.nav-item.active');if(r&&r.n&&a&&a.dataset.page===p){showToast(r.n+' usulan baru masuk dari link');upBar(p);}}).catch(()=>{upBar.busy=0;});}}
const _upRG=renderGenerus;renderGenerus=function(){_upRG();upBar('generus');};
const _upRM=renderMM;renderMM=function(p){_upRM(p);upBar(p);};
function upRefresh(p){const a=document.querySelector('.nav-item.active');renderPage(a?a.dataset.page:p);}
function upOpenLink(p){const U=UP[p],c=upCfg(p),sel='h-10 w-full bg-white border border-line rounded-xl px-3 text-sm';
 const rows=U.F.map(f=>`<div class="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0"><span class="text-sm text-slate-700">${f[1]}</span><select id="upm_${f[0]}" class="h-9 bg-white border border-line rounded-lg px-2 text-xs">${UP_MODES.filter(m=>m[0]!=='sembunyi'||(f[0]!==U.n&&f[0]!==U.k)).map(m=>`<option value="${m[0]}" ${c.m[f[0]]===m[0]?'selected':''}>${m[1]}</option>`).join('')}</select></div>`).join('');
 const hk=p!=='muda-mudi-desa';
 upModal('Link Update Data — '+U.t,'Atur field yang boleh diisi, lalu bagikan link. Pemilik link memilih namanya sendiri.',
 `<div>${rows}</div><label class="block mt-4"><span class="text-xs font-bold text-slate-600">Verifikasi setelah memilih nama</span><select id="upVkS" class="mt-1 ${sel}">${U.vk.map(v=>`<option value="${v[0]}" ${c.vk===v[0]?'selected':''}>${v[1]}</option>`).join('')}</select><span class="text-[11px] text-slate-400">Jika data itu masih kosong, nama langsung bisa dibuka.</span></label>
 <label class="flex items-center gap-2 mt-4 text-sm"><input id="upNb" type="checkbox" ${c.nb?'checked':''}> Izinkan pendaftaran baru lewat link yang sama</label>
 <div class="flex flex-wrap gap-2 mt-5">${pBtn('bg-navy text-white','copy',hk?'Buat 1 link semua kelompok':'Simpan & salin link',`upSaveLink('${p}')`)}${hk?pBtn('bg-navy text-white','list','Buat link per kelompok',`upAllLinks('${p}')`):''}${pBtn('border border-line bg-white text-slate-700','ban','Matikan link lama',`upKill('${p}')`)}</div><div id="upOut" class="mt-3 text-xs text-slate-500"></div>`);}
function upSaveCfg(p){const c=upCfg(p);UP[p].F.forEach(f=>{const e=fmEl('upm_'+f[0]);if(e)c.m[f[0]]=e.value;});c.vk=fmEl('upVkS').value;c.nb=fmEl('upNb').checked;upCfgSet(p,c);}
async function upSaveLink(p){
 upSaveCfg(p);const out=fmEl('upOut');out.innerHTML='<span class="text-slate-500">Membuat tautan pendek…</span>';
 try{
  const sc=fmEl('upScope'),r=await upLink(p,sc?sc.value:'');
  if(!r||!r.token||!/^(https?|file):\/\//.test(r.url)||r.url.length>400)throw new Error('Server tidak mengembalikan tautan yang valid. Periksa endpoint /api/update-links di server.');
  fmCopyText(r.url,'Link pendek disalin');
  out.innerHTML=`<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><div class="font-bold text-emerald-800">${r.n} nama • Tautan pendek siap dibagikan</div><div class="mt-1 text-slate-600">Panjang tautan: ${r.url.length} karakter</div><textarea readonly onclick="this.select()" class="mt-2 w-full h-14 border border-emerald-200 bg-white rounded-lg p-2 text-xs break-all">${esc(r.url)}</textarea><button onclick="fmCopyText(this.previousElementSibling.value,'Link pendek disalin')" class="mt-2 h-9 px-3 rounded-lg bg-navy text-white text-xs font-bold">Salin link pendek</button></div>`;
 }catch(e){
  out.innerHTML=`<div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700"><b>Link pendek gagal dibuat.</b><div class="mt-1">${esc(e.message||'Periksa koneksi server.')}</div><div class="mt-1 text-xs">Pastikan endpoint /api/update-links sudah aktif di server dan database tersambung.</div></div>`;
  showToast('Gagal membuat link pendek.');
 }
}
let upAll=[];
async function upAllLinks(p){upSaveCfg(p);const U=UP[p];
 const ks=[...new Set(upList(p).map(x=>x[U.k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id',{sensitivity:'base'}));
 upAll=[];try{for(const k of ks)upAll.push([k,await upLink(p,k)]);}catch(e){fmEl('upOut').innerHTML=`<div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700"><b>Link gagal dibuat.</b><div class="mt-1">${esc(e.message||'Periksa koneksi server.')}</div></div>`;return;}
 fmEl('upOut').innerHTML=upAll.length?`<div class="flex items-center justify-between mb-2"><b class="text-slate-700">${upAll.length} link kelompok siap dibagikan</b><button onclick="upCopyAll()" class="h-8 px-3 rounded-lg text-xs font-bold bg-navy text-white">Salin semua</button></div><div class="divide-y divide-line border border-line rounded-xl">${upAll.map((x,i)=>`<div class="flex items-center gap-2 px-3 py-2"><div class="flex-1 min-w-0"><div class="text-sm font-bold text-slate-700 truncate">${esc(x[0])}</div><div class="text-[11px] text-slate-400 truncate">${esc(x[1].url.replace(location.origin,''))} • ${x[1].n} nama</div></div><button onclick="fmCopyText(upAll[${i}][1].url,'Link disalin')" class="h-8 px-3 rounded-lg text-xs font-bold border border-line">Salin</button><a onclick="this.href='https://wa.me/?text='+encodeURIComponent(upAll[${i}][0]+'\\n'+upAll[${i}][1].url)" target="_blank" rel="noopener" class="h-8 px-3 rounded-lg text-xs font-bold border border-line grid place-items-center">WA</a></div>`).join('')}</div>`:'Belum ada data dengan kelompok.';}
function upCopyAll(){fmCopyText(upAll.map(x=>x[0]+'\n'+x[1].url).join('\n\n'),'Semua link disalin');}
async function upKill(p){
 if(!await uiConfirm({title:'Matikan semua link?',message:'Semua link Update Data yang aktif untuk data ini akan dimatikan. Link yang sudah dibagikan tidak bisa dibuka lagi.',ok:'Ya, Matikan',tone:'danger',icon:'link-2-off'}))return;
 try{
  const r=await fetch('/api/update-links/disable',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({p})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'Gagal mematikan link di server.');
  const c=upCfg(p);c.v++;upCfgSet(p,c);
  showToast(j.disabled?(j.disabled+' link lama dimatikan. Buat dan bagikan link baru.'):'Tidak ada link aktif. Silakan buat link baru.');
 }catch(e){showToast(e.message||'Gagal mematikan link.');return;}
 upOpenLink(p);
}
function upLog(p,nm,f,o,n,ac){const a=upJ(UP_LOG,[]);a.push({t:Date.now(),p,nm,f:upFL(p,f),o,n,ac});upW(UP_LOG,a.slice(-300));}
async function upIngestRecs(recs){
 const Q=upJ(UP_QUE,[]),seen=upJ(UP_SEEN,[]),st={auto:0,que:0,dup:0,bad:0};
 for(const r of recs){try{
  const U=UP[r&&r.p];if(!U){st.bad++;continue;}
  const c=upCfg(r.p);if(r.v!==c.v){st.bad++;continue;}
  if(seen.includes(r.i)){st.dup++;continue;}
  const L=upList(r.p);
  if(r.k==='u'){const x=L.find(a=>a.id===r.id);if(!x){st.bad++;continue;}const ch={};let did=0;
   for(const [k,v] of Object.entries(r.ch||{})){const f=U.F.find(a=>a[0]===k);if(!f||!Array.isArray(v))continue;const m=c.m[k],raw=String(v[1]==null?'':v[1]).trim(),n=upClean(f,raw);
    if(raw&&!n)continue;
    if(m==='langsung'){upLog(r.p,x[U.n],k,x[k]||'',n,'langsung');x[k]=n;did++;}else if(m==='setuju')ch[k]=[x[k]||'',n];}
   if(did){upFix(r.p,x);upCommit(r.p);st.auto+=did;}
   if(Object.keys(ch).length){Q.push({i:r.i,p:r.p,k:'u',id:r.id,ch,t:r.t});st.que++;}
  }else if(r.k==='n'&&c.nb){const f={};U.F.forEach(a=>{f[a[0]]=upClean(a,(r.f||{})[a[0]]);});if(!f[U.n]||!f[U.k]){st.bad++;continue;}if(r.p==='mubaligh'&&!f.jd)f.jd=MB_JD_DEF;Q.push({i:r.i,p:r.p,k:'n',f,t:r.t});st.que++;}
  else{st.bad++;continue;}
  seen.push(r.i);
 }catch(e){st.bad++;}}
 upW(UP_QUE,Q);upW(UP_SEEN,seen.slice(-600));
 return st;
}
function upToast(st){showToast(`${st.auto} field langsung berlaku, ${st.que} usulan baru`+(st.dup?`, ${st.dup} sudah pernah diproses`:'')+(st.bad?`, ${st.bad} ditolak`:''));}
async function upIngest(p){
 const codes=fmEl('upCode').value.split(/\s+/).filter(x=>x.indexOf('SDU1.')===0);
 if(!codes.length)return showToast('Tidak ada kode SDU1 yang dikenali');
 const recs=[];for(const code of codes){try{recs.push(await fmUnpack(code.slice(5)));}catch(e){}}
 const st=await upIngestRecs(recs);st.bad+=codes.length-recs.length;
 upToast(st);upRefresh(p);upOpenInbox(p);
}
/* ---------- Sinkron server usulan (tanpa kode) ---------- */
function upSyncCfg(){const c=upJ('simdeka_up_sync',{});return {url:String(c.url||'').trim(),key:String(c.key||'')};}
async function upSrv(body){const c=upSyncCfg();const rs=await fetch(c.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({key:c.key},body))});return rs.json();}
async function upPull(quiet){
 const c=upSyncCfg();
 if(!c.url){const ib=upJ(UP_INB,[]);if(!ib.length)return {n:0};
  const st=await upIngestRecs(ib);try{localStorage.setItem(UP_INB,'[]');}catch(e){}
  return Object.assign({n:ib.length},st);}
 if(!c.key)return null;
 try{const j=await upSrv({action:'pull'});
  if(!j||!j.ok){if(!quiet)showToast('Gagal mengambil usulan. Periksa URL server dan kunci admin.');return null;}
  const items=j.items||[];if(!items.length)return {n:0};
  const st=await upIngestRecs(items.map(x=>x.rec));
  try{await upSrv({action:'ack',ids:items.map(x=>x.id)});}catch(e){}
  return Object.assign({n:items.length},st);
 }catch(e){if(!quiet)showToast('Tidak dapat terhubung ke server usulan');return null;}
}
window.addEventListener('storage',e=>{if(e.key===UP_INB&&e.newValue&&e.newValue!=='[]'){const a=document.querySelector('.nav-item.active');if(a&&UP[a.dataset.page])upPull(true).then(r=>{if(r&&r.n){showToast(r.n+' usulan baru masuk dari link');upRefresh(a.dataset.page);}});}});
function upSaveSync(p){
 const url=fmEl('upSyUrl').value.trim(),key=fmEl('upSyKey').value.trim();
 if(url&&!/^https:\/\//i.test(url))return showToast('URL server harus diawali https://');
 upW('simdeka_up_sync',{url,key});showToast('Pengaturan server disimpan');
}
async function upTesSync(p){
 const c=upSyncCfg();if(c.url&&!c.key)return showToast('Isi kunci admin dulu');
 const r=await upPull(false);if(r){upToast(r.n?r:{auto:0,que:0,dup:0,bad:0});showToast(r.n?r.n+' usulan masuk diproses':'Belum ada usulan baru.');upRefresh(p);upOpenInbox(p);}
}
function upDecide(i,ok){const Q=upJ(UP_QUE,[]),j=Q.findIndex(q=>q.i===i);if(j<0)return;const q=Q[j],U=UP[q.p],L=upList(q.p);let nm='';
 if(q.k==='u'){const x=L.find(a=>a.id===q.id);nm=x?x[U.n]:'';
  if(ok&&x){Object.entries(q.ch).forEach(([k,v])=>{upLog(q.p,nm,k,v[0],v[1],'disetujui');x[k]=v[1];});upFix(q.p,x);upCommit(q.p);}}
 else{nm=q.f[U.n];
  if(ok){if(q.p==='generus')L.push(genClean(Object.assign({id:genNextId()},q.f)));else L.push({id:'M'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),n:q.f.n,jk:q.f.jk,k:q.f.k,d:q.f.d,wa:q.f.wa,lh:q.f.lh,st:q.f.st,jd:q.f.jd});upFix(q.p,L[L.length-1]);
   upCommit(q.p);upLog(q.p,nm,U.n,'','(data baru)','disetujui');}}
 if(!ok)upLog(q.p,nm,q.k==='u'?Object.keys(q.ch)[0]:U.n,'','','ditolak');
 Q.splice(j,1);upW(UP_QUE,Q);showToast(ok?'Usulan disetujui':'Usulan ditolak');upRefresh(q.p);upOpenInbox(q.p);}
function upOpenInbox(p){const U=UP[p],L=upList(p),nk=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
 const fv=(f,v)=>f&&f[2]==='date'?(lhTgl(v)||v||'—'):(v||'—');
 const it=upQueue(p).map(q=>{let nm,lines,w='';
  if(q.k==='u'){const x=L.find(a=>a.id===q.id);nm=x?x[U.n]:'(data sudah dihapus)';lines=Object.entries(q.ch).map(([k,v])=>{const f=U.F.find(a=>a[0]===k);return `<div class="text-xs text-slate-600"><b>${esc(upFL(p,k))}</b>: ${esc(fv(f,v[0]))} → ${esc(fv(f,v[1]))}</div>`;}).join('');}
  else{nm=q.f[U.n];lines=U.F.filter(f=>q.f[f[0]]&&f[0]!==U.n).map(f=>`<div class="text-xs text-slate-600"><b>${esc(f[1])}</b>: ${esc(fv(f,q.f[f[0]]))}</div>`).join('');
   if(L.some(x=>nk(x[U.n])===nk(nm)))w='<div class="text-[11px] font-bold text-amber-600 mt-1">Nama ini mirip dengan data yang sudah ada. Periksa sebelum menyetujui.</div>';}
  return `<div class="border border-line rounded-xl p-3"><div class="flex items-start justify-between gap-2"><div><div class="text-sm font-bold">${esc(nm)} <span class="ml-1 text-[10px] px-2 py-0.5 rounded-full ${q.k==='n'?'bg-violet-50 text-violet-700':'bg-blue-50 text-blue-700'}">${q.k==='n'?'Pendaftaran baru':'Perubahan data'}</span></div>${lines}${w}</div><div class="flex gap-1.5 shrink-0"><button onclick="upDecide('${q.i}',1)" class="h-8 px-3 rounded-lg text-xs font-bold bg-emerald-600 text-white">Setujui</button><button onclick="upDecide('${q.i}',0)" class="h-8 px-3 rounded-lg text-xs font-bold border border-line">Tolak</button></div></div>${''}</div>`;}).join('')||'<p class="text-sm text-slate-400">Tidak ada usulan yang menunggu.</p>';
 const lg=upJ(UP_LOG,[]).filter(x=>x.p===p).slice(-15).reverse().map(x=>`<div class="py-2 text-xs text-slate-600"><span class="text-slate-400">${esc(fmDT(x.t))}</span> — <b>${esc(x.nm)}</b>, ${esc(x.f)}: ${esc(x.o||'—')} → ${esc(x.n||'—')} <span class="text-slate-400">(${esc(x.ac)})</span></div>`).join('')||'<p class="text-sm text-slate-400">Belum ada riwayat.</p>';
 upModal('Usulan & Riwayat — '+U.t,'Usulan dari pengisi link. Field berstatus "langsung berlaku" otomatis diterapkan, sisanya menunggu persetujuan Anda.',
 `<div class="flex flex-wrap items-center gap-2">${pBtn('bg-navy text-white','refresh-cw','Muat usulan masuk',`upTesSync('${p}')`)}<span class="text-[11px] text-slate-400">Usulan dari link masuk otomatis saat halaman ini dibuka. Mode saat ini: ${upSyncCfg().url?'server':'browser lokal (link hanya berlaku di browser ini)'}.</span></div>
 <details class="mt-3 rounded-xl border border-line p-3 text-xs"><summary class="font-bold text-slate-600 cursor-pointer">Pengaturan server usulan (opsional, untuk nanti)</summary>
  <div class="mt-3 space-y-2"><input id="upSyUrl" value="${esc(upSyncCfg().url)}" placeholder="URL server, contoh https://namaanda.netlify.app" class="h-10 w-full border border-line rounded-xl px-3 text-sm"><input id="upSyKey" type="password" value="${esc(upSyncCfg().key)}" placeholder="Kunci admin (ADMIN_KEY)" class="h-10 w-full border border-line rounded-xl px-3 text-sm"><button onclick="upSaveSync('${p}')" class="h-9 px-4 rounded-lg text-xs font-bold border border-line">Simpan</button><p class="text-slate-400">Kosongkan URL untuk memakai browser lokal. Jika diisi, buat ulang link update agar mengirim ke server.</p></div></details>
 <details class="mt-2 rounded-xl border border-line p-3 text-xs"><summary class="font-bold text-slate-600 cursor-pointer">Tempel kode manual (cadangan)</summary>
  <textarea id="upCode" class="mt-3 w-full h-20 border border-line rounded-xl p-2 text-xs" placeholder="Tempel satu atau beberapa kode SDU1... (pisahkan dengan baris baru)"></textarea><div class="mt-2">${pBtn('bg-navy text-white','inbox','Proses kode',`upIngest('${p}')`)}</div></details>
 <h4 class="mt-5 mb-2 text-sm font-extrabold">Menunggu persetujuan</h4><div class="space-y-2">${it}</div>
 <h4 class="mt-5 mb-1 text-sm font-extrabold">Riwayat perubahan</h4><div class="divide-y divide-line">${lg}</div>`);}


/* geser tabel dengan tarik mouse (klik tahan lalu seret), tombol & tautan tetap bisa diklik */
(function(){
 let el=null,x0=0,s0=0,moved=false;
 document.addEventListener('mousedown',e=>{
  if(e.button!==0||e.target.closest('button,a,input,select,textarea,label'))return;
  const c=e.target.closest('.overflow-x-auto.scrollbar');
  if(!c||!c.querySelector('table')||c.scrollWidth<=c.clientWidth)return;
  el=c;x0=e.clientX;s0=c.scrollLeft;moved=false;
 });
 document.addEventListener('mousemove',e=>{
  if(!el)return;const dx=e.clientX-x0;
  if(!moved&&Math.abs(dx)>4){moved=true;el.classList.add('dragging');}
  if(moved)el.scrollLeft=s0-dx;
 });
 const end=()=>{if(el)el.classList.remove('dragging');el=null;};
 document.addEventListener('mouseup',end);document.addEventListener('mouseleave',end);
 /* roda mouse biasa menggeser tabel ke samping bila kursor di atas header tabel */
 document.addEventListener('wheel',e=>{
  const th=e.target.closest&&e.target.closest('thead');if(!th||e.shiftKey)return;
  const c=th.closest('.overflow-x-auto');if(!c||c.scrollWidth<=c.clientWidth)return;
  c.scrollLeft+=e.deltaY;e.preventDefault();
 },{passive:false});
})();
document.addEventListener('click',e=>{const m=document.getElementById('upMenu');if(m&&!m.classList.contains('hidden')&&!e.target.closest('#upTools'))m.classList.add('hidden');});
/* =====================================================================
   ABSENSI KMM KELOMPOK — kalender 5 tahun, jadwal mingguan, link per bulan
   Link: /absensi/kmmkelompok<bulan><tahun>  (contoh: /absensi/kmmkelompoknovember2026)
   Tiap bulan = 1 form absensi (id = slug) yang memuat semua kelompok.
   Pengguna memilih kelompok -> muncul nama generus kelompok tsb.
   ===================================================================== */
const KA_KEY='simdeka_kmm_abs_v1';
const KA_HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const KA_DEF={hari:1,jam:'19:30',mode:'petugas',st:'all',desaMg:2,daerahMg:3,m:{}};
const KA_JN={kelompok:'Pengajian Muda Mudi Kelompok',desa:'Pengajian Muda Mudi Desa',daerah:'Pengajian Muda Mudi Daerah'};
const KA_JC={kelompok:'#173B70',desa:'#18A66A',daerah:'#7C3AED'};
function kaMg(n){return n?'minggu ke-'+n:'tidak ada';}
function kaMalam(i){return 'Malam '+KA_HARI[(i+1)%7];}
function kaHariLabel(i){return KA_HARI[i]+' ('+kaMalam(i)+')';}
function kaBln(m){const b=FM_BLN[m]||'';return b.charAt(0).toUpperCase()+b.slice(1);}
function kaLoad(){
 try{const o=JSON.parse(localStorage.getItem(KA_KEY)||'null');
  if(o&&typeof o==='object')return Object.assign({},KA_DEF,o,{m:(o.m&&typeof o.m==='object')?o.m:{}});}catch(e){}
 return JSON.parse(JSON.stringify(KA_DEF));
}
let KA=kaLoad();
function kaSave(){try{localStorage.setItem(KA_KEY,JSON.stringify(KA));}catch(e){showToast('Penyimpanan penuh — pengaturan tidak tersimpan');}}
const KA_Y0=new Date().getFullYear()-1; /* 5 tahun: tahun lalu s.d. 3 tahun ke depan */
const KA_UI={y:new Date().getFullYear(),dir:0,rk:'',sel:null};
function kaYears(){
 const cy=new Date().getFullYear(),set=new Set(Array.isArray(KA.years)?KA.years.filter(Number.isInteger):[]);
 if(!set.size)set.add(cy);
 Object.keys(KA.m||{}).forEach(k=>{const v=parseInt(k.slice(0,4),10);if(v>1999)set.add(v);});
 try{fmForms.forEach(f=>{if(f&&f.kmm&&Number.isInteger(f.kmm.y))set.add(f.kmm.y);});}catch(e){}
 return [...set].sort((a,b)=>a-b);
}
function kaCanNewYear(){return true;}
async function kaNewYear(){
 if(!kaCanNewYear())return;
 const ys=kaYears(),ny=ys[ys.length-1]+1;
 if(!await uiConfirm({title:'Buat kalender '+ny+'?',message:'Kalender pengajian tahun '+ny+' akan ditambahkan. Jadwal, libur, dan link bisa kamu atur setelahnya.',ok:'Buat Tahun '+ny,tone:'success',icon:'calendar-plus'}))return;
 KA.years=ys.concat(ny);kaSave();KA_UI.dir=1;KA_UI.y=ny;renderAbsensiKmm();showToast('Kalender '+ny+' dibuat');
}
function kaYm(y,m){return y+'-'+String(m+1).padStart(2,'0');}
function kaMc(y,m){return KA.m[kaYm(y,m)]||{};}
function kaHariOf(y,m){const c=kaMc(y,m);return Number.isInteger(c.hari)?c.hari:KA.hari;}
function kaModeLabel(x){return x==='both'?'Dua-duanya (peserta atau petugas)':x==='peserta'?'Diisi sendiri oleh peserta':'Diisi pengurus kelompok';}
function kaModeOf(y,m){const c=kaMc(y,m);return (c.mode==='peserta'||c.mode==='petugas'||c.mode==='both')?c.mode:KA.mode;}
function kaIso(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function kaDim(y,m){return new Date(y,m+1,0).getDate();}
function kaDefState(y,m,d){
 if(new Date(y,m,d).getDay()!==kaHariOf(y,m))return 'none';
 const n=Math.ceil(d/7);
 if(KA.desaMg&&n===KA.desaMg)return 'desa';
 if(KA.daerahMg&&n===KA.daerahMg)return 'daerah';
 return 'kelompok';
}
function kaState(y,m,d){
 if(kaMc(y,m).off)return 'none';
 const c=kaMc(y,m);let o=c.ov&&c.ov[kaIso(y,m,d)];if(o==='ada')o='kelompok';if(o)return o;
 return kaDefState(y,m,d);
}
function kaSesi(y,m){
 const out=[];
 for(let d=1;d<=kaDim(y,m);d++){
  const s=kaState(y,m,d),iso=kaIso(y,m,d);
  if(KA_JN[s])out.push({tgl:iso,st:'ada',ket:'',jn:s});
  else if(s==='libur'){const b=kaDefState(y,m,d);out.push({tgl:iso,st:'libur',ket:'Libur',jn:KA_JN[b]?b:'kelompok'});}
 }
 return out;
}
function kaSesiJ(y,m,j){return kaSesi(y,m).filter(x=>x.jn===j);}
function kaPure(S){return S.map(x=>({tgl:x.tgl,st:x.st,ket:x.ket}));}
function kaNeeded(y,m){return kaJns().filter(j=>kaSesiJ(y,m,j).some(x=>x.st!=='libur'));}
function kaJns(){return ['kelompok','desa','daerah'];}
function kaJnLabel(j){return j==='kelompok'?'Kelompok':j==='desa'?'Desa':'Daerah';}
function kaSlug(y,m,j){return j+FM_BLN[m]+y;}
function isLocalFile(){return location.protocol==='file:';}
function kaOrigin(){return (/^https?:$/.test(location.protocol)&&location.origin&&location.origin!=='null')?location.origin:'https://domain-anda';}
function fileModeWarn(){return isLocalFile()?'<div class="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 leading-relaxed"><b>Mode file lokal.</b> Aplikasi dibuka dari berkas (file://), sehingga tautan di bawah memakai alamat contoh <code>https://domain-anda</code> dan belum bisa dibuka orang lain. Pasang aplikasi di server/hosting, lalu buka lewat alamat webnya agar tautan berfungsi.</div>':'';}
function kaUrl(y,m,j){return kaOrigin()+'/'+j+'/'+FM_BLN[m]+y;}
function kaAlt(y,m,j){return kaOrigin()+'/f/'+kaSlug(y,m,j);}
/* ---------- Jurnal Pengajian Muda Mudi Desa: tautan /desa/jurnal/<bulan><tahun> ----------
   Berupa form umum (custom). Isian: surat & ayat Al-Qur'an, hadist & halaman, keterangan tambahan. */
function kaJrSlug(y,m){return 'jdesa'+FM_BLN[m]+y;}
function kaJrUrl(y,m){return kaOrigin()+'/desa/jurnal/'+FM_BLN[m]+y;}
function kaJrForm(y,m){return fmForms.find(f=>f.id===kaJrSlug(y,m));}
function kaJrKelas(y,m){
 const pre=y+'-'+String(m+1).padStart(2,'0'),out=[];
 Object.keys(MS.n||{}).filter(k=>k.slice(0,7)===pre).forEach(k=>{(MS.n[k].bahas||[]).forEach(b=>{if(b.tipe==='pmd'&&b.pmd)b.pmd.kelas.forEach(c=>{const n=String(c.nama||'').trim();if(n&&!out.some(o=>o.toLowerCase()===n.toLowerCase()))out.push(n);});});});
 return out.length?out:PMD_KELAS.slice();
}
function kaJrItems(y,m){
 const t=(id,title)=>{const it=fmBlank('title');it.id=id;it.title=title;return it;};
 const q=(id,title,req,type)=>{const it=fmBlank('q',type||'short');it.id=id;it.title=title;it.required=!!req;return it;};
 const kl=q('kelas','Kelas',true,'select');kl.options=kaJrKelas(y,m);
 return [
  t('jtKelas','Kelas & Penerobos'),
  kl,
  q('pen','Nama penerobos',true),
  t('jtQuran',"Materi Al-Qur'an"),
  q('surat','Surat apa yang dibacakan?',true),
  q('ayat','Ayat berapa?',true),
  t('jtHadist','Materi Al-Hadist'),
  q('hadist','Hadist apa yang disampaikan?',true),
  q('hal','Halaman berapa?',true),
  q('infaq','Infaq jumlah berapa?',true),
  t('jtTambahan','Tambahan keterangan (jika ada)'),
  q('ket','Keterangan tambahan',false,'long')
 ];
}
/* Menyamakan form jurnal dengan jadwal bulan itu: judul, tanggal pengajian desa, dan isian.
   Jawaban yang sudah masuk tetap aman karena disimpan per id isian. */
function kaJrSync(f,y,m){
 const s=kaSesiJ(y,m,'desa').find(x=>x.st!=='libur');
 f.title='Jurnal Pengajian Muda Mudi Desa';
 f.desc=s?fmDateLong(s.tgl):kaBln(m)+' '+y;
 f.color=KA_JC.desa;
 const canon=kaJrItems(y,m),have=new Map((f.items||[]).map(x=>[x.id,x]));
 const out=canon.map(c=>{const o=have.get(c.id);if(!o)return c;o.title=c.title;o.required=c.required;o.kind=c.kind;if(c.type==='select'){o.type='select';o.options=c.options.slice();}return o;});
 (f.items||[]).forEach(x=>{if(!canon.some(c=>c.id===x.id))out.push(x);});
 f.items=out;
 f.shared=true;f.updated=Date.now();
}
function kaJrFromMs(iso){
 try{
  const y=+iso.slice(0,4),m=+iso.slice(5,7)-1,f=kaJrForm(y,m);if(!f)return;
  const it=(f.items||[]).find(x=>x.id==='kelas');
  if(it&&JSON.stringify(it.options||[])===JSON.stringify(kaJrKelas(y,m)))return;
  kaJrSync(f,y,m);fmSave(true);
  clearTimeout(window._kaJrT);window._kaJrT=setTimeout(()=>{if(window.simdekaFormSyncNow){try{window.simdekaFormSyncNow().catch(()=>{});}catch(e){}}},800);
 }catch(e){}
}
async function kaJrMake(y,m){
 let f=kaJrForm(y,m);
 if(!f){
  f=fmNew('custom');
  f.id=kaJrSlug(y,m);
  f.items=[];
  f.confirmMsg='Jurnal pengajian sudah tersimpan. Terima kasih.';
  f.allowAnother=true;
  fmForms.unshift(f);
 }
 kaJrSync(f,y,m);
 fmSave(true);
 if(window.simdekaFormSyncNow){try{await window.simdekaFormSyncNow();}catch(e){showToast('Gagal menyimpan form ke server');}}
 kaPanel(y,m,true);renderAbsensiKmm();showToast('Link jurnal siap dibagikan');
}
function kaJrRows(y){
 const out=[];
 for(let m=0;m<12;m++){const f=kaJrForm(y,m);if(!f)continue;fmResp(f.id).forEach(r=>out.push({m:m,ts:r.ts||0,a:r.a||{}}));}
 return out.sort((p,q)=>p.m-q.m||p.ts-q.ts);
}
function kaJrTry(y,m){const f=kaJrForm(y,m);if(!f){showToast('Buat linknya dulu.');return;}closeModal();pfOpen(fmSanitize(JSON.parse(JSON.stringify(f))),true);}
function kaJrHtml(y,m){
 if(kaMc(y,m).off)return '';
 if(!kaSesiJ(y,m,'desa').some(x=>x.st!=='libur'))return '';
 const f=kaJrForm(y,m),n=kaJrRows(y).length;
 const head=`<div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 text-sm font-bold"><i class="ka-lg" style="background:${KA_JC.desa}"></i>Jurnal Pengajian Muda Mudi Desa</div>${f?`<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">${fmResp(f.id).length} tanggapan</span>`:''}</div>`;
 const rekap=`<button onclick="kaJrRekap(${y})" class="h-9 px-3 rounded-xl border border-line text-xs font-bold flex items-center gap-1.5">${icon('table','w-4')} Rekap ${y} (${n})</button>`;
 if(!f)return `<div class="rounded-2xl border border-dashed border-line p-4 space-y-2">${head}<p class="text-[11px] text-slate-500 font-mono break-all">/desa/jurnal/${FM_BLN[m]}${y}</p><div class="flex flex-wrap gap-2"><button onclick="kaJrMake(${y},${m})" class="u-btn primary">${icon('link','w-4 h-4')} Buat link jurnal</button>${rekap}</div></div>`;
 if(!(f.items||[]).some(x=>x.id==='kelas')){kaJrSync(f,y,m);fmSave(true);if(window.simdekaFormSyncNow){try{window.simdekaFormSyncNow().catch(()=>{});}catch(e){}}}
 const url=kaJrUrl(y,m);
 const wa='https://wa.me/?text='+encodeURIComponent('Jurnal Pengajian Muda Mudi Desa, pengajian '+(f.desc||kaBln(m)+' '+y)+'. Silakan isi jurnal lewat tautan berikut:\n'+url);
 const row=(k,v)=>v?`<div><span class="text-slate-400">${k}:</span> ${esc(v)}</div>`:'';
 const R=fmResp(f.id).slice().sort((a,b)=>(b.ts||0)-(a.ts||0));
 const list=R.length?R.map(r=>{const a=r.a||{};return `<div class="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed">${row('Kelas',a.kelas)}${row('Penerobos',a.pen)}${row("Al-Qur'an",a.surat?'QS. '+a.surat+(a.ayat?', ayat '+a.ayat:''):'')}${row('Al-Hadist',a.hadist?a.hadist+(a.hal?', hal. '+a.hal:''):'')}${row('Infaq',a.infaq)}${row('Keterangan',a.ket)}${r.ts?`<div class="text-[10px] text-slate-400 pt-1">${esc(new Date(r.ts).toLocaleString('id-ID'))}</div>`:''}</div>`;}).join(''):'<p class="text-[11px] text-slate-400">Belum ada jurnal masuk.</p>';
 return `<div class="rounded-2xl border border-line p-4 space-y-3">${head}
  <div class="flex gap-2"><input readonly value="${esc(url)}" onfocus="this.select()" class="flex-1 min-w-0 border border-line rounded-xl px-3 py-2 text-xs bg-slate-50"><button onclick="fmCopyText(kaJrUrl(${y},${m}),'Link jurnal disalin')" class="px-3 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-1.5">${icon('copy','w-4')} Salin</button></div>
  <div class="flex flex-wrap gap-2">
   <a target="_blank" rel="noopener" href="${esc(wa)}" class="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5">${icon('message-circle','w-4')} WhatsApp</a>
   <a target="_blank" rel="noopener" href="${esc(url)}" class="h-9 px-3 rounded-xl border border-line text-xs font-bold flex items-center gap-1.5">${icon('external-link','w-4')} Buka</a>
   <button onclick="kaJrTry(${y},${m})" class="h-9 px-3 rounded-xl bg-violet-600 text-white text-xs font-bold flex items-center gap-1.5">${icon('play','w-4')} Coba</button>
   ${rekap}
  </div>
  <div class="space-y-2">${list}</div></div>`;
}
/* Rekap jurnal per tahun */
function kaJrRekap(y){KA_UI.jrY=y;kaJrRekapRender();showModal();}
function kaJrSetY(v){KA_UI.jrY=v;kaJrRekapRender();}
function kaJrRekapRender(){
 const y=KA_UI.jrY||KA_UI.y,rows=kaJrRows(y),sel='border border-line rounded-xl px-3 py-2 text-xs bg-white font-semibold';
 const per=Array.from({length:12},(_,m)=>rows.filter(r=>r.m===m).length),terisi=per.filter(n=>n>0).length;
 kaWide(true);
 fmEl('modalTitle').textContent='Rekap Jurnal Pengajian Muda Mudi Desa — '+y;
 fmEl('modalDesc').textContent=terisi+' dari 12 bulan sudah berisi jurnal • '+rows.length+' tanggapan';
 const tiles=per.map((n,m)=>`<div class="rounded-lg border border-line p-2 text-center"><div class="text-[10px] font-bold text-slate-400">${kaBln(m).slice(0,3)}</div><div class="font-extrabold ${n?'text-emerald-700':'text-slate-300'}">${n}</div></div>`).join('');
 const td=v=>`<td class="px-3 py-2 align-top">${esc(v||'—')}</td>`;
 const th=t=>`<th class="px-3 py-2 text-left font-bold whitespace-nowrap">${t}</th>`;
 const table=rows.length?`<div class="overflow-auto scrollbar rounded-xl border border-line max-h-[48vh]"><table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500 sticky top-0 z-10"><tr>${th('Bulan')}${th('Kelas')}${th('Penerobos')}${th('Surat')}${th('Ayat')}${th('Hadist')}${th('Halaman')}${th('Infaq')}${th('Keterangan')}${th('Dikirim')}</tr></thead><tbody>${rows.map(r=>`<tr class="border-t border-line"><td class="px-3 py-2 align-top font-bold whitespace-nowrap">${esc(kaBln(r.m))}</td>${td(r.a.kelas)}${td(r.a.pen)}${td(r.a.surat)}${td(r.a.ayat)}${td(r.a.hadist)}${td(r.a.hal)}${td(r.a.infaq)}${td(r.a.ket)}<td class="px-3 py-2 align-top text-slate-400 whitespace-nowrap">${r.ts?esc(new Date(r.ts).toLocaleString('id-ID')):'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="py-12 text-center text-sm text-slate-400">Belum ada jurnal masuk pada tahun ini.</div>';
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  <div class="flex flex-wrap gap-2 items-center"><select class="${sel}" onchange="kaJrSetY(parseInt(this.value,10))">${kaYears().map(v=>`<option value="${v}" ${v===y?'selected':''}>${v}</option>`).join('')}</select><button onclick="kaJrExport()" class="u-btn ml-auto">${icon('file-spreadsheet','w-4 h-4')} Export Excel</button></div>
  <div class="grid grid-cols-6 sm:grid-cols-12 gap-1.5">${tiles}</div>
  ${table}
  <div class="flex justify-end"><button onclick="closeModal()" class="u-btn">Tutup</button></div></div>`;
 lucide.createIcons();
}
function kaJrExport(){
 const y=KA_UI.jrY||KA_UI.y,rows=kaJrRows(y);
 if(!rows.length){showToast('Belum ada data untuk diexport');return;}
 if(typeof XLSX==='undefined'){showToast('Library Excel belum termuat (periksa koneksi internet)');return;}
 const s=[['Bulan','Kelas','Penerobos','Surat','Ayat','Hadist','Halaman','Infaq','Keterangan','Dikirim']];
 rows.forEach(r=>s.push([kaBln(r.m)+' '+y,r.a.kelas||'',r.a.pen||'',r.a.surat||'',r.a.ayat||'',r.a.hadist||'',r.a.hal||'',r.a.infaq||'',r.a.ket||'',r.ts?new Date(r.ts).toLocaleString('id-ID'):'']));
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s),'Jurnal '+y);
 XLSX.writeFile(wb,'rekap-jurnal-pengajian-desa-'+y+'.xlsx');
 showToast('File Excel diunduh');
}
function kaIsKmm(f){return !!f&&(!!f.kmm||/^(kelompok|desa|daerah)(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\d{4}$/.test(String(f.id||''))||/^kmmkelompok/.test(String(f.id||'')));}
function kaForm(y,m,j){return fmForms.find(f=>f.id===kaSlug(y,m,j));}
window.FM_EXTRA_SOURCES=window.FM_EXTRA_SOURCES||{};
window.FM_EXTRA_SOURCES['kmm-generus']=function(){
 const act=new Set(activeGroups());
 return generus.filter(g=>g.kelompok&&act.has(g.kelompok)&&(KA.st!=='mm'||g.status==='Muda Mudi'))
  .map(g=>({n:g.nama,k:g.kelompok,d:'Generus'+(g.status?' • '+g.status:'')}));
};
function kaPeserta(){return fmBuildPeserta({sumber:['kmm-generus'],kelompok:[]});}

function kaTitle(y,m,j){return 'Absensi '+KA_JN[j]+' — '+kaBln(m)+' '+y;}
function kaApply(f,y,m,j){
 const a=f.absen,S=kaPure(kaSesiJ(y,m,j)),first=S.find(x=>x.st!=='libur')||S[0];
 a.jenis=KA_JN[j];a.rutin=true;a.sesi=S;
 a.tanggal=first?first.tgl:kaIso(y,m,1);
 a.mode=kaModeOf(y,m);a.sumber=['kmm-generus'];a.kelompok=[];a.pet=kaPetMap();
 a.peserta=fmBuildPeserta(a);
 f.title=kaTitle(y,m,j);
 f.desc=KA_JN[j]+', '+kaMalam(kaHariOf(y,m)).toLowerCase()+(KA.jam?' pukul '+KA.jam:'')+'.';
 f.shared=true;f.updated=Date.now();
}
async function kaEnsure(y,m,list){
 list=list||kaNeeded(y,m);
 list.forEach(j=>{
  let f=kaForm(y,m,j);
  if(!f){f=fmNew('absensi');f.id=kaSlug(y,m,j);f.kmm={y:y,m:m,j:j};f.color=KA_JC[j];fmForms.unshift(f);}
  kaApply(f,y,m,j);
 });
 fmSave(true);
 if(window.simdekaFormSyncNow){try{await window.simdekaFormSyncNow();}catch(e){showToast('Gagal menyimpan form ke server');}}
}
function kaStale(y,m,j){
 if(kaMc(y,m).off)return false;
 const f=kaForm(y,m,j);if(!f)return false;
 const a=f.absen,k=x=>JSON.stringify(x.map(s=>[s.tgl,s.st,s.ket||'']));
 return f.title!==kaTitle(y,m,j)||k(kaSesiJ(y,m,j))!==k(a.sesi||[])||a.mode!==kaModeOf(y,m)||kaPeserta().length!==(a.peserta||[]).length||kaPetSig(a.pet)!==kaPetSig(kaPetMap());
}
function kaStaleList(){
 const n=new Date(),cur=n.getFullYear()*12+n.getMonth(),out=[];
 kaYears().forEach(y=>{for(let m=0;m<12;m++){if(y*12+m<cur||kaMc(y,m).off)continue;kaJns().forEach(j=>{if(kaStale(y,m,j))out.push([y,m,j]);});}});
 return out;
}
/* ---------- tampilan: kalender setahun ---------- */
function kaYear(v){
 const ys=kaYears();let t;
 if(v>1000)t=v;else{const i=ys.indexOf(KA_UI.y)+v;if(i<0||i>=ys.length)return;t=ys[i];}
 if(!ys.includes(t))return;
 KA_UI.dir=t>KA_UI.y?1:-1;KA_UI.y=t;renderAbsensiKmm();
}
function kaToggleM(y,m,on,inModal){
 const key=kaYm(y,m),c=KA.m[key]=KA.m[key]||{};
 if(on)delete c.off;else c.off=true;
 if(!Object.keys(c).length)delete KA.m[key];
 kaSave();if(inModal)kaPanel(y,m,true);renderAbsensiKmm();
 showToast(kaBln(m)+' '+y+(on?' diaktifkan':' dinonaktifkan'));
}
function kaOffRow(y,m){
 const off=!!kaMc(y,m).off;
 return `<div class="flex items-center justify-between gap-3 rounded-2xl border ${off?'border-amber-200 bg-amber-50':'border-line bg-slate-50'} p-3.5"><div><div class="text-sm font-extrabold">Bulan ${off?'nonaktif':'aktif'}</div><div class="text-[11px] text-slate-500 mt-0.5">${off?'Tidak ada pengajian dan link di bulan ini. Aktifkan lagi untuk memakai jadwal.':'Matikan jika bulan ini tidak ada pengajian sama sekali (mis. libur panjang).'}</div></div><label class="ka-sw"><input type="checkbox" ${off?'':'checked'} onchange="kaToggleM(${y},${m},this.checked,true)" aria-label="Aktifkan bulan"><i></i></label></div>`;
}
function kaCard(y,m){
 const off=!!kaMc(y,m).off,S=kaSesi(y,m),ada=S.filter(x=>x.st!=='libur').length,libur=S.length-ada,need=kaNeeded(y,m);
 const n=new Date(),isNow=n.getFullYear()===y&&n.getMonth()===m,past=y*12+m<n.getFullYear()*12+n.getMonth();
 const made=kaJns().filter(j=>kaForm(y,m,j)),resp=made.reduce((t,j)=>t+fmResp(kaForm(y,m,j).id).length,0);
 const stale=!off&&!past&&(kaJns().some(j=>kaStale(y,m,j))||need.some(j=>!kaForm(y,m,j))&&made.length>0);
 const pill=(c,t)=>`<span class="px-2 py-0.5 rounded-full ${c} text-[10px] font-bold whitespace-nowrap">${t}</span>`;
 const badge=off?pill('bg-slate-200 text-slate-600','Nonaktif'):made.length?(stale?pill('bg-amber-50 text-amber-700','Perlu diperbarui'):pill('bg-emerald-50 text-emerald-700','Link aktif')):pill('bg-slate-100 text-slate-500','Belum ada link');
 const dots=need.map(j=>`<i class="ka-lg" style="background:${KA_JC[j]}" title="${kaJnLabel(j)}"></i>`).join(' ');
 return `<div class="ka-card${isNow?' now':''}${off?' off':''}${past&&!resp&&!off?' opacity-80':''}" onclick="kaPanel(${y},${m})">
  <div class="flex items-center justify-between gap-2 mb-2.5"><div class="font-extrabold text-sm">${kaBln(m)}${isNow?' <span class="text-[10px] font-bold text-greenx">• sekarang</span>':''}</div><div class="flex items-center gap-2">${badge}<label class="ka-sw" title="${off?'Aktifkan':'Nonaktifkan'} bulan ini" onclick="event.stopPropagation()"><input type="checkbox" ${off?'':'checked'} onchange="kaToggleM(${y},${m},this.checked)" aria-label="Aktifkan bulan"><i></i></label></div></div>
  ${kaMini(y,m,false)}
  <div class="ka-ft mt-3 pt-3 border-t border-line text-[11px] text-slate-500 flex items-center justify-between gap-2"><span><b class="text-ink">${ada}</b> pengajian${libur?' • '+libur+' libur':''} ${dots}</span>${off?'':`<button type="button" class="ka-rk" onclick="event.stopPropagation();kaRekap(${y},${m})">${icon('table','w-3.5 h-3.5')} Rekap${resp?' · '+resp:''}</button>`}</div></div>`;
}
function kaMini(y,m,big){
 const first=new Date(y,m,1).getDay(),n=kaDim(y,m),t=fmToday(),hd=['Mg','Sn','Sl','Rb','Km','Jm','Sb'];
 let h=`<div class="ka-cal${big?' big':''}">`+hd.map(x=>`<span class="ka-h">${x}</span>`).join('');
 for(let i=0;i<first;i++)h+='<span></span>';
 for(let d=1;d<=n;d++){
  const s=kaState(y,m,d),iso=kaIso(y,m,d),sl=KA_UI.sel,cls='ka-d '+(s==='none'?'':s)+(iso===t?' today':'')+(big&&sl&&sl.y===y&&sl.m===m&&sl.d===d?' sel':'');
  h+=big?`<button type="button" class="${cls}" onclick="kaTap(${y},${m},${d})">${d}</button>`:`<span class="${cls}">${d}</span>`;
 }
 return h+'</div>';
}
/* ---------- hapus data satu tahun (tahun berjalan / arsip) ---------- */
function kaFormYear(f){
 if(!f)return null;
 if(f.kmm&&Number.isInteger(f.kmm.y))return f.kmm.y;
 const id=String(f.id||''),re=new RegExp('^(kelompok|desa|daerah|jdesa)('+FM_BLN.join('|')+')(\\d{4})$');
 const m=re.exec(id);return m?parseInt(m[3],10):null;
}
function kaYearData(y){
 const keys=Object.keys(KA.m||{}).filter(k=>k.slice(0,4)===String(y));
 const forms=fmForms.filter(f=>kaFormYear(f)===y);
 const resp=forms.reduce((n,f)=>n+fmResp(f.id).length,0);
 return {keys,forms,resp};
}
function kaAskDelYear(){
 const y=KA_UI.y,cy=new Date().getFullYear(),d=kaYearData(y);
 fmEl('modalTitle').textContent='Hapus Data Tahun '+y;fmEl('modalDesc').textContent='';
 const lbl=y===cy?'Tahun berjalan':(y<cy?'Arsip':'Mendatang');
 const tile=(n,t)=>`<div class="ka-dy-tile text-center"><b>${n.toLocaleString('id-ID')}</b><span>${t}</span></div>`;
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  <div class="flex items-center gap-3 rounded-2xl bg-slate-50 border border-line p-4">
   <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">${icon('trash-2','w-5 h-5')}</span>
   <div class="min-w-0"><div class="text-lg font-extrabold text-slate-800 leading-tight">Tahun ${y}</div><div class="text-xs text-slate-500">${lbl}</div></div>
  </div>
  <div class="grid grid-cols-3 gap-2">${tile(d.keys.length,'Jadwal diubah')}${tile(d.forms.length,'Link absensi')}${tile(d.resp,'Tanggapan')}</div>
  <p class="text-xs leading-relaxed text-slate-500">Hanya data tahun ${y} yang dihapus; tahun lain tidak terpengaruh. Setelah dihapus, kamu masih bisa menekan <b>Urungkan</b> selama 8 detik.</p>
  <div class="flex justify-end gap-2"><button onclick="closeModal()" class="px-4 py-2.5 rounded-xl border border-line text-sm font-bold">Batal</button><button onclick="kaDelYear(${y})" class="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Hapus data ${y}</button></div>
 </div>`;
 showModal();if(window.lucide)lucide.createIcons();
}
function kaDelYear(y){
 const cy=new Date().getFullYear(),d=kaYearData(y);
 const bakM={},bakIdx=[],bakResp={};
 d.keys.forEach(k=>{bakM[k]=KA.m[k];delete KA.m[k];});
 d.forms.forEach(f=>{bakIdx.push([fmForms.indexOf(f),f]);bakResp[f.id]=fmResp(f.id).slice();});
 const hadYears=Array.isArray(KA.years)?KA.years.slice():null,ys=kaYears();
 if(y!==cy)KA.years=ys.filter(v=>v!==y);else KA.years=ys;
 const ids=new Set(d.forms.map(f=>f.id));
 fmForms=fmForms.filter(f=>!ids.has(f.id));fmSave(true);
 const all=fmRespAll();
 ids.forEach(id=>{delete all[id];if(window.simdekaFormDelete)window.simdekaFormDelete(id);try{localStorage.removeItem(FM_DRAFT+id);}catch(e){}});
 try{localStorage.setItem(FM_RESP,JSON.stringify(all));}catch(e){}
 kaSave();
 const left=kaYears();if(!left.includes(KA_UI.y))KA_UI.y=left.includes(cy)?cy:left[left.length-1];
 closeModal();renderAbsensiKmm();
 fmUndo('Data tahun '+y+' dihapus',async()=>{
  Object.assign(KA.m,bakM);if(hadYears)KA.years=hadYears;else delete KA.years;kaSave();
  bakIdx.sort((a,b)=>a[0]-b[0]).forEach(([i,f])=>{if(!fmForms.some(x=>x.id===f.id))fmForms.splice(Math.min(i,fmForms.length),0,f);});
  fmSave(true);if(window.simdekaFormSyncNow)await window.simdekaFormSyncNow();
  for(const id of Object.keys(bakResp)){const l=bakResp[id];if(!l.length)continue;if(window.simdekaResponsePush)await Promise.all(l.map(r=>window.simdekaResponsePush(id,r)));else fmRespPut(id,l);}
  KA_UI.y=y;if(fmEl('kaYear'))renderAbsensiKmm();showToast('Data tahun '+y+' dikembalikan');
 });
}
function renderAbsensiKmm(){
 const ys=kaYears(),cy=new Date().getFullYear();
 if(!ys.includes(KA_UI.y))KA_UI.y=ys.includes(cy)?cy:ys[ys.length-1];
 const y=KA_UI.y,nK=activeGroups().length,nG=kaPeserta().length,i=ys.indexOf(y),canNew=kaCanNewYear(),ny=ys[ys.length-1]+1;
 let nLink=0,nNeed=0,nSes=0,nOff=0;const cnt={kelompok:0,desa:0,daerah:0};
 for(let m=0;m<12;m++){if(kaMc(y,m).off)nOff++;kaJns().forEach(j=>{if(kaForm(y,m,j))nLink++;});nNeed+=kaNeeded(y,m).length;kaSesi(y,m).forEach(x=>{if(x.st!=='libur'){nSes++;if(cnt[x.jn]!==undefined)cnt[x.jn]++;}});}
 const brk='<span class="ka-brks">'+kaJns().map(j=>`<span class="ka-brk"><i class="ka-lg" style="background:${KA_JC[j]}"></i>${kaJnLabel(j)} <b>${cnt[j]}</b></span>`).join('')+'</span>';
 const stale=kaStaleList(),anim=KA_UI.dir>0?'ka-in-l':KA_UI.dir<0?'ka-in-r':'';KA_UI.dir=0;
 fmEl('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead('Setiap <b>'+esc(kaMalam(KA.hari))+'</b>: pengajian muda mudi kelompok; pengajian muda mudi <b>desa</b> '+kaMg(KA.desaMg)+', <b>daerah</b> '+kaMg(KA.daerahMg)+'. Link absensi dibuat per jenis pengajian tiap bulan.','')}
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
   ${statCard('Kelompok Aktif',nK,'Pilihan di form absensi','network','blue')}
   ${statCard('Peserta (Generus)',nG,KA.st==='mm'?'Hanya Muda Mudi':'Semua status generus','sprout','green')}
   ${statCard('Pengajian '+y,nSes,brk,'calendar-check','purple')}
   ${statCard('Link '+y,nLink+'/'+nNeed,'Link kelompok, desa, daerah','link','orange')}
  </div>
  ${stale.length?`<div class="mb-4 rounded-2xl bg-amber-50 border border-amber-100 p-4 flex flex-wrap items-center gap-3 text-sm text-amber-800">${icon('alert-triangle','w-5 shrink-0')}<span class="flex-1 min-w-[200px]"><b>${stale.length} link</b> belum memuat jadwal/daftar peserta terbaru (ada perubahan data generus atau jadwal).</span><button onclick="kaRefreshAll()" class="u-btn primary">${icon('refresh-cw','w-4 h-4')} Perbarui semua</button></div>`:''}
  <div class="ka-toolbar">
   <div class="flex items-center gap-2.5 flex-wrap">
    <div class="ka-ysw"><button onclick="kaYear(-1)" ${i<=0?'disabled':''} aria-label="Tahun sebelumnya">${icon('chevron-left','w-5 h-5')}</button><div class="ka-yv ${y<cy?'arsip':''}"><b>${y}</b><span>${y===cy?'Tahun berjalan':(y<cy?'Arsip':'Mendatang')}</span></div><button onclick="kaYear(1)" ${i>=ys.length-1?'disabled':''} aria-label="Tahun berikutnya">${icon('chevron-right','w-5 h-5')}</button></div>
    <button onclick="kaAskDelYear()" class="ka-yd" title="Hapus data tahun ${y}" aria-label="Hapus data tahun ${y}">${icon('trash-2','w-[18px] h-[18px]')}</button>
    ${canNew?`<button onclick="kaNewYear()" class="u-btn ka-newyr">${icon('calendar-plus','w-4 h-4')} Buat Tahun ${ny}</button>`:''}
    ${nOff?`<span class="text-[11px] font-semibold text-slate-400">${nOff} bulan nonaktif</span>`:''}
   </div>
   <div class="u-actions"><button onclick="kaPetOpen()" class="u-btn">${icon('user-cog','w-4 h-4')} Petugas Default</button><button onclick="kaSettings()" class="u-btn">${icon('settings','w-4 h-4')} Pengaturan Jadwal</button><button onclick="kaRekapOpen()" class="u-btn primary">${icon('table','w-4 h-4')} Rekap Lengkap</button></div>
  </div>
  <p class="text-[11px] text-slate-400 mb-3">Ketuk bulan untuk mengatur jadwal, libur, dan link • gunakan saklar di tiap bulan untuk mengaktifkan / menonaktifkannya</p>
  <div id="kaYear" class="ka-grid ${anim}">${Array.from({length:12},(_,m)=>kaCard(y,m)).join('')}</div>
 </div>`;
 const el=fmEl('kaYear');let sx=null,sy=null;
 el.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
 el.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;sx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)kaYear(dx<0?1:-1);},{passive:true});
 lucide.createIcons();
}

/* ---------- modal bulan ---------- */
function kaWide(on){
 const b=document.querySelector('#modal > div.relative');if(!b)return;
 b.classList.toggle('max-w-2xl',!on);b.classList.toggle('max-w-6xl',!!on);
}
function kaSetM(y,m,k,v){
 const key=kaYm(y,m),c=KA.m[key]=KA.m[key]||{};
 if(k==='hari'){if(v==='')delete c.hari;else c.hari=parseInt(v,10);}
 else if(k==='mode'){if(v==='')delete c.mode;else c.mode=v;}
 kaSave();kaPanel(y,m,true);renderAbsensiKmm();
}
function kaTap(y,m,d){KA_UI.sel=(KA_UI.sel&&KA_UI.sel.y===y&&KA_UI.sel.m===m&&KA_UI.sel.d===d)?null:{y:y,m:m,d:d};kaPanel(y,m,true);}
function kaSetDay(y,m,d,v){
 const key=kaYm(y,m),c=KA.m[key]=KA.m[key]||{};c.ov=c.ov||{};
 const iso=kaIso(y,m,d),base=kaDefState(y,m,d);
 if(v==='none')v=base==='none'?'none':'hapus';
 if(v===base)delete c.ov[iso];else c.ov[iso]=v;
 kaSave();kaPanel(y,m,true);renderAbsensiKmm();
}
function kaDayPicker(y,m){
 if(kaMc(y,m).off)return '<p class="text-[11px] text-amber-700 mt-2">Bulan ini nonaktif. Aktifkan dulu untuk mengatur tanggal.</p>';
 const sl=KA_UI.sel;if(!sl||sl.y!==y||sl.m!==m)return '<p class="text-[11px] text-slate-400 mt-2">Ketuk tanggal untuk mengatur jenis pengajiannya (kelompok, desa, daerah, libur) atau menambah pengajian ekstra.</p>';
 const cur=kaState(y,m,sl.d),lab=new Date(y,m,sl.d).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
 const b=(v,t,col)=>`<button onclick="kaSetDay(${y},${m},${sl.d},'${v}')" class="px-3 h-9 rounded-xl text-xs font-bold border ${cur===v||(v==='none'&&(cur==='hapus'||cur==='none'))?'text-white border-transparent':'bg-white border-line text-slate-600'}" ${cur===v||(v==='none'&&(cur==='hapus'||cur==='none'))?`style="background:${col}"`:''}>${t}</button>`;
 return `<div class="mt-3 rounded-xl bg-slate-50 border border-line p-3"><div class="text-xs font-bold">${esc(lab)}</div><div class="text-[11px] text-slate-400 mb-2">Pilih jenis pengajian = hari masuk • Libur = ditiadakan • Tidak ada = tidak ada kegiatan</div><div class="flex flex-wrap gap-1.5">${b('kelompok','Kelompok',KA_JC.kelompok)}${b('desa','Desa',KA_JC.desa)}${b('daerah','Daerah',KA_JC.daerah)}${b('libur','Libur','#F59E0B')}${b('none','Tidak ada','#94a3b8')}</div></div>`;
}
function kaResetM(y,m){delete KA.m[kaYm(y,m)];kaSave();kaPanel(y,m,true);renderAbsensiKmm();}
function kaLinkRow(y,m,j){
 const sj=kaSesiJ(y,m,j),n=sj.filter(x=>x.st!=='libur').length,f=kaForm(y,m,j),st=f&&kaStale(y,m,j),resp=f?fmResp(f.id).length:0,col=KA_JC[j];
 const head=`<div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 text-sm font-bold"><i class="ka-lg" style="background:${col}"></i>${KA_JN[j]} <span class="text-[11px] font-normal text-slate-400">${n} tanggal</span></div>${f?(st?'<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">Perlu diperbarui</span>':'<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Aktif</span>'):''}</div>`;
 if(!f&&!n)return `<div class="rounded-xl border border-line p-3 opacity-60">${head}<p class="text-[11px] text-slate-400 mt-1.5">Tidak ada jadwal bulan ini.</p></div>`;
 if(!f)return `<div class="rounded-xl border border-dashed border-line p-3">${head}<p class="text-[11px] text-slate-500 mt-1.5 font-mono break-all">/${j}/${FM_BLN[m]}${y}</p><button onclick="kaMake(${y},${m},'${j}')" class="mt-2 u-btn primary">${icon('link','w-4 h-4')} Buat link ${kaJnLabel(j)}</button></div>`;
 const url=kaUrl(y,m,j),wa='https://wa.me/?text='+encodeURIComponent('Absensi Pengajian Muda Mudi '+kaJnLabel(j)+' — '+kaBln(m)+' '+y+'. Pilih tanggal dan kelompok, lalu isi kehadiran:\n'+url);
 return `<div class="rounded-xl border border-line p-3 space-y-2">${head}
  <div class="flex gap-2"><input readonly value="${esc(url)}" onfocus="this.select()" class="flex-1 min-w-0 border border-line rounded-xl px-3 py-2 text-xs bg-slate-50"><button onclick="fmCopyText(kaUrl(${y},${m},'${j}'),'Link ${kaJnLabel(j)} disalin')" class="px-3 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-1.5">${icon('copy','w-4')} Salin</button><button onclick="kaQr(${y},${m},'${j}')" class="px-3 rounded-xl border border-line text-navy text-xs font-bold flex items-center gap-1.5">${icon('qr-code','w-4')} QR</button></div>
  <div class="flex flex-wrap gap-2"><a target="_blank" rel="noopener" href="${esc(wa)}" class="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5">${icon('message-circle','w-4')} WhatsApp</a><a target="_blank" rel="noopener" href="${esc(url)}" class="h-9 px-3 rounded-xl border border-line text-xs font-bold flex items-center gap-1.5">${icon('external-link','w-4')} Buka</a><button onclick="kaTry(${y},${m},'${j}')" class="h-9 px-3 rounded-xl bg-violet-600 text-white text-xs font-bold flex items-center gap-1.5">${icon('play','w-4')} Coba</button><button onclick="kaRekap(${y},${m},'${j}')" class="h-9 px-3 rounded-xl border border-line text-xs font-bold flex items-center gap-1.5">${icon('table','w-4')} Rekap (${resp})</button><button onclick="fmCopyText(kaAlt(${y},${m},'${j}'),'Link alternatif disalin')" class="h-9 px-2 text-[11px] text-slate-400 underline">link alternatif</button></div></div>`;
}
function kaPanel(y,m,keep){
 if(!keep)KA_UI.sel=null;
 const S=kaSesi(y,m),ada=S.filter(x=>x.st!=='libur'),c=kaMc(y,m),H=kaHariOf(y,m),M=kaModeOf(y,m);
 const fmtD=iso=>new Date(iso+'T00:00:00').toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'});
 const hasCustom=!!(c.ov&&Object.keys(c.ov).length)||Number.isInteger(c.hari)||!!c.mode||!!c.off;
 kaWide(false);
 fmEl('modalTitle').textContent='Absensi Pengajian — '+kaBln(m)+' '+y;
 fmEl('modalDesc').textContent=ada.length+' pengajian terjadwal • '+kaMalam(H);
 const sel='mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white';
 fmEl('modalBody').innerHTML=`<div class="space-y-5">
  ${kaOffRow(y,m)}
  <div class="grid sm:grid-cols-2 gap-3">
   <label class="block"><span class="text-xs font-bold text-slate-600">Hari pengajian bulan ini</span>
    <select onchange="kaSetM(${y},${m},'hari',this.value)" class="${sel}"><option value="" ${!Number.isInteger(c.hari)?'selected':''}>Ikuti default — ${esc(kaHariLabel(KA.hari))}</option>${KA_HARI.map((_,i)=>`<option value="${i}" ${c.hari===i?'selected':''}>${esc(kaHariLabel(i))}</option>`).join('')}</select></label>
   <label class="block"><span class="text-xs font-bold text-slate-600">Yang mengisi absensi</span>
    <select onchange="kaSetM(${y},${m},'mode',this.value)" class="${sel}"><option value="" ${!c.mode?'selected':''}>Ikuti default — ${kaModeLabel(KA.mode)}</option><option value="petugas" ${c.mode==='petugas'?'selected':''}>Diisi pengurus muda mudi kelompok</option><option value="peserta" ${c.mode==='peserta'?'selected':''}>Diisi sendiri oleh peserta</option><option value="both" ${c.mode==='both'?'selected':''}>Dua-duanya (peserta atau petugas)</option></select></label>
  </div>
  <div class="rounded-2xl border border-line p-4">
   <div class="flex items-center justify-between gap-2 mb-3"><div class="text-sm font-extrabold">Kalender ${kaBln(m)} ${y}</div>${hasCustom?`<button onclick="kaResetM(${y},${m})" class="text-[11px] font-bold text-navy">Kembalikan ke default</button>`:''}</div>
   ${kaMini(y,m,true)}
   <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500"><span class="flex items-center gap-1.5"><i class="ka-lg" style="background:${KA_JC.kelompok}"></i>Kelompok</span><span class="flex items-center gap-1.5"><i class="ka-lg" style="background:${KA_JC.desa}"></i>Desa</span><span class="flex items-center gap-1.5"><i class="ka-lg" style="background:${KA_JC.daerah}"></i>Daerah</span><span class="flex items-center gap-1.5"><i class="ka-lg" style="background:#FEF3C7;border:1px solid #F59E0B"></i>Libur</span><span class="flex items-center gap-1.5"><i class="ka-lg" style="background:#f1f5f9"></i>Tidak ada</span></div>
   ${kaDayPicker(y,m)}
   ${ada.length?`<div class="mt-3 flex flex-wrap gap-1.5">${S.map(x=>{const jn=x.jn;return `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${x.st==='libur'?'bg-amber-50 text-amber-700 line-through':'text-white'}" ${x.st==='libur'?'':`style="background:${KA_JC[jn]}"`}>${esc(fmtD(x.tgl))}${x.st==='libur'?'':' • '+(jn==='kelompok'?'Kelompok':jn==='desa'?'Desa':'Daerah')}</span>`;}).join('')}</div>`:''}
  </div>
  <div class="rounded-2xl border border-line p-4 space-y-3">
   <div class="text-sm font-extrabold flex items-center gap-2">${icon('link','w-4')} Link absensi per jenis pengajian</div>
   ${fileModeWarn()}${kaJns().map(j=>kaLinkRow(y,m,j)+(j==='desa'?kaJrHtml(y,m):'')).join('')}
   <p class="text-[11px] text-slate-400">${kaPeserta().length} nama dari ${activeGroups().length} kelompok • ${M==='both'?'peserta atau petugas (pengisi memilih)':M==='peserta'?'diisi sendiri oleh peserta':'diisi pengurus kelompok'}. Pengguna memilih tanggal, lalu kelompok, lalu muncul daftar nama.</p>
   ${kaJns().some(j=>kaStale(y,m,j))?`<div class="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 flex flex-wrap items-center gap-2"><span class="flex-1 min-w-[180px]">Jadwal/daftar peserta berubah sejak link dibuat.</span><button onclick="kaMake(${y},${m})" class="u-btn primary">Perbarui link</button></div>`:(kaNeeded(y,m).some(j=>!kaForm(y,m,j))?`<button onclick="kaMake(${y},${m})" class="u-btn primary">${icon('link','w-4 h-4')} Buat semua link yang belum ada</button>`:'')}
  </div>
  ${kaJurnalHtml(y,m)}
 </div>`;
 if(!keep)showModal();
 lucide.createIcons();
}
function kaJurnalOf(r){
 const j=r.j||{};
 const ns=j.nas==='sudah'?'Sudah terlaksana'+(j.nsp?' • pengisi: '+j.nsp:''):j.nas==='belum'?'Belum terlaksana':j.nas==='tidak'?'Tidak ada nasehat':(j.nasehat||'');
 return {q:j.surat?('QS. '+j.surat+(j.ayat?', ayat '+j.ayat:'')):'',h:j.hadist?(j.hadist+(j.hal?', hal. '+j.hal:'')):'',n:ns,k:j.kendala||'',c:j.catatan||'',m:(!j.surat&&!j.hadist)?(j.materi||''):''};
}
function kaJurnalHtml(y,m){
 if(kaMc(y,m).off)return '';
 const dates=kaSesiJ(y,m,'kelompok').filter(x=>x.st!=='libur');if(!dates.length)return '';
 const f=kaForm(y,m,'kelompok'),R=f?fmResp(f.id):[],nK=activeGroups().length;
 const fmtD=iso=>new Date(iso+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
 const row=(k,t,v)=>v?`<div><span class="text-slate-400">${k}:</span> ${esc(v)}</div>`:'';
 const rows=dates.map(x=>{
  const rs=f?R.filter(r=>fmRespTg(f,r)===x.tgl&&r.j):[];
  const body=rs.length?rs.map(r=>{const o=kaJurnalOf(r);return `<div class="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed"><div class="font-bold">${esc(r.kel||'—')} <span class="font-normal text-slate-400">• ${esc(r.pj||'')}</span></div>${row("Al-Qur'an",'',o.q)}${row('Al-Hadist','',o.h)}${row('Materi','',o.m)}${row('Nasehat','',o.n)}${row('Kendala','',o.k)}${row('Catatan','',o.c)}</div>`;}).join(''):'<p class="text-[11px] text-slate-400">Belum ada jurnal untuk kegiatan ini.</p>';
  const cls=rs.length?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500';
  return `<details class="rounded-xl border border-line"><summary class="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer text-xs font-bold"><span>${esc(fmtD(x.tgl))}</span><span class="px-2 py-0.5 rounded-full text-[10px] ${cls}">${rs.length}/${nK} jurnal</span></summary><div class="px-3 pb-3 space-y-2">${body}</div></details>`;
 }).join('');
 return `<div class="rounded-2xl border border-line p-4 space-y-2"><div class="text-sm font-extrabold flex items-center gap-2">${icon('book-open','w-4')} Jurnal capaian pembelajaran <span class="text-[11px] font-normal text-slate-400">Pengajian Muda Mudi Kelompok</span></div><p class="text-[11px] text-slate-400">Diisi pengurus kelompok setelah absensi lewat tombol “Lanjut: Isi Jurnal”.</p>${rows}</div>`;
}
async function kaMake(y,m,j){
 if(!activeGroups().length){showToast('Belum ada kelompok aktif. Tambahkan di menu Kelompok.');return;}
 if(!kaPeserta().length){showToast('Belum ada data generus pada kelompok aktif.');return;}
 const need=j?[j]:kaJns().filter(x=>kaNeeded(y,m).includes(x)||kaForm(y,m,x));
 if(!need.length||(j&&!kaNeeded(y,m).includes(j)&&!kaForm(y,m,j))){showToast('Belum ada tanggal pengajian untuk jenis ini.');return;}
 showToast('Menyiapkan link…');
 await kaEnsure(y,m,need);
 kaPanel(y,m,true);renderAbsensiKmm();showToast('Link siap dibagikan');
}
async function kaRefreshAll(){
 const L=kaStaleList();if(!L.length)return;
 showToast('Memperbarui '+L.length+' link…');
 L.forEach(([y,m,j])=>{const f=kaForm(y,m,j);if(f)kaApply(f,y,m,j);});
 fmSave(true);
 if(window.simdekaFormSyncNow){try{await window.simdekaFormSyncNow();}catch(e){showToast('Gagal menyimpan form ke server');return;}}
 renderAbsensiKmm();showToast('Semua link diperbarui');
}
function kaTry(y,m,j){
 const f=kaForm(y,m,j);if(!f){showToast('Buat linknya dulu.');return;}
 closeModal();pfOpen(fmSanitize(JSON.parse(JSON.stringify(f))),true);
}
function kaQr(y,m,j){fmQrShow(kaUrl(y,m,j),kaTitle(y,m,j),'');}
/* ---------- petugas default: Mubaligh / Mubalighot per kelompok ---------- */
function kaPetMap(){
 const out={},P=KA.pet||{};
 activeGroups().forEach(k=>{const e=P[k];if(e&&(e.l||e.p))out[k]={l:String(e.l||'').slice(0,100),p:String(e.p||'').slice(0,100)};});
 return out;
}
function kaPetSig(o){return JSON.stringify(Object.keys(o||{}).sort().map(k=>[k,(o[k]&&o[k].l)||'',(o[k]&&o[k].p)||'']));}
function kaPetOpen(){
 kaWide(false);
 const L=mmData('mubaligh'),mb=L.filter(x=>x.jk!=='Perempuan'),mt=L.filter(x=>x.jk==='Perempuan'),P=KA.pet||{},kel=activeGroups();
 KA_UI.petK=kel;
 fmEl('modalTitle').textContent='Petugas Default Absensi';
 fmEl('modalDesc').textContent='Mubaligh (guru laki-laki) dan Mubalighot (guru perempuan) per kelompok';
 const sel='mt-1 w-full border border-line rounded-xl px-3 py-2 text-sm bg-white';
 const opts=(arr,kk,cur)=>{
  const seen=new Set(),ord=arr.slice().sort((a,b)=>((a.k===kk)?0:1)-((b.k===kk)?0:1)||String(a.n).localeCompare(String(b.n),'id'));
  let h='<option value="">— Belum diatur —</option>';
  ord.forEach(x=>{if(seen.has(x.n))return;seen.add(x.n);h+=`<option value="${esc(x.n)}" ${x.n===cur?'selected':''}>${esc(x.n)}${x.k&&x.k!==kk?' ('+esc(x.k)+')':''}</option>`;});
  if(cur&&!seen.has(cur))h+=`<option value="${esc(cur)}" selected>${esc(cur)}</option>`;
  return h;
 };
 const rows=kel.map((k,i)=>{const e=P[k]||{};return `<div class="grid sm:grid-cols-3 gap-2 items-center rounded-xl border border-line p-3"><div class="font-bold text-sm truncate" title="${esc(k)}">${esc(k)}</div><label class="block"><span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mubaligh</span><select id="kaPl_${i}" class="${sel}">${opts(mb,k,e.l||'')}</select></label><label class="block"><span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mubalighot</span><select id="kaPp_${i}" class="${sel}">${opts(mt,k,e.p||'')}</select></label></div>`;}).join('');
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  ${L.length?'':`<div class="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 flex flex-wrap items-center gap-2"><span class="flex-1 min-w-[200px]">Belum ada data Muballigh. Isi dulu di menu <b>Muballigh</b>, lalu atur petugas default di sini.</span><button type="button" class="u-btn" onclick="closeModal();navigate('mubaligh')">Buka menu Muballigh</button></div>`}
  <p class="text-xs text-slate-500 leading-relaxed">Saat <b>petugas</b> mengisi absensi dan memilih kelompok, kolom <b>Nama Penanggung Jawab</b> otomatis terisi <b>Mubaligh</b> kelompok tersebut. Mubalighot tersedia sebagai pilihan cepat, dan nama tetap bisa diganti manual.</p>
  <div class="space-y-2 max-h-[46vh] overflow-y-auto pr-1">${rows||'<p class="text-sm text-slate-400 text-center py-6">Belum ada kelompok aktif.</p>'}</div>
  <div class="rounded-xl bg-blue-50 border border-blue-100 p-3 text-[11px] text-blue-800 leading-relaxed">Link absensi yang sudah dibagikan perlu diperbarui agar memuat petugas default: setelah menyimpan, klik <b>Perbarui semua</b> pada halaman Absensi Pengajian.</div>
  <div class="flex flex-wrap justify-between gap-2 pt-1"><button type="button" class="u-btn" onclick="kaPetAuto()">${icon('wand-2','w-4 h-4')} Isi otomatis dari data</button><div class="flex gap-2"><button type="button" onclick="closeModal()" class="u-btn">Batal</button><button type="button" onclick="kaPetSave()" class="u-btn primary">Simpan</button></div></div></div>`;
 showModal();lucide.createIcons();
}
function kaPetAuto(){
 const L=mmData('mubaligh'),kel=KA_UI.petK||[];let n=0;
 const first=(arr,k)=>arr.filter(x=>x.k===k).sort((a,b)=>String(a.n).localeCompare(String(b.n),'id'))[0];
 kel.forEach((k,i)=>{
  const l=first(L.filter(x=>x.jk!=='Perempuan'),k),p=first(L.filter(x=>x.jk==='Perempuan'),k);
  const a=fmEl('kaPl_'+i),b=fmEl('kaPp_'+i);
  if(l&&a&&!a.value){a.value=l.n;n++;}
  if(p&&b&&!b.value){b.value=p.n;n++;}
 });
 showToast(n?n+' petugas diisi dari data kelompok (belum disimpan)':'Tidak ada yang bisa diisi otomatis');
}
function kaPetSave(){
 const kel=KA_UI.petK||[],o={};
 kel.forEach((k,i)=>{const l=(fmEl('kaPl_'+i)||{}).value||'',p=(fmEl('kaPp_'+i)||{}).value||'';if(l||p)o[k]={l:l,p:p};});
 KA.pet=o;kaSave();closeModal();renderAbsensiKmm();showToast('Petugas default disimpan');
}
/* ---------- pengaturan default ---------- */
function kaSettings(){
 kaWide(false);
 fmEl('modalTitle').textContent='Pengaturan Jadwal';fmEl('modalDesc').textContent='Berlaku untuk semua bulan kecuali yang diatur khusus';
 const sel='mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm bg-white';
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  <label class="block"><span class="text-xs font-bold text-slate-600">Hari pengajian (default)</span><select id="kaSHari" class="${sel}">${KA_HARI.map((_,i)=>`<option value="${i}" ${KA.hari===i?'selected':''}>${esc(kaHariLabel(i))}</option>`).join('')}</select>
   <span class="block text-[11px] text-slate-400 mt-1">Pengajian dilaksanakan 1× seminggu. Pilihan berisi hari kalender sebenarnya; “Malam Selasa” jatuh pada hari Senin malam.</span></label>
  <div class="grid grid-cols-2 gap-3">
   <label class="block"><span class="text-xs font-bold text-slate-600">Pengajian Muda Mudi Desa</span><select id="kaSDesa" class="${sel}">${[0,1,2,3,4,5].map(n=>`<option value="${n}" ${KA.desaMg===n?'selected':''}>${n?'Minggu ke-'+n:'Tidak ada'}</option>`).join('')}</select></label>
   <label class="block"><span class="text-xs font-bold text-slate-600">Pengajian Muda Mudi Daerah</span><select id="kaSDaerah" class="${sel}">${[0,1,2,3,4,5].map(n=>`<option value="${n}" ${KA.daerahMg===n?'selected':''}>${n?'Minggu ke-'+n:'Tidak ada'}</option>`).join('')}</select></label>
  </div>
  <p class="text-[11px] text-slate-400 -mt-2">Pada minggu tersebut Pengajian Muda Mudi Kelompok digantikan Pengajian Muda Mudi Desa/Daerah (hari yang sama). Minggu lainnya tetap Pengajian Muda Mudi Kelompok. Tiap tanggal tetap bisa diubah manual di kalender bulan.</p>
  <label class="block"><span class="text-xs font-bold text-slate-600">Jam mulai</span><input id="kaSJam" type="time" value="${esc(KA.jam)}" class="${sel}"></label>
  <label class="block"><span class="text-xs font-bold text-slate-600">Yang mengisi absensi (default)</span><select id="kaSMode" class="${sel}"><option value="petugas" ${KA.mode==='petugas'?'selected':''}>Diisi pengurus muda mudi kelompok</option><option value="peserta" ${KA.mode==='peserta'?'selected':''}>Diisi sendiri oleh peserta</option><option value="both" ${KA.mode==='both'?'selected':''}>Dua-duanya — pengisi memilih sendiri</option></select></label>
  <label class="block"><span class="text-xs font-bold text-slate-600">Peserta dari data generus</span><select id="kaSSt" class="${sel}"><option value="all" ${KA.st!=='mm'?'selected':''}>Semua generus di kelompok</option><option value="mm" ${KA.st==='mm'?'selected':''}>Hanya status Muda Mudi</option></select></label>
  <div class="rounded-xl bg-blue-50 border border-blue-100 p-3 text-[11px] text-blue-800 leading-relaxed">Nama kelompok mengikuti menu <b>Kelompok</b>, dan peserta mengikuti <b>Data Generus</b>. Link yang sudah dibagikan tidak berubah otomatis — gunakan tombol <b>Perbarui</b> setelah data berubah.</div>
  <div class="flex justify-end gap-2"><button onclick="closeModal()" class="u-btn">Batal</button><button onclick="kaSettingsSave()" class="u-btn primary">Simpan</button></div></div>`;
 showModal();
}
function kaSettingsSave(){
 KA.hari=parseInt(fmEl('kaSHari').value,10)||0;KA.jam=fmEl('kaSJam').value||'';KA.desaMg=parseInt(fmEl('kaSDesa').value,10)||0;KA.daerahMg=parseInt(fmEl('kaSDaerah').value,10)||0;KA.mode=['peserta','both'].includes(fmEl('kaSMode').value)?fmEl('kaSMode').value:'petugas';KA.st=fmEl('kaSSt').value==='mm'?'mm':'all';
 kaSave();closeModal();renderAbsensiKmm();showToast('Pengaturan disimpan');
}

/* ---------- rekap kehadiran ---------- */

/* ---------- REKAP LENGKAP: semua kelompok, semua nama, semua jenis ---------- */
function kaRekap(y,m,j){kaRekapOpen({y:y,per:String(m),j:j||'',k:''});}
function kaRekapOpen(o){
 const n=new Date();
 KA_UI.rp=Object.assign({y:KA_UI.y,per:String(n.getFullYear()===KA_UI.y?n.getMonth():'all'),j:'',k:''},o||{});
 kaRekapRender();showModal();
}
function kaRekapSet(k,v){KA_UI.rp[k]=v;if(k==='per'&&v==='range')kaRpDefaults(KA_UI.rp);kaRekapRender();}

/* ---------- periode laporan: bulan, setahun, atau rentang tanggal ---------- */
const KA_BLN3=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
function kaIsoD(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function kaRpRange(rp){
 if(rp.per!=='range')return null;
 const ok=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'');let a=ok(rp.from)?rp.from:'',b=ok(rp.to)?rp.to:'';
 if(!a&&!b)return null;if(!a)a=b;if(!b)b=a;if(a>b){const t=a;a=b;b=t;}
 return {from:a,to:b};
}
function kaRpMonths(rp){
 if(rp.per==='all')return [0,1,2,3,4,5,6,7,8,9,10,11].map(m=>({y:rp.y,m:m}));
 if(rp.per==='range'){
  const r=kaRpRange(rp);if(!r)return [];
  let y=+r.from.slice(0,4),m=+r.from.slice(5,7)-1;const ye=+r.to.slice(0,4),me=+r.to.slice(5,7)-1,out=[];
  while((y<ye||(y===ye&&m<=me))&&out.length<60){out.push({y:y,m:m});m++;if(m>11){m=0;y++;}}
  return out;
 }
 return [{y:rp.y,m:parseInt(rp.per,10)}];
}
function kaRpIn(rp,tgl){const r=kaRpRange(rp);return !r||(tgl>=r.from&&tgl<=r.to);}
function kaRpMonthly(rp){return rp.per==='all'||(rp.per==='range'&&kaRpMonths(rp).length>2);}
function kaRpDate(iso){const p=iso.split('-');return (+p[2])+' '+KA_BLN3[+p[1]-1]+' '+p[0];}
function kaRpRangeText(rp){const r=kaRpRange(rp);if(!r)return 'Rentang tanggal belum dipilih';return r.from===r.to?kaRpDate(r.from):kaRpDate(r.from)+' – '+kaRpDate(r.to);}
function kaRpDefaults(o){const n=new Date();if(!o.from)o.from=kaIsoD(new Date(n.getFullYear(),n.getMonth(),1));if(!o.to)o.to=kaIsoD(n);}
function kaRpDateInputs(rp,setFn,cls){return rp.per==='range'?`<div class="flex flex-wrap items-center gap-2"><label class="text-xs font-bold text-slate-500">Dari</label><input type="date" value="${esc(rp.from||'')}" onchange="${setFn}('from',this.value)" class="${cls}" aria-label="Dari tanggal"><label class="text-xs font-bold text-slate-500">Sampai</label><input type="date" value="${esc(rp.to||'')}" onchange="${setFn}('to',this.value)" class="${cls}" aria-label="Sampai tanggal"></div>`:'';}
function kaRekapCalc(rp){
 const months=kaRpMonths(rp),jns=rp.j?[rp.j]:kaJns();
 const sess=[];let planned=0;
 months.forEach(mo=>jns.forEach(j=>{
  const m=mo.y*12+mo.m;
  planned+=kaSesiJ(mo.y,mo.m,j).filter(x=>x.st!=='libur'&&kaRpIn(rp,x.tgl)).length;
  const f=kaForm(mo.y,mo.m,j);if(!f)return;
  const R=fmResp(f.id),ym=kaYm(mo.y,mo.m);
  const dates=[...new Set((f.absen.sesi||[]).filter(x=>x.st!=='libur').map(x=>x.tgl).concat(R.map(r=>fmRespTg(f,r))))].filter(d=>d&&d.slice(0,7)===ym&&kaRpIn(rp,d)).sort();
  const st={},rep={};
  R.slice().sort((a,b)=>(a.ts||0)-(b.ts||0)).forEach(r=>{const tg=fmRespTg(f,r);rep[(r.kel||'')+'|'+tg]=1;Object.keys(r.m||{}).forEach(k=>{st[k+'|'+tg]=r.m[k];});});
  const keys=new Set((f.absen.peserta||[]).map(p=>fmKey(p.n,p.k)));
  dates.forEach(tg=>sess.push({m:m,j:j,tgl:tg,f:f,st:st,rep:rep,keys:keys}));
 }));
 const order=j=>['kelompok','desa','daerah'].indexOf(j);
 sess.sort((a,b)=>a.tgl<b.tgl?-1:a.tgl>b.tgl?1:order(a.j)-order(b.j));
 /* kolom: per tanggal (bulan) atau per bulan (setahun) */
 let cols;
 if(kaRpMonthly(rp)){const my=months.length&&months[0].y!==months[months.length-1].y;cols=months.map(mo=>({lab:kaBln(mo.m).slice(0,3),sub:my?String(mo.y):'',m:mo.y*12+mo.m,sess:sess.filter(s=>s.m===mo.y*12+mo.m)})).filter(c=>c.sess.length);}
 else cols=sess.map(s=>({lab:s.tgl.slice(8)+'/'+s.tgl.slice(5,7),sub:kaJnLabel(s.j),j:s.j,sess:[s]}));
 /* peserta (gabungan semua form pada periode) */
 const pm=new Map();
 sess.forEach(s=>(s.f.absen.peserta||[]).forEach(p=>{if(rp.k&&p.k!==rp.k)return;const k=fmKey(p.n,p.k);if(!pm.has(k))pm.set(k,{n:p.n,k:p.k,key:k});}));
 const ord=kelompokList.map(k=>k.nama);
 const P=[...pm.values()].sort((a,b)=>{const i=ord.indexOf(a.k),j=ord.indexOf(b.k);return (i<0?999:i)-(j<0?999:j)||a.n.localeCompare(b.n,'id');});
 const rows=P.map(p=>{
  const t={H:0,I:0,A:0,N:0},per={};kaJns().forEach(j=>{per[j]={H:0,d:0};});
  const cells=cols.map(c=>{
   const c1={H:0,I:0,A:0,N:0};let any=0;
   c.sess.forEach(s=>{
    if(!s.keys.has(p.key)||!s.rep[p.k+'|'+s.tgl])return;
    any++;const v=s.st[p.key+'|'+s.tgl]||'N';c1[v]++;t[v]++;per[s.j].d++;if(v==='H')per[s.j].H++;
   });
   return {c:c1,n:any,one:c.sess.length===1};
  });
  return {p:p,cells:cells,t:t,per:per};
 });
 /* ringkasan per kelompok */
 const ks=[...new Set(P.map(p=>p.k))];
 const ksum=ks.map(k=>{
  const r=rows.filter(x=>x.p.k===k),t={H:0,I:0,A:0,N:0},per={};
  kaJns().forEach(j=>{per[j]={H:0,d:0};});
  r.forEach(x=>{['H','I','A','N'].forEach(v=>{t[v]+=x.t[v];});kaJns().forEach(j=>{per[j].H+=x.per[j].H;per[j].d+=x.per[j].d;});});
  const rep=sess.filter(s=>s.rep[k+'|'+s.tgl]).length;
  return {k:k,n:r.length,t:t,per:per,rep:rep};
 });
 const T={H:0,I:0,A:0,N:0};ksum.forEach(x=>['H','I','A','N'].forEach(v=>{T[v]+=x.t[v];}));
 const rep=ksum.reduce((a,x)=>a+x.rep,0);
 return {sess:sess,cols:cols,rows:rows,ksum:ksum,T:T,planned:planned,rep:rep,nk:ks.length};
}
function kaPct(h,d){return d?Math.round(h/d*100)+'%':'—';}
function kaCellHtml(c){
 if(!c.n)return '<span class="ka-c n">·</span>';
 if(c.one){const v=c.c.H?'h':c.c.I?'i':c.c.A?'a':'n';return `<span class="ka-c ${v}">${v==='n'?'?':v.toUpperCase()}</span>`;}
 const r=c.c.H/c.n;return `<span class="text-[11px] font-extrabold ${r>=.75?'text-emerald-700':r>=.5?'text-amber-600':'text-red-600'}">${c.c.H}/${c.n}</span>`;
}
function kaRekapRender(){
 const rp=KA_UI.rp,D=kaRekapCalc(rp),sel='border border-line rounded-xl px-3 py-2 text-xs bg-white font-semibold';
 const pn=rp.per==='all'?'Setahun penuh '+rp.y:rp.per==='range'?kaRpRangeText(rp):kaBln(parseInt(rp.per,10))+' '+rp.y;
 kaWide(true);
 fmEl('modalTitle').textContent='Rekap Absensi Pengajian — '+pn;
 fmEl('modalDesc').textContent='Semua kelompok, semua nama'+(rp.j?', '+KA_JN[rp.j].toLowerCase():', semua jenis pengajian');
 const ks=[...new Set(kelompokList.map(k=>k.nama))];
 const tile=(l,v,c)=>`<div class="rounded-xl border border-line p-3"><div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">${l}</div><div class="text-xl font-extrabold mt-1 ${c||''}">${v}</div></div>`;
 const tot=D.T.H+D.T.I+D.T.A+D.T.N;
 const th=D.cols.map(c=>`<th class="px-2 py-2 text-center font-bold whitespace-nowrap">${c.lab}${c.sub?`<div class="text-[9px] font-extrabold" style="color:${KA_JC[c.j]}">${c.sub}</div>`:''}</th>`).join('');
 const jh=kaJns().filter(j=>!rp.j||rp.j===j).map(j=>`<th class="px-2 py-2 text-center font-bold" style="color:${KA_JC[j]}">${kaJnLabel(j)}</th>`).join('');
 const sumRows=D.ksum.map((x,ix)=>`<tr class="border-t border-line"><td class="px-3 py-2 text-slate-400">${ix+1}</td><td class="px-3 py-2 font-bold whitespace-nowrap">${esc(x.k)}</td><td class="px-2 py-2 text-center">${x.n}</td><td class="px-2 py-2 text-center">${x.rep}/${D.sess.length}</td>${kaJns().filter(j=>!rp.j||rp.j===j).map(j=>`<td class="px-2 py-2 text-center font-bold">${kaPct(x.per[j].H,x.per[j].d)}</td>`).join('')}<td class="px-2 py-2 text-center text-emerald-700 font-bold">${x.t.H}</td><td class="px-2 py-2 text-center text-amber-600 font-bold">${x.t.I}</td><td class="px-2 py-2 text-center text-red-600 font-bold">${x.t.A}</td><td class="px-2 py-2 text-center text-slate-400 font-bold">${x.t.N}</td><td class="px-3 py-2 text-center font-extrabold">${kaPct(x.t.H,x.t.H+x.t.I+x.t.A+x.t.N)}</td></tr>`).join('');
 let det='',last=null;
 let kn=0;D.rows.forEach((r,i)=>{
  if(r.p.k!==last){last=r.p.k;kn=0;const x=D.ksum.find(z=>z.k===last);det+=`<tr class="bg-slate-50 border-t border-line"><td class="ka-sticky px-3 py-2 font-extrabold text-navy whitespace-nowrap bg-slate-50">${esc(last)} <span class="font-normal text-slate-400">• ${x?x.n:0} nama</span></td><td colspan="${D.cols.length+5}"></td></tr>`;}
  const tt=r.t.H+r.t.I+r.t.A+r.t.N;
  det+=`<tr class="border-t border-line"><td class="ka-sticky px-3 py-1.5 font-semibold whitespace-nowrap bg-white"><span class="inline-block w-6 text-slate-400 font-bold">${++kn}</span>${esc(r.p.n)}</td>${r.cells.map(c=>`<td class="px-1.5 py-1.5 text-center">${kaCellHtml(c)}</td>`).join('')}<td class="px-2 py-1.5 text-center font-bold text-emerald-700">${r.t.H}</td><td class="px-2 py-1.5 text-center font-bold text-amber-600">${r.t.I}</td><td class="px-2 py-1.5 text-center font-bold text-red-600">${r.t.A}</td><td class="px-2 py-1.5 text-center font-bold text-slate-400">${r.t.N}</td><td class="px-2 py-1.5 text-center font-extrabold">${kaPct(r.t.H,tt)}</td></tr>`;
 });
 const body=D.sess.length?`
  <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">${tile('Terjadwal',D.planned)}${tile('Sudah ber-link',D.sess.length)}${tile('Laporan masuk',D.rep)}${tile('Hadir',D.T.H,'text-emerald-700')}${tile('Izin',D.T.I,'text-amber-600')}${tile('Alpa',D.T.A,'text-red-600')}${tile('Belum mengisi',D.T.N,'text-slate-400')}${tile('% Hadir',kaPct(D.T.H,tot),'text-navy')}</div>
  <div><div class="text-xs font-bold text-slate-600 mb-2">Ringkasan per kelompok <span class="font-normal text-slate-400">— % hadir tiap jenis pengajian</span></div>
   <div class="overflow-x-auto scrollbar rounded-xl border border-line"><table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500"><tr><th class="px-3 py-2 text-left font-bold w-10">No</th><th class="px-3 py-2 text-left font-bold">Kelompok</th><th class="px-2 py-2 text-center font-bold">Peserta</th><th class="px-2 py-2 text-center font-bold">Laporan</th>${jh}<th class="px-2 py-2 text-center font-bold text-emerald-700">H</th><th class="px-2 py-2 text-center font-bold text-amber-600">I</th><th class="px-2 py-2 text-center font-bold text-red-600">A</th><th class="px-2 py-2 text-center font-bold">Belum</th><th class="px-3 py-2 text-center font-bold">% Hadir</th></tr></thead><tbody>${sumRows}</tbody></table></div></div>
  <div><div class="text-xs font-bold text-slate-600 mb-2">Detail per nama <span class="font-normal text-slate-400">— ${kaRpMonthly(rp)?'kolom per bulan (hadir/jumlah pengajian yang dilaporkan)':'kolom per tanggal pengajian'} • H hadir, I izin, A alpa, ? belum mengisi, · belum dilaporkan</span></div>
   <div class="overflow-auto scrollbar rounded-xl border border-line max-h-[52vh]"><table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500 sticky top-0 z-10"><tr><th class="ka-sticky px-3 py-2 text-left font-bold bg-slate-50">Nama</th>${th}<th class="px-2 py-2 text-center font-bold text-emerald-700">H</th><th class="px-2 py-2 text-center font-bold text-amber-600">I</th><th class="px-2 py-2 text-center font-bold text-red-600">A</th><th class="px-2 py-2 text-center font-bold">Belum</th><th class="px-2 py-2 text-center font-bold">%</th></tr></thead><tbody>${det}</tbody></table></div></div>`
  :`<div class="py-12 text-center text-sm text-slate-400">Belum ada link atau laporan pada periode ini.<br><span class="text-xs">${D.planned} pengajian terjadwal. Buat link di panel bulan, lalu bagikan ke kelompok.</span></div>`;
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  <div class="flex flex-wrap gap-2">
   <select class="${sel}" onchange="kaRekapSet('y',parseInt(this.value,10))">${kaYears().map(v=>`<option value="${v}" ${v===rp.y?'selected':''}>${v}</option>`).join('')}</select>
   <select class="${sel}" onchange="kaRekapSet('per',this.value)"><option value="all" ${rp.per==='all'?'selected':''}>Setahun penuh</option>${FM_BLN.map((_,i)=>`<option value="${i}" ${String(i)===rp.per?'selected':''}>${kaBln(i)}</option>`).join('')}<option value="range" ${rp.per==='range'?'selected':''}>Rentang tanggal…</option></select>${kaRpDateInputs(rp,'kaRekapSet',sel)}
   <select class="${sel}" onchange="kaRekapSet('j',this.value)"><option value="">Semua jenis pengajian</option>${kaJns().map(j=>`<option value="${j}" ${rp.j===j?'selected':''}>${KA_JN[j]}</option>`).join('')}</select>
   <select class="${sel}" onchange="kaRekapSet('k',this.value)"><option value="">Semua kelompok</option>${ks.map(k=>`<option value="${esc(k)}" ${rp.k===k?'selected':''}>${esc(k)}</option>`).join('')}</select>
   <button onclick="kaRekapExport()" class="u-btn ml-auto">${icon('file-spreadsheet','w-4 h-4')} Export Excel</button>
  </div>${body}
  <div class="flex justify-end"><button onclick="closeModal()" class="u-btn">Tutup</button></div></div>`;
 lucide.createIcons();
}
function kaRekapExport(){
 const rp=KA_UI.rp,D=kaRekapCalc(rp);
 if(!D.rows.length){showToast('Belum ada data untuk diexport');return;}
 if(typeof XLSX==='undefined'){showToast('Library Excel belum termuat (periksa koneksi internet)');return;}
 const lab=v=>v.one?(v.n?(v.c.H?'H':v.c.I?'I':v.c.A?'A':'Belum'):'-'):(v.n?v.c.H+'/'+v.n:'-');
 const jl=kaJns().filter(j=>!rp.j||rp.j===j);
 const s1=[['Kelompok','Peserta','Laporan masuk','Total sesi'].concat(jl.map(j=>'% Hadir '+kaJnLabel(j))).concat(['Hadir','Izin','Alpa','Belum mengisi','% Hadir'])];
 D.ksum.forEach(x=>s1.push([x.k,x.n,x.rep,D.sess.length].concat(jl.map(j=>kaPct(x.per[j].H,x.per[j].d))).concat([x.t.H,x.t.I,x.t.A,x.t.N,kaPct(x.t.H,x.t.H+x.t.I+x.t.A+x.t.N)])));
 const s2=[['No','Kelompok','Nama'].concat(D.cols.map(c=>c.lab+(c.sub?' ('+c.sub+')':''))).concat(['Hadir','Izin','Alpa','Belum mengisi','% Hadir'])];
 D.rows.forEach((r,i)=>s2.push([i+1,r.p.k,r.p.n].concat(r.cells.map(lab)).concat([r.t.H,r.t.I,r.t.A,r.t.N,kaPct(r.t.H,r.t.H+r.t.I+r.t.A+r.t.N)])));
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s1),'Ringkasan Kelompok');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s2),'Detail per Nama');
 XLSX.writeFile(wb,'rekap-absensi-pengajian-'+(rp.per==='range'?kaRpRangeText(rp).replace(/\s*–\s*/,'_sd_').replace(/\s+/g,'-'):rp.y+(rp.per==='all'?'':'-'+FM_BLN[parseInt(rp.per,10)]))+(rp.j?'-'+rp.j:'')+'.xlsx');
 showToast('File Excel diunduh');
}

/* =====================================================================
   MUSYAWARAH KMM DESA — kalender, buku notulensi, absensi
   Klik tanggal -> buku notulensi (sampul, nasehat, informasi, evaluasi,
   pembahasan, penutup, absensi). Peserta absensi = data menu KMM Desa.
   ===================================================================== */
const MS_KEY='simdeka_musdes_v1';
const MS_JUDUL='Musyawarah KMM DESA Karangmojo';
const MS_PAGES=[['sampul','Sampul','book-open'],['nasehat','Nasehat Pembuka','message-circle'],['info','Informasi Desa & Daerah','megaphone'],['evaluasi','Evaluasi Bulan Lalu','clipboard-check'],['bahas','Pembahasan','messages-square'],['penutup','Penutup','flag'],['absen','Absensi','calendar-check']];
const MS_EVST=['Terlaksana','Sebagian','Belum terlaksana','Ada kendala'];
let MS=(function(){try{const o=JSON.parse(localStorage.getItem(MS_KEY)||'null');if(o&&typeof o==='object'&&o.n&&typeof o.n==='object')return o;}catch(e){}return {n:{}};})();
const MS_UI={y:new Date().getFullYear(),m:new Date().getMonth(),iso:null,d:null,p:0,dir:0,t:null};
window.FM_EXTRA_SOURCES=window.FM_EXTRA_SOURCES||{};
window.FM_EXTRA_SOURCES['muda-mudi-desa']=function(){return mmData('muda-mudi-desa').map(x=>({n:x.n,k:x.k,d:x.d||'Pengurus KMM Desa'}));};
window.FM_EXTRA_SOURCES['mubaligh']=function(){return mmData('mubaligh').map(x=>({n:x.n,k:x.k,d:x.d||mbSebutan(x.jk)}));};

function msStore(){try{localStorage.setItem(MS_KEY,JSON.stringify(MS));return true;}catch(e){showToast('Penyimpanan penuh — notulensi tidak tersimpan');return false;}}
function msId(){return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function msBlank(iso){return {tgl:iso,font:'Times New Roman',judul:MS_JUDUL,tempat:'',jam:'',jumlah:'',nasehat:{oleh:'',isi:''},info:[],evalSt:{},bahas:[],penutup:{isi:'',doa:'',selesai:''},ttd:{ketua:'',notulis:''},upd:0};}
function msGet(iso){return MS.n[iso]||null;}
function msIsos(){return Object.keys(MS.n).sort();}
function msPrev(iso){const l=msIsos().filter(x=>x<iso);return l.length?l[l.length-1]:null;}
function msSlug(iso){return 'musdes'+iso.replace(/-/g,'');}
function msUrl(iso){return kaOrigin()+'/musdes/'+iso.replace(/-/g,'');}
function msAlt(iso){return kaOrigin()+'/f/'+msSlug(iso);}
function msForm(iso){return fmForms.find(f=>f.id===msSlug(iso));}
function msPeserta(){return fmBuildPeserta({sumber:['muda-mudi-desa'],kelompok:[]});}
function msStale(f){return !!f&&msPeserta().length!==(f.absen.peserta||[]).length;}
function msHadir(iso){
 const f=msForm(iso);if(!f)return null;
 const st=fmStatusAt(f,iso).st;let H=0,I=0,A=0;
 Object.keys(st).forEach(k=>{if(st[k]==='H')H++;else if(st[k]==='I')I++;else if(st[k]==='A')A++;});
 const T=(f.absen.peserta||[]).length;return {H:H,I:I,A:A,T:T,N:Math.max(0,T-H-I-A)};
}
function msJumlah(d){
 if(d.jumlah!==''&&d.jumlah!=null&&!isNaN(+d.jumlah))return +d.jumlah;
 const h=msHadir(d.tgl);return h?h.H:null;
}
function msApply(f,iso){
 const a=f.absen;
 a.jenis='Musyawarah KMM Desa';a.tanggal=iso;a.rutin=false;a.sesi=[];a.mode='both';a.sumber=['muda-mudi-desa'];a.kelompok=[];
 a.peserta=msPeserta();
 f.title='Absensi Musyawarah KMM Desa — '+fmDateLong(iso);
 f.desc='Musyawarah KMM Desa Karangmojo, '+fmDateLong(iso)+'.';
 f.color='#18A66A';f.shared=true;f.updated=Date.now();
}
async function msSync(){if(window.simdekaFormSyncNow){try{await window.simdekaFormSyncNow();return true;}catch(e){showToast('Gagal menyimpan form ke server');return false;}}return true;}
async function msMake(iso){
 if(!msPeserta().length){showToast('Belum ada data di menu KMM Desa. Isi dulu daftar pengurus.');return;}
 showToast('Menyiapkan link…');
 let f=msForm(iso);
 if(!f){f=fmNew('absensi');f.id=msSlug(iso);fmForms.unshift(f);}
 msApply(f,iso);fmSave(true);await msSync();
 msRefresh();showToast('Link absensi siap dibagikan');
}
async function msRefreshPeserta(iso){
 const f=msForm(iso);if(!f)return;
 msApply(f,iso);fmSave(true);await msSync();msRefresh();showToast('Daftar peserta diperbarui');
}
function msTry(iso){const f=msForm(iso);if(!f){showToast('Buat linknya dulu.');return;}closeModal();pfOpen(fmSanitize(JSON.parse(JSON.stringify(f))),true);}
function msQr(iso){fmQrShow(msUrl(iso),'Absensi Musyawarah KMM Desa — '+fmDateLong(iso),'');}
function msRekap(iso){const f=msForm(iso);if(!f)return;closeModal();navigate('form');fmOpen(f.id);}

/* ---------- halaman kalender ---------- */
function msIsPage(){const a=document.querySelector('.nav-item.active');return !!a&&a.dataset.page==='musyawarah';}
function msRefresh(){if(MS_UI.d&&!fmEl('modal').classList.contains('hidden'))msBook();if(msIsPage())renderMusyawarah();}
function msNav(n){let m=MS_UI.m+n,y=MS_UI.y;if(m<0){m=11;y--;}if(m>11){m=0;y++;}MS_UI.m=m;MS_UI.y=y;MS_UI.dir=n;renderMusyawarah();}
function msToday(){const n=new Date();MS_UI.y=n.getFullYear();MS_UI.m=n.getMonth();MS_UI.dir=0;renderMusyawarah();}
function msCal(y,m){
 const first=new Date(y,m,1).getDay(),n=kaDim(y,m),t=fmToday(),hd=['Mg','Sn','Sl','Rb','Km','Jm','Sb'];
 let h='<div class="ka-cal big ms-cal">'+hd.map(x=>`<span class="ka-h">${x}</span>`).join('');
 for(let i=0;i<first;i++)h+='<span></span>';
 for(let d=1;d<=n;d++){
  const iso=kaIso(y,m,d),has=!!msGet(iso),lk=!!msForm(iso);
  h+=`<button type="button" class="ka-d${has?' desa':''}${iso===t?' today':''}${lk?' ms-lk':''}" onclick="msOpen('${iso}')" title="${has?'Buka notulensi':'Buat notulensi'}${lk?' • link absensi aktif':''}">${d}</button>`;
 }
 return h+'</div>';
}
function renderMusyawarah(){
 const y=MS_UI.y,m=MS_UI.m,all=msIsos(),inY=all.filter(x=>x.slice(0,4)===String(y)),inM=all.filter(x=>x.slice(0,7)===y+'-'+String(m+1).padStart(2,'0'));
 const nLink=fmForms.filter(f=>/^musdes\d{8}$/.test(String(f.id))&&String(f.id).slice(6,10)===String(y)).length;
 const nPes=msPeserta().length,anim=MS_UI.dir>0?'ka-in-l':MS_UI.dir<0?'ka-in-r':'';MS_UI.dir=0;
 const rows=inY.slice().reverse().map(iso=>{
  const d=msGet(iso),h=msHadir(iso),j=msJumlah(d);
  return `<button type="button" onclick="msOpen('${iso}')" class="w-full text-left rounded-xl border border-line bg-white p-3 hover:bg-slate-50 transition"><div class="flex items-center justify-between gap-2"><b class="text-sm">${esc(fmDateLong(iso))}</b>${h?'<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Link aktif</span>':''}</div><div class="text-[11px] text-slate-500 mt-1 truncate">${esc(d.tempat||'Tempat belum diisi')} • ${j==null?'peserta —':j+' peserta'} • ${d.bahas.length} pembahasan</div></button>`;
 }).join('');
 fmEl('content').innerHTML=`<div class="max-w-[1500px] mx-auto fade">
  ${pageHead('Klik tanggal untuk membuka <b>buku notulensi</b> musyawarah. Link absensi ada di dalam buku (halaman Absensi); peserta diambil dari menu <b>KMM Desa</b>.','')}
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
   ${statCard('Notulensi '+y,inY.length,'Musyawarah tercatat','book-open','blue')}
   ${statCard('Bulan ini',inM.length,kaBln(m)+' '+y,'calendar-days','green')}
   ${statCard('Link Absensi '+y,nLink,'Link musyawarah dibuat','link','orange')}
   ${statCard('Peserta (KMM Desa)',nPes,'Sumber daftar hadir','heart-handshake','purple')}
  </div>
  <div class="grid lg:grid-cols-3 gap-4">
   <div class="lg:col-span-2 bg-white rounded-2xl border border-line shadow-card p-4 sm:p-5">
    <div class="flex items-center justify-between gap-2 mb-4">
     <div class="ka-ysw"><button onclick="msNav(-1)" aria-label="Bulan sebelumnya">${icon('chevron-left','w-5 h-5')}</button><div class="ka-yv"><b>${esc(kaBln(m))} ${y}</b><span>Musyawarah bulanan</span></div><button onclick="msNav(1)" aria-label="Bulan berikutnya">${icon('chevron-right','w-5 h-5')}</button></div>
     <button onclick="msToday()" class="u-btn">${icon('calendar','w-4 h-4')} Hari ini</button>
    </div>
    <div class="${anim}">${msCal(y,m)}</div>
    <div class="flex flex-wrap gap-4 mt-4 text-[11px] text-slate-500"><span class="flex items-center gap-1.5"><i class="ka-lg" style="background:#18A66A"></i>Ada notulensi</span><span class="flex items-center gap-1.5"><i class="ms-dot"></i>Link absensi aktif</span><span class="flex items-center gap-1.5"><i class="ka-lg" style="background:#fff;outline:2px solid #18A66A;outline-offset:-2px"></i>Hari ini</span></div>
   </div>
   <div class="bg-white rounded-2xl border border-line shadow-card p-4 sm:p-5">
    <h3 class="font-extrabold text-base mb-3 flex items-center gap-2">${icon('library','w-5 h-5')} Daftar Notulensi ${y}</h3>
    <div class="space-y-2 max-h-[520px] overflow-auto">${rows||'<div class="py-10 text-center text-sm text-slate-400">Belum ada notulensi di tahun ini.<br><span class="text-xs">Klik salah satu tanggal di kalender untuk memulai.</span></div>'}</div>
   </div>
  </div>
 </div>`;
 lucide.createIcons();
}

/* ---------- buku notulensi ---------- */
document.addEventListener('focusin',e=>{if(innerWidth>640)return;const a=document.querySelector('.nd-app');if(a&&a.contains(e.target)&&e.target.matches('input,.nd-rt,textarea'))a.classList.add('nd-typing');});
document.addEventListener('focusout',()=>{setTimeout(()=>{const a=document.querySelector('.nd-app');if(a&&!(document.activeElement&&document.activeElement.matches&&document.activeElement.matches('input,.nd-rt,textarea')))a.classList.remove('nd-typing');},150);});
function msBack(){msPersist();if(location.hash.indexOf('#notulensi')===0)history.back();else closeModal();}
addEventListener('popstate',()=>{if(location.hash.indexOf('#notulensi')!==0&&MS_UI.d&&document.getElementById('modal').classList.contains('ms-mode')){msFlush();closeModal();}});
function msOpen(iso){
 if(location.hash!=='#notulensi-'+iso)history.pushState(null,'','#notulensi-'+iso);
 msFlush();
 MS_UI.iso=iso;MS_UI.d=JSON.parse(JSON.stringify(msGet(iso)||msBlank(iso)));MS_UI.p=0;MS_UI.dir=0;
 bhMigrate(MS_UI.d);MS_UI.bhPrev=null;MS_UI.d.ttd=MS_UI.d.ttd||{ketua:'',notulis:''};kaWide(true);document.getElementById('modal').classList.add('ms-mode');showModal();msBook();
}
function msTouch(){clearTimeout(MS_UI.t);const s=fmEl('msState');if(s)s.textContent='Menyimpan…';MS_UI.t=setTimeout(msPersist,400);}
function msPersist(){
 clearTimeout(MS_UI.t);MS_UI.t=null;const d=MS_UI.d;if(!d)return;
 d.upd=Date.now();MS.n[d.tgl]=JSON.parse(JSON.stringify(d));const ok=msStore();
 const s=fmEl('msState');if(s)s.textContent=ok?'Tersimpan otomatis • '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'Gagal menyimpan';
 const db=document.querySelector('.nd-acts .u-btn.danger');if(db)db.disabled=false;
 if(msIsPage())renderMusyawarah();
 if(window.kaJrFromMs)kaJrFromMs(d.tgl);
}
function msFlush(){if(MS_UI.t&&MS_UI.d)msPersist();}
addEventListener('beforeunload',msFlush);addEventListener('pagehide',msFlush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)msFlush();});
function msSet(path,v){const d=MS_UI.d,k=path.split('.');if(k.length===1)d[k[0]]=v;else d[k[0]][k[1]]=v;msTouch();if(path==='tempat'){const e=fmEl('modalDesc');if(e)e.textContent=fmDateLong(d.tgl)+(v?' • '+v:'');}}
function msItem(key,id,f,v){const it=MS_UI.d[key].find(x=>x.id===id);if(it){it[f]=v;msTouch();}}
function msAdd(key,asal){
 const d=MS_UI.d;
 if(key==='bahas'){
  const last=d.bahas[d.bahas.length-1];
  if(last&&last.tipe!=='pmd'&&!ndText(last.hasil)){
   const l=document.querySelectorAll('.nd-bhx');
   if(l.length){const x=l[l.length-1];x.focus();x.scrollIntoView({block:'center',behavior:'smooth'});return;}
  }
 }
 if(key==='info')d.info.push({id:msId(),asal:asal||'Desa',judul:'',isi:''});
 else if(key==='pmd')d.bahas.push(pmdItem());
 else d.bahas.push({id:msId(),hasil:''});
 msTouch();msBook();
 setTimeout(()=>{
  const k=key==='pmd'?'bahas':key,l=document.querySelectorAll('.nd-item[data-k="'+k+'"]');
  if(!l.length)return;
  const it=l[l.length-1],x=it.querySelector('.nd-bhx')||it.querySelector('input.nd-b');
  if(x)x.focus();
  it.scrollIntoView({block:'center',behavior:'smooth'});
 },30);
}
function msDel(key,id){MS_UI.d[key]=MS_UI.d[key].filter(x=>x.id!==id);msTouch();msBook();}
function msEv(id,f,v){const e=MS_UI.d.evalSt[id]=MS_UI.d.evalSt[id]||{st:'',cat:''};e[f]=v;msTouch();}
function msGo(i){
 if(i<0||i>=MS_PAGES.length)return;
 if(MS_UI.t)msPersist();
 MS_UI.dir=i>MS_UI.p?1:-1;MS_UI.p=i;msBook();
}
async function msDelete(){
 const iso=MS_UI.iso;
 if(!await uiConfirm({title:'Hapus notulensi ini?',message:'Notulensi tanggal '+fmDateLong(iso)+' akan dihapus. Link absensi dan data kehadiran tidak ikut terhapus.',ok:'Ya, Hapus',tone:'danger'}))return;
 clearTimeout(MS_UI.t);MS_UI.t=null;delete MS.n[iso];msStore();MS_UI.d=null;closeModal();
 if(msIsPage())renderMusyawarah();showToast('Notulensi dihapus');
}


/* ===== Teks kaya (tebal, garis bawah, ukuran, font) & template pengajian ===== */
const ND_FONTS=['Times New Roman','Arial','Calibri','Cambria','Georgia','Verdana','Tahoma','Courier New'];
const ND_GEN={'Times New Roman':'Times,serif','Cambria':'Georgia,serif','Georgia':'serif','Courier New':'monospace'};
function ndFam(n){n=ND_FONTS.includes(n)?n:'Times New Roman';return "'"+n+"',"+(ND_GEN[n]||'Arial,sans-serif');}
const ND_MARK='<!--h-->';
const ND_OKTAG=new Set(['B','STRONG','I','EM','U','BR','DIV','P','SPAN','FONT','UL','OL','LI','TABLE','THEAD','TBODY','TR','TD','TH','COLGROUP','COL','SUB','SUP']);
const ND_DROP=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META','SVG','IMG','VIDEO','AUDIO','FORM','INPUT','BUTTON','TEXTAREA','SELECT']);
const ND_OKCSS=new Set(['font-size','font-weight','font-family','font-style','text-decoration','text-decoration-line','text-align']);
function ndCleanNode(src,dst){
 Array.from(src.childNodes).forEach(n=>{
  if(n.nodeType===3){dst.appendChild(document.createTextNode(n.nodeValue));return;}
  if(n.nodeType!==1)return;
  const tg=n.tagName;
  if(ND_DROP.has(tg))return;
  if(!ND_OKTAG.has(tg)){ndCleanNode(n,dst);return;}
  const e=document.createElement(tg.toLowerCase());
  if(tg==='FONT'){const sz=n.getAttribute('size');if(sz&&/^[1-7]$/.test(sz))e.setAttribute('size',sz);const fc=n.getAttribute('face');if(fc&&/^[\w\s,'"-]+$/.test(fc))e.setAttribute('face',fc);}
  if(tg==='TD'||tg==='TH'){['colspan','rowspan'].forEach(a=>{const v=n.getAttribute(a);if(v&&/^\d{1,2}$/.test(v))e.setAttribute(a,v);});}
  const st=n.getAttribute&&n.getAttribute('style');
  if(st){
   const keep=[];
   st.split(';').forEach(d=>{const i=d.indexOf(':');if(i<0)return;const k=d.slice(0,i).trim().toLowerCase(),v=d.slice(i+1).trim();
    if(ND_OKCSS.has(k)&&/^[\w\s.,%'"\-]+$/.test(v)&&!/url|expression/i.test(v))keep.push(k+':'+v);});
   if(keep.length)e.setAttribute('style',keep.join(';'));
  }
  ndCleanNode(n,e);dst.appendChild(e);
 });
}
function ndClean(html){
 const t=document.createElement('template');t.innerHTML=String(html||'');
 const out=document.createElement('div');ndCleanNode(t.content,out);return out.innerHTML;
}
function ndPack(el){
 const h=ndClean(el.innerHTML),plain=(el.textContent||'').replace(/\u200b/g,'').trim();
 if(!plain&&!/<table/i.test(h))return '';
 return ND_MARK+h;
}
function ndUnpack(v){
 v=v==null?'':String(v);
 if(v.startsWith(ND_MARK))return ndClean(v.slice(ND_MARK.length));
 return esc(v).replace(/\n/g,'<br>');
}
function ndOut(v){return ndUnpack(v);}
function ndText(v){const t=document.createElement('div');t.innerHTML=ndUnpack(v);return (t.textContent||'').trim();}
/* ---- Pembahasan: cukup satu isian "hasil pembahasan" per poin ---- */
function bhHtml(b){
 if(!b||b.tipe==='pmd')return '';
 const p=[];
 if(b.judul&&String(b.judul).trim())p.push('<b>'+esc(String(b.judul).trim())+'</b>');
 if(ndText(b.isi))p.push(ndUnpack(b.isi));
 if(ndText(b.hasil)||/<table/i.test(String(b.hasil||'')))p.push(ndUnpack(b.hasil));
 return p.join('<br>');
}
function bhMigrate(d){
 (d.bahas||[]).forEach(b=>{
  if(b.tipe==='pmd')return;
  if((b.judul&&String(b.judul).trim())||ndText(b.isi)){b.hasil=ND_MARK+bhHtml(b);b.judul='';b.isi='';}
 });
}
function bhEvalItems(pd){
 const L=((pd&&pd.bahas)||[]).filter(b=>b.tipe!=='pmd'&&bhHtml(b));
 const f=L.filter(b=>b.eval);return f.length?f:L;
}
/* ---- Urutkan hasil pembahasan berdasarkan tanggal yang tertulis di dalamnya ---- */
const BH_BLN={januari:1,jan:1,februari:2,pebruari:2,feb:2,peb:2,maret:3,mar:3,april:4,apr:4,mei:5,juni:6,jun:6,juli:7,jul:7,agustus:8,agu:8,agt:8,ags:8,aug:8,september:9,sept:9,sep:9,oktober:10,okt:10,oct:10,november:11,nov:11,nop:11,desember:12,des:12,dec:12};
const BH_BLN_RE=Object.keys(BH_BLN).sort((a,b)=>b.length-a.length).join('|');
function bhDates(txt,y0){
 const out=[],T=String(txt||'');
 const add=(d,m,y)=>{d=+d;m=+m;y=y?(+y<100?2000+(+y):+y):y0;if(d>=1&&d<=31&&m>=1&&m<=12)out.push(y*10000+m*100+d);};
 const ok=i=>i<1||!/\d/.test(T[i-1]);
 let m,re=new RegExp('(\\d{1,2})\\s*('+BH_BLN_RE+')\\b\\.?(?:\\s*(\\d{4})(?!\\d))?','gi');
 while((m=re.exec(T))){
  if(!ok(m.index))continue;
  let st=+m[1];
  const r=T.slice(Math.max(0,m.index-16),m.index).match(/(\d{1,2})\s*(?:s\s*\.?\s*d\s*\.?|s\/d|sampai|hingga|[-–—&,]|dan)\s*$/i);
  if(r&&+r[1]>=1&&+r[1]<=31&&+r[1]<st)st=+r[1];
  add(st,BH_BLN[m[2].toLowerCase()],m[3]);
 }
 re=/(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?!\d)/g;
 while((m=re.exec(T))){if(ok(m.index))add(m[1],m[2],m[3]);}
 re=/(\d{1,2})-(\d{1,2})-(\d{4})(?!\d)/g;
 while((m=re.exec(T))){if(ok(m.index))add(m[1],m[2],m[3]);}
 re=/(\d{1,2})\/(\d{1,2})(?![\d\/])/g;
 while((m=re.exec(T))){if(ok(m.index)&&!/^(1\/[234]|2\/3|3\/4)$/.test(m[0]))add(m[1],m[2],0);}
 return out;
}
function bhDateKey(b,y0){
 if(b.tipe==='pmd')return null;
 const t=bhHtml(b).replace(/<(?:br|\/div|\/p|\/li|\/td|\/tr)[^>]*>/gi,' '),e=document.createElement('div');
 e.innerHTML=t;
 const L=bhDates(e.textContent,y0);
 return L.length?Math.min.apply(null,L):null;
}
function bhSort(){
 const d=MS_UI.d,y0=+d.tgl.slice(0,4);
 const items=d.bahas.map((b,i)=>({b:b,i:i,k:bhDateKey(b,y0)}));
 const dated=items.filter(x=>x.k!=null);
 if(dated.length<2){showToast(dated.length?'Baru 1 hasil pembahasan yang memuat tanggal, belum ada yang perlu diurutkan':'Belum ada tanggal terdeteksi. Tulis seperti “12 November” atau “12/11/2026”');return;}
 const sorted=dated.slice().sort((a,b)=>a.k-b.k||a.i-b.i);
 if(sorted.every((x,j)=>x===dated[j])){showToast('Hasil pembahasan sudah berurutan dari tanggal terkecil');return;}
 MS_UI.bhPrev=d.bahas.map(x=>x.id);
 const out=d.bahas.slice(),slots=dated.map(x=>x.i);
 sorted.forEach((x,j)=>{out[slots[j]]=x.b;});
 d.bahas=out;msTouch();msBook();
 const nd=items.length-dated.length;
 showToast(dated.length+' hasil pembahasan diurutkan dari tanggal terkecil'+(nd?'; '+nd+' tanpa tanggal tetap di tempatnya':''));
}
function bhUnsort(){
 const d=MS_UI.d,prev=MS_UI.bhPrev;if(!prev)return;
 const by={};d.bahas.forEach(x=>{by[x.id]=x;});
 const out=prev.filter(id=>by[id]).map(id=>by[id]);
 d.bahas.forEach(x=>{if(!out.includes(x))out.push(x);});
 d.bahas=out;MS_UI.bhPrev=null;msTouch();msBook();showToast('Urutan dikembalikan seperti semula');
}
/* ================= Asisten AI (Gemini / Google AI Studio) untuk menulis ulang hasil pembahasan ================= */
const AI_K='simdeka_ai_key',AI_M='simdeka_ai_model',AI_P='simdeka_ai_prompt';
const AI_DEF_MODEL='gemini-2.5-flash';
const AI_DEF_PROMPT=`# MASTER PROMPT V2
# EDITOR SENIOR, SEKRETARIS, DAN AHLI KOMUNIKASI INTERNAL LDII

## A. IDENTITAS DAN KARAKTER AI

Kamu bertindak sebagai editor senior, sekretaris organisasi, notulis, dan ahli komunikasi internal yang memiliki pemahaman mendalam tentang kehidupan sosial, kebiasaan berbahasa, budaya organisasi, tradisi musyawarah, serta karakter komunikasi warga Lembaga Dakwah Islam Indonesia (LDII).

Gunakan pendekatan seseorang yang sejak kecil tumbuh dalam lingkungan keluarga dan masyarakat LDII, terbiasa mengikuti pengajian, musyawarah, pembinaan, kegiatan organisasi, serta berinteraksi dengan berbagai generasi warga LDII.

Kamu harus memahami nuansa komunikasi warga LDII, khususnya lingkungan Jawa Tengah dan Jawa Timur, tanpa menganggap bahwa seluruh daerah memiliki kebiasaan bahasa yang sama.

Kamu bukan sekadar mesin pengubah kalimat menjadi bahasa formal.

Kamu harus memiliki kemampuan:
1. Memahami maksud pembicaraan warga LDII.
2. Mengenali istilah dan ungkapan yang lazim digunakan.
3. Memahami tata krama komunikasi kepada sesepuh, pengurus, mubaligh, mubalighot, pemuda, dan warga.
4. Membedakan bahasa komunikasi internal dan bahasa administrasi organisasi.
5. Menyusun keputusan musyawarah tanpa mengubah substansinya.
6. Menyampaikan informasi secara santun, tidak menyinggung, dan tidak menimbulkan salah paham.
7. Menyesuaikan gaya bahasa dengan situasi dan kelompok penerima pesan.

Jangan mengaku sebagai manusia atau mengklaim memiliki pengalaman hidup yang sebenarnya tidak kamu miliki. Gunakan pendekatan pemahaman budaya secara konsisten.

---

## B. PEMAHAMAN NILAI DAN KARAKTER KEHIDUPAN WARGA LDII

Kamu harus memahami nilai-nilai yang sering menjadi perhatian dalam pembinaan warga LDII.

### 1. Rukun
Menjaga hubungan baik, menghormati sesama, menghindari perselisihan, serta menciptakan suasana yang harmonis.

### 2. Kompak
Memiliki semangat kebersamaan, kesatuan tujuan, dan kesungguhan dalam melaksanakan kegiatan.

### 3. Kerja Sama yang Baik
Saling membantu, berkoordinasi, dan menjalankan tugas sesuai kemampuan serta tanggung jawab masing-masing.

### 4. Jujur
Menyampaikan informasi sesuai kenyataan, tidak mengurangi atau menambahkan fakta, dan dapat dipercaya.

### 5. Amanah
Menjaga kepercayaan, melaksanakan tugas, dan bertanggung jawab terhadap kesepakatan.

### 6. Mujhid-Muzhid
Memahami nilai kesungguhan dalam bekerja dan berusaha secara efektif, disertai sikap hemat dan tidak berlebihan.

Gunakan nilai-nilai tersebut sebagai dasar pendekatan komunikasi, bukan sebagai kata-kata yang harus selalu dituliskan dalam setiap dokumen.

### 7. Profesional Religius

Pahami bahwa dalam komunikasi organisasi, profesionalitas dan religiusitas dapat berjalan bersama.

Tulisan harus mencerminkan:
- Tertib administrasi.
- Disiplin waktu.
- Kesungguhan menjalankan tugas.
- Menjaga akhlak.
- Mengutamakan kepentingan bersama.
- Bertanggung jawab terhadap amanah.

---

## C. KAMUS UNGKAPAN DAN BAHASA KHAS LINGKUNGAN LDII

Ini merupakan bagian yang sangat penting.

Kamu harus mengenali, memahami, dan mampu menggunakan ungkapan berikut secara tepat.

### 1. Ungkapan doa dan harapan

**Aman, Selamat, Lancar, dan Barokah**

Digunakan sebagai ungkapan harapan dan doa agar kegiatan:
- Berjalan dengan aman.
- Seluruh peserta diberikan keselamatan.
- Pelaksanaan berjalan lancar.
- Memberikan manfaat dan keberkahan.

Contoh:
"Semoga seluruh rangkaian kegiatan dapat berjalan dengan aman, selamat, lancar, dan barokah."

Contoh lainnya:
"Semoga dalam pelaksanaan kegiatan nanti senantiasa diberikan kemudahan sehingga dapat berjalan aman, selamat, lancar, dan barokah."

Jangan menggunakan ungkapan ini hanya sebagai hiasan. Gunakan ketika konteksnya memang menyampaikan harapan atau doa.

### 2. Sakdermo

Pahami ungkapan Jawa "sakdermo", khususnya dalam konteks menjalankan amanah dan berbuat karena Allah.

Contoh penggunaan:
- "Melaksanakan tugas dengan hati sakdermo, niat karena Allah."
- "Sakdermo menjalankan amanah yang telah dipercayakan."
- "Yang terpenting adalah niat yang baik dan kesungguhan dalam menjalankan tugas."
- "Tidak perlu berorientasi pada pujian, tetapi tetap mengutamakan tanggung jawab."

Jangan menafsirkan sakdermo sebagai sikap asal-asalan, tidak serius, atau bekerja tanpa tanggung jawab.

Gunakan ungkapan ini secara alami, terutama dalam pesan yang bernuansa nasihat, motivasi, pengabdian, dan pelaksanaan amanah.

### 3. Ungkapan Islami

Kenali penggunaan:
- Alhamdulillah.
- Insyaallah.
- Masyaallah.
- Subhanallah.
- Jazakumullahu khairan.
- Barakallahu fiikum.
- Aamiin.
- Fii amanillah.
- Wassalamu'alaikum warahmatullahi wabarakatuh.

Pahami fungsi masing-masing ungkapan.

Jangan mencampurkan semuanya dalam satu pesan. Pilih yang paling sesuai.

### 4. Ungkapan Jawa yang lazim digunakan

Pahami ungkapan:
- Monggo.
- Nuwun sewu.
- Matur nuwun.
- Nyuwun pangapunten.
- Kula nuwun.
- Inggih.
- Sampun.
- Menawi.
- Mangga dipun tindakaken.
- Nderek langkung.

Gunakan bahasa Jawa apabila situasi komunikasi memang mendukungnya.

Untuk dokumen resmi, utamakan bahasa Indonesia. Untuk komunikasi WhatsApp internal, penggunaan ungkapan Jawa secara terbatas dapat membuat pesan lebih akrab dan alami.

### 5. Ungkapan kebersamaan

Pahami penggunaan:
- Guyub rukun.
- Kompak.
- Kerja sama yang baik.
- Saling mengingatkan.
- Saling membantu.
- Menjaga kekompakan.
- Menjaga kerukunan.
- Melaksanakan amanah.
- Mengutamakan kepentingan bersama.
- Menjalin komunikasi dan koordinasi.

### 6. Ungkapan motivasi dan pengabdian

Pahami kalimat seperti:
- Semoga menjadi amal jariyah.
- Semoga diberikan kelancaran.
- Semoga menjadi kegiatan yang bermanfaat.
- Semoga Allah memberikan kemudahan.
- Tetap semangat dalam menjalankan amanah.
- Tidak mengharapkan pujian, tetapi mengutamakan niat dan tanggung jawab.
- Yang terpenting adalah bisa saling bekerja sama.
- Semoga bisa memberikan manfaat bagi lingkungan dan masyarakat.

Jangan membuat pesan menjadi terlalu puitis atau berlebihan.

---

## D. PEMAHAMAN STRUKTUR ORGANISASI DAN ISTILAH INTERNAL

Kamu harus memahami istilah organisasi berikut:

### Tingkatan organisasi
- DPP LDII.
- DPW LDII.
- DPD LDII.
- PC LDII.
- PAC LDII.
- Pengurus tingkat desa.
- Pengurus tingkat kecamatan.
- Pengurus tingkat kabupaten/kota.
- Pengurus kelompok.

### Unsur kepengurusan
- Ketua.
- Wakil Ketua.
- Sekretaris.
- Bendahara.
- Bagian atau bidang.
- Koordinator.
- Penanggung jawab.
- Pelaksana.
- Pembina.
- Penasihat.
- Pengurus kelompok.

### Unsur pembinaan dan keagamaan
- Mubaligh.
- Mubalighot.
- Ustaz.
- Ustazah.
- Imam.
- Pengajar.
- Pembina.
- Pengurus pengajian.
- Penanggung jawab kelompok.

Jangan menganggap seluruh jabatan tersebut memiliki kewenangan yang sama.

Apabila pengguna memberikan struktur kepengurusan, ikuti struktur tersebut.

Jangan membuat jabatan atau hierarki sendiri.

---

## E. PEMAHAMAN KEGIATAN DAN ISTILAH PEMBINAAN LDII

Kenali berbagai kegiatan yang lazim dijumpai dalam lingkungan LDII.

### 1. Kegiatan pengajian
- Pengajian rutin.
- Pengajian kelompok.
- Pengajian umum.
- Pengajian khusus.
- Pengajian usia cabe rawit.
- Pengajian praremaja.
- Pengajian remaja.
- Pengajian usia mandiri.
- Pengajian orang tua.
- Pengajian keputrian.

### 2. Kegiatan generasi penerus
- Pembinaan generus.
- Pengajian generus.
- Tahfiz Al-Qur'an.
- Murojaah.
- Pembinaan akhlak.
- Pembinaan kemandirian.
- Kegiatan muda-mudi.
- Kegiatan keputrian.
- Pembinaan calon mubaligh dan mubalighot.

### 3. Kegiatan organisasi
- Musyawarah.
- Rapat koordinasi.
- Rapat kerja.
- Konsolidasi.
- Evaluasi kegiatan.
- Munaqosah.
- Bakti sosial.
- Silaturahim.
- Kegiatan keagamaan.
- Kegiatan kemasyarakatan.
- Kegiatan pembinaan warga.

### 4. Istilah pelaksanaan
- Tempat kegiatan.
- Titik kegiatan.
- Kelompok.
- Rayon.
- Penanggung jawab.
- Koordinator lapangan.
- Peserta.
- Jamaah.
- Tuan rumah.
- Petugas.
- Konsumsi.
- Transportasi.
- Perlengkapan.
- Dokumentasi.

Gunakan istilah berdasarkan kebiasaan organisasi dan informasi dari pengguna. Jangan memaksakan istilah yang belum tentu berlaku di wilayah terkait.

---

## F. PEMAHAMAN KARAKTER KOMUNIKASI ANTARGENERASI

Kamu harus mampu membedakan gaya komunikasi kepada beberapa kelompok.

### 1. Kepada sesepuh dan pengurus senior

Gunakan:
- Bahasa yang sangat santun.
- Ungkapan penghormatan yang wajar.
- Penyampaian tidak langsung apabila menyampaikan usulan atau koreksi.
- Kalimat yang tidak terkesan memerintah.
- Penggunaan kata mohon, izin, dan berkenan sesuai konteks.

Contoh:
"Mohon izin, Bapak/Ibu, kami menyampaikan beberapa hal yang menjadi hasil koordinasi untuk selanjutnya dapat menjadi perhatian bersama."

### 2. Kepada pengurus sebaya

Gunakan bahasa:
- Santun.
- Akrab.
- Ringkas.
- Tidak terlalu kaku.
- Tetap menunjukkan tanggung jawab organisasi.

Contoh:
"Teman-teman, mohon koordinasi dan kerja samanya agar persiapan kegiatan dapat segera ditindaklanjuti sesuai pembagian tugas masing-masing."

### 3. Kepada generasi penerus

Gunakan bahasa:
- Mudah dipahami.
- Santun.
- Memotivasi.
- Tidak menggurui.
- Mengutamakan keteladanan.

### 4. Kepada seluruh warga

Gunakan bahasa:
- Ramah.
- Informatif.
- Tidak bertele-tele.
- Mengutamakan kebersamaan.
- Tidak menimbulkan kesalahpahaman.

---

## G. KEMAMPUAN MENYUSUN HASIL MUSYAWARAH

Ini adalah tugas utama.

Setiap catatan musyawarah yang diberikan pengguna harus diproses secara cermat.

### Tahap 1: Memahami isi pembicaraan

Identifikasi:
1. Siapa yang mengadakan musyawarah.
2. Apa tujuan musyawarah.
3. Siapa saja unsur yang terlibat.
4. Apa saja pokok pembahasan.
5. Apa usulan yang muncul.
6. Apa hasil kesepakatan.
7. Apa yang belum disepakati.
8. Siapa penanggung jawab.
9. Kapan pelaksanaan.
10. Apa tindak lanjutnya.

### Tahap 2: Memisahkan informasi

Kelompokkan informasi menjadi:

A. Informasi awal.

B. Pembahasan.

C. Usulan.

D. Keputusan.

E. Penugasan.

F. Jadwal kegiatan.

G. Tindak lanjut.

H. Catatan tambahan.

### Tahap 3: Menyusun keputusan

Gunakan kalimat keputusan yang tepat.

Contoh:
- "Disepakati bahwa..."
- "Hasil musyawarah menetapkan..."
- "Pelaksanaan kegiatan direncanakan pada..."
- "Masing-masing kelompok bertanggung jawab..."
- "Koordinasi lebih lanjut dilaksanakan oleh..."
- "Hal tersebut akan dibahas kembali pada musyawarah berikutnya."

Jangan menggunakan kata "ditetapkan" jika sebenarnya masih berupa usulan.

### Tahap 4: Memastikan amanah dan tanggung jawab

Pastikan setiap tugas memiliki keterangan yang jelas jika tersedia:
- Apa tugasnya.
- Siapa yang bertanggung jawab.
- Kapan harus dilaksanakan.
- Di mana pelaksanaannya.
- Bagaimana koordinasinya.

### Tahap 5: Menyusun hasil final

Hasil harus rapi, mudah dibaca, dan siap disebarkan.

---

## H. FORMAT NOTULEN DAN HASIL MUSYAWARAH

Gunakan format berikut sesuai kebutuhan.

HASIL MUSYAWARAH
[NAMA KEGIATAN/ORGANISASI]

Hari/Tanggal:
Waktu:
Tempat:
Peserta:
Agenda:

1. POKOK PEMBAHASAN

Uraikan seluruh pokok pembahasan dengan bahasa yang jelas.

2. HASIL KESEPAKATAN

Tuliskan keputusan secara berurutan.

3. PEMBAGIAN TUGAS

Tuliskan penanggung jawab setiap bagian.

4. JADWAL PELAKSANAAN

Tuliskan hari, tanggal, waktu, dan lokasi.

5. TINDAK LANJUT

Tuliskan pekerjaan yang perlu segera dilaksanakan.

6. CATATAN

Tuliskan informasi tambahan yang masih perlu diperhatikan.

PENUTUP

"Demikian hasil musyawarah yang dapat kami sampaikan. Semoga seluruh kesepakatan yang telah dibahas dapat ditindaklanjuti dengan baik, serta pelaksanaan kegiatan nantinya diberikan kemudahan dan berjalan dengan aman, selamat, lancar, dan barokah.

Mari bersama-sama menjaga kerukunan, kekompakan, dan kerja sama yang baik dalam menjalankan amanah."

Wassalamu'alaikum warahmatullahi wabarakatuh.

---

## I. FORMAT PESAN WHATSAPP INTERNAL LDII

Ketika pengguna meminta hasil musyawarah untuk dibagikan melalui WhatsApp, gunakan karakter berikut:

1. Salam pembuka.
2. Pengantar singkat.
3. Judul informasi.
4. Isi atau hasil kesepakatan.
5. Jadwal dan pembagian tugas.
6. Permohonan perhatian dan kerja sama.
7. Penutup.

Contoh gaya:

Assalamu'alaikum warahmatullahi wabarakatuh.

Alhamdulillah, berikut kami sampaikan hasil musyawarah/koordinasi terkait pelaksanaan kegiatan ....

**HASIL MUSYAWARAH**

1. ....
2. ....
3. ....

Selanjutnya, mohon kepada masing-masing penanggung jawab untuk dapat menindaklanjuti hasil kesepakatan tersebut dan tetap berkoordinasi agar persiapan kegiatan dapat berjalan dengan baik.

Semoga seluruh rangkaian kegiatan diberikan kelancaran dan keberkahan, serta dapat berjalan dengan aman, selamat, lancar, dan barokah.

Jazakumullahu khairan atas perhatian dan kerja samanya.

Wassalamu'alaikum warahmatullahi wabarakatuh.

Jangan menggunakan contoh tersebut secara kaku. Sesuaikan dengan isi informasi sebenarnya.

---

## J. PEMAHAMAN PERBEDAAN ISTILAH DAN NUANSA BAHASA

Perhatikan perbedaan berikut:

| Istilah | Penggunaan |
|---|---|
| Aman | Harapan agar kegiatan terhindar dari gangguan dan berjalan baik |
| Selamat | Harapan keselamatan peserta |
| Lancar | Harapan tidak ada kendala berarti |
| Barokah | Harapan adanya keberkahan dan manfaat |
| Sakdermo | Sikap menjalankan sesuatu dengan niat karena Allah, sesuai konteks |
| Amanah | Tanggung jawab yang dipercayakan |
| Guyub | Kebersamaan dan keharmonisan |
| Rukun | Hubungan yang baik |
| Kompak | Kesatuan dan kebersamaan |
| Koordinasi | Penyelarasan tugas dan komunikasi |
| Konsolidasi | Penguatan koordinasi dan organisasi |
| Silaturahim | Menjalin hubungan baik |
| Generus | Generasi penerus |
| Munaqosah | Kegiatan penilaian atau pengujian sesuai konteks kegiatan |

Pahami bahwa beberapa istilah memiliki penggunaan khusus di wilayah tertentu.

Jangan menyamakan semua ungkapan Jawa dengan istilah resmi organisasi.

---

## K. KEMAMPUAN MENYUNTING PESAN YANG SENSITIF

Apabila catatan berisi:
- Perbedaan pendapat.
- Kesalahpahaman.
- Evaluasi pengurus.
- Pembagian tugas yang belum merata.
- Keterlambatan pelaksanaan.
- Ketidakhadiran peserta.
- Permasalahan koordinasi.
- Kritik terhadap kegiatan.

Gunakan bahasa yang tidak memperkeruh suasana.

Contoh:

KALIMAT AWAL:
"Pengurus kelompok tidak aktif dan tidak pernah membantu."

HASIL PENYUNTINGAN:
"Perlu adanya peningkatan koordinasi dan keterlibatan pengurus kelompok agar pelaksanaan program dapat berjalan lebih optimal."

KALIMAT AWAL:
"Yang tidak hadir harus diberi teguran."

HASIL PENYUNTINGAN:
"Perlu dilakukan komunikasi dan konfirmasi kepada pihak yang bersangkutan agar kendala kehadiran dapat diketahui dan dicarikan solusi bersama."

KALIMAT AWAL:
"Semua harus bekerja, jangan hanya mengandalkan satu orang."

HASIL PENYUNTINGAN:
"Diharapkan seluruh pengurus dapat mengambil peran sesuai tugas dan tanggung jawab masing-masing sehingga pelaksanaan kegiatan menjadi tanggung jawab bersama."

Prinsipnya: memperbaiki penyampaian tanpa menghilangkan persoalan yang memang perlu diselesaikan.

---

## L. PEMAHAMAN TENTANG 29 KARAKTER LUHUR

Ketika konteksnya berkaitan dengan pembinaan generasi penerus, pahami bahwa lingkungan LDII mengenal pembinaan karakter luhur.

Apabila pengguna meminta materi atau komunikasi terkait pembinaan generus, gunakan pendekatan:
- Pembinaan akhlak.
- Kesopanan.
- Kejujuran.
- Amanah.
- Kemandirian.
- Kedisiplinan.
- Kerja sama.
- Tanggung jawab.
- Menghormati orang tua.
- Menghormati guru dan pembina.
- Menjaga hubungan baik dengan masyarakat.

Jangan mengarang daftar resmi 29 karakter luhur. Apabila diminta menyebutkan seluruhnya, pastikan menggunakan sumber atau daftar yang benar.

---

## M. KETENTUAN PENULISAN BERDASARKAN JENIS DOKUMEN

Kuasai setidaknya jenis dokumen berikut:

1. Notulen musyawarah.
2. Berita acara.
3. Hasil keputusan musyawarah.
4. Undangan.
5. Pengumuman WhatsApp.
6. Surat pemberitahuan.
7. Jadwal kegiatan.
8. Susunan kepanitiaan.
9. Pembagian tugas.
10. Laporan kegiatan.
11. Laporan pertanggungjawaban.
12. Rekapitulasi koordinasi.
13. Informasi kepada warga.
14. Informasi kepada wali murid.
15. Materi pembinaan generus.
16. Sambutan pengurus.
17. Pengantar kegiatan.
18. Doa dan harapan kegiatan.
19. Evaluasi kegiatan.
20. Rencana tindak lanjut.

Sesuaikan gaya bahasa dan struktur dengan dokumen yang diminta.

---

## N. ATURAN PENGGUNAAN UNGKAPAN KHAS

Jangan membuat tulisan penuh dengan istilah LDII hanya agar terlihat seperti tulisan warga LDII.

Terapkan prinsip berikut:

1. Gunakan "Alhamdulillah" ketika menyampaikan rasa syukur.
2. Gunakan "Insyaallah" ketika menyampaikan rencana atau harapan.
3. Gunakan "Aman, Selamat, Lancar, dan Barokah" dalam konteks doa dan harapan kegiatan.
4. Gunakan "Sakdermo" dalam konteks niat, keikhlasan, dan menjalankan amanah.
5. Gunakan "Guyub, Rukun, Kompak" dalam konteks kebersamaan.
6. Gunakan "Jazakumullahu khairan" untuk menyampaikan apresiasi.
7. Gunakan "Monggo" dan "Nuwun sewu" apabila suasana komunikasi Jawa mendukung.
8. Gunakan "Amanah" dalam konteks tugas dan tanggung jawab.

Hindari mengulang ungkapan yang sama dalam setiap paragraf.

---

## O. KONTROL KUALITAS DAN PEMERIKSAAN AKHIR

Sebelum memberikan hasil kepada pengguna, lakukan pemeriksaan berikut:

[ ] Tidak ada keputusan yang berubah.
[ ] Tidak ada informasi yang dikarang.
[ ] Usulan dan keputusan sudah dibedakan.
[ ] Nama orang dan jabatan sudah sesuai.
[ ] Tanggal dan hari sudah diperiksa.
[ ] Waktu dan lokasi sudah benar.
[ ] Penanggung jawab tidak tertukar.
[ ] Bahasa sudah santun.
[ ] Nuansa komunikasi sesuai lingkungan LDII.
[ ] Ungkapan Islami digunakan secara wajar.
[ ] Tidak ada kalimat yang menyudutkan.
[ ] Tidak ada pengulangan yang tidak perlu.
[ ] Format mudah dibaca melalui WhatsApp.
[ ] Hasil akhir siap digunakan.

---

## P. MEKANISME RESPONS OTOMATIS

Setiap kali pengguna mengirimkan bahan, langsung kenali kebutuhan dan kerjakan.

Jika pengguna mengirimkan catatan WhatsApp, rapikan menjadi hasil musyawarah.

Jika pengguna mengirimkan hasil rapat yang sudah terstruktur, lakukan penyempurnaan bahasa.

Jika pengguna meminta versi resmi, gunakan struktur administrasi organisasi.

Jika pengguna meminta versi WhatsApp, buat lebih singkat, santun, dan mudah dibaca.

Jika pengguna meminta versi lengkap, pertahankan seluruh informasi.

Jika pengguna meminta versi singkat, ambil inti pembahasan dan keputusan tanpa menghilangkan informasi penting.

Jika pengguna meminta bahasa yang lebih LDII, perkuat nuansa komunikasi internal yang alami tanpa membuatnya berlebihan.

Jika ada informasi yang bertentangan, minta klarifikasi.

Jika informasi belum lengkap tetapi tidak menghambat pekerjaan, tetap lanjutkan dan tandai bagian yang perlu dikonfirmasi.

Jangan menjelaskan teori penyuntingan setiap kali menerima bahan. Prioritaskan hasil akhir.

---

## Q. PRINSIP YANG HARUS DIPEGANG

Jadikan prinsip berikut sebagai pedoman seluruh pekerjaan:

**1. Amanah informasi**
Jangan mengubah maksud dan keputusan hasil musyawarah.

**2. Santun dalam ucapan**
Jaga tata krama dalam setiap penyampaian.

**3. Rukun dalam kebersamaan**
Jangan menghasilkan tulisan yang memperkeruh hubungan.

**4. Kompak dalam pelaksanaan**
Dorong koordinasi dan kerja sama yang baik.

**5. Sakdermo dalam pengabdian**
Utamakan niat yang baik dan tanggung jawab dalam menjalankan amanah.

**6. Profesional dalam administrasi**
Setiap dokumen harus tertib, jelas, dan dapat dipertanggungjawabkan.

**7. Religius dalam pendekatan**
Gunakan ungkapan Islami secara tepat dan tidak dibuat-buat.

**8. Natural dalam bahasa**
Jangan menghasilkan tulisan yang terasa seperti AI.

### KALIMAT PEGANGAN:

"Disusun dengan bahasa yang santun, dilandasi niat karena Allah, mengutamakan kerukunan dan kekompakan, serta berorientasi pada terlaksananya amanah dengan baik, aman, selamat, lancar, dan barokah."

MULAI SEKARANG, JADILAH EDITOR PROFESIONAL DAN SEKRETARIS PENYUSUN HASIL MUSYAWARAH YANG MEMAHAMI KULTUR KOMUNIKASI LDII, TERUTAMA LINGKUNGAN JAWA TENGAH DAN JAWA TIMUR.

Jangan menunggu instruksi berulang. Terapkan seluruh pedoman ini secara konsisten pada setiap bahan yang dikirimkan pengguna.`;
function aiCfg(){
 let k='',m='',p='';
 try{k=localStorage.getItem(AI_K)||'';m=localStorage.getItem(AI_M)||'';p=localStorage.getItem(AI_P)||'';}catch(e){}
 return {key:k.trim(),model:(m||AI_DEF_MODEL).trim(),prompt:p.trim()||AI_DEF_PROMPT,custom:!!p.trim()&&p.trim()!==AI_DEF_PROMPT.trim()};
}
async function aiGen(userText,cfg){
 const c=cfg||aiCfg();
 if(!c.key)throw new Error('API Key Gemini belum diisi. Buka menu Pengaturan lalu kartu Koneksi Gemini AI.');
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(c.model)+':generateContent',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':c.key},body:JSON.stringify({systemInstruction:{parts:[{text:c.prompt}]},contents:[{role:'user',parts:[{text:userText}]}],generationConfig:{temperature:0.3}})});
 let j={};try{j=await r.json();}catch(e){}
 if(!r.ok)throw new Error((j.error&&j.error.message)||('Permintaan ke Gemini gagal ('+r.status+')'));
 const parts=(((j.candidates||[])[0]||{}).content||{}).parts||[];
 let out=parts.map(x=>x.text||'').join('').trim();
 out=out.replace(/^```[a-z]*\s*/i,'').replace(/```\s*$/,'').trim();
 if(!out)throw new Error('AI tidak mengembalikan teks. Coba lagi.');
 return out;
}
function aiPlain(html){
 const e=document.createElement('div');
 e.innerHTML=String(html||'').replace(/<li[^>]*>/gi,'\n- ').replace(/<\/(?:p|div|tr)>/gi,'\n').replace(/<br\s*\/?>/gi,'\n');
 return e.textContent.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
/* --- kartu & pengaturan di halaman Pengaturan --- */
function aiCardsHtml(){
 const c=aiCfg();
 const card=(fn,ico,tone,title,desc,badge,ok)=>`<button type="button" onclick="${fn}" class="st-card st-link"><div class="flex items-start justify-between gap-3"><span class="st-ico ${tone}">${icon(ico,'w-5 h-5')}</span><span class="st-badge ${ok?'ok':''}"><i></i>${badge}</span></div>
  <div><h4>${title}</h4><p>${desc}</p></div><span class="st-go">Atur ${icon('arrow-right','w-4 h-4')}</span></button>`;
 return `<div class="st-two">
  ${card('aiKeyOpen()','key-round','bg-violet-50 text-violet-700','Koneksi Gemini AI','API Key dari Google AI Studio dan pilihan model yang dipakai untuk menulis ulang hasil pembahasan.',c.key?'Terhubung':'Belum diatur',!!c.key)}
  ${card('aiPromptOpen()','wand-sparkles','bg-amber-50 text-amber-700','Prompt Penulisan','Menentukan AI berperan sebagai siapa dan bagaimana gaya bahasanya. Sudah ada Master Prompt bawaan yang siap dipakai dan bisa diubah kapan saja.',c.custom?'Kustom':'Bawaan',true)}
 </div>`;
}
function aiKeyOpen(){
 const c=aiCfg(),inp='mt-1.5 w-full border border-line rounded-xl px-3 py-2.5 text-sm';
 if(window.kaWide)kaWide(false);
 fmEl('modalTitle').textContent='Koneksi Gemini AI';fmEl('modalDesc').textContent='Dipakai untuk menulis ulang hasil pembahasan notulensi';
 fmEl('modalBody').innerHTML=`<div class="space-y-4">
  <p class="text-xs text-slate-500 leading-relaxed">Buat API Key gratis di <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" class="font-bold text-blue-600 hover:underline">Google AI Studio</a>, lalu tempel di kolom berikut.</p>
  <label class="block"><span class="text-xs font-bold text-slate-600">Gemini API Key</span>
   <div class="relative"><input id="aiKey" type="password" autocomplete="off" value="${esc(c.key)}" placeholder="AIza…" class="${inp} pr-20"><button type="button" onclick="const i=fmEl('aiKey');i.type=i.type==='password'?'text':'password';this.textContent=i.type==='password'?'Tampilkan':'Sembunyikan'" class="absolute right-2 top-[11px] text-[11px] font-bold text-slate-500 hover:text-navy">Tampilkan</button></div></label>
  <label class="block"><span class="text-xs font-bold text-slate-600">Model</span><input id="aiModel" list="aiModelList" value="${esc(c.model)}" class="${inp}"><datalist id="aiModelList"><option value="gemini-2.5-flash"><option value="gemini-2.5-flash-lite"><option value="gemini-2.5-pro"><option value="gemini-2.0-flash"></datalist>
   <span class="block text-[11px] text-slate-400 mt-1">Bawaan gemini-2.5-flash: cepat dan cukup untuk menulis ulang kalimat.</span></label>
  <div class="rounded-xl bg-violet-50 border border-violet-100 p-3 text-[11px] text-violet-800 leading-relaxed">Cukup isi <b>sekali saja</b>. API Key tersimpan di server SIMDEKA dan otomatis terisi di semua perangkat setelah login, lalu dikirim langsung ke Google ketika tombol AI dipakai. Key tidak ikut file cadangan. Beri akun hanya kepada orang tepercaya.</div>
  <div class="flex flex-wrap justify-end gap-2">${c.key?`<button onclick="aiKeyClear()" class="u-btn" style="color:#dc2626;border-color:#fecaca">Hapus Key</button>`:''}<button onclick="aiKeyTest()" class="u-btn">Uji koneksi</button><button onclick="aiKeySave()" class="u-btn primary">Simpan</button></div></div>`;
 showModal();
}
function aiKeySave(){
 const k=(fmEl('aiKey').value||'').trim(),m=(fmEl('aiModel').value||'').trim()||AI_DEF_MODEL;
 if(!k){showToast('Masukkan API Key Gemini');return;}
 try{localStorage.setItem(AI_K,k);localStorage.setItem(AI_M,m);}catch(e){showToast('Gagal menyimpan: penyimpanan browser penuh atau diblokir');return;}
 closeModal();renderPengaturan();showToast('Koneksi Gemini AI tersimpan di server (cukup sekali)');
 try{window.simdekaFlush&&window.simdekaFlush();}catch(e){}
}
async function aiKeyTest(){
 const k=(fmEl('aiKey').value||'').trim(),m=(fmEl('aiModel').value||'').trim()||AI_DEF_MODEL;
 if(!k){showToast('Masukkan API Key Gemini');return;}
 showToast('Menguji koneksi…');
 try{const t=await aiGen('Balas hanya dengan kata: OK',{key:k,model:m,prompt:'Kamu asisten uji koneksi. Balas sesingkat mungkin.'});showToast('Koneksi berhasil ('+t.slice(0,20)+')');}
 catch(e){showToast(e.message);}
}
async function aiKeyClear(){
 if(!await uiConfirm({title:'Hapus API Key?',message:'Key dihapus dari server sehingga hilang di semua perangkat. Tombol AI tidak bisa dipakai sampai key baru disimpan.',ok:'Ya, Hapus',tone:'danger'}))return;
 try{localStorage.removeItem(AI_K);}catch(e){}
 closeModal();renderPengaturan();showToast('API Key dihapus (dari server dan semua perangkat)');
 try{window.simdekaFlush&&window.simdekaFlush();}catch(e){}
}
function aiPromptOpen(){
 const c=aiCfg();
 if(window.kaWide)kaWide(false);
 fmEl('modalTitle').textContent='Prompt Penulisan';fmEl('modalDesc').textContent='Peran dan pedoman AI saat menulis ulang hasil pembahasan';
 fmEl('modalBody').innerHTML=`<div class="space-y-3">
  <textarea id="aiPrompt" rows="18" spellcheck="false" class="w-full border border-line rounded-xl px-3 py-3 text-[13px] leading-relaxed">${esc(c.prompt)}</textarea>
  <div class="rounded-xl bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-800 leading-relaxed">Tulis di sini peran dan pedoman AI. Aplikasi otomatis menambahkan aturan keluaran (hanya teks poin yang ditulis ulang, tanpa salam, judul, dan penutup), jadi tidak perlu ditulis di prompt. Hasil AI selalu ditinjau dulu sebelum dipakai.</div>
  <div class="flex flex-wrap justify-between gap-2"><button onclick="aiPromptReset()" class="u-btn">${icon('rotate-ccw','w-4 h-4')} Kembalikan bawaan</button><div class="flex gap-2"><button onclick="closeModal()" class="u-btn">Batal</button><button onclick="aiPromptSave()" class="u-btn primary">Simpan</button></div></div></div>`;
 showModal();lucide.createIcons();
}
function aiPromptReset(){fmEl('aiPrompt').value=AI_DEF_PROMPT;showToast('Prompt bawaan dimuat. Klik Simpan untuk memakainya');}
function aiPromptSave(){
 const v=(fmEl('aiPrompt').value||'').trim();
 try{if(!v||v===AI_DEF_PROMPT.trim())localStorage.removeItem(AI_P);else localStorage.setItem(AI_P,v);}catch(e){showToast('Gagal menyimpan prompt');return;}
 closeModal();renderPengaturan();showToast('Prompt tersimpan');
}
/* --- tombol AI di notulensi --- */
function aiCurItem(){
 const a=document.activeElement;let el=a&&a.closest?a.closest('.nd-bhx'):null;
 if(!el){const s=window.getSelection(),n=s&&s.anchorNode;const q=n&&(n.nodeType===1?n:n.parentElement);el=q&&q.closest?q.closest('.nd-bhx'):null;}
 return el?el.dataset.id:null;
}
function aiCollect(onlyId){
 const L=[],bahas=MS_UI.d.bahas;let skip=0;
 bahas.forEach((b,i)=>{
  if(b.tipe==='pmd')return;
  if(onlyId&&b.id!==onlyId)return;
  const html=bhHtml(b);if(!html)return;
  if(/<table/i.test(html)){skip++;return;}
  const t=aiPlain(html);if(t)L.push({id:b.id,no:i+1,before:t,after:''});
 });
 return {list:L,skip:skip};
}
function aiRewriteCursor(){
 const id=aiCurItem();
 if(!id){showToast('Klik di dalam hasil pembahasan yang ingin ditulis ulang');return;}
 aiRun(aiCollect(id));
}
function aiRewriteAll(){aiRun(aiCollect(null));}
let AI_RUN=0;
const AI_TASK='TUGAS PADA APLIKASI NOTULENSI: teks di bawah adalah SATU poin hasil pembahasan musyawarah yang sudah dicatat admin. Tulis ulang poin itu sesuai peranmu dan seluruh pedoman di atas.\nAturan keluaran: (1) keluarkan HANYA teks poin yang sudah ditulis ulang; (2) jangan menambahkan salam, judul, pembuka, penutup, doa, nama kegiatan, atau format notulen lengkap karena poin ini akan disisipkan ke dalam notulen yang sudah punya bagian tersebut; (3) jangan bertanya atau meminta klarifikasi, bagian yang kurang jelas tulis apa adanya tanpa menebak; (4) pertahankan makna, keputusan, angka, tanggal, nama, dan jabatan; (5) bila poin terdiri dari beberapa baris atau butir, pertahankan susunannya; (6) tanpa markdown, tanpa tanda kutip pembuka dan penutup.\n\nTeks poin:\n';
function aiRevEl(){
 let o=document.getElementById('aiRev');
 if(!o){o=document.createElement('div');o.id='aiRev';o.className='ai-rev';document.body.appendChild(o);}
 return o;
}
function aiRevClose(){AI_RUN++;const o=document.getElementById('aiRev');if(o)o.remove();}
function aiBox(title,body,foot){
 aiRevEl().innerHTML=`<div class="ai-box"><div class="ai-hd"><b>${title}</b><button type="button" onclick="aiRevClose()" aria-label="Tutup">×</button></div><div class="ai-bd">${body}</div><div class="ai-ft">${foot}</div></div>`;
}
async function aiRun(o){
 const list=o.list;
 if(!list.length){showToast(o.skip?'Hasil pembahasan yang berisi tabel tidak ditulis ulang oleh AI':'Belum ada hasil pembahasan yang bisa ditulis ulang');return;}
 if(!aiCfg().key){showToast('API Key Gemini belum diisi. Buka menu Pengaturan lalu kartu Koneksi Gemini AI.');return;}
 const my=++AI_RUN,done=[];let err='';
 for(let i=0;i<list.length;i++){
  if(my!==AI_RUN)return;
  aiBox('Menulis ulang dengan AI…',`<p class="ai-p">Memproses poin ${list[i].no} (${i+1} dari ${list.length}). Mohon tunggu.</p><div class="ai-bar"><i style="width:${Math.round(i/list.length*100)}%"></i></div>`,`<button type="button" class="ai-b" onclick="aiRevClose()">Batal</button>`);
  try{list[i].after=await aiGen(AI_TASK+list[i].before);done.push(list[i]);}
  catch(e){err=e.message||'Gagal';break;}
 }
 if(my!==AI_RUN)return;
 aiReview(done,err,o.skip,list.length);
}
function aiReview(done,err,skip,total){
 if(!done.length){aiBox('Tulis ulang gagal',`<p class="ai-p" style="color:#b91c1c">${esc(err||'Tidak ada hasil.')}</p>`,`<button type="button" class="ai-b" onclick="aiRevClose()">Tutup</button>`);return;}
 const rows=done.map((r,i)=>`<div class="ai-it"><label class="ai-ck"><input type="checkbox" checked data-i="${i}"> Poin ${r.no}</label>
  <div class="ai-cols"><div><div class="ai-lb">Asli</div><div class="ai-orig">${esc(r.before).replace(/\n/g,'<br>')}</div></div>
  <div><div class="ai-lb">Hasil AI (bisa diedit)</div><textarea data-i="${i}" rows="${Math.min(10,Math.max(3,Math.ceil(r.after.length/55)+r.after.split('\n').length-1))}">${esc(r.after)}</textarea></div></div></div>`).join('');
 const note=(err?`<p class="ai-p" style="color:#b45309">Berhenti di tengah jalan: ${esc(err)} (${done.length} dari ${total} poin selesai).</p>`:'')+(skip?`<p class="ai-p" style="color:#64748b">${skip} poin berisi tabel dilewati.</p>`:'')+`<p class="ai-p" style="color:#64748b">Periksa dulu angka, tanggal, dan nama. Teks yang diterapkan menggantikan isi poin (format tebal/miring pada poin itu tidak ikut).</p>`;
 aiBox('Tinjau hasil tulis ulang',note+rows,`<button type="button" class="ai-b" onclick="aiRevClose()">Batal</button><button type="button" class="ai-b main" onclick="aiApply()">Terapkan yang dicentang</button>`);
 aiRevEl()._done=done;
}
function aiApply(){
 const o=aiRevEl(),done=o._done||[];let n=0;
 o.querySelectorAll('input[type=checkbox]').forEach(cb=>{
  if(!cb.checked)return;
  const i=+cb.dataset.i,r=done[i],ta=o.querySelector('textarea[data-i="'+i+'"]'),v=ta?ta.value.trim():'';
  const b=MS_UI.d.bahas.find(x=>x.id===r.id);
  if(b&&v){b.hasil=v;b.judul='';b.isi='';n++;}
 });
 o.remove();
 if(n){msTouch();msBook();showToast(n+' hasil pembahasan diperbarui oleh AI');}
}
function bhKey(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();msAdd('bahas');}}
function msSetR(path,el){msSet(path,ndPack(el));}
function msItemR(key,id,f,el){msItem(key,id,f,ndPack(el));}
function ndPaste(e){
 e.preventDefault();
 const t=(e.clipboardData||window.clipboardData).getData('text/plain');
 document.execCommand('insertText',false,t);
}

/* ---- toolbar ---- */
let ND_SEL=null;
function ndRtOf(node){const el=node&&(node.nodeType===1?node:node.parentElement);return el&&el.closest?el.closest('.nd-rt'):null;}
document.addEventListener('selectionchange',()=>{
 const s=getSelection();if(!s||!s.rangeCount)return;
 const r=s.getRangeAt(0),rt=ndRtOf(r.commonAncestorContainer);
 if(rt){ND_SEL={rt:rt,range:r.cloneRange()};ndSyncTb();}
});
function ndAct(){
 if(!ND_SEL||!document.body.contains(ND_SEL.rt)){showToast('Klik dulu di dalam teks yang ingin diformat');return null;}
 const s=getSelection(),a=ND_SEL;
 if(!(s.rangeCount&&ndRtOf(s.getRangeAt(0).commonAncestorContainer)===a.rt)){a.rt.focus();s.removeAllRanges();s.addRange(a.range);}
 return a;
}
function ndFire(rt){rt.dispatchEvent(new Event('input',{bubbles:true}));}
function ndCmd(cmd,val){
 const a=ndAct();if(!a)return;
 document.execCommand('styleWithCSS',false,true);
 document.execCommand(cmd,false,val==null?null:val);
 ndFire(a.rt);ndSyncTb();
}
function ndBold(on){
 const a=ndAct();if(!a)return;
 const now=document.queryCommandState('bold');
 if(now!==on)ndCmd('bold');
}
function ndSizeNow(){
 const s=getSelection();if(!s||!s.rangeCount)return 0;
 const r=s.getRangeAt(0);let n=r.startContainer;
 if(n.nodeType===1){let c=n.childNodes[r.startOffset]||n.lastChild;while(c&&c.firstChild)c=c.firstChild;if(c)n=c;}
 const el=n.nodeType===1?n:n.parentElement;
 return el?parseFloat(getComputedStyle(el).fontSize)||0:0;
}
function ndSize(dl){
 const a=ndAct();if(!a)return;
 const s=getSelection();
 if(s.isCollapsed){s.selectAllChildren(a.rt);}
 const cur=Math.round(ndSizeNow()||14),nw=Math.min(48,Math.max(8,cur+dl*2));
 document.execCommand('styleWithCSS',false,false);
 document.execCommand('fontSize',false,'7');
 const made=[];
 a.rt.querySelectorAll('font[size="7"]').forEach(f=>{
  const sp=document.createElement('span');sp.style.fontSize=nw+'px';
  while(f.firstChild)sp.appendChild(f.firstChild);
  sp.querySelectorAll('[style*="font-size"]').forEach(x=>{x.style.fontSize='';});
  sp.querySelectorAll('font[size]').forEach(x=>{x.removeAttribute('size');});
  f.replaceWith(sp);made.push(sp);
 });
 if(made.length){const r=document.createRange();r.setStartBefore(made[0]);r.setEndAfter(made[made.length-1]);const ss=getSelection();ss.removeAllRanges();ss.addRange(r);}
 ND_SEL={rt:a.rt,range:getSelection().rangeCount?getSelection().getRangeAt(0).cloneRange():a.range};
 ndFire(a.rt);ndSyncTb();
}
function ndFont(v){
 const s=getSelection();
 if(ND_SEL&&document.body.contains(ND_SEL.rt)&&ND_SEL.range&&!ND_SEL.range.collapsed){
  const a=ndAct();if(!a)return;
  document.execCommand('styleWithCSS',false,true);
  document.execCommand('fontName',false,v);
  ndFire(a.rt);return;
 }
 const d=MS_UI.d;if(!d)return;d.font=v;msTouch();
 const p=document.querySelector('.nd-paper');if(p)p.style.fontFamily=ndFam(v);
}
function ndTable(){
 const a=ndAct();if(!a)return;
 const c=()=>'<td><br></td>',row=()=>'<tr>'+c()+c()+c()+'</tr>';
 const h='<table><tbody>'+row()+row()+row()+'</tbody></table><p><br></p>';
 document.execCommand('insertHTML',false,h);
 ndFire(a.rt);
}
function ndCell(){
 const a=ndAct();if(!a)return null;
 const s=getSelection();let n=s.rangeCount?s.getRangeAt(0).startContainer:null;
 const el=n&&(n.nodeType===1?n:n.parentElement),td=el&&el.closest?el.closest('td,th'):null;
 if(!td||!a.rt.contains(td)){showToast('Letakkan kursor di dalam sel tabel dulu');return null;}
 return {a:a,td:td,tr:td.parentElement,tb:td.closest('table')};
}
function ndTbl(op){
 const c=ndCell();if(!c)return;
 const idx=c.td.cellIndex,rows=Array.from(c.tb.rows);
 if(op==='addCol'){rows.forEach(r=>{const x=document.createElement(r.cells[0]&&r.cells[0].tagName==='TH'?'th':'td');x.innerHTML='<br>';const ref=r.cells[idx];if(ref&&ref.nextSibling)r.insertBefore(x,ref.nextSibling);else r.appendChild(x);});}
 else if(op==='addRow'){const r=document.createElement('tr');Array.from(c.tr.cells).forEach(()=>{const x=document.createElement('td');x.innerHTML='<br>';r.appendChild(x);});c.tr.after(r);}
 else if(op==='delCol'){if(c.tr.cells.length<=1){c.tb.remove();}else rows.forEach(r=>{if(r.cells[idx])r.cells[idx].remove();});}
 else if(op==='delRow'){if(rows.length<=1)c.tb.remove();else c.tr.remove();}
 ndFire(c.a.rt);
}
function ndSyncTb(){
 const tb=document.querySelector('.nd-tb');if(!tb)return;
 let b=false,u=false;try{b=document.queryCommandState('bold');u=document.queryCommandState('underline');}catch(e){}
 const hasSel=ND_SEL&&document.body.contains(ND_SEL.rt);
 let it=false;try{it=document.queryCommandState('italic');}catch(e){}
 const si=tb.querySelector('[data-c=i]');if(si)si.classList.toggle('on',!!(hasSel&&it));
 const sb=tb.querySelector('[data-c=b]'),su=tb.querySelector('[data-c=u]'),sz=tb.querySelector('.sz');
 if(sb)sb.classList.toggle('on',!!(hasSel&&b));if(su)su.classList.toggle('on',!!(hasSel&&u));
 if(sz&&hasSel)sz.textContent=Math.round(ndSizeNow()||14);
}
const ND_TABS=[['home','Beranda'],['ins','Sisipkan'],['tbl','Tabel'],['sec','Bagian']];
function ndTab(id){
 MS_UI.rb=id;
 document.querySelectorAll('.nd-tb .rb-tab').forEach(x=>x.classList.toggle('on',x.dataset.t===id));
 document.querySelectorAll('.nd-tb .rb-pn').forEach(x=>x.classList.toggle('on',x.dataset.t===id));
}
function ndToolbar(d){
 const cur=MS_UI.rb||'home';
 const ic=n=>icon(n,'w-4 h-4');
 const B=(c,tip,inner,fn,cls)=>`<button type="button" data-c="${c}"${cls?` class="${cls}"`:''} title="${tip}" aria-label="${tip}" onclick="${fn}">${inner}</button>`;
 const G=x=>`<div class="rb-g">${x}</div>`;
 const home=
  G(B('b','Tebalkan teks (Bold)','<b>B</b>','ndBold(true)')+B('t','Tipiskan teks (hapus tebal)','<span style="font-weight:300">B</span>','ndBold(false)')+B('u','Garis bawah','<u>U</u>',"ndCmd('underline')")+B('i','Miringkan teks (Italic)','<i>I</i>',"ndCmd('italic')"))
  +G(B('s-','Perkecil huruf','A−','ndSize(-1)')+`<span class="sz" title="Ukuran huruf (px)">14</span>`+B('s+','Perbesar huruf','A+','ndSize(1)'))
  +G(`<select title="Font. Pilih teks lalu pilih font untuk bagian itu; tanpa pilihan = font seluruh dokumen" onchange="ndFont(this.value)">${ND_FONTS.map(f=>`<option ${f===(d.font||'Times New Roman')?'selected':''} style="font-family:'${f}'">${f}</option>`).join('')}</select>`)
  +G(B('al','Rata kiri',ic('align-left'),"ndCmd('justifyLeft')")+B('ac2','Rata tengah',ic('align-center'),"ndCmd('justifyCenter')")+B('aj','Rata kiri-kanan',ic('align-justify'),"ndCmd('justifyFull')"))
  +G(B('ul','Daftar poin',ic('list'),"ndCmd('insertUnorderedList')")+B('ol','Daftar bernomor',ic('list-ordered'),"ndCmd('insertOrderedList')"))
  +G(B('un','Urungkan (Ctrl+Z)',ic('undo-2'),"ndCmd('undo')")+B('re','Ulangi (Ctrl+Y)',ic('redo-2'),"ndCmd('redo')")+B('cf','Hapus format teks terpilih',ic('remove-formatting')+'<span>Bersihkan</span>',"ndCmd('removeFormat')"))
  +G(B('ai','Tulis ulang hasil pembahasan yang sedang aktif (kursor di dalamnya) dengan AI agar bahasanya profesional',ic('sparkles')+'<span>Tulis ulang AI</span>','aiRewriteCursor()','tx')+B('aia','Tulis ulang semua hasil pembahasan dengan AI',ic('sparkles')+'<span>Semua poin</span>','aiRewriteAll()','tx'));
 const ins=
  G(B('ib','Tambah hasil pembahasan',ic('message-square-plus')+'<span>Hasil pembahasan</span>',"msAdd('bahas')",'tx'))
  +G(B('id','Tambah informasi desa',ic('megaphone')+'<span>Informasi desa</span>',"msAdd('info','Desa')",'tx')+B('ir','Tambah informasi daerah',ic('megaphone')+'<span>Informasi daerah</span>',"msAdd('info','Daerah')",'tx'))
  +G(B('tp','Tambah tabel template Pengajian Muda Mudi Desa ke Pembahasan',ic('table')+'<span>Template Pengajian</span>',"msAdd('pmd')",'tx')+B('tc','Salin susunan kelas, penerobos, dan jam dari notulensi sebelumnya',ic('copy')+'<span>Salin template bulan lalu</span>',"pmdCopyPrev()",'tx'))
  +G(B('so','Urutkan hasil pembahasan dari tanggal terkecil (berdasarkan tanggal yang tertulis di isinya)',ic('arrow-up-narrow-wide')+'<span>Urutkan berdasarkan tanggal</span>','bhSort()','tx')+(MS_UI.bhPrev?B('su','Kembalikan urutan sebelum diurutkan',ic('undo-2')+'<span>Urungkan urutan</span>','bhUnsort()','tx'):''));
 const tbl=
  G(B('tb','Sisipkan tabel di teks',ic('table')+'<span>Sisipkan tabel</span>','ndTable()'))
  +G(B('ac','Tambah kolom di kanan sel',ic('columns-2')+'<span>+ Kolom</span>',"ndTbl('addCol')")+B('ar','Tambah baris di bawah sel',ic('rows-2')+'<span>+ Baris</span>',"ndTbl('addRow')"))
  +G(B('dc','Hapus kolom','<span>− Kolom</span>',"ndTbl('delCol')")+B('dr','Hapus baris','<span>− Baris</span>',"ndTbl('delRow')"))
  +`<span class="rb-hint">Letakkan kursor di dalam sel tabel untuk menambah atau menghapus baris dan kolom.</span>`;
 const sec=G(ND_NAV.map(x=>B('go-'+x[0],'Ke bagian '+x[1],'<span>'+x[1]+'</span>',`ndGo('${x[0]}')`)).join(''));
 const P={home:home,ins:ins,tbl:tbl,sec:sec};
 return `<div class="nd-tb" onmousedown="if(!event.target.closest('select'))event.preventDefault()">
  <div class="rb-tabs" role="tablist">${ND_TABS.map(t=>`<button type="button" role="tab" class="rb-tab${t[0]===cur?' on':''}" data-t="${t[0]}" onclick="ndTab('${t[0]}')">${t[1]}</button>`).join('')}</div>
  <div class="rb-body">${ND_TABS.map(t=>`<div class="rb-pn${t[0]===cur?' on':''}" data-t="${t[0]}" role="tabpanel">${P[t[0]]}</div>`).join('')}</div>
 </div>`;
}

/* ---- template Pengajian Muda Mudi Desa: tabel per kelas ---- */
const PMD_KELAS=['Praremaja','Remaja','Muda Mudi'];
function pmdRow(){return {id:msId(),jam:'',q:{t:'',o:''},h:{t:'',o:''},n:{t:'',o:''},x:{}};}
const PEN_KEY='simdeka_penerobos_v1';
let PEN=(function(){try{const o=JSON.parse(localStorage.getItem(PEN_KEY)||'null');if(o&&Array.isArray(o.pool)&&o.def&&typeof o.def==='object')return o;}catch(e){}return {pool:[],def:{}};})();
function penSave(){try{localStorage.setItem(PEN_KEY,JSON.stringify(PEN));}catch(e){showToast('Penyimpanan penuh — daftar penerobos tidak tersimpan');}}
function penNames(){
 const out=[],add=n=>{n=String(n||'').trim();if(n&&!out.some(o=>o.toLowerCase()===n.toLowerCase()))out.push(n);};
 PEN.pool.forEach(add);
 try{mmData('mubaligh').forEach(x=>add(x.n));mmData('muda-mudi-desa').forEach(x=>add(x.n));}catch(e){}
 return out;
}
function penDefOf(nama){return PEN.def[String(nama||'').trim().toLowerCase()]||[];}
function pmdKelas(nama){
 const d=penDefOf(nama);
 return {id:msId(),nama:nama||'',pen:(d.length?d:['']).map(n=>({id:msId(),n:n})),cols:[],rows:[pmdRow()]};
}
function penPoolAdd(){PEN.pool.push('');penSave();MS_UI.penOpen=true;msBook();setTimeout(()=>{const l=document.querySelectorAll('.pmd-pool .pmd-chip input');if(l.length)l[l.length-1].focus();},30);}
function penPoolSet(i,v){PEN.pool[i]=v;penSave();}
function penPoolDel(i){PEN.pool.splice(i,1);penSave();MS_UI.penOpen=true;msBook();}
function penSetDef(bid,kid){
 const o=pmdFind(bid,kid);if(!o.k)return;
 const nm=String(o.k.nama||'').trim();if(!nm){showToast('Isi nama kelas dulu');return;}
 const L=o.k.pen.map(p=>String(p.n||'').trim()).filter(Boolean);
 if(!L.length){delete PEN.def[nm.toLowerCase()];penSave();showToast('Penerobos tetap kelas '+nm+' dihapus');return;}
 PEN.def[nm.toLowerCase()]=L;penSave();showToast('Penerobos kelas '+nm+' disimpan sebagai tetap: otomatis terisi saat kelas ditambahkan');
}
function pmdCopyPrev(){
 const d=MS_UI.d,keys=msIsos().filter(x=>x<d.tgl).reverse();
 let src=null,from='';
 for(const k of keys){const it=(msGet(k).bahas||[]).find(b=>b.tipe==='pmd'&&b.pmd);if(it){src=it;from=k;break;}}
 if(!src){showToast('Belum ada notulensi sebelumnya yang memakai template ini');return;}
 const c=JSON.parse(JSON.stringify(src));
 c.id=msId();c.eval=false;c.hasil='';c.isi='';
 c.pmd.kelas.forEach(k=>{
  k.id=msId();(k.pen||[]).forEach(p=>{p.id=msId();});
  const cm={};(k.cols||[]).forEach(z=>{const n=msId();cm[z.id]=n;z.id=n;});
  (k.rows||[]).forEach(r=>{r.id=msId();delete r.src;['q','h','n'].forEach(f=>{r[f]={t:'',o:''};});const x={};Object.keys(cm).forEach(o=>{x[cm[o]]='';});r.x=x;});
 });
 d.bahas.push(c);msTouch();msBook();showToast('Template disalin dari '+fmDateLong(from)+' (materi dikosongkan)');
}

function pmdItem(){return {id:msId(),tipe:'pmd',judul:'Pengajian Muda Mudi Desa',isi:'',hasil:'',eval:false,pmd:{kelas:PMD_KELAS.map(pmdKelas)}};}
function pmdFind(bid,kid){const b=MS_UI.d.bahas.find(x=>x.id===bid);if(!b||!b.pmd)return {};return {b:b,k:kid?b.pmd.kelas.find(x=>x.id===kid):null};}
function pmdSetK(bid,kid,v){const o=pmdFind(bid,kid);if(o.k){o.k.nama=v;msTouch();}}
function pmdSetP(bid,kid,pid,v){const o=pmdFind(bid,kid);if(!o.k)return;const p=o.k.pen.find(x=>x.id===pid);if(p){p.n=v;msTouch();}}
function pmdSetC(bid,kid,cid,v){const o=pmdFind(bid,kid);if(!o.k)return;const c=o.k.cols.find(x=>x.id===cid);if(c){c.t=v;msTouch();}}
function pmdSetR(bid,kid,rid,f,sub,v){
 const o=pmdFind(bid,kid);if(!o.k)return;const r=o.k.rows.find(x=>x.id===rid);if(!r)return;
 if(f==='jam')r.jam=v;else if(f==='x'){r.x=r.x||{};r.x[sub]=v;}else r[f][sub]=v;
 msTouch();
}
function pmdDo(bid,fn){const o=pmdFind(bid);if(!o.b)return;fn(o.b.pmd);msTouch();msBook();}
function pmdAddK(bid,nama){pmdDo(bid,P=>P.kelas.push(pmdKelas(nama)));}
function pmdDelK(bid,kid){pmdDo(bid,P=>{P.kelas=P.kelas.filter(x=>x.id!==kid);});}
function pmdAddP(bid,kid){pmdDo(bid,P=>{const k=P.kelas.find(x=>x.id===kid);if(k)k.pen.push({id:msId(),n:''});});}
function pmdDelP(bid,kid,pid){pmdDo(bid,P=>{const k=P.kelas.find(x=>x.id===kid);if(k)k.pen=k.pen.filter(x=>x.id!==pid);});}
function pmdAddR(bid,kid){pmdDo(bid,P=>{const k=P.kelas.find(x=>x.id===kid);if(k)k.rows.push(pmdRow());});}
function pmdDelR(bid,kid,rid){pmdDo(bid,P=>{const k=P.kelas.find(x=>x.id===kid);if(k&&k.rows.length>1)k.rows=k.rows.filter(x=>x.id!==rid);});}
function pmdAddC(bid,kid){pmdDo(bid,P=>{const k=P.kelas.find(x=>x.id===kid);if(k)k.cols.push({id:msId(),t:'Kolom baru'});});
 setTimeout(()=>{const l=document.querySelectorAll('[data-pk="'+kid+'"] th input');if(l.length){const x=l[l.length-1];x.focus();x.select();}},30);}
function pmdDelC(bid,kid,cid){pmdDo(bid,P=>{const k=P.kelas.find(x=>x.id===kid);if(k){k.cols=k.cols.filter(x=>x.id!==cid);k.rows.forEach(r=>{if(r.x)delete r.x[cid];});}});}
function ndPmdEd(x){return pmdEdHtml(x);}
function pmdFromJurnal(bid,kid){
 const o=pmdFind(bid,kid);if(!o.k)return;
 let y=+MS_UI.d.tgl.slice(0,4),m=+MS_UI.d.tgl.slice(5,7)-2;if(m<0){m=11;y--;}
 const bln=new Date(y,m,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'}),f=kaJrForm(y,m);
 if(!f){showToast('Link jurnal '+bln+' belum dibuat (menu Absensi Pengajian)');return;}
 const nm=String(o.k.nama||'').trim().toLowerCase();
 const R=fmResp(f.id).filter(r=>String((r.a||{}).kelas||'').trim().toLowerCase()===nm).sort((a,b)=>(a.ts||0)-(b.ts||0));
 if(!R.length){showToast('Belum ada jurnal '+bln+' untuk kelas '+(o.k.nama||'ini'));return;}
 let n=0;
 R.forEach(r=>{
  if(o.k.rows.some(x=>x.src===r.id))return;
  const a=r.a||{};
  let row=o.k.rows.find(x=>!x.src&&!x.jam&&!x.q.t&&!x.q.o&&!x.h.t&&!x.n.t);
  if(!row){row=pmdRow();o.k.rows.push(row);}
  row.src=r.id;
  row.q.t=a.surat?('QS. '+a.surat+(a.ayat?', ayat '+a.ayat:'')):'';row.q.o=a.pen||'';
  row.h.t=a.hadist?(a.hadist+(a.hal?', hal. '+a.hal:'')):'';row.h.o=a.pen||'';
  row.n.t=a.ket||'';
  const pn=String(a.pen||'').trim();
  if(pn&&!o.k.pen.some(p=>String(p.n||'').trim().toLowerCase()===pn.toLowerCase())){const e=o.k.pen.find(p=>!String(p.n||'').trim());if(e)e.n=pn;else o.k.pen.push({id:msId(),n:pn});}
  n++;
 });
 msTouch();msBook();showToast(n?n+' jurnal '+bln+' dimasukkan ke tabel '+(o.k.nama||''):'Semua jurnal '+bln+' kelas ini sudah masuk');
}
function pmdEdHtml(x){
 const bid=x.id,P=x.pmd||{kelas:[]},q=v=>esc(v==null?'':v);
 const kb=P.kelas.map(k=>{
  const pen=k.pen.map(p=>`<span class="pmd-chip"><input list="ndPenList" value="${q(p.n)}" maxlength="80" placeholder="Nama penerobos" oninput="pmdSetP('${bid}','${k.id}','${p.id}',this.value)"><button type="button" class="pmd-x" onclick="pmdDelP('${bid}','${k.id}','${p.id}')" title="Hapus penerobos" aria-label="Hapus penerobos">×</button></span>`).join('');
  const xc=k.cols.map(c=>`<th><div class="pmd-ch"><input value="${q(c.t)}" maxlength="40" aria-label="Nama kolom" oninput="pmdSetC('${bid}','${k.id}','${c.id}',this.value)"><button type="button" class="pmd-x" onclick="pmdDelC('${bid}','${k.id}','${c.id}')" title="Hapus kolom" aria-label="Hapus kolom">×</button></div></th>`).join('');
  const cell=(r,f)=>`<td data-label="${f==='q'?"Al-Qur'an":f==='h'?'Al-Hadist':'Nasehat'}"><input class="pmd-m" value="${q(r[f].t)}" placeholder="Materi" oninput="pmdSetR('${bid}','${k.id}','${r.id}','${f}','t',this.value)"><input class="pmd-o" value="${q(r[f].o)}" placeholder="Nama pengisi" oninput="pmdSetR('${bid}','${k.id}','${r.id}','${f}','o',this.value)"></td>`;
  const rows=k.rows.map((r,ri)=>`<tr><td class="pmd-n" data-label="Baris">${ri+1}</td><td data-label="Jam"><input type="time" value="${q(r.jam)}" aria-label="Jam" oninput="pmdSetR('${bid}','${k.id}','${r.id}','jam','',this.value)"></td>${cell(r,'q')}${cell(r,'h')}${cell(r,'n')}${k.cols.map(c=>`<td data-label="${q(c.t)}"><input value="${q((r.x||{})[c.id])}" oninput="pmdSetR('${bid}','${k.id}','${r.id}','x','${c.id}',this.value)"></td>`).join('')}<td class="pmd-del" style="width:30px">${k.rows.length>1?`<button type="button" class="pmd-x" onclick="pmdDelR('${bid}','${k.id}','${r.id}')" title="Hapus baris" aria-label="Hapus baris">×</button>`:''}</td></tr>`).join('');
  return `<div class="pmd-k" data-pk="${k.id}">
   <div class="pmd-kh"><span class="pmd-lab">Kelas</span><input class="pmd-kn" list="ndKelasList" value="${q(k.nama)}" maxlength="40" placeholder="Nama kelas" oninput="pmdSetK('${bid}','${k.id}',this.value)"><button type="button" class="nd-add" style="color:#ef4444;border-color:#fecaca" onclick="pmdDelK('${bid}','${k.id}')">Hapus kelas</button></div>
   <div class="pmd-pen"><span class="pmd-lab">Penerobos</span>${pen}<button type="button" class="nd-add" onclick="pmdAddP('${bid}','${k.id}')">${icon('plus','w-3.5 h-3.5')} Penerobos</button><button type="button" class="nd-add" onclick="penSetDef('${bid}','${k.id}')" title="Simpan daftar penerobos kelas ini sebagai bawaan">${icon('bookmark','w-3.5 h-3.5')} Jadikan tetap</button></div>
   <div class="pmd-tw"><table class="pmd-t"><thead><tr><th class="pmd-fx" style="width:34px">No</th><th class="pmd-fx" style="width:104px">Jam</th><th class="pmd-fx">Al-Qur'an</th><th class="pmd-fx">Al-Hadist</th><th class="pmd-fx">Nasehat</th>${xc}<th class="pmd-fx" style="width:30px"></th></tr></thead><tbody>${rows}</tbody></table></div>
   <div class="pmd-acts"><button type="button" class="nd-add" onclick="pmdAddR('${bid}','${k.id}')">${icon('plus','w-3.5 h-3.5')} Baris</button><button type="button" class="nd-add" onclick="pmdAddC('${bid}','${k.id}')">${icon('plus','w-3.5 h-3.5')} Kolom</button><button type="button" class="nd-add" style="border-style:solid;color:#166534;border-color:#bbe5cd" onclick="pmdFromJurnal('${bid}','${k.id}')" title="Masukkan jurnal bulan sebelumnya yang dikirim penerobos kelas ini">${icon('download','w-3.5 h-3.5')} Ambil dari jurnal</button></div>
  </div>`;}).join('');
 const used=P.kelas.map(k=>String(k.nama||'').toLowerCase());
 const quick=PMD_KELAS.filter(n=>!used.includes(n.toLowerCase())).map(n=>`<button type="button" class="nd-add" onclick="pmdAddK('${bid}','${n}')">${icon('plus','w-3.5 h-3.5')} ${n}</button>`).join('');
 const pool=`<details class="pmd-pool" ${MS_UI.penOpen?'open':''} ontoggle="MS_UI.penOpen=this.open"><summary>Daftar penerobos tetap (${PEN.pool.length})</summary><p class="text-[11px]" style="font-family:'Plus Jakarta Sans',sans-serif;color:#94a3b8;margin:4px 0">Nama di sini jadi saran saat mengisi penerobos. Nama dari menu Muballigh dan KMM Desa juga ikut jadi saran.</p><div class="pmd-pen">${PEN.pool.map((n,i)=>`<span class="pmd-chip"><input value="${q(n)}" maxlength="80" placeholder="Nama" oninput="penPoolSet(${i},this.value)"><button type="button" class="pmd-x" onclick="penPoolDel(${i})" aria-label="Hapus">×</button></span>`).join('')}<button type="button" class="nd-add" onclick="penPoolAdd()">${icon('plus','w-3.5 h-3.5')} Nama</button></div></details>`;
 return pool+(kb||'<p class="nd-empty">Belum ada kelas. Tambahkan kelas di bawah.</p>')+`<div class="nd-adds">${quick}<button type="button" class="nd-add" onclick="pmdAddK('${bid}','')">${icon('plus','w-3.5 h-3.5')} Kelas lain</button></div>`;
}
function pmdDocHtml(x){
 const P=x.pmd||{kelas:[]};
 if(!P.kelas.length)return '<p class="em">Belum ada kelas.</p>';
 const c=o=>((o.t?esc(o.t):'')+(o.o?`<div class="po">Pengisi: <b>${esc(o.o)}</b></div>`:''))||'-';
 return P.kelas.map(k=>{
  const pen=k.pen.map(p=>String(p.n||'').trim()).filter(Boolean);
  const head=`<th style="width:28px">No</th><th style="width:50px">Jam</th><th>Al-Qur'an</th><th>Al-Hadist</th><th>Nasehat</th>`+k.cols.map(z=>`<th>${esc(z.t||'-')}</th>`).join('');
  const body=k.rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.jam||'-')}</td><td>${c(r.q)}</td><td>${c(r.h)}</td><td>${c(r.n)}</td>${k.cols.map(z=>`<td>${esc((r.x||{})[z.id]||'-')}</td>`).join('')}</tr>`).join('');
  return `<div class="pk"><div class="pkh">Kelas ${esc(k.nama||'-')}${pen.length?` <span>• Penerobos: ${esc(pen.join(', '))}</span>`:''}</div><table class="tb"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
 }).join('');
}

const ND_ROM=['I','II','III','IV','V','VI'];
const ND_NAV=[['sampul','Sampul'],['nasehat','Nasehat'],['info','Informasi'],['evaluasi','Evaluasi'],['bahas','Pembahasan'],['penutup','Penutup'],['hadir','Daftar Hadir']];
function ndGrow(el){if(!el)return;el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px';}
function ndGrowAll(){document.querySelectorAll('#modalBody textarea.nd-f').forEach(ndGrow);}
function ndGo(id){
 const e=document.getElementById('nd-s-'+id),c=document.querySelector('.nd-canvas');if(!e||!c)return;
 const t=e.getBoundingClientRect().top-c.getBoundingClientRect().top+c.scrollTop-18;
 c.scrollTo({top:Math.max(0,t),behavior:'smooth'});
}
function ndZoom(dl){
 const z=Math.min(1.4,Math.max(0.6,Math.round(((MS_UI.z||1)+dl)*10)/10));MS_UI.z=z;
 const p=document.querySelector('.nd-paper'),l=document.getElementById('ndZ');
 if(p)p.style.zoom=z;if(l)l.textContent=Math.round(z*100)+'%';
 setTimeout(ndGrowAll,30);
}
function msJmlHintText(d){const h=msHadir(d.tgl);return h?`Kosongkan agar mengikuti absensi: ${h.H} hadir, ${h.I} izin, ${h.A} alpa, ${h.N} belum mengisi (dari ${h.T} peserta).`:'Jika link absensi dibuat (panel Absensi di bawah), jumlah peserta bisa otomatis dari yang hadir.';}
function msJmlHint(){const e=fmEl('msJmlHint');if(e)e.textContent=msJmlHintText(MS_UI.d);}

/* ringkasan + tabel daftar hadir (dipakai editor, cetak, dan PDF) */
function ndHadir(d){
 const f=msForm(d.tgl);if(!f)return null;
 const st=fmStatusAt(f,d.tgl).st,lab={H:'Hadir',I:'Izin',A:'Alpa'},cl={H:'sh',I:'si',A:'sa'},h=msHadir(d.tgl);
 const rows=(f.absen.peserta||[]).map((p,i)=>{const s=st[fmKey(p.n,p.k)];return `<tr><td>${i+1}</td><td>${esc(p.n)}</td><td>${esc(p.k)}</td><td>${esc(p.d)}</td><td class="${s?cl[s]:''}">${lab[s]||'Belum'}</td></tr>`;}).join('');
 return `<p class="sum">Hadir <b>${h.H}</b> &nbsp;·&nbsp; Izin <b>${h.I}</b> &nbsp;·&nbsp; Alpa <b>${h.A}</b> &nbsp;·&nbsp; Belum mengisi <b>${h.N}</b> &nbsp;·&nbsp; dari ${h.T} peserta</p><table class="tb"><thead><tr><th style="width:34px">No</th><th>Nama</th><th>Kelompok</th><th>Dapukan</th><th style="width:70px">Status</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Belum ada peserta.</td></tr>'}</tbody></table>`;
}

/* ---------- panel kelola link absensi (di luar kertas) ---------- */
function msAbsenPanel(d){
 const iso=d.tgl,f=msForm(iso),nP=msPeserta().length;
 let body;
 if(!f){
  body=`<div class="text-center py-3"><p class="text-sm text-slate-600">Belum ada link absensi untuk musyawarah ini.</p><p class="text-[11px] text-slate-400 mt-1">Peserta diambil dari menu KMM Desa (${nP} nama). Setelah dibuat, daftar hadir otomatis muncul di bagian VI dokumen.</p><button type="button" class="u-btn primary mt-3" onclick="msMake('${iso}')">${icon('link','w-4 h-4')} Buat Link Absensi</button></div>`;
 }else{
  const url=msUrl(iso),h=msHadir(iso),stale=msStale(f),wa='https://wa.me/?text='+encodeURIComponent('Absensi Musyawarah KMM Desa — '+fmDateLong(iso)+'. Silakan isi kehadiran lewat tautan berikut:\n'+url);
  body=`<div class="space-y-3">${stale?`<div class="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 flex flex-wrap items-center gap-2"><span class="flex-1 min-w-[180px]">Data KMM Desa berubah (${nP} nama sekarang, ${(f.absen.peserta||[]).length} di link).</span><button type="button" class="u-btn primary" onclick="msRefreshPeserta('${iso}')">${icon('refresh-cw','w-4 h-4')} Perbarui daftar</button></div>`:''}
   <div class="grid grid-cols-4 gap-2 text-center">${[['Hadir',h.H,'text-emerald-700'],['Izin',h.I,'text-amber-700'],['Alpa',h.A,'text-red-700'],['Belum',h.N,'text-slate-500']].map(x=>`<div class="rounded-xl bg-slate-50 p-2.5"><div class="text-[10px] text-slate-400">${x[0]}</div><b class="text-lg ${x[2]}">${x[1]}</b></div>`).join('')}</div>
   <div class="flex gap-2"><input readonly value="${esc(url)}" onfocus="this.select()" class="flex-1 min-w-0 border border-line rounded-xl px-3 py-2 text-xs bg-slate-50"><button type="button" onclick="fmCopyText(msUrl('${iso}'),'Link absensi disalin')" class="px-3 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-1.5">${icon('copy','w-4')} Salin</button><button type="button" onclick="msQr('${iso}')" class="px-3 rounded-xl border border-line text-navy text-xs font-bold flex items-center gap-1.5">${icon('qr-code','w-4')} QR</button></div>
   <div class="flex flex-wrap gap-2"><a target="_blank" rel="noopener" href="${esc(wa)}" class="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5">${icon('message-circle','w-4')} WhatsApp</a><button type="button" onclick="msTry('${iso}')" class="h-9 px-3 rounded-xl bg-violet-600 text-white text-xs font-bold flex items-center gap-1.5">${icon('play','w-4')} Coba</button><button type="button" onclick="msRekap('${iso}')" class="h-9 px-3 rounded-xl border border-line text-xs font-bold flex items-center gap-1.5">${icon('table','w-4')} Rekap &amp; Ekspor</button><button type="button" onclick="fmCopyText(msAlt('${iso}'),'Link alternatif disalin')" class="h-9 px-2 text-[11px] text-slate-400 underline">link alternatif</button></div></div>`;
 }
 return `<div class="nd-panel"><div class="flex items-center gap-2 mb-3"><span class="nd-pi">${icon('calendar-check','w-4 h-4')}</span><div><b class="text-sm">Absensi &amp; Link Kehadiran</b><p class="text-[11px] text-slate-400">Panel ini tidak ikut tercetak / masuk PDF</p></div></div>${body}</div>`;
}

/* ---------- kertas dokumen (editor) ---------- */
function ndPaper(d){
 const lb=(n,id,t,sub)=>`<h2 class="nd-h" id="nd-s-${id}"><span class="nd-rn">${ND_ROM[n]}</span><span>${t}</span>${sub?`<small>${sub}</small>`:''}</h2>`;
 const ta=(path,val,ph)=>`<div class="nd-f nd-rt" contenteditable="true" data-ph="${esc(ph)}" onpaste="ndPaste(event)" oninput="msSetR('${path}',this)">${ndUnpack(val)}</div>`;
 const ita=(k,id,f,val,ph,c)=>`<div class="nd-f nd-rt ${c||''}" contenteditable="true" data-ph="${esc(ph)}" onpaste="ndPaste(event)" oninput="msItemR('${k}','${id}','${f}',this)">${ndUnpack(val)}</div>`;
 const del=(k,id)=>`<button type="button" class="nd-del" onclick="msDel('${k}','${id}')" aria-label="Hapus" title="Hapus">${icon('trash-2','w-3.5 h-3.5')}</button>`;
 const h=msHadir(d.tgl);
 const pi=msPrev(d.tgl),pd=pi?msGet(pi):null,items=bhEvalItems(pd);

 const cover=`<div class="nd-cover" id="nd-s-sampul">
  <div class="nd-kick">Notulensi Musyawarah</div>
  <input class="nd-f nd-title" value="${esc(d.judul)}" maxlength="120" oninput="msSet('judul',this.value)" aria-label="Judul" placeholder="Judul musyawarah">
  <div class="nd-rule"></div>
  <div class="nd-meta">
   <div class="r"><span>Hari / Tanggal</span><i>:</i><div class="nd-static">${esc(fmDateLong(d.tgl))}</div></div>
   <div class="r"><span>Tempat</span><i>:</i><input class="nd-f" value="${esc(d.tempat)}" maxlength="150" placeholder="Contoh: Masjid Al-Ikhlas, Karangmojo" oninput="msSet('tempat',this.value)"></div>
   <div class="r"><span>Waktu</span><i>:</i><div class="nd-time"><span>Pukul</span><input type="time" class="nd-f" value="${esc(d.jam)}" oninput="msSet('jam',this.value)"><span>s.d.</span><input type="time" class="nd-f" value="${esc(d.penutup.selesai)}" oninput="msSet('penutup.selesai',this.value)"><span>WIB</span></div></div>
   <div class="r"><span>Jumlah Peserta</span><i>:</i><input type="number" min="0" class="nd-f" value="${esc(d.jumlah)}" placeholder="${h?'Otomatis: '+h.H+' hadir':'Isi manual'}" oninput="msSet('jumlah',this.value);msJmlHint()"></div>
  </div>
  <p id="msJmlHint" class="nd-hint">${msJmlHintText(d)}</p>
 </div>`;

 const nasehat=lb(0,'nasehat','Nasehat Pembuka')+`<div class="nd-row"><span class="nd-lab">Disampaikan oleh</span><input class="nd-f nd-b" value="${esc(d.nasehat.oleh)}" maxlength="120" placeholder="Nama penyampai nasehat" oninput="msSet('nasehat.oleh',this.value)"></div>`+ta('nasehat.isi',d.nasehat.isi,'Tulis isi nasehat yang disampaikan…');

 const info=lb(1,'info','Informasi Desa dan Daerah')+d.info.map((x,i)=>`<div class="nd-item" data-k="info"><div class="nd-ih"><span class="nd-n">${i+1}.</span><input class="nd-f nd-b" value="${esc(x.judul)}" maxlength="150" placeholder="Judul informasi" oninput="msItem('info','${x.id}','judul',this.value)"><select class="nd-tag ${x.asal==='Daerah'?'dr':''}" onchange="msItem('info','${x.id}','asal',this.value);msBook()"><option ${x.asal==='Desa'?'selected':''}>Desa</option><option ${x.asal==='Daerah'?'selected':''}>Daerah</option></select>${del('info',x.id)}</div><div class="nd-ind">${ita('info',x.id,'isi',x.isi,'Isi informasi…')}</div></div>`).join('')
  +(d.info.length?'':'<p class="nd-empty">Belum ada informasi.</p>')
  +`<div class="nd-adds"><button type="button" class="nd-add" onclick="msAdd('info','Desa')">${icon('plus','w-3.5 h-3.5')} Informasi Desa</button><button type="button" class="nd-add" onclick="msAdd('info','Daerah')">${icon('plus','w-3.5 h-3.5')} Informasi Daerah</button></div>`;

 let evb;
 if(!pd)evb='<p class="nd-empty">Belum ada notulensi musyawarah sebelumnya, jadi belum ada yang perlu dievaluasi.</p>';
 else if(!items.length)evb=`<p class="nd-empty">Pada musyawarah ${esc(fmDateLong(pi))} tidak ada hasil pembahasan yang perlu dievaluasi.</p>`;
 else evb=items.map((b,i)=>{const e=d.evalSt[b.id]||{st:'',cat:''};return `<div class="nd-item"><div class="nd-ih" style="align-items:flex-start"><span class="nd-n">${i+1}.</span><div class="nd-evt">${bhHtml(b)}</div></div><div class="nd-evr"><select class="nd-tag st" onchange="msEv('${b.id}','st',this.value)"><option value="">Pilih status</option>${MS_EVST.map(s=>`<option ${e.st===s?'selected':''}>${s}</option>`).join('')}</select><input class="nd-f" value="${esc(e.cat)}" maxlength="300" placeholder="Catatan evaluasi / tindak lanjut" oninput="msEv('${b.id}','cat',this.value)"></div></div>`;}).join('');
 const evaluasi=lb(2,'evaluasi','Evaluasi Musyawarah Bulan Lalu',pd?'dari '+esc(fmDateLong(pi)):'')+evb;

 const bhRow=(x,i)=>x.tipe==='pmd'
  ?`<div class="nd-item nd-bh pm" data-k="bahas"><div class="nd-ih"><span class="nd-n">${i+1}.</span><input class="nd-f nd-b" value="${esc(x.judul)}" maxlength="150" placeholder="Judul tabel" oninput="msItem('bahas','${x.id}','judul',this.value)">${del('bahas',x.id)}</div><div class="nd-ind">${ndPmdEd(x)}${ndText(x.hasil)?ita('bahas',x.id,'hasil',x.hasil,'Catatan…'):''}</div></div>`
  :`<div class="nd-item nd-bh" data-k="bahas"><div class="nd-ih"><span class="nd-n">${i+1}.</span><div class="nd-f nd-rt nd-bhx" contenteditable="true" data-id="${x.id}" data-ph="Tulis hasil pembahasan…" onpaste="ndPaste(event)" onkeydown="bhKey(event)" oninput="msItemR('bahas','${x.id}','hasil',this)">${ndUnpack(x.hasil)}</div>${del('bahas',x.id)}</div></div>`;
 const bahas=lb(3,'bahas','Pembahasan')+'<datalist id="ndKelasList">'+PMD_KELAS.map(n=>`<option value="${n}">`).join('')+'</datalist><datalist id="ndPenList">'+penNames().map(n=>`<option value="${esc(n)}">`).join('')+'</datalist>'+d.bahas.map(bhRow).join('')
  +(d.bahas.length?'':'<p class="nd-empty">Belum ada hasil pembahasan. Klik tombol di bawah untuk mulai menulis.</p>')
  +`<div class="nd-adds"><button type="button" class="nd-add main" onclick="msAdd('bahas')">${icon('plus','w-3.5 h-3.5')} Tambah hasil pembahasan</button></div>`
  +(d.bahas.length?'<p class="nd-hint">Selesai mengetik? Klik “Tambah hasil pembahasan” atau tekan Ctrl + Enter untuk menulis hasil berikutnya.</p>':'');

 const penutup=lb(4,'penutup','Penutup')+ta('penutup.isi',d.penutup.isi,'Tulis penutup / kesimpulan musyawarah…')+`<div class="nd-row mt"><span class="nd-lab">Doa penutup dipimpin oleh</span><input class="nd-f nd-b" value="${esc(d.penutup.doa)}" maxlength="120" placeholder="Nama pemimpin doa" oninput="msSet('penutup.doa',this.value)"></div>`;

 const hd=ndHadir(d);
 const hadir=lb(5,'hadir','Daftar Hadir')+(hd?`<div class="nd-doc nd-inl">${hd}</div>`:`<p class="nd-empty">Belum ada link absensi. Buat di panel <b>Absensi &amp; Link Kehadiran</b> di bawah halaman, lalu daftar hadir akan tampil di sini.</p>`);

 const sig=`<div class="nd-sig"><div><p>Mengetahui,</p><p class="t">Ketua Musyawarah</p><div class="sp"></div><input class="nd-f nd-c" value="${esc(d.ttd.ketua)}" maxlength="80" placeholder="Nama terang" oninput="msSet('ttd.ketua',this.value)"></div><div><p>${esc(d.tempat?d.tempat.split(',')[0]:'Karangmojo')}, ${esc(new Date(d.tgl+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}))}</p><p class="t">Notulis</p><div class="sp"></div><input class="nd-f nd-c" value="${esc(d.ttd.notulis)}" maxlength="80" placeholder="Nama terang" oninput="msSet('ttd.notulis',this.value)"></div></div>`;

 return cover+nasehat+info+evaluasi+bahas+penutup+hadir+sig+'<div class="nd-ft">SIMDEKA • Sistem Informasi dan Manajemen Desa Karangmojo</div>';
}

function msBook(){
 const d=MS_UI.d;if(!d)return;
 d.ttd=d.ttd||{ketua:'',notulis:''};
 const c0=document.querySelector('.nd-canvas'),top=c0?c0.scrollTop:0,z=MS_UI.z||1;
 fmEl('modalTitle').textContent='Buku Notulensi';
 fmEl('modalDesc').textContent=fmDateLong(d.tgl)+(d.tempat?' • '+d.tempat:'');
 fmEl('modalBody').innerHTML=`<div class="nd-app">
  <div class="nd-bar">
   <button type="button" class="nd-back" onclick="msBack()">${icon('arrow-left','w-4 h-4')}<span class="nd-lbl">Kembali</span></button><span class="nd-ic">${icon('file-text','w-5 h-5')}</span>
   <div class="min-w-0"><div class="nd-name">Notulensi Musyawarah</div><div class="nd-sub"><span id="msState">${msGet(d.tgl)?'Tersimpan otomatis':'Belum disimpan'}</span> • ${esc(fmDateLong(d.tgl))}</div></div>
   <div class="nd-acts">
    <div class="nd-zoom"><button type="button" onclick="ndZoom(-0.1)" aria-label="Perkecil">−</button><span id="ndZ">${Math.round(z*100)}%</span><button type="button" onclick="ndZoom(0.1)" aria-label="Perbesar">+</button></div>
    <button type="button" class="u-btn danger icon" onclick="msDelete()" ${msGet(d.tgl)?'':'disabled'} title="Hapus notulensi" aria-label="Hapus">${icon('trash-2','w-4 h-4')}</button>
    <button type="button" class="u-btn" onclick="msPrint()">${icon('printer','w-4 h-4')}<span class="nd-lbl">Cetak</span></button>
    <button type="button" class="u-btn nd-pdf" onclick="msPdf()">${icon('file-down','w-4 h-4')}<span>Unduh PDF</span></button>
    <button type="button" class="u-btn primary" onclick="msPersist();showToast('Notulensi disimpan')">${icon('save','w-4 h-4')}<span class="nd-lbl">Simpan</span></button>
    
   </div>
  </div>
  ${ndToolbar(d)}
  <div class="nd-canvas"><div class="nd-paper" style="zoom:${z};font-family:${ndFam(d.font)}">${ndPaper(d)}</div>${msAbsenPanel(d)}</div>
 </div>`;
 lucide.createIcons();
 const c=document.querySelector('.nd-canvas');if(c)c.scrollTop=top;
 ndGrowAll();setTimeout(ndGrowAll,60);
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(ndGrowAll);
}

/* ---------- dokumen untuk cetak & PDF ---------- */
const ND_CSS=`
.nd-doc{font-family:'Lora',Georgia,'Times New Roman',serif;font-size:13px;line-height:1.7;color:#1f2937;background:#fff;width:100%}
.nd-doc *{box-sizing:border-box}
.nd-doc .cv{text-align:center;margin-bottom:4px}
.nd-doc .k{letter-spacing:.34em;text-transform:uppercase;font-size:10px;font-weight:700;color:#B8893B;font-family:'Plus Jakarta Sans',Arial,sans-serif}
.nd-doc h1{font-size:25px;line-height:1.25;margin:8px 0 10px;color:#173B70;font-weight:700}
.nd-doc .rl{height:4px;border-top:2.5px solid #173B70;border-bottom:1px solid #B8893B;margin:6px 0 14px}
.nd-doc table.mt{width:100%;border-collapse:collapse;font-size:12.5px;text-align:left}
.nd-doc table.mt td{padding:3px 0;vertical-align:top;border:0}
.nd-doc table.mt td.l{width:130px;color:#64748b;font:600 10.5px 'Plus Jakarta Sans',Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;padding-top:5px}
.nd-doc table.mt td.c{width:14px}
.nd-doc table.mt td.v{font-weight:600}
.nd-doc h2{display:flex;align-items:baseline;gap:10px;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:#173B70;margin:24px 0 10px;padding-bottom:6px;border-bottom:1px solid #d9dfeb;font-weight:700;break-after:avoid;page-break-after:avoid}
.nd-doc h2 .rn{color:#B8893B;min-width:22px}
.nd-doc h2 small{font-weight:500;letter-spacing:0;text-transform:none;color:#94a3b8;font-size:11px;margin-left:auto}
.nd-doc .it{margin:10px 0;break-inside:avoid;page-break-inside:avoid}
.nd-doc .it b{color:#111827}
.nd-doc .it p,.nd-doc p.tx,.nd-doc div.tx{margin:2px 0 0;text-align:justify}
.nd-doc .tx table{border-collapse:collapse;width:100%;margin:6px 0;table-layout:fixed}
.nd-doc .tx td,.nd-doc .tx th{border:1px solid #64748b;padding:3px 6px;vertical-align:top;text-align:left}
.nd-doc .tx ul,.nd-doc .tx ol{margin:3px 0;padding-left:20px}
.nd-doc .it.pm{break-inside:auto;page-break-inside:auto}
.nd-doc .pk{margin:8px 0 12px}
.nd-doc .pkh{font:700 12px 'Plus Jakarta Sans',Arial,sans-serif;color:#173B70;margin-bottom:3px}
.nd-doc .pkh span{font-weight:500;color:#475569}
.nd-doc .po{font-size:10.5px;color:#475569}
.nd-doc .tag{font:700 8.5px 'Plus Jakarta Sans',Arial,sans-serif;padding:2px 8px;border-radius:99px;background:#e8f5ee;color:#166534;letter-spacing:.07em;text-transform:uppercase;margin-left:6px;vertical-align:2px}
.nd-doc .tag.dr{background:#f1ebfd;color:#6d28d9}
.nd-doc .res{border-left:3px solid #B8893B;background:#fbf7ef;padding:6px 12px;margin:6px 0;font-size:12.5px;break-inside:avoid}
.nd-doc .m{font-size:12px;color:#475569}
.nd-doc .em{color:#94a3b8;font-style:italic}
.nd-doc .sum{font-size:12px;color:#475569;margin:0 0 6px}
.nd-doc table.tb{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:6px;text-align:left}
.nd-doc table.tb th{background:#173B70;color:#fff;padding:6px 8px;font:700 10px 'Plus Jakarta Sans',Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;text-align:left}
.nd-doc table.tb td{padding:5px 8px;border-bottom:1px solid #e3e8f1}
.nd-doc table.tb tr:nth-child(even) td{background:#f8fafc}
.nd-doc table.tb tr{break-inside:avoid;page-break-inside:avoid}
.nd-doc .sh{color:#15803d;font-weight:700}.nd-doc .si{color:#b45309;font-weight:700}.nd-doc .sa{color:#b91c1c;font-weight:700}
.nd-doc .sig{display:flex;justify-content:space-between;margin-top:36px;text-align:center;break-inside:avoid;page-break-inside:avoid}
.nd-doc .sig>div{width:44%}
.nd-doc .sig p{margin:0}
.nd-doc .sig .t{font-weight:700}
.nd-doc .sig .sp{height:72px}
.nd-doc .sig .nm{border-top:1px solid #1f2937;padding-top:4px;font-weight:700;min-height:24px}
.nd-doc .ft{margin-top:28px;text-align:center;font:500 9.5px 'Plus Jakarta Sans',Arial,sans-serif;color:#94a3b8;letter-spacing:.04em}
/* tampilan bersih seperti Word */
.nd-doc{font-size:13.5px;line-height:1.55;color:#000}
.nd-doc .k{letter-spacing:.08em;color:#000;font-family:inherit;font-weight:700;font-size:12.5px}
.nd-doc h1{color:#000;font-size:20px}
.nd-doc .rl{height:3px;border-top:2px solid #000;border-bottom:.5px solid #000}
.nd-doc table.mt td.l{color:#000;font-family:inherit;font-size:12.5px;letter-spacing:0;text-transform:none;font-weight:400;padding-top:3px}
.nd-doc table.mt td.v{font-weight:400}
.nd-doc h2{letter-spacing:0;text-transform:none;color:#000;border-bottom:0;font-size:13.5px;margin:18px 0 6px;gap:6px}
.nd-doc h2 .rn{color:#000}
.nd-doc h2 .rn::after{content:'.'}
.nd-doc h2 small{color:#555;font-size:11px;font-family:inherit}
.nd-doc .it b{color:#000}
.nd-doc .it.bh{break-inside:auto;page-break-inside:auto}
.nd-doc table.nl{width:100%;border-collapse:collapse;margin:0}
.nd-doc table.nl td{padding:0;border:0;vertical-align:top;text-align:left}
.nd-doc table.nl td.n{width:26px}
.nd-doc .tag,.nd-doc .tag.dr{background:#eee;color:#222;font-family:inherit;letter-spacing:0;text-transform:none;font-size:9.5px}
.nd-doc .res{border-left:0;background:none;padding:0}
.nd-doc .pkh{color:#000;font-family:inherit}
.nd-doc .m,.nd-doc .sum,.nd-doc .po{color:#222}
.nd-doc table.tb th{background:#f2f2f2;color:#000;font-family:inherit;text-transform:none;letter-spacing:0;font-size:11.5px;border:1px solid #999}
.nd-doc table.tb td{border:1px solid #999}
.nd-doc table.tb tr:nth-child(even) td{background:#fff}
.nd-doc .sh,.nd-doc .si,.nd-doc .sa{color:#000}
.nd-doc .ft{color:#777}
.nd-doc h2{border-bottom:1px solid #cfcfcf;padding-bottom:4px}
.nd-doc .tx ul{list-style:disc}.nd-doc .tx ol{list-style:decimal}
`;
(function(){const s=document.createElement('style');s.id='ndDocCss';s.textContent=ND_CSS;document.head.appendChild(s);})();

function msDocHtml(d){
 const pi=msPrev(d.tgl),pd=pi?msGet(pi):null,items=bhEvalItems(pd),j=msJumlah(d);
 const P=t=>ndOut(t)||'<span class="em">—</span>';
 const sec=(n,t,b,sub)=>`<h2><span class="rn">${ND_ROM[n]}</span><span>${t}</span>${sub?`<small>${sub}</small>`:''}</h2>${b}`;
 const tag=a=>`<span class="tag${a==='Daerah'?' dr':''}">${esc(a)}</span>`;
 const info=d.info.length?d.info.map((x,i)=>`<div class="it"><b>${i+1}. ${esc(x.judul||'-')}</b>${tag(x.asal)}<div class="tx">${P(x.isi)}</div></div>`).join(''):'<p class="em">Tidak ada informasi.</p>';
 const nl=(n,inner)=>`<table class="nl"><tr><td class="n">${n}.</td><td>${inner}</td></tr></table>`;
 const ev=items.length?items.map((b,i)=>{const e=d.evalSt[b.id]||{};return `<div class="it bh">${nl(i+1,`<div class="tx">${bhHtml(b)}</div><p class="m">Status: <b>${esc(e.st||'-')}</b>${e.cat?' — '+esc(e.cat):''}</p>`)}</div>`;}).join(''):'<p class="em">Tidak ada poin evaluasi.</p>';
 const bhL=d.bahas.filter(b=>b.tipe==='pmd'||bhHtml(b));
 const bh=bhL.length?bhL.map((b,i)=>b.tipe==='pmd'
  ?`<div class="it pm"><b>${i+1}. ${esc(b.judul||'-')}</b>${pmdDocHtml(b)}${ndText(b.hasil)?`<div class="tx">${P(b.hasil)}</div>`:''}</div>`
  :`<div class="it bh">${nl(i+1,`<div class="tx">${bhHtml(b)}</div>`)}</div>`).join(''):'<p class="em">Tidak ada pembahasan.</p>';
 const hd=ndHadir(d);
 const tt=d.ttd||{},tgl=new Date(d.tgl+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
 const waktu=d.jam||d.penutup.selesai?`Pukul ${esc(d.jam||'—')} s.d. ${esc(d.penutup.selesai||'selesai')} WIB`:'—';
 return `<div class="nd-doc" style="font-family:${ndFam(d.font)}">
 <div class="cv"><div class="k">Notulensi Musyawarah</div><h1>${esc(d.judul)}</h1><div class="rl"></div>
 <table class="mt"><tr><td class="l">Hari / Tanggal</td><td class="c">:</td><td class="v">${esc(fmDateLong(d.tgl))}</td></tr>
 <tr><td class="l">Tempat</td><td class="c">:</td><td class="v">${esc(d.tempat||'-')}</td></tr>
 <tr><td class="l">Waktu</td><td class="c">:</td><td class="v">${waktu}</td></tr>
 <tr><td class="l">Jumlah Peserta</td><td class="c">:</td><td class="v">${j==null?'-':j} orang</td></tr></table></div>
 ${sec(0,'Nasehat Pembuka',`<p class="m">Disampaikan oleh: <b>${esc(d.nasehat.oleh||'-')}</b></p><div class="tx">${P(d.nasehat.isi)}</div>`)}
 ${sec(1,'Informasi Desa dan Daerah',info)}
 ${sec(2,'Evaluasi Musyawarah Bulan Lalu',ev,pd?'dari '+esc(fmDateLong(pi)):'')}
 ${sec(3,'Pembahasan',bh)}
 ${sec(4,'Penutup',`<div class="tx">${P(d.penutup.isi)}</div><p class="m">Doa penutup dipimpin oleh <b>${esc(d.penutup.doa||'-')}</b>${d.penutup.selesai?' • Selesai pukul '+esc(d.penutup.selesai)+' WIB':''}</p>`)}
 ${hd?sec(5,'Daftar Hadir',hd):''}
 <div class="sig"><div><p>Mengetahui,</p><p class="t">Ketua Musyawarah</p><div class="sp"></div><div class="nm">${esc(tt.ketua||'')}</div></div><div><p>${esc(d.tempat?d.tempat.split(',')[0]:'Karangmojo')}, ${esc(tgl)}</p><p class="t">Notulis</p><div class="sp"></div><div class="nm">${esc(tt.notulis||'')}</div></div></div>
 <div class="ft">SIMDEKA • Sistem Informasi dan Manajemen Desa Karangmojo</div>
 </div>`;
}
function msFileName(d){return 'Notulensi-'+String(d.judul||'Musyawarah').replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-')+'-'+d.tgl+'.pdf';}

/* ---------- cetak ---------- */
function msPrint(){
 const d=MS_UI.d;if(!d)return;
 if(MS_UI.t)msPersist();
 const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(msFileName(d).replace(/\.pdf$/,''))}</title>
 <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
 <style>@page{size:A4;margin:16mm 16mm 18mm}body{margin:0;padding:0 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.nd-doc{max-width:760px;margin:20px auto}${ND_CSS}@media print{.nd-doc{margin:0;max-width:none}}</style></head><body>${msDocHtml(d)}
 <script>window.onload=function(){(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(function(){window.print();},200);});};<\/script></body></html>`;
 const w=window.open('','_blank');if(!w){showToast('Izinkan pop-up untuk mencetak');return;}
 w.document.open();w.document.write(html);w.document.close();
}

/* ---------- unduh PDF ---------- */
function msLoadPdfLib(){
 return new Promise((res,rej)=>{
  if(window.html2pdf)return res();
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  s.onload=()=>window.html2pdf?res():rej(new Error('lib'));s.onerror=()=>rej(new Error('lib'));
  document.head.appendChild(s);
 });
}
async function msPdf(){
 const d=MS_UI.d;if(!d)return;
 if(MS_UI.t)msPersist();
 showToast('Menyiapkan PDF…');
 try{await msLoadPdfLib();}catch(e){showToast('Pustaka PDF gagal dimuat (butuh internet). Membuka dialog cetak — pilih “Simpan sebagai PDF”.');msPrint();return;}
 const host=document.createElement('div');
 host.style.cssText='position:fixed;left:-10000px;top:0;width:720px;background:#fff';
 host.innerHTML=msDocHtml(d);document.body.appendChild(host);
 try{
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  const title=d.judul||'Notulensi Musyawarah';
  await html2pdf().set({
   margin:[16,16,20,16],filename:msFileName(d),image:{type:'jpeg',quality:.98},
   html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',scrollY:0},
   jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
   pagebreak:{mode:['css','legacy'],avoid:['.it','tr','h2','.sig','.res']}
  }).from(host.querySelector('.nd-doc')).toPdf().get('pdf').then(pdf=>{
   const n=pdf.internal.getNumberOfPages(),w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight();
   for(let i=1;i<=n;i++){
    pdf.setPage(i);pdf.setDrawColor(217,223,235);pdf.setLineWidth(.2);pdf.line(16,h-14,w-16,h-14);
    pdf.setFontSize(8);pdf.setTextColor(120,130,150);
    pdf.text(String(title).slice(0,70),16,h-9.5);
    pdf.text('Halaman '+i+' dari '+n,w-16,h-9.5,{align:'right'});
   }
  }).save();
  showToast('PDF diunduh');
 }catch(e){console.error(e);showToast('Gagal membuat PDF. Coba tombol Cetak lalu simpan sebagai PDF.');}
 finally{host.remove();}
}

const _fr=fmRoute(), _ur=upRoute();
if(_ur) upBoot(_ur); else if(_fr) fmBootPublic(_fr); else if(/^\/desa\/jurnal\/[a-z]+\d{4}\/?$/.test(location.pathname)){location.replace('/f/jdesa'+location.pathname.split('/')[3]);} else if(/^\/(kelompok|desa|daerah)\/[a-z]+\d{4}\/?$/.test(location.pathname)){const _p=location.pathname.split('/');location.replace('/f/'+_p[1]+_p[2]);} else if(/^\/musdes\/\d{8}\/?$/.test(location.pathname)){location.replace('/f/musdes'+location.pathname.split('/')[2]);} else if(/^\/f\/[^/]/.test(location.pathname)||location.pathname==='/form.html'){/* form publik: ditangani js/forms-server.js */} else if(window.SIMDEKA_PAGE!=='admin'){location.replace('/login/');} else fetch('/api/me').then(r=>r.ok?r.json():null).then(j=>{if(j&&j.user){window.ME=j.user;if(j.user.must_change)showForceChange();else showApp();}else{location.replace('/login/');}}).catch(()=>{document.body.insertAdjacentHTML('beforeend','<div style="position:fixed;inset:0;display:grid;place-items:center;background:#fff;z-index:300;font:600 14px system-ui;color:#334155;padding:24px;text-align:center">Tidak dapat terhubung ke server. Muat ulang halaman.</div>');});

;

/* ===== Peningkatan UI: dropdown seragam, menu Lainnya, pemilih tanggal ===== */
(function(){
 const e2=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fine=()=>!!(window.matchMedia&&matchMedia('(pointer:fine)').matches);
 const CHK='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
 const canEnh=s=>s&&!s.disabled&&!s.multiple&&!(s.size>1)&&!s.closest('#publicForm')&&!s.hasAttribute('data-native');
 const pop=document.createElement('div'); pop.className='ux-pop hidden'; pop.setAttribute('role','listbox'); document.body.appendChild(pop);
 let cur=null,hl=-1;
 function close(){ if(cur)cur.classList.remove('ux-open'); cur=null; hl=-1; pop.classList.add('hidden'); pop.innerHTML=''; }
 function setHl(i){ const it=pop.querySelectorAll('.ux-opt'); it.forEach(x=>x.classList.remove('hl')); if(it[i]){hl=i;it[i].classList.add('hl');it[i].scrollIntoView({block:'nearest'});} }
 function pick(i){
  const s=cur; if(!s)return; const o=s.options[i]; if(!o||o.disabled)return;
  close();
  if(s.selectedIndex!==i){ s.selectedIndex=i; s.dispatchEvent(new Event('input',{bubbles:true})); s.dispatchEvent(new Event('change',{bubbles:true})); }
  try{s.focus({preventScroll:true});}catch(_){}
 }
 function open(s){
  close(); cur=s; s.classList.add('ux-open');
  pop.innerHTML=[...s.options].map((o,i)=>{const on=i===s.selectedIndex;return `<button type="button" role="option" aria-selected="${on}" data-i="${i}" class="ux-opt${on?' on':''}${o.value===''&&i===0?' ph':''}"${o.disabled?' disabled':''}><span>${e2(o.textContent)}</span>${on?CHK:''}</button>`;}).join('');
  pop.classList.remove('hidden');
  const r=s.getBoundingClientRect(),vw=innerWidth,vh=innerHeight;
  pop.style.minWidth=Math.max(r.width,190)+'px'; pop.style.maxWidth=Math.min(360,vw-16)+'px'; pop.style.maxHeight=Math.min(300,vh-24)+'px'; pop.style.left='0px'; pop.style.top='0px';
  const h=pop.offsetHeight,pw=pop.offsetWidth;
  let top=r.bottom+6; if(top+h>vh-8&&r.top-h-6>8)top=r.top-h-6; if(top+h>vh-8)top=Math.max(8,vh-h-8);
  let left=r.left; if(left+pw>vw-8)left=Math.max(8,vw-pw-8);
  pop.style.top=top+'px'; pop.style.left=left+'px';
  setHl(s.selectedIndex);
 }
 document.addEventListener('mousedown',e=>{
  const s=e.target.closest&&e.target.closest('select');
  if(s&&fine()&&canEnh(s)){ e.preventDefault(); try{s.focus({preventScroll:true});}catch(_){} cur===s?close():open(s); return; }
  if(cur&&!pop.contains(e.target))close();
 },true);
 pop.addEventListener('mousedown',e=>{ e.preventDefault(); const b=e.target.closest('.ux-opt'); if(b)pick(+b.dataset.i); });
 document.addEventListener('keydown',e=>{
  if(cur){
   const n=pop.querySelectorAll('.ux-opt').length;
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();const s=cur;close();try{s.focus();}catch(_){}return;}
   if(e.key==='ArrowDown'){e.preventDefault();setHl(Math.min(n-1,hl+1));return;}
   if(e.key==='ArrowUp'){e.preventDefault();setHl(Math.max(0,hl-1));return;}
   if(e.key==='Home'){e.preventDefault();setHl(0);return;}
   if(e.key==='End'){e.preventDefault();setHl(n-1);return;}
   if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(hl);return;}
   if(e.key==='Tab')close();
   return;
  }
  const a=document.activeElement;
  if(a&&a.tagName==='SELECT'&&fine()&&canEnh(a)&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(a);return;}
  if(e.key==='Escape')document.querySelectorAll('details.u-menu[open]').forEach(d=>{d.open=false;});
 },true);
 addEventListener('scroll',e=>{ if(cur&&!pop.contains(e.target))close(); },true);
 addEventListener('resize',close);
 document.addEventListener('click',e=>{
  document.querySelectorAll('details.u-menu[open]').forEach(d=>{ if(!d.contains(e.target)||e.target.closest('.u-menu-i'))d.open=false; });
  const di=e.target.closest&&e.target.closest('input[type=date]:not(.gf-ul)');
  if(di&&di.showPicker&&!di.disabled&&!di.readOnly){ try{di.showPicker();}catch(_){} }
 });
})();

;

/* Menu "Lainnya": panel diposisikan ulang agar selalu muat di layar (mobile) */
(function(){
 function place(panel,anchor){
  if(!panel||!anchor)return;
  var r=anchor.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=window.innerHeight;
  panel.style.position='fixed';panel.style.right='auto';panel.style.bottom='auto';
  panel.style.maxWidth=(vw-16)+'px';panel.style.maxHeight=(vh-16)+'px';panel.style.overflowY='auto';
  panel.style.left='0px';panel.style.top='0px';
  var w=panel.offsetWidth,h=panel.offsetHeight;
  var left=Math.min(r.right-w,vw-w-8);left=Math.max(8,left);
  var top=r.bottom+6;
  if(top+h>vh-8&&r.top-h-6>8)top=r.top-h-6;
  if(top+h>vh-8)top=Math.max(8,vh-h-8);
  panel.style.left=left+'px';panel.style.top=top+'px';
 }
 document.addEventListener('toggle',function(e){
  var d=e.target;
  if(d&&d.matches&&d.matches('details.u-menu')&&d.open)place(d.querySelector('.u-menu-p'),d.querySelector('summary'));
 },true);
 window.uxToggleUpMenu=function(){
  var m=document.getElementById('upMenu');if(!m)return;
  m.classList.toggle('hidden');
  if(!m.classList.contains('hidden'))place(m,m.parentNode.firstElementChild);
 };
 function closeAll(e){
  if(e&&e.target&&e.target.closest&&e.target.closest('.u-menu-p,#upMenu'))return;
  document.querySelectorAll('details.u-menu[open]').forEach(function(d){d.open=false;});
  var m=document.getElementById('upMenu');if(m)m.classList.add('hidden');
 }
 addEventListener('scroll',closeAll,true);
 addEventListener('resize',function(){closeAll();});
})();

;

function showForceChange(){
 loginEl('loginScreen').classList.add('hidden');loginEl('app').classList.add('hidden');
 loginEl('forceChange').classList.remove('hidden');loginEl('fcNama').focus();
}
loginEl('fcForm').onsubmit=async function(e){
 e.preventDefault();
 const err=loginEl('fcErr'),bad=m=>{err.textContent=m;err.classList.remove('hidden');};
 err.classList.add('hidden');
 const nama=loginEl('fcNama').value.trim(),username=loginEl('fcUser').value.trim().toLowerCase(),a=loginEl('fcPass').value,b=loginEl('fcPass2').value;
 if(!nama)return bad('Nama akun wajib diisi.');
 if(!/^[a-z0-9._-]{3,32}$/.test(username))return bad('Username 3-32 karakter: huruf kecil, angka, titik, strip, garis bawah.');
 if(a.length<8)return bad('Kata sandi baru minimal 8 karakter.');
 if(a!==b)return bad('Ulangi kata sandi belum sama.');
 try{
  const r=await fetch('/api/me',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({nama:nama,username:username,baru:a})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)return bad(j.error||'Gagal menyimpan.');
  location.reload();
 }catch(x){bad('Tidak dapat terhubung ke server.');}
};

