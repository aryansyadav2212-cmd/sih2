import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import ProjectsPage from './pages/ProjectsPage/ProjectsPage';
import CategoryPage from './pages/CategoryPage/CategoryPage';
import ProjectDetailPage from './pages/ProjectDetailPage/ProjectDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/intervention" element={<CategoryPage category="intervention" />} />
        <Route path="/projects/closure" element={<CategoryPage category="closure" />} />
        <Route path="/projects/monitor" element={<CategoryPage category="monitor" />} />
        <Route path="/projects/:projectCode" element={<ProjectDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
