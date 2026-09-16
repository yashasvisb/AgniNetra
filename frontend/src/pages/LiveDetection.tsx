// import FireMap from "../components/FireMap";

// function LiveDetection() {
//   return (
//     <div className="live-page">
//       <div className="page-header">
//         <p className="eyebrow">AGNI NETRA / LIVE SYSTEM</p>

//         <h1>
//           Live Fire <span>Detection</span>
//         </h1>

//         <p>
//           Real-time thermal events from NASA FIRMS will appear
//           here. Each event will be analyzed using satellite and
//           industrial context before being classified and prioritized.
//         </p>
//       </div>

//       <div className="map-container">
//         <FireMap />
//       </div>
//     </div>
//   );
// }

// export default LiveDetection;




import FireMap from "../components/FireMap";

function LiveDetection() {
  return (
    <div className="live-page">
      <div className="page-header">
        <p className="eyebrow">AGNI NETRA / LIVE SYSTEM</p>

        <h1>
          Live Fire <span>Detection</span>
        </h1>

        <p>
          Real-time thermal events from NASA FIRMS appear here as
          they're detected. Each event is analyzed against satellite,
          environmental, and industrial context before being
          classified and prioritized for response.
        </p>

        <span className="status">● LIVE — UPDATING EVERY 5 MIN</span>
      </div>

      <div className="map-container">
        <FireMap />
      </div>
    </div>
  );
}

export default LiveDetection;