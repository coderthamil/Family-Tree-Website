import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

// Pages
import LoginPage from '@/pages/LoginPage'
import TreePage from '@/pages/TreePage'
import ProfilePage from '@/pages/ProfilePage'
import SharePage from '@/pages/SharePage'

// Admin pages
import AdminLayout from '@/pages/admin/AdminLayout'
import DashboardPage from '@/pages/admin/DashboardPage'
import FamiliesPage from '@/pages/admin/FamiliesPage'
import FamilyDetailPage from '@/pages/admin/FamilyDetailPage'
import PersonEditPage from '@/pages/admin/PersonEditPage'
import ImportPage from '@/pages/admin/ImportPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { token, isAdmin, isContributor } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!isAdmin() && !isContributor()) return <Navigate to="/tree" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#003459',
            color: '#fff',
            border: '1px solid #007EA7',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00A7E1', secondary: '#003459' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#003459' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/share/:token" element={<SharePage />} />

        {/* Viewer+ */}
        <Route path="/tree" element={<RequireAuth><TreePage /></RequireAuth>} />
        <Route path="/profile/:personId" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        {/* Admin/Contributor */}
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<DashboardPage />} />
          <Route path="families" element={<FamiliesPage />} />
          <Route path="families/:familyId" element={<FamilyDetailPage />} />
          <Route path="persons/new" element={<PersonEditPage />} />
          <Route path="persons/:personId/edit" element={<PersonEditPage />} />
          <Route path="import" element={<ImportPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/tree" replace />} />
        <Route path="*" element={<Navigate to="/tree" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
