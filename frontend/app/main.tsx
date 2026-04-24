import "@xyflow/react/dist/style.css";

import React from "react";
import { ThemeProvider } from "next-themes";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { Provider } from "react-redux";

import { App } from "./app";
import { i18n } from "./i18n/index";
import { startOpenReplay } from "./lib/analytics/openreplay";
import { AuthProvider } from "./lib/auth";
import { store } from "./lib/store";

import "./styles/globals.css";

startOpenReplay();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </Provider>
      </I18nextProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
