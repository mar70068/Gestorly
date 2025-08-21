'use client';
import {usePathname, useRouter} from '../../i18n/routing';
import {useLocale} from 'next-intl';

const locales = ['es','en','ca'];

export default function LanguageSwitcher(){
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <select
      className="input"
      value={locale}
      onChange={(e)=>router.replace(pathname, {locale:e.target.value as any})}
      style={{width:140}}
    >
      {locales.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
    </select>
  );
}
