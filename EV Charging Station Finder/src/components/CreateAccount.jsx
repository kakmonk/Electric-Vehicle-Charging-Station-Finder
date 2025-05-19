import Navbar from "./Navbar";
import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import '../styles/CreateAccount.css';

export const CreateAccount = () => {
    const [email, setEmail] = useState('');
    const [password, setPw] = useState('');
    const [name, setName] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async () => {
        const result = await fetch("http://3.85.120.248:5000/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({name, email, password}),
        });

        const data = await result.json();
        if (result.ok) {
            localStorage.setItem("user_id", data.user_id);
            alert("Signup successful!");
            navigate("/login");
        } else {
            alert("Signup failed: " + data.error);
        }
    };

    return (
        <>
        <Navbar/>
        <div className="createaccount-container">
            <h2>Sign Up</h2>
            <input placeholder="Name" onChange={e => setName(e.target.value)} />
            <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" onChange={e => setPw(e.target.value)} />
            <button onClick={handleSubmit}>Create Account</button>            
        </div>
        </>
    );
};