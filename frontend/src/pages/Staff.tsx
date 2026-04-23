import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { staffService, type RestaurantTeamRole } from '../services/staffService';
import ProfileDropdown from '../components/ProfileDropdown';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import Icon from '@mdi/react';
import { mdiSilverwareForkKnife, mdiLeaf } from '@mdi/js';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import NotificationBell from '../components/NotificationBell';
import { formatRoleLabel } from '../utils/roleLabels';
import AppHeaderBranding from '../components/AppHeaderBranding';
import WorkspaceContextBar from '../components/WorkspaceContextBar';

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  isActive: boolean;
  lastLogin?: string;
  profilePicture?: string;
  createdAt?: string;
  restaurantId?: {
    _id: string;
    name: string;
  } | string;
}

type ColumnKey = 'member' | 'email' | 'restaurant' | 'role' | 'status' | 'lastLogin' | 'actions';

const Staff: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAllergensPage = location.pathname === '/allergens';
  const { toasts, removeToast, error: showError } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>({
    member: 220,
    email: 260,
    restaurant: 180,
    role: 120,
    status: 120,
    lastLogin: 140,
    actions: 120
  });
  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'staff' as RestaurantTeamRole,
    isActive: true
  });

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const rawUserRole = localStorage.getItem('userRole') || 'staff';
  const normalizedUserRole = rawUserRole.toLowerCase();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const isPlatformAdmin =
    normalizedUserRole === 'platform_admin' || normalizedUserRole === 'super_owner';

  const canManageStaff =
    normalizedUserRole === 'owner' ||
    normalizedUserRole === 'manager' ||
    isPlatformAdmin;

  const canInviteStaff = canManageStaff;

  const canDeleteStaff =
    normalizedUserRole === 'owner' || isPlatformAdmin;

  /** Extra restaurant column when platform admins work in a workspace context */
  const showRestaurantColumn = isPlatformAdmin;

  const rolesAssignableOnInvite = (): RestaurantTeamRole[] => {
    if (isPlatformAdmin) return ['owner', 'manager', 'staff'];
    if (normalizedUserRole === 'owner' || normalizedUserRole === 'manager') {
      return ['manager', 'staff'];
    }
    return [];
  };

  const rolesAssignableOnEdit = (target: StaffMember): RestaurantTeamRole[] => {
    if (target.role === 'owner') return ['owner'];
    if (isPlatformAdmin) return ['owner', 'manager', 'staff'];
    if (normalizedUserRole === 'owner' || normalizedUserRole === 'manager') {
      return ['manager', 'staff'];
    }
    return [];
  };

  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as RestaurantTeamRole
  });

  useEffect(() => {
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) {
      setProfilePicture(savedPic);
    }
  }, []);

  useEffect(() => {
    fetchStaffMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isInviteModalOpen) return;
    const allowed = rolesAssignableOnInvite();
    if (!allowed.includes(inviteForm.role)) {
      setInviteForm((f) => ({ ...f, role: allowed[0] ?? 'staff' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInviteModalOpen]);

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const nextWidth = Math.max(100, startWidth + delta);
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: nextWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, startWidth, startX]);

  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      const response = await staffService.getAllStaff();
      setStaffMembers(response.data || []);
      setPendingInvitations(response.pendingInvitations || 0);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      showError('Failed to load staff members');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canInviteStaff) {
      showError('You do not have permission to invite team members');
      return;
    }
    
    if (!inviteForm.name || !inviteForm.email || !inviteForm.password) {
      showError('Please fill in all fields');
      return;
    }

    if (inviteForm.password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    try {
      setInviteLoading(true);
      await staffService.addStaff(inviteForm);
      toast.success('Staff member invited successfully');
      setIsInviteModalOpen(false);
      setInviteForm({ name: '', email: '', password: '', role: 'staff' });
      fetchStaffMembers();
    } catch (error: any) {
      console.error('Error inviting staff:', error);
      showError(error.response?.data?.message || 'Failed to invite staff member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      setDeleteLoading(true);
      await staffService.deleteStaff(selectedStaff._id);
      toast.success('Staff member removed successfully');
      setIsDeleteModalOpen(false);
      setSelectedStaff(null);
      fetchStaffMembers();
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      showError(error.response?.data?.message || 'Failed to remove staff member');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditStaff = (staff: StaffMember) => {
    if (staff.role === 'owner' && !isPlatformAdmin) {
      showError('Only a platform admin can edit an owner account');
      return;
    }
    setSelectedStaff(staff);
    setEditForm({
      name: staff.name,
      email: staff.email,
      role: staff.role === 'manager' ? 'manager' : staff.role === 'owner' ? 'owner' : 'staff',
      isActive: staff.isActive
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      setEditLoading(true);
      const payload =
        selectedStaff.role === 'owner'
          ? { name: editForm.name, email: editForm.email, isActive: editForm.isActive }
          : { name: editForm.name, email: editForm.email, role: editForm.role, isActive: editForm.isActive };
      await staffService.updateStaff(selectedStaff._id, payload);
      toast.success('Staff member updated successfully');
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      fetchStaffMembers();
    } catch (error: any) {
      console.error('Error updating staff:', error);
      showError(error.response?.data?.message || 'Failed to update staff member');
    } finally {
      setEditLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'manager':
        return 'bg-blue-100 text-blue-700';
      case 'staff':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-yellow-500',
      'bg-green-500',
      'bg-red-500',
      'bg-pink-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-orange-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const startColumnResize = (column: ColumnKey, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setResizingColumn(column);
    setStartX(e.clientX);
    setStartWidth(columnWidths[column]);
  };

  const filteredStaff = staffMembers.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStaff = staffMembers.length;
  const activeMembers = staffMembers.filter(s => s.isActive).length;
  const managers = staffMembers.filter(s => s.role === 'manager' || s.role === 'owner').length;

  const tableColumnCount =
    5 + (showRestaurantColumn ? 1 : 0) + (canManageStaff ? 1 : 0);

  const handleLogout = () => {
    authService.logout();
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AppHeaderBranding title="Smart Menu" subtitle="Staff Management" />
          </div>
          <WorkspaceContextBar restaurantName={restaurantName} />

          {/* Actions and Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <NotificationBell />

            {/* Profile Dropdown */}
            <ProfileDropdown
              userName={userName}
              userEmail={userEmail}
              restaurantName={restaurantName}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="bg-white dark:bg-gray-800 shadow-sm flex flex-col h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 w-64 min-w-[16rem]">
          {/* Navigation */}
          <nav className="p-6 flex flex-col flex-1 justify-between">
            <div className="space-y-2">
              {/* Dashboard */}
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="flex-1 text-left">Dashboard</span>
              </button>

              {/* Menu Items */}
              <button
                onClick={() => navigate('/menu-items')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <Icon path={mdiSilverwareForkKnife} size={0.8} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">Menu Items</span>
              </button>

              {/* Allergens */}
              <button
                onClick={() => navigate('/allergens')}
                className={`w-full flex items-center space-x-4 px-4 py-3 rounded-lg font-medium text-sm transition ${
                  isAllergensPage ? 'bg-green-500 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <ShieldCheckIcon size={20} className={`flex-shrink-0 ${isAllergensPage ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
                <span className="flex-1 text-left">Allergens</span>
              </button>

              {/* Ingredients */}
              <button
                onClick={() => navigate('/ingredients')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <Icon path={mdiLeaf} size={1} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">Ingredients</span>
              </button>

              {/* Staff Management - Active */}
              <button
                onClick={() => navigate('/staff')}
                className="w-full flex items-center space-x-4 px-4 py-3 bg-green-500 text-white rounded-lg font-medium text-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="flex-1 text-left">Staff Management</span>
              </button>

              {/* QR Codes */}
              <button
                onClick={() => navigate('/qr-codes')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="flex-1 text-left">QR Codes</span>
              </button>
            </div>

            {/* Bottom Navigation */}
            <div className="space-y-2 pt-4">
              {/* Reports */}
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="flex-1 text-left">Reports</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="flex-1 text-left">Settings</span>
              </button>
            </div>
          </nav>

          {/* Fixed User Card at Bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 mt-auto pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {profilePicture ? (
                  <img src={profilePicture} alt={userName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-white capitalize truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{formatRoleLabel(normalizedUserRole)}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition flex-shrink-0"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
              </div>
            ) : (
              <>
            {/* Page Title and Action Button */}
            <motion.div
              className="flex items-center justify-between mb-8"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26 }}
            >
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Staff Management</h2>
                <p className="text-gray-600 dark:text-gray-400">Manage your restaurant team members</p>
              </div>
              {canInviteStaff && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Invite New Staff</span>
                </button>
              )}
            </motion.div>

            <motion.div
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.06 }}
            >
              {/* Left Column - Team Members Table */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <div className="mb-6">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed min-w-[960px]">
                      <colgroup>
                        <col style={{ width: `${columnWidths.member}px` }} />
                        <col style={{ width: `${columnWidths.email}px` }} />
                        {showRestaurantColumn && <col style={{ width: `${columnWidths.restaurant}px` }} />}
                        <col style={{ width: `${columnWidths.role}px` }} />
                        <col style={{ width: `${columnWidths.status}px` }} />
                        <col style={{ width: `${columnWidths.lastLogin}px` }} />
                        {canManageStaff && <col style={{ width: `${columnWidths.actions}px` }} />}
                      </colgroup>
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="relative text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Member
                            <button
                              type="button"
                              onMouseDown={(e) => startColumnResize('member', e)}
                              className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                              aria-label="Resize Member column"
                            />
                          </th>
                          <th className="relative text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Email
                            <button
                              type="button"
                              onMouseDown={(e) => startColumnResize('email', e)}
                              className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                              aria-label="Resize Email column"
                            />
                          </th>
                          {showRestaurantColumn && (
                            <th className="relative text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Restaurant
                              <button
                                type="button"
                                onMouseDown={(e) => startColumnResize('restaurant', e)}
                                className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                aria-label="Resize Restaurant column"
                              />
                            </th>
                          )}
                          <th className="relative text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Role
                            <button
                              type="button"
                              onMouseDown={(e) => startColumnResize('role', e)}
                              className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                              aria-label="Resize Role column"
                            />
                          </th>
                          <th className="relative text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Status
                            <button
                              type="button"
                              onMouseDown={(e) => startColumnResize('status', e)}
                              className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                              aria-label="Resize Status column"
                            />
                          </th>
                          <th className="relative text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Last Login
                            <button
                              type="button"
                              onMouseDown={(e) => startColumnResize('lastLogin', e)}
                              className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                              aria-label="Resize Last Login column"
                            />
                          </th>
                          {canManageStaff && (
                            <th className="relative text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Actions
                              <button
                                type="button"
                                onMouseDown={(e) => startColumnResize('actions', e)}
                                className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                aria-label="Resize Actions column"
                              />
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.length === 0 ? (
                          <tr>
                            <td colSpan={tableColumnCount} className="text-center py-8 text-gray-500 dark:text-gray-400">
                              No staff members found
                            </td>
                          </tr>
                        ) : (
                          filteredStaff.map((staff) => (
                              <tr key={staff._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="py-4 px-4">
                                  <div className="flex items-center space-x-3 min-w-0">
                                    {staff.profilePicture ? (
                                      <img
                                        src={staff.profilePicture}
                                        alt={staff.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className={`w-10 h-10 ${getAvatarColor(staff.name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                                        {staff.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="font-medium text-gray-800 dark:text-white truncate">{staff.name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm truncate">{staff.email}</td>
                                {showRestaurantColumn && (
                                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm truncate">
                                    {typeof staff.restaurantId === 'object' &&
                                    staff.restaurantId !== null &&
                                    'name' in staff.restaurantId
                                      ? staff.restaurantId.name
                                      : restaurantName}
                                  </td>
                                )}
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(staff.role)}`}>
                                    {formatRoleLabel(staff.role)}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${staff.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{staff.isActive ? 'Active' : 'Inactive'}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm">{formatLastLogin(staff.lastLogin)}</td>
                                {canManageStaff && (
                                  <td className="py-4 px-4">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleEditStaff(staff)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                                        title="Edit"
                                        disabled={staff.role === 'owner' && !isPlatformAdmin}
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      {canDeleteStaff && staff.role !== 'owner' && (
                                        <button
                                          onClick={() => {
                                            setSelectedStaff(staff);
                                            setIsDeleteModalOpen(true);
                                          }}
                                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                          title="Delete"
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column - Statistics and Permissions */}
              <div className="space-y-6">
                {/* Team Statistics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Team Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Total Staff</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white">{totalStaff}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Active Members</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white">{activeMembers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Managers</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white">{managers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Pending Invitations</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white">{pendingInvitations}</span>
                    </div>
                  </div>
                </div>

                {/* Permission Levels */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Permission Levels</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                          Owner
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Full access including billing and subscription management
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                          Manager
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Can manage menu, staff, and generate reports
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          Staff
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Can view menu and update item availability
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            </> )}
          </div>
        </main>
      </div>

      {/* Invite Staff Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm" onClick={() => setIsInviteModalOpen(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-lg w-full transform transition-all" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Invite Team Member</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Send secure access to your staff dashboard.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleInviteStaff} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={inviteForm.name}
                        onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g. Sarah Ahmed"
                        required
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) =>
                          setInviteForm({
                            ...inviteForm,
                            role: e.target.value as RestaurantTeamRole
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        {rolesAssignableOnInvite().map((r) => (
                          <option key={r} value={r}>
                            {formatRoleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="name@restaurant.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Temporary Password</label>
                    <input
                      type="password"
                      value={inviteForm.password}
                      onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      The team member can update this after first login.
                    </p>
                  </div>

                  <div className="rounded-lg border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2.5">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300">
                      {isPlatformAdmin
                        ? 'Platform admins can add owners, managers, or staff for this workspace. Owners and managers can only add managers and staff. Staff cannot invite anyone.'
                        : 'Owners and managers can add managers and staff. Staff can only view team details.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-6 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/30 flex items-center space-x-2"
                    >
                      {inviteLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Inviting...</span>
                        </>
                      ) : (
                        <span>Invite Staff</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full transform transition-all" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Staff Member</h3>
                  <button
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedStaff(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleUpdateStaff} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                    {selectedStaff.role === 'owner' ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                        {formatRoleLabel('owner')} — role cannot be changed here.
                      </p>
                    ) : (
                      <select
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm({ ...editForm, role: e.target.value as RestaurantTeamRole })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        {rolesAssignableOnEdit(selectedStaff).map((r) => (
                          <option key={r} value={r}>
                            {formatRoleLabel(r)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active
                    </label>
                  </div>
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setSelectedStaff(null);
                      }}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="px-6 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/30 flex items-center space-x-2"
                    >
                      {editLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Update Staff</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedStaff(null);
        }}
        onConfirm={handleDeleteStaff}
        itemName={selectedStaff?.name || ''}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Staff;
