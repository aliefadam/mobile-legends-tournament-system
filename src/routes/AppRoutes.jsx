import { Route, Routes } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import AdminLayout from "../layouts/AdminLayout";
import Home from "../pages/public/Home";
import TournamentDetail from "../pages/public/TournamentDetail";
import Registration from "../pages/public/Registration";
import RegistrationSuccess from "../pages/public/RegistrationSuccess";
import PublicBracket from "../pages/public/PublicBracket";
import StatusCheck from "../pages/public/StatusCheck";
import NotFound from "../pages/public/NotFound";
import Login from "../pages/admin/Login";
import Dashboard from "../pages/admin/Dashboard";
import Tournaments from "../pages/admin/Tournaments";
import AdminTournamentDetail from "../pages/admin/TournamentDetail";
import Registrations from "../pages/admin/Registrations";
import Payments from "../pages/admin/Payments";
import Settings from "../pages/admin/Settings";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<StatusCheck />} />
        <Route path="/tournament/:slug" element={<TournamentDetail />} />
        <Route path="/tournament/:slug/register" element={<Registration />} />
        <Route path="/tournament/:slug/register/success/:regId" element={<RegistrationSuccess />} />
        <Route path="/tournament/:slug/bracket" element={<PublicBracket />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="tournaments" element={<Tournaments />} />
        <Route path="tournaments/:id" element={<AdminTournamentDetail />} />
        <Route path="registrations" element={<Registrations />} />
        <Route path="payments" element={<Payments />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
