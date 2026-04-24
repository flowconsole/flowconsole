import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import enMessages from "../messages/en.json";
import ruMessages from "../messages/ru.json";

// Build namespace resources from top-level keys of messages files
const namespaces = Object.keys(enMessages) as (keyof typeof enMessages)[];

const enResources: Record<string, Record<string, string>> = {};
const ruResources: Record<string, Record<string, string>> = {};

for (const ns of namespaces) {
  enResources[ns] = enMessages[ns] as Record<string, string>;
  ruResources[ns] = ruMessages[ns] as Record<string, string>;
}

export const i18n = i18next.createInstance();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: enResources,
      ru: ruResources,
    },
    lng: "en",
    fallbackLng: "en",
    ns: namespaces,
    defaultNS: "nav",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
