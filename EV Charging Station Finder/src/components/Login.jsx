import Navbar from "./Navbar";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import '../styles/Login.css';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPw] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async () => {
        const result = await fetch("http://3.85.120.248:5000/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await result.json();
        if (result.ok) {
            localStorage.setItem("user_id", data.user_id);
            alert("Login successful!");
            navigate("/tripPlan");
        } else {
            alert("Login failed: " + data.error);
        }
    };

    return (
        <>
        <Navbar />
        <div className="login-container">
            <h2>Login</h2>
                  <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
                  <input type="password" placeholder="Password" onChange={e => setPw(e.target.value)} />
                  <button onClick={handleSubmit}>Log In</button>
            <Link to="/create-account">
                <button>Don't have an account? Create one here.</button>
            </Link>
            </div>
        </>
    );
};