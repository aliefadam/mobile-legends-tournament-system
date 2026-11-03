import { HashRouter } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import { DataProvider } from "./contexts/DataContext";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./routes/AppRoutes";

// HashRouter dipilih agar aplikasi statis (dist/index.html) dapat dibuka tanpa konfigurasi server.
// Contoh URL landing page: /#/tournament/mobile-legends-season-1
export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <AuthProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AuthProvider>
      </DataProvider>
    </ToastProvider>
  );
}
