import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import { Login } from "./components/Login";
import TripPlan from "./components/TripPlan";
import { CreateAccount } from "./components/CreateAccount";
import Settings from "./components/Settings";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/tripPlan" element={<TripPlan />} />
                <Route path="/create-account" element={<CreateAccount />} />"
                <Route path="/settings" element={<Settings />} />
            </Routes>
        </Router>
    );
}

export default App;
