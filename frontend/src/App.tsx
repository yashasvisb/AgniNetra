// // import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

// // import Home from "./pages/Home";
// // import LiveDetection from "./pages/LiveDetection";

// // function App() {
// //   return (
// //     <BrowserRouter>
// //       <div className="app">

// //         <nav className="navbar">

// //           <Link to="/" className="logo">
// //             <span className="logo-mark">A</span>
// //             <span>AGNI NETRA</span>
// //           </Link>

// //           <div className="nav-links">
// //             <Link to="/">Home</Link>
// //             <Link to="/live">Live Detection</Link>
// //             <a href="#about">About</a>
// //             <a href="#methodology">Methodology</a>
// //           </div>

// //         </nav>

// //         <Routes>

// //           <Route path="/" element={<Home />} />

// //           <Route
// //             path="/live"
// //             element={<LiveDetection />}
// //           />

// //         </Routes>

// //       </div>
// //     </BrowserRouter>
// //   );
// // }

// // export default App;


// import {
//   BrowserRouter,
//   Routes,
//   Route,
//   Link,
//   useLocation,
// } from "react-router-dom";

// import Home from "./pages/Home";
// import LiveDetection from "./pages/LiveDetection";

// // Path to the logo in /public. Renamed from the uploaded
// // "AgniNetra logo.jpeg" to remove the space, which otherwise
// // has to be URL-encoded everywhere it's referenced.
// const LOGO_SRC = "/agninetra-logo.jpg";

// function NavLinks() {
//   const location = useLocation();

//   const isActive = (path: string) =>
//     location.pathname === path;

//   return (
//     <div className="nav-links">
//       <Link to="/" className={isActive("/") ? "active" : ""}>
//         Home
//       </Link>

//       <Link
//         to="/live"
//         className={isActive("/live") ? "active" : ""}
//       >
//         Live Detection
//       </Link>

//       <a href="#about">About</a>
//       <a href="#methodology">Methodology</a>
//     </div>
//   );
// }

// function App() {
//   return (
//     <BrowserRouter>
//       <div className="app">
//         <nav className="navbar">
//           <Link to="/" className="logo">
//             <span className="logo-mark">
//               <img
//                 src={LOGO_SRC}
//                 alt="Agni Netra logo"
//                 onError={(event) => {
//                   // If the logo file hasn't been added to /public yet,
//                   // fall back to the letter mark instead of a broken image.
//                   const img = event.currentTarget;
//                   img.style.display = "none";

//                   const fallback =
//                     img.parentElement?.querySelector(
//                       ".logo-mark-fallback"
//                     );

//                   if (fallback) {
//                     (fallback as HTMLElement).style.display = "flex";
//                   }
//                 }}
//               />

//               <span
//                 className="logo-mark-fallback"
//                 style={{ display: "none" }}
//               >
//                 A
//               </span>
//             </span>

//             <span>AGNI NETRA</span>
//           </Link>

//           <NavLinks />
//         </nav>

//         <Routes>
//           <Route path="/" element={<Home />} />
//           <Route path="/live" element={<LiveDetection />} />
//         </Routes>
//       </div>
//     </BrowserRouter>
//   );
// }

// export default App;



import { useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home";
import LiveDetection from "./pages/LiveDetection";

// Tries each of these, in order, against whatever you actually
// named the file when you dropped it into /public. No need to
// rename anything — spaces in the filename are fine, the browser
// encodes them automatically.
const LOGO_CANDIDATES = [
  "/AgniNetra logo.jpeg",
  "/agninetra-logo.jpeg",
  "/agninetra-logo.jpg",
  "/agninetra-logo.png",
  "/logo.jpeg",
  "/logo.png",
];

function NavLinks() {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path;

  return (
    <div className="nav-links">
      <Link to="/" className={isActive("/") ? "active" : ""}>
        Home
      </Link>

      <Link
        to="/live"
        className={isActive("/live") ? "active" : ""}
      >
        Live Detection
      </Link>

      
    </div>
  );
}

function Logo() {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  const src = LOGO_CANDIDATES[candidateIndex];

  return (
    <span className="logo-mark">
      {!exhausted && (
        <img
          src={src}
          alt="Agni Netra logo"
          onError={() => {
            // This filename didn't exist in /public — try the next
            // likely one. Once we've tried them all, show the
            // letter mark instead of a broken image icon.
            if (candidateIndex < LOGO_CANDIDATES.length - 1) {
              setCandidateIndex(candidateIndex + 1);
            } else {
              setExhausted(true);
            }
          }}
        />
      )}

      {exhausted && (
        <span className="logo-mark-fallback">A</span>
      )}
    </span>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="logo">
            <Logo />

            <span>AGNI NETRA</span>
          </Link>

          <NavLinks />
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<LiveDetection />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;