import FireMap from "../components/FireMap";

function LiveDetection() {
  return (
    <div className="live-page">
      <div className="live-bar">
        <div className="live-title">
          <h1>Live detection</h1>

          <span className="live-status">
            <span className="pulse" aria-hidden="true" />
            Live · refreshes every 5 minutes
          </span>
        </div>

        <p className="live-hint">
          Select a detection to see its classification, evidence and the
          fastest emergency route.
        </p>
      </div>

      <div className="map-container">
        <FireMap />
      </div>
    </div>
  );
}

export default LiveDetection;