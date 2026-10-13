import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./store/AuthContext.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";
import MotionExperience from "./components/MotionExperience.jsx";
import { PreferencesProvider } from "./store/PreferencesContext.jsx";
import ReaderSettings from "./components/ReaderSettings.jsx";
import SupportChat from "./components/SupportChat.jsx";
import { AdAllowanceProvider } from "./store/AdAllowanceContext.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <PreferencesProvider><AuthProvider><AdAllowanceProvider>
        <MotionExperience />
        <AppRoutes />
        <ReaderSettings/><SupportChat/>
      </AdAllowanceProvider></AuthProvider></PreferencesProvider>
    </BrowserRouter>
  );
}
