import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./store/AuthContext.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";
import MotionExperience from "./components/MotionExperience.jsx";
import { PreferencesProvider } from "./store/PreferencesContext.jsx";
import ReaderSettings from "./components/ReaderSettings.jsx";
import SupportChat from "./components/SupportChat.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <PreferencesProvider><AuthProvider>
        <MotionExperience />
        <AppRoutes />
        <ReaderSettings/><SupportChat/>
      </AuthProvider></PreferencesProvider>
    </BrowserRouter>
  );
}
