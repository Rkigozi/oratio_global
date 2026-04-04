import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100dvh', /* Modern browsers use dvh, fallback handled in CSS */
      display: 'flex',
      flexDirection: 'column',
      background: '#0A1A3A',
      color: 'white',
    }}>
      <RouterProvider router={router} />
    </div>
  );
}
