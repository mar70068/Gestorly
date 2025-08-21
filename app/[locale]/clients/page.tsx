'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import { useTranslations } from 'next-intl';

const API_BASE = '/api';

export default function ClientsPage(){
  const t = useTranslations();
  const [token,setToken] = useState<string>('');
  const [clients,setClients] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const [newClient,setNewClient] = useState({ display_name:'', tax_id:'', country:'ES' });
  const [selectedClient,setSelectedClient] = useState<string>('');
  const [file,setFile] = useState<File|null>(null);
  const [type,setType] = useState('factura');
  const [period,setPeriod] = useState('2025-08');

  useEffect(()=>{
    supabaseBrowser.auth.getSession().then(({data})=>{
      setToken(data.session?.access_token || '');
    });
  },[]);

  async function authedFetch(url:string, init?:RequestInit){
    const res = await fetch(url, { ...(init||{}), headers: { ...(init?.headers||{}), 'authorization': `Bearer ${token}` }});
    if(!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function load(){
    setLoading(true);
    try{
      const data = await authedFetch(`${API_BASE}/clients`);
      setClients(data.data || []);
    } finally{ setLoading(false); }
  }

  async function create(){
    await authedFetch(`${API_BASE}/clients`, { method:'POST', body: JSON.stringify(newClient), headers: {'content-type':'application/json'} });
    setNewClient({ display_name:'', tax_id:'', country:'ES' });
    await load();
  }

  async function upload(){
    if(!file || !selectedClient) return alert('Selecciona cliente y archivo');
    // 1) Ask server for signed upload url
    const req = await authedFetch(`${API_BASE}/clients/${selectedClient}/documents`, {
      method:'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ filename: file.name, mime: file.type, size: file.size, type, period })
    });
    const { upload, document_id } = req.data;
    // 2) PUT file to signed url
    const put = await fetch(upload.signedUrl, { method:'PUT', headers:{ 'content-type': file.type || 'application/octet-stream' }, body: file });
    if(!put.ok) throw new Error('Storage upload failed');
    alert('Documento subido: '+document_id);
  }

  return (
    <div className="card">
      <div className="header">
        <h1>{t('clients.title')}</h1>
        <span className="small">{loading ? 'Cargando…' : ''}</span>
      </div>

      <div className="row">
        <div>
          <button className="btn" onClick={load} disabled={!token}>{t('action.load')}</button>
          <ul>
            {clients.map(c => (
              <li key={c.id} style={{margin:'8px 0', padding:'8px', border:'1px solid #eee', borderRadius:8}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><strong>{c.display_name}</strong> <span className="small">{c.tax_id} · {c.country}</span></div>
                  <button className="badge" onClick={()=>setSelectedClient(c.id)}>Seleccionar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>{t('clients.new')}</h3>
          <div className="row">
            <input className="input" placeholder={t('clients.name')} value={newClient.display_name} onChange={e=>setNewClient({...newClient, display_name:e.target.value})}/>
            <input className="input" placeholder={t('clients.taxid')} value={newClient.tax_id||''} onChange={e=>setNewClient({...newClient, tax_id:e.target.value})}/>
          </div>
          <div className="row" style={{marginTop:8}}>
            <input className="input" placeholder={t('clients.country')} value={newClient.country} onChange={e=>setNewClient({...newClient, country:e.target.value})}/>
            <button className="btn" onClick={create} disabled={!token}>{t('action.create')}</button>
          </div>

          <hr />
          <h3>{t('documents.upload')}</h3>
          <select className="input" value={selectedClient} onChange={e=>setSelectedClient(e.target.value)}>
            <option value="">— Selecciona cliente —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
          <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} style={{marginTop:8}} />
          <div className="row" style={{marginTop:8}}>
            <input className="input" placeholder="tipo" value={type} onChange={e=>setType(e.target.value)} />
            <input className="input" placeholder="periodo" value={period} onChange={e=>setPeriod(e.target.value)} />
          </div>
          <button className="btn" onClick={upload} disabled={!token || !file || !selectedClient} style={{marginTop:8}}>{t('documents.upload')}</button>
        </div>
      </div>
    </div>
  );
}
