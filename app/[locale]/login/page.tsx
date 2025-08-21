'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import { useRouter } from '../../i18n/routing';

export default function LoginPage(){
  const t = useTranslations();
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [loading,setLoading] = useState(false);
  const router = useRouter();
  const onSubmit = async (e:any)=>{
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({email,password});
    setLoading(false);
    if (error) return alert(error.message);
    alert('Login OK. Your token will be used in client-side fetches.');
    router.replace('/');
  };
  return (
    <div className="card">
      <h1>{t('login.title')}</h1>
      <form onSubmit={onSubmit} className="row">
        <div><label>{t('login.email')}</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
        <div><label>{t('login.password')}</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
        <div><button className="btn" disabled={loading}>{t('login.signin')}</button></div>
      </form>
    </div>
  );
}
