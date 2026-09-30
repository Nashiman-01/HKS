import { useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Describe from "./pages/Describe.jsx";
import FollowUp from "./pages/FollowUp.jsx";
import Analysis from "./pages/Analysis.jsx";
import Results from "./pages/Results.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Alert from "./components/Alert.jsx";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";

export default function App() {
  const { t, language } = useLanguage();
  const { user, session, loading: authLoading, logout, authError, setAuthError } = useAuth();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [step, setStep] = useState("home");
  const [problem, setProblem] = useState({ text: "", province: "" });
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const mainRef = useRef(null);

  useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPathname);
    return () => window.removeEventListener("popstate", syncPathname);
  }, []);

  function navigate(path, replace = false) {
    if (window.location.pathname !== path) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
      setPathname(path);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (user && !pathname.startsWith("/app")) navigate("/app", true);
    if (!user && pathname.startsWith("/app")) navigate("/login", true);
  }, [authLoading, user, pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [step, pathname]);

  function goToSection(id) {
    setStep("home");
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function restart() {
    setProblem({ text: "", province: "" });
    setAnswers([]);
    setResult(null);
    setStep("describe");
  }

  async function handleLogout() {
    setAuthError("");
    try {
      await logout();
      navigate("/", true);
    } catch {
      // Keep the protected view open if the backend session cannot be ended.
    }
  }

  const inApp = pathname.startsWith("/app");
  const onLoginPage = pathname === "/login";

  return (
    <>
      <a className="skip-link" href="#main">{t("skip")}</a>
      {!inApp && (
        <Navbar
          user={user}
          onHome={() => navigate(user ? "/app" : "/")}
          onNavigate={goToSection}
          onStart={() => setStep("describe")}
          onLogin={() => navigate("/login")}
          onLogout={handleLogout}
          onAccount={() => navigate("/app")}
        />
      )}
      <main id="main" ref={mainRef} tabIndex={-1}>
        {inApp && user && !authLoading ? (
          <Dashboard
            pathname={pathname}
            navigate={navigate}
            user={user}
            accessToken={session?.access_token}
            onLogout={handleLogout}
            authError={authError}
            onDismissAuthError={() => setAuthError("")}
          />
        ) : inApp || authLoading ? (
          <div className="container flow-page">
            <div className="status" role="status">
              <span className="loader" aria-hidden="true" />
              <p>{t("auth.restoringSession")}</p>
            </div>
          </div>
        ) : (
          <div key={`${pathname}-${step}`} className="page-fade">
            {!user && authError && !onLoginPage && (
              <div className="container flow-page">
                <Alert tone="error" icon="alert" role="alert">{t(`auth.${authError}`)}</Alert>
              </div>
            )}
            {onLoginPage && !user && <Login onAuthenticated={() => navigate("/app", true)} />}
            {!onLoginPage && step === "home" && <Home onStart={() => setStep("describe")} />}
            {!onLoginPage && step === "describe" && (
              <Describe
                initialValue={problem}
                onContinue={(value) => {
                  setProblem(value);
                  setStep("followup");
                }}
              />
            )}
            {!onLoginPage && step === "followup" && (
              <FollowUp
                problem={problem}
                onBack={() => setStep("describe")}
                onDone={(list) => {
                  setAnswers(list);
                  setStep("analysis");
                }}
              />
            )}
            {!onLoginPage && step === "analysis" && (
              <Analysis
                problem={problem}
                answers={answers}
                onBack={() => setStep("describe")}
                onDone={(data) => {
                  setResult(data);
                  setStep("results");
                }}
              />
            )}
            {!onLoginPage && step === "results" && result && (
              <Results result={result} problem={problem} answers={answers} onRestart={restart} />
            )}
          </div>
        )}
      </main>
      {!inApp && <Footer />}
    </>
  );
}
