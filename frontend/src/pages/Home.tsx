function Home() {
  return (
    <div className="home-page">
      <section className="hero" id="home">
        <div className="hero-content">
          <p className="eyebrow">AI-POWERED FIRE INTELLIGENCE</p>

          <h1>
            From Thermal Detection
            <br />
            to <span>Actionable Intelligence.</span>
          </h1>

          <p className="description">
            Agni Netra combines NASA FIRMS thermal observations,
            satellite-derived environmental signals, and industrial
            context to identify and prioritize potential fire events.
          </p>

          <a href="/live">
            <button className="cta">
              EXPLORE LIVE DETECTION
              <span>→</span>
            </button>
          </a>
        </div>

        <div className="hero-visual">
          <div className="radar">
            <div className="radar-ring ring-1"></div>
            <div className="radar-ring ring-2"></div>
            <div className="radar-ring ring-3"></div>

            <div className="radar-sweep"></div>

            <div className="radar-dot dot-1"></div>
            <div className="radar-dot dot-2"></div>
            <div className="radar-dot dot-3"></div>

            <div className="radar-center"></div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div>
          <strong>NASA FIRMS</strong>
          <span>Thermal Detection</span>
        </div>

        <div>
          <strong>Satellite Data</strong>
          <span>Environmental Context</span>
        </div>

        <div>
          <strong>AI Classification</strong>
          <span>Event Intelligence</span>
        </div>

        <div>
          <strong>GIS Intelligence</strong>
          <span>Spatial Risk Analysis</span>
        </div>
      </section>
    </div>
  );
}

export default Home;