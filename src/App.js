// App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TemplateEditor from './components/templates/templateEditor';
import FileUpload from './components/FileUpload';
import Home from './components/home';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/template-editor" element={<TemplateEditor />} />
        <Route path="/file-management" element={<FileUpload />} />
        {/* Default route for undefined paths */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
