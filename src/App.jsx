import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Garden from './pages/Garden'
import Diagnosis from './pages/Diagnosis'
import AddPlant from './pages/AddPlant'
import CareTips from './pages/CareTips'
import Profile from './pages/Profile'
import PlantIdentifier from './pages/PlantIdentifier'
import LocationDetail from './pages/LocationDetail'
import RecommendedPlan from './pages/RecommendedPlan'

function RequireUser({ children }) {
  const user = localStorage.getItem('user')
  return user ? children : <Navigate to="/onboarding" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/garden"
            element={<RequireUser><Garden /></RequireUser>}
          />
          <Route
            path="/diagnosis"
            element={<RequireUser><Diagnosis /></RequireUser>}
          />
          <Route
            path="/add-plant"
            element={<RequireUser><AddPlant /></RequireUser>}
          />
          <Route
            path="/care-tips"
            element={<RequireUser><CareTips /></RequireUser>}
          />
          <Route
            path="/care-tips/:plantId"
            element={<RequireUser><CareTips /></RequireUser>}
          />
          <Route
            path="/profile"
            element={<RequireUser><Profile /></RequireUser>}
          />
          <Route
            path="/identify"
            element={<RequireUser><PlantIdentifier /></RequireUser>}
          />
          <Route
            path="/location/:id"
            element={<RequireUser><LocationDetail /></RequireUser>}
          />
          <Route
            path="/recommended-plan/:plantId"
            element={<RequireUser><RecommendedPlan /></RequireUser>}
          />
          <Route
            path="*"
            element={
              localStorage.getItem('user')
                ? <Navigate to="/garden" replace />
                : <Navigate to="/onboarding" replace />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
