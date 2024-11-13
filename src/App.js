import React from 'react';
import TemplateEditor from './components/templates/templateEditor';
import FileUpload from './components/FileUpload';
import { BrowserRouter, Routes, Route } from 'react-router-dom';


const App = () => {
  return (
    <BrowserRouter>
        <Routes>
          <Route path="/template-editor" element={<TemplateEditor />} />
          <Route path="/file-management" element={<FileUpload />} />
        </Routes>
    </BrowserRouter>
  );
};


export default App;
