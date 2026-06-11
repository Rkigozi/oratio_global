import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE || "development",
      tracesSampleRate: 0.1,
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
