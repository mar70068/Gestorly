import createMiddleware from 'next-intl/middleware';
import {locales, localePrefix, pathnames} from './i18n/routing';

export default createMiddleware({
  locales,
  defaultLocale: 'es',
  localePrefix,
  pathnames
});

export const config = {
  matcher: ['/', '/(es|en|ca)/:path*']
};
