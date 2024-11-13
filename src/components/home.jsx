// Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';
import logo from '../assets/githubbies-logo.jpg'

const Home = () => {
    return (
        <div className="dashboard">
            <nav className="navbar">
                <div className="navbar-logo">
                    <img src={logo} alt="Logo" />
                </div>
                <ul className="navbar-links">
                    <li><Link to="/">Dashboard</Link></li>
                    <li><Link to="/file-management">File Management</Link></li>
                    <li><Link to="/template-editor">Template Editor</Link></li>
                    <li><Link to="/media-management">Media Management</Link></li>
                </ul>
            </nav>

            <div className="dashboard-content">
                <h1 className="dashboard-title">Welcome Admin! 😊</h1>

                <div className="dashboard-sections">
                    <div className="dashboard-section">
                        <h2>Advertisement Management</h2>
                        <p>Set up and control ad campaigns, including scheduling and content selection.</p>
                        <Link to="/file-management">
                            <button className="dashboard-btn">Manage Advertisements</button>
                        </Link>
                    </div>

                    <div className="dashboard-section">
                        <h2>New Ad Template</h2>
                        <p>Design and create new ad templates for campaigns.</p>
                        <Link to="/template-editor">
                            <button className="dashboard-btn">Create New Template</button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
