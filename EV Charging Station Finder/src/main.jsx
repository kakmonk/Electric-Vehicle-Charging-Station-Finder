//import { StrictMode } from 'react';
//import { createRoot } from 'react-dom/client';
import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
//import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './index.css';
import App from './App.jsx';
//import LandingPage from "./components/LandingPage";

ReactDOM.createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
  </StrictMode>
);

