import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import "../styles/Settings.css";

const API_BASE = "http://3.85.120.248:5000/api"; // reminder to create .env file and put in there, just did this for declutter

const Settings = () => {
  const userId = localStorage.getItem("user_id");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    preferences: {
      charging_type: "Level 1", // if no user preferences, set initial form to level 1 to show all chargers on account creation
    },
  });

  // load current preferences
  useEffect(() => {
    if (!userId) {
      alert("You must be logged in to view this page.");
      navigate("/login");
      return;
    }

    fetch(`${API_BASE}/preferences/${userId}`)
      .then(res => res.json())
      .then(data => {
        setForm(prev => ({
          ...prev,
          name: data.name || "",
          email: data.email || "",
          preferences: {
            charging_type: data.preferences?.charging_type || "Level 1", // if user has previously set preferences, if not set level 1
          },
        }));
      });
  }, [userId, navigate]);

  // on change call setForm to update user account data
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // on change call setForm to update user preferences
  const handlePreferenceChange = (e) => {
    // the ...[list] format is for appending new changes simply
    setForm(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        charging_type: e.target.value,
      },
    }));
  };

  const handleSubmit = async () => {
    // call on the post method preferences API route to update settings
    const res = await fetch(`${API_BASE}/preferences/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Settings updated successfully.");
    } else {
      alert("Update failed: " + data.error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="settings-container">
        <h2>User Settings</h2>

        <label>Name:</label>
        <input type="text" value={form.name} onChange={e => handleChange("name", e.target.value)} />

        <label>Email:</label>
        <input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} />

        <label>Password:</label>
        <input type="password" value={form.password} onChange={e => handleChange("password", e.target.value)} />

        <label>Charging Type Preference:</label>
        <select value={form.preferences.charging_type} onChange={handlePreferenceChange}>
          <option value="Level 1">Level 1</option>
          <option value="Level 2">Level 2</option>
          <option value="DC Fast Charger">DC Fast Charger</option>
        </select>

        <br /><br />
        <button onClick={handleSubmit}>Save Settings</button>
      </div>
    </>
  );
};

export default Settings;