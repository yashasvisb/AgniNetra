import { Link } from "react-router-dom";

function Method() {
  return (
    <div className="wrap prose-page">
      <header className="prose-head">
        <p className="kicker">Methodology</p>

        <h1>How Agni Netra turns a thermal detection into a response</h1>

        <p className="hero-lede">
          This page explains what the system does at each step, what data it
          uses, and where its limits are.
        </p>
      </header>

      <section className="prose-section">
        <h2>1. Detection</h2>

        <p>
          Thermal anomalies come from NASA FIRMS. The map reloads them every
          five minutes, and each new detection is analysed automatically. A
          detection is a satellite observation of heat, not a confirmed
          incident.
        </p>
      </section>

      <section className="prose-section">
        <h2>2. Context and classification</h2>

        <p>
          Each detection is matched against the surrounding area: proximity to
          industrial infrastructure, land cover, vegetation and water indices
          (NDVI, NDWI, NDBI), how long the location has been hot, and
          atmospheric anomaly layers for NO₂, SO₂, CO and CH₄.
        </p>

        <p>
          Machine-learning models use these features to estimate the source
          of the heat. The result includes the predicted class, the model
          confidence and the probability of every class, so an analyst can see
          how close a call was.
        </p>

        <p>
          A separate industrial-association assessment lists the evidence, such
          as distance to a facility, so the reasoning is visible and not
          hidden inside the model.
        </p>
      </section>

      <section className="prose-section">
        <h2>3. Response priority</h2>

        <p>
          Every analysed detection is ranked critical, high, moderate or low.
          The reasons behind the rank are shown next to it. Critical locations
          are also listed in the summary panel on the live map, ordered by fire
          radiative power.
        </p>
      </section>

      <section className="prose-section">
        <h2>4. Emergency routing</h2>

        <p>
          The nearest station by straight-line distance is not always the
          fastest to arrive. Agni Netra takes the five nearest stations from a
          dataset of 345, requests a driving route with live traffic from
          Mapbox for each, and compares the travel times.
        </p>

        <p>
          The station with the lowest estimated time is recommended, the others
          are shown as alternatives, and the recommended route is drawn on the
          map.
        </p>
      </section>

      <section className="prose-section">
        <h2>5. Limits</h2>

        <ul className="limits">
          <li>
            A FIRMS pixel covers hundreds of metres, so a detection cannot
            always be attributed to a single facility.
          </li>
          <li>
            Satellite passes are periodic. Detections are near-real-time, not
            continuous.
          </li>
          <li>
            Atmospheric gas layers are satellite anomaly signals. They are
            supporting evidence and do not confirm a gas leak.
          </li>
          <li>
            Class and priority support a decision. They do not replace ground
            verification.
          </li>
         
        </ul>
      </section>

      <div className="prose-cta">
        <Link className="btn btn-primary" to="/live">
          Open live map <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

export default Method;