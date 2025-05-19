import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/LandingPage.css";

const LandingPage = () => {
  return (
    <>
      <Navbar />
      <div className="landing-container">
        <h1>Welcome to the EV Charging Station Finder</h1>
        <p>Find charging stations and plan your routes with ease.</p>
        <div className="button-container">
            <Link to="/tripPlan">
              <button style={{ padding: "10px 20px", fontSize: "16px" }}>
                Create a Trip
              </button>
            </Link>
            <Link to="/login">
              <button style={{ padding: "10px 20px", fontSize: "16px" }}>
                Login
              </button>
            </Link>
        </div>
      </div>
    </>
  );
};

export default LandingPage;
