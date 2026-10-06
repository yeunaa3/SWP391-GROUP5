import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./store/AuthContext.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";
import MotionExperience from "./components/MotionExperience.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MotionExperience />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
