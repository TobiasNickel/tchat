import { useEffect } from "react";
import "./index.css";
import { useAuthState, checkAuth } from "./state/authState";
// import { Login } from "./components/Login";
import { TicrossPage } from "./pages/TicrossPage";
import { PageReactRouter } from "./utils/PageReactRouter";
import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from "./components/Login";
import { config } from "./config";
import { AudioAnalyzerPage } from "./pages/AudioAnalyzerPage";

const routes = [
  { path: "/", element: <TicrossPage />, },
  { path: '/auth/login', element: <Login /> },
  { path: '/auth/register', element: <Register /> },
  { path: '/auth/forgot-password', element: <ForgotPassword /> },
  { path: '/auth/verify-email', element: <VerifyEmail /> },
  { path: '/auth/reset-password', element: <ResetPassword /> },
  { path: '/audio-analyzer', element: <AudioAnalyzerPage /> },
  { path: "/*", element: <TicrossPage /> }
]

export function App() {
  const authState = useAuthState();

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (authState.loading) {
    return (
      <div className="app-loading">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  // // Show login if not authenticated
  // if (!authState.user) {
  //   return <Login />;
  // }
  return <PageReactRouter 
    routes={routes}
  />;
}

export default App;
