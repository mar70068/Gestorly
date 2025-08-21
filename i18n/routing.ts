import {createLocalizedPathnamesNavigation, Pathnames} from 'next-intl/navigation';

export const locales = ['es','en','ca'] as const;
export const localePrefix = 'always';

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
  '/login': '/login',
  '/clients': '/clients',
  '/threads': '/threads',
  '/tasks': '/tasks',
  '/settings': '/settings'
};

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createLocalizedPathnamesNavigation({locales, localePrefix, pathnames});
