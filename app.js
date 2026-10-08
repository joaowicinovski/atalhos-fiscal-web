'use strict';
(() => {
  const elements = Object.fromEntries(['search','category','favorites','message-list','count','message-title','message-meta','message-keywords','message-preview','copy','copy-hint','refresh','theme','sync-status','statusdot'].map(id => [id, document.getElementById(id)]));
  let messages = [];
  let selected = null;
  const $ = elements;
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const markup = value => escapeHtml(value)
    .replace(/```([\s\S]*?)```/g, '<code>$1</code>')
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .replace(/_([^_\n]+)_/g, '<i>$1</i>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/\n/g, '<br>');
  const sortByTitle = (a,b) => a.title.localeCompare(b.title,'pt-BR',{sensitivity:'base'});
  const RAW_DATA_URL = 'https://raw.githubusercontent.com/joaowicinovski/atalhos-fiscal-web/main/data/messages.json';
  const PAGES_DATA_URL = './data/messages.json';

  const getFiltered = () => {
    const terms = normalize($.search.value).split(' ').filter(Boolean);
    const category = $.category.value;
    const onlyFav = $.favorites.checked;
    return messages.filter(message => {
      if(category && message.category !== category) return false;
      if(onlyFav && !message.favorite) return false;
      const hay = normalize([message.title, message.category, ...(message.keywords || []), message.text].join(' '));
      return terms.every(term => hay.includes(term));
    });
  };
  function showDetail(message) {
    selected = message || null;
    $.copy.disabled = !message;
    if(!message){
      $['message-title'].textContent='Nenhuma mensagem encontrada';
      $['message-meta'].textContent='';
      $['message-keywords'].textContent='';
      $['message-preview'].textContent='Altere a busca ou o filtro para encontrar uma mensagem.';
      return;
    }
    $['message-title'].textContent=(message.favorite?'★ ':'') + message.title;
    $['message-meta'].textContent=`${message.category || 'Sem categoria'} • Atualizada: ${message.updated_at ? message.updated_at.replace('T',' ').slice(0,19) : '—'}`;
    $['message-keywords'].textContent=`Palavras-chave: ${message.keywords?.length ? message.keywords.join(', ') : '—'}`;
    $['message-preview'].innerHTML=markup(message.text);
  }
  function render() {
    const filtered = getFiltered();
    $.count.textContent=`${filtered.length} ${filtered.length===1?'mensagem':'mensagens'}`;
    $['message-list'].replaceChildren();
    const previousId=selected?.id;
    const next=filtered.find(m=>m.id===previousId) || filtered[0] || null;
    const frag=document.createDocumentFragment();
    filtered.forEach(message=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='message-item'+(next?.id===message.id?' active':'');
      btn.setAttribute('role','option');
      btn.setAttribute('aria-selected',String(next?.id===message.id));
      btn.textContent=(message.favorite?'★ ':'')+message.title;
      btn.addEventListener('click',()=>{
        showDetail(message);
        $['message-list'].querySelectorAll('.message-item').forEach(el=>{const active=el===btn;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});
      });
      frag.append(btn);
    });
    if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='Nenhuma mensagem encontrada.';frag.append(p);}
    $['message-list'].append(frag);
    showDetail(next);
  }
  async function refreshCategories() {
    const prior=$.category.value;
    $.category.replaceChildren();
    const all=document.createElement('option');all.value='';all.textContent='Todas as categorias';$.category.append(all);
    const categories=[...new Set(messages.map(m=>m.category || 'Sem categoria'))].sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'}));
    categories.forEach(cat=>{const opt=document.createElement('option');opt.textContent=cat;opt.value=cat;$.category.append(opt);});
    $.category.value=categories.includes(prior)?prior:'';
  }
  async function fetchDataSource(baseUrl, sourceName) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const response = await fetch(baseUrl + separator + 'v=' + Date.now(), {
      cache: 'no-store',
      headers: {'Accept':'application/json'}
    });
    if(!response.ok) throw new Error(`${sourceName}: HTTP ${response.status}`);
    const data = await response.json();
    if(!Array.isArray(data.messages)) throw new Error(`${sourceName}: formato inesperado`);
    return {data, sourceName};
  }
  async function loadData(manual=false) {
    const text=$['sync-status'];
    if(manual) text.textContent='Verificando publicação...';
    try {
      let result;
      try {
        result = await fetchDataSource(RAW_DATA_URL, 'GitHub');
      } catch(rawError) {
        console.warn('Leitura direta do GitHub falhou; usando GitHub Pages como fallback.', rawError);
        result = await fetchDataSource(PAGES_DATA_URL, 'GitHub Pages');
      }
      const data=result.data;
      const clean=data.messages.filter(m=>m && !m.deleted && typeof m.id==='string' && typeof m.title==='string' && typeof m.text==='string').map(m=>({
        id:m.id,title:m.title,category:typeof m.category==='string'?m.category:'Sem categoria',
        keywords:Array.isArray(m.keywords)?m.keywords.filter(v=>typeof v==='string'):[],
        text:m.text,favorite:!!m.favorite,updated_at:typeof m.updated_at==='string'?m.updated_at:''
      })).sort(sortByTitle);
      const fingerprint=JSON.stringify(clean);
      if(fingerprint!==JSON.stringify(messages)) {messages=clean;await refreshCategories();render();}
      $.statusdot.className='statusdot ok';
      const updated = data.generated_at ? ' • '+String(data.generated_at).replace('T',' ').slice(0,16) : '';
      text.textContent=`Dados atualizados${updated}`;
      text.title=`Fonte: ${result.sourceName}`;
    } catch(err) {
      $.statusdot.className='statusdot error';
      text.textContent=messages.length?'Sem atualização • mostrando a última versão carregada':'Não foi possível carregar as mensagens';
      if(!messages.length) render();
      console.error('Falha ao carregar a versão pública:',err);
    }
  }
  async function copyCurrent() {
    if(!selected) return;
    const content=selected.text;
    try {
      if(navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(content);
      else {
        const area=document.createElement('textarea');area.value=content;area.style.position='fixed';area.style.left='-9999px';
        document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();if(!ok) throw new Error('Clipboard indisponível');
      }
      $['copy-hint'].textContent='Mensagem copiada. Cole no WhatsApp.';
    } catch(err){
      $['copy-hint'].textContent='Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.';
      console.error(err);
    }
  }
  function applyTheme(mode){
    document.documentElement.dataset.theme=mode;
    $.theme.textContent=mode==='light'?'☾':'☀';
    $.theme.title=mode==='light'?'Ativar modo escuro':'Ativar modo claro';
    try{localStorage.setItem('atalhos-fiscal-theme',mode);}catch(_e){}
  }
  $.search.addEventListener('input',render);
  $.category.addEventListener('change',render);
  $.favorites.addEventListener('change',render);
  $.refresh.addEventListener('click',()=>loadData(true));
  $.copy.addEventListener('click',copyCurrent);
  $.theme.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='light'?'dark':'light'));
  let savedTheme='dark';try{savedTheme=localStorage.getItem('atalhos-fiscal-theme')||'dark';}catch(_e){}
  applyTheme(savedTheme);
  loadData();
  setInterval(()=>{if(!document.hidden) loadData();},30000);
})();
