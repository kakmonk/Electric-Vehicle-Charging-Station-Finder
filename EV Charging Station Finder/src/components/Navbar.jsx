import { Link, useNavigate } from "react-router-dom";
import React from "react";
import "../styles/Navbar.css";

const Navbar = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem("user_id");
    const name = localStorage.getItem("name");

    const handleLogout = () => {
        localStorage.clear();
        alert("You've been logged out.'");
        navigate("/login");
    };


    return (
        <nav className="navbar">
            <ul className="nav-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/tripPlan">Create Trip</Link></li>
                {!userId && <li><Link to="/create-account">Create Account</Link></li>}
                    {userId ? (
                        <>
                            <li><Link to="/settings">Settings</Link></li>
                            <li><Link to="#" onClick={(e) => {
                                e.preventDefault();
                                handleLogout();
                            }}>Logout</Link>
                            </li>
                        </>
                    ) : (
                        <li><Link to="/login">Login</Link></li>
                    )}
            </ul>
        </nav>
    );
};

export default Navbar;