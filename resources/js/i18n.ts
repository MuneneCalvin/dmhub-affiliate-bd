// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en/translation.json';
import translationDUTCH from './locales/du/translation.json';

const resources = {
    en: { translation: translationEN },
    du: { translation: translationDUTCH },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

export default i18n;
