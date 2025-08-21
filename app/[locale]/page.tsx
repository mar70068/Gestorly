import {useTranslations} from 'next-intl';
import {Link} from '../../i18n/routing';

export default function Page(){
  const t = useTranslations();
  return (
    <div className="card">
      <h1>{t('dashboard.title')}</h1>
      <p className="small">Quick links:</p>
      <ul>
        <li><Link href="/clients">/clients</Link></li>
        <li><Link href="/tasks">/tasks</Link></li>
        <li><Link href="/threads">/threads</Link></li>
        <li><Link href="/settings">/settings</Link></li>
      </ul>
    </div>
  );
}
