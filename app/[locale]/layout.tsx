import '../globals.css';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {Link} from '../../i18n/routing';
import LanguageSwitcher from './language-switcher';

export default async function RootLayout({children, params}:{children:React.ReactNode, params:{locale:string}}){
  const messages = await getMessages();
  return (
    <html lang={params.locale}>
      <body>
        <nav className="container nav">
          <div className="brand">
            <div className="logo" />
            <strong>Gestorly</strong>
            <span className="badge">R1</span>
          </div>
          <LanguageSwitcher />
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
