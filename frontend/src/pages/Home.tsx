import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getLiveFires } from "../services/api";
import { BrandMark } from "../components/BrandMark";

interface Detection {
  latitude: number;
  longitude: number;
}

// Rough bounding box of Odisha, used to place real detections on the radar
const BOUNDS = { latMin: 17.7, latMax: 22.7, lonMin: 81.3, lonMax: 87.6 };

function toRadarPosition(detection: Detection) {
  const x =
    (detection.longitude - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin);

  const y =
    1 - (detection.latitude - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin);

  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null;
  }

  // Keep every dot inside the circle (16% margin, 68% usable width)
  return { left: 16 + x * 68, top: 16 + y * 68 };
}

const PIPELINE = [
  {
    title: "Detect",
    text: "Thermal detections are pulled from NASA FIRMS and refreshed every five minutes.",
  },
  {
    title: "Add context",
    text: "Each detection is matched with industrial infrastructure, land cover, vegetation and water indices, fire persistence and atmospheric anomaly layers.",
  },
  {
    title: "Classify",
    text: "Machine-learning is used to estimate the source of the heat, with a confidence score and a probability for every class.",
  },
  {
    title: "Prioritise",
    text: "Each event is ranked critical, high, moderate or low, and the reasons behind the rank are shown to the analyst.",
  },
  {
    title: "Respond",
    text: "The five nearest fire stations are routed with traffic-aware driving times, and the fastest one is recommended.",
  },
];


function Home() {
  const [fires, setFires] = useState<Detection[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    getLiveFires()
      .then((result) => {
        if (!alive) return;

        const list: any[] = Array.isArray(result?.fires)
          ? result.fires
          : Array.isArray(result)
          ? result
          : [];

        setFires(
          list.filter(
            (fire) =>
              Number.isFinite(Number(fire?.latitude)) &&
              Number.isFinite(Number(fire?.longitude))
          )
        );
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const radarDots = useMemo(() => {
    if (!fires) return [];

    return fires
      .slice(0, 120)
      .map((fire) => toRadarPosition(fire))
      .filter((position): position is { left: number; top: number } =>
        Boolean(position)
      );
  }, [fires]);

  const countLabel = failed ? "Unavailable" : fires ? String(fires.length) : "…";

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="kicker">Industrial fire intelligence · Odisha, India</p>

            <h1 className="hero-title">
              FIRMS shows a dot. Agni Netra tells you what it is.
            </h1>

            <p className="hero-lede">
              Agni Netra classifies satellite thermal detections, separating
              industrial fires from forest fires and other natural fires. It
              ranks each event by response priority and routes the fastest
              fire station to the scene. It also detects possible gas leaks.
            </p>

            <div className="hero-actions">
              <Link className="btn btn-primary" to="/live">
                Open live map <span aria-hidden="true">→</span>
              </Link>

              <Link className="btn btn-ghost" to="/method">
                How it works
              </Link>
            </div>
          </div>

          <figure className="radar-wrap">
            <div
              className="radar"
              role="img"
              aria-label={`Schematic radar showing ${
                fires ? fires.length : "live"
              } current fire detections over Odisha`}
            >
              <div className="radar-ring r1" />
              <div className="radar-ring r2" />
              <div className="radar-ring r3" />
              <div className="radar-sweep" />

              {radarDots.map((position, index) => (
                <span
                  key={index}
                  className="radar-dot"
                  style={{
                    left: `${position.left}%`,
                    top: `${position.top}%`,
                  }}
                />
              ))}

              <div className="radar-logo">
                <BrandMark />
              </div>
            </div>

            <figcaption className="radar-caption">
              Current FIRMS detections over Odisha. 
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ================= LIVE NUMBERS ================= */}
      <section className="signal" aria-label="Live system status">
        <div className="wrap signal-grid">
          <div className="signal-item">
            <strong>{countLabel}</strong>
            <span>Live detections right now</span>
          </div>

          <div className="signal-item">
            <strong>5 min</strong>
            <span>Refresh interval</span>
          </div>

          <div className="signal-item">
            <strong>345</strong>
            <span>Fire stations indexed</span>
          </div>

          <div className="signal-item">
            <strong>4 levels</strong>
            <span>Response priority</span>
          </div>
        </div>
      </section>

      {/* ================= THE GAP ================= */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>A detection is not yet a decision</h2>

            <p>
              A raw thermal detection says something is hot. An incident
              commander needs to know what, how urgent, and who can get there
              first.
            </p>
          </div>

          <div className="gap-grid">
            <div className="gap-col">
              <h3>What FIRMS gives you</h3>

              <ul className="plain-list">
                <li>Coordinates and acquisition time</li>
                <li>Brightness and fire radiative power</li>
                <li>Sensor confidence</li>
              </ul>
            </div>

            <div className="gap-col gap-col--accent">
              <h3>What Agni Netra adds</h3>

              <ul className="plain-list">
                <li>
                  The likely source: industrial fire, forest fire or another
                  heat source
                </li>
                <li>
                  A response priority, with the evidence that produced it
                </li>
                <li>
                  The fastest fire station by road time, with the route drawn
                  on the map
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PIPELINE ================= */}
      <section className="section section--ruled">
        <div className="wrap">
          <div className="section-head">
            <h2>From satellite pixel to dispatch</h2>

            <p>Every detection passes through the same five stages.</p>
          </div>

          <ol className="pipeline">
            {PIPELINE.map((step, index) => (
              <li key={step.title}>
                <span className="pipeline-step">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= DELIVERABLES ================= */}
      <section className="section section--ruled">
        <div className="wrap">
          <div className="section-head">
            <h2>Built to the problem statement</h2>

            <p>
              NTRO asked for two things. Both are working in the live map.
            </p>
          </div>

          <div className="deliver">
            <div className="deliver-item">
              <h3>Classify and separate industrial fires</h3>

              <p>
                Every detection carries a predicted class, a model confidence
                and an industrial-association assessment. Select any point on
                the map to see the evidence.
              </p>
            </div>

            <div className="deliver-item">
              <h3>GIS overlays on a map</h3>

              <p>
                Detections sit on a map with switchable layers: land cover,
                NDVI, NDWI, NDBI, NO₂, SO₂, CO, CH₄ and fire persistence.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ================= CTA ================= */}
      <section className="cta-band">
        <div className="wrap cta-inner">
          <h2>See what is burning in Odisha right now</h2>

          <Link className="btn btn-primary" to="/live">
            Open live map <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}

export default Home;