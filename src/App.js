// App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TemplateEditor from './components/templateEditor';
import FileUpload from './components/FileUpload';
import TemplatePage from './components/templatePage';
import ViewAllTemplates from "./components/viewAllTemplates";
import AdvertisementDisplay from "./components/advertisement"; // Import the component

import Home from './components/home';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manage-templates" element={<TemplatePage />} />
        <Route path="/manage-templates/view-all" element={<ViewAllTemplates />} />
        <Route path="/file-management" element={<FileUpload />} />
        <Route path="/template-editor" element={<TemplateEditor/>} />
        <Route path="/advertisement-display" element={<AdvertisementDisplay />} /> {/* New route */}
        {/* Default route for undefined paths */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
