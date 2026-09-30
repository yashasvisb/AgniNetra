import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home";
import LiveDetection from "./pages/LiveDetection";
import Method from "./pages/Method";

import { BrandMark } from "./components/BrandMark";
import { applyFavicon } from "./lib/logo";

const PAGE_TITLES: Record<string, string> = {
  "/": "Agni Netra — Industrial fire intelligence from satellite data",
  "/live": "Live detection — Agni Netra",
  "/method": "Methodology — Agni Netra",
};

// Scrolls to the top and sets the browser tab title on every page change
function RouteEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = PAGE_TITLES[pathname] ?? "Page not found — Agni Netra";
  }, [pathname]);

  useEffect(() => {
    applyFavicon();
  }, []);

  return null;
}

function NotFound() {
  return (
    <div className="wrap notfound">
      <h1>This page does not exist</h1>
      <p>The address may be mistyped, or the page may have moved.</p>
      <Link className="btn btn-primary" to="/">
        Back to home
      </Link>
    </div>
  );
}

function Layout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  // The live map fills the whole screen, so it has no footer
  const isConsole = pathname === "/live";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-nav">
        <div className="nav-inner">
          <Link to="/" className="brand" onClick={closeMenu}>
            <BrandMark />
            <span className="brand-word">Agni Netra</span>
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            id="primary-nav"
            className={`nav-links${menuOpen ? " open" : ""}`}
            aria-label="Primary"
          >
            <NavLink to="/" end className={linkClass} onClick={closeMenu}>
              Home
            </NavLink>

            <NavLink to="/live" className={linkClass} onClick={closeMenu}>
              Live detection
            </NavLink>

            <NavLink to="/method" className={linkClass} onClick={closeMenu}>
              Methodology
            </NavLink>

            <Link
              to="/live"
              className="btn btn-primary nav-cta"
              onClick={closeMenu}
            >
              Open live map
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className={isConsole ? "main-console" : "main"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<LiveDetection />} />
          <Route path="/method" element={<Method />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isConsole && (
        <footer className="site-footer">
          <div className="wrap footer-inner">
            <div className="footer-brand">
              <div className="brand">
                <BrandMark />
                <span className="brand-word">Agni Netra</span>
              </div>

              <p>
                Satellite thermal detections, classified and prioritised for
                emergency response.
              </p>
            </div>

            <div className="footer-col">
              <h2>Explore</h2>
              <Link to="/live">Live detection</Link>
              <Link to="/method">Methodology</Link>
            </div>

            <div className="footer-col">
              <h2>Data</h2>
              <span>NASA FIRMS</span>
              <span>Copernicus Sentinel</span>
              <span>OpenStreetMap contributors</span>
              <span>Mapbox</span>
            </div>
          </div>

          <div className="wrap footer-base">
            Built for Smart India Hackathon 2026 · Problem statement SIH26162
          </div>
        </footer>
      )}

      <RouteEffects />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;