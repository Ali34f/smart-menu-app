import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { staffService, type RestaurantTeamRole, type StaffMemberRecord } from '../services/staffService';
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
import {
  JOB_ROLE_OTHER,
  RESTAURANT_JOB_ROLE_GROUPS,
  parseJobTitleForForm,
  resolvedJobTitleForApi
} from '../constants/restaurantJobRoles';

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' }
];

const CONTRACT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not set' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'zero_hours', label: 'Zero-hours' },
  { value: 'fixed_term', label: 'Fixed-term / temporary' },
  { value: 'casual', label: 'Casual' },
  { value: 'apprenticeship', label: 'Apprenticeship' }
];

const PAYMENT_FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not set' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'four_weekly', label: 'Four-weekly' }
];

const fieldInputClass =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60';
const fieldInputClassInvite =
  'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500';

type StaffMember = StaffMemberRecord;

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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
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

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    role: 'staff' as RestaurantTeamRole,
    isActive: true,
    age: '' as string | number,
    gender: '' as string,
    jobRoleSelect: '',
    jobRoleCustom: '',
    hourlyRate: '' as string | number,
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    startDate: '',
    notesInternal: '',
    contractType: '',
    paymentFrequency: '',
    hoursPerWeek: '' as string | number,
    niNumber: '',
    taxCode: '',
    addressLine1: '',
    addressLine2: '',
    townCity: '',
    county: '',
    postcode: '',
    bankAccountHolderName: '',
    bankSortCode: '',
    bankAccountNumber: ''
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
    role: 'staff' as RestaurantTeamRole,
    age: '' as string | number,
    gender: '' as string,
    jobRoleSelect: '',
    jobRoleCustom: '',
    hourlyRate: '' as string | number,
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    startDate: '',
    notesInternal: '',
    contractType: '',
    paymentFrequency: '',
    hoursPerWeek: '' as string | number,
    niNumber: '',
    taxCode: '',
    addressLine1: '',
    addressLine2: '',
    townCity: '',
    county: '',
    postcode: '',
    bankAccountHolderName: '',
    bankSortCode: '',
    bankAccountNumber: ''
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

  const requiresInviteHr = inviteForm.role === 'staff' || inviteForm.role === 'manager';

  const syncProfileFormFromMember = (m: StaffMemberRecord) => {
    const sp = m.staffProfile || {};
    const start =
      sp.startDate != null ? String(sp.startDate).slice(0, 10) : '';
    const { selectValue, customTitle } = parseJobTitleForForm(sp.jobTitle);
    setProfileForm({
      name: m.name || '',
      email: m.email || '',
      role: (m.role as RestaurantTeamRole) || 'staff',
      isActive: m.isActive !== false,
      age: sp.age != null ? sp.age : '',
      gender: sp.gender != null ? String(sp.gender) : '',
      jobRoleSelect: selectValue,
      jobRoleCustom: customTitle,
      hourlyRate: sp.hourlyRate != null ? sp.hourlyRate : '',
      phone: sp.phone != null ? String(sp.phone) : '',
      emergencyContactName: sp.emergencyContactName != null ? String(sp.emergencyContactName) : '',
      emergencyContactPhone: sp.emergencyContactPhone != null ? String(sp.emergencyContactPhone) : '',
      startDate: start,
      notesInternal: sp.notesInternal != null ? String(sp.notesInternal) : '',
      contractType: sp.contractType != null ? String(sp.contractType) : '',
      paymentFrequency: sp.paymentFrequency != null ? String(sp.paymentFrequency) : '',
      hoursPerWeek: sp.hoursPerWeek != null ? sp.hoursPerWeek : '',
      niNumber: sp.niNumber != null ? String(sp.niNumber) : '',
      taxCode: sp.taxCode != null ? String(sp.taxCode) : '',
      addressLine1: sp.addressLine1 != null ? String(sp.addressLine1) : '',
      addressLine2: sp.addressLine2 != null ? String(sp.addressLine2) : '',
      townCity: sp.townCity != null ? String(sp.townCity) : '',
      county: sp.county != null ? String(sp.county) : '',
      postcode: sp.postcode != null ? String(sp.postcode) : '',
      bankAccountHolderName: sp.bankAccountHolderName != null ? String(sp.bankAccountHolderName) : '',
      bankSortCode: sp.bankSortCode != null ? String(sp.bankSortCode) : '',
      bankAccountNumber: sp.bankAccountNumber != null ? String(sp.bankAccountNumber) : ''
    });
  };

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

    if (requiresInviteHr) {
      const ageNum = Number(inviteForm.age);
      if (!Number.isFinite(ageNum) || ageNum < 16 || ageNum > 100) {
        showError('Enter a valid age between 16 and 100');
        return;
      }
      if (!inviteForm.gender) {
        showError('Please select a gender');
        return;
      }
      const inviteTitle = resolvedJobTitleForApi(
        inviteForm.jobRoleSelect,
        inviteForm.jobRoleCustom
      ).trim().slice(0, 80);
      if (!inviteTitle) {
        showError('Choose a restaurant job role from the list, or pick Other and type a custom title');
        return;
      }
      if (inviteForm.jobRoleSelect === JOB_ROLE_OTHER && !inviteForm.jobRoleCustom.trim()) {
        showError('Enter a custom job role, or choose a preset from the list instead of Other');
        return;
      }
      const rate = Number(inviteForm.hourlyRate);
      if (!Number.isFinite(rate) || rate < 0) {
        showError('Enter a valid hourly rate in GBP');
        return;
      }
      const hwInvite = inviteForm.hoursPerWeek;
      if (hwInvite !== '' && hwInvite != null) {
        const hwn = Number(hwInvite);
        if (!Number.isFinite(hwn) || hwn < 0 || hwn > 168) {
          showError('Hours per week must be between 0 and 168');
          return;
        }
      }
    }

    try {
      setInviteLoading(true);
      const payload: Parameters<typeof staffService.addStaff>[0] = {
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        password: inviteForm.password,
        role: inviteForm.role
      };
      if (requiresInviteHr) {
        payload.age = Number(inviteForm.age);
        payload.gender = inviteForm.gender;
        payload.jobTitle = resolvedJobTitleForApi(
          inviteForm.jobRoleSelect,
          inviteForm.jobRoleCustom
        ).trim().slice(0, 80);
        payload.hourlyRate = Number(inviteForm.hourlyRate);
        payload.phone = inviteForm.phone.trim() || undefined;
        payload.emergencyContactName = inviteForm.emergencyContactName.trim() || undefined;
        payload.emergencyContactPhone = inviteForm.emergencyContactPhone.trim() || undefined;
        payload.startDate = inviteForm.startDate || undefined;
        payload.notesInternal = inviteForm.notesInternal.trim() || undefined;
        if (inviteForm.contractType) payload.contractType = inviteForm.contractType;
        if (inviteForm.paymentFrequency) payload.paymentFrequency = inviteForm.paymentFrequency;
        const hwnum = inviteForm.hoursPerWeek;
        if (hwnum !== '' && hwnum != null) payload.hoursPerWeek = Number(hwnum);
        if (inviteForm.niNumber.trim()) payload.niNumber = inviteForm.niNumber.trim();
        if (inviteForm.taxCode.trim()) payload.taxCode = inviteForm.taxCode.trim();
        if (inviteForm.addressLine1.trim()) payload.addressLine1 = inviteForm.addressLine1.trim();
        if (inviteForm.addressLine2.trim()) payload.addressLine2 = inviteForm.addressLine2.trim();
        if (inviteForm.townCity.trim()) payload.townCity = inviteForm.townCity.trim();
        if (inviteForm.county.trim()) payload.county = inviteForm.county.trim();
        if (inviteForm.postcode.trim()) payload.postcode = inviteForm.postcode.trim();
        if (inviteForm.bankAccountHolderName.trim()) {
          payload.bankAccountHolderName = inviteForm.bankAccountHolderName.trim();
        }
        if (inviteForm.bankSortCode.trim()) payload.bankSortCode = inviteForm.bankSortCode.trim();
        if (inviteForm.bankAccountNumber.trim()) {
          payload.bankAccountNumber = inviteForm.bankAccountNumber.replace(/\s/g, '');
        }
      }
      await staffService.addStaff(payload);
      toast.success('Staff member invited successfully');
      setIsInviteModalOpen(false);
      setInviteForm({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        age: '',
        gender: '',
        jobRoleSelect: '',
        jobRoleCustom: '',
        hourlyRate: '',
        phone: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        startDate: '',
        notesInternal: '',
        contractType: '',
        paymentFrequency: '',
        hoursPerWeek: '',
        niNumber: '',
        taxCode: '',
        addressLine1: '',
        addressLine2: '',
        townCity: '',
        county: '',
        postcode: '',
        bankAccountHolderName: '',
        bankSortCode: '',
        bankAccountNumber: ''
      });
      fetchStaffMembers();
    } catch (error: any) {
      console.error('Error inviting staff:', error);
      showError(error.response?.data?.message || 'Failed to invite staff member');
    } finally {
      setInviteLoading(false);
    }
  };

  const openStaffProfile = async (staff: StaffMember) => {
    if (!canManageStaff) return;
    if (staff.role === 'owner' && !isPlatformAdmin) {
      showError('Only a platform admin can view or edit owner account details');
      return;
    }
    setSelectedStaff(staff);
    setIsProfileModalOpen(true);
    setProfileEditMode(false);
    setProfileLoading(true);
    try {
      const res = await staffService.getStaffMember(staff._id);
      if (res.data) {
        setSelectedStaff(res.data);
        syncProfileFormFromMember(res.data);
      }
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      showError(err.response?.data?.message || 'Could not load staff profile');
      setIsProfileModalOpen(false);
      setSelectedStaff(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      setProfileSaveLoading(true);
      const ageNum = Number(profileForm.age);
      const rateNum = Number(profileForm.hourlyRate);
      if (!Number.isFinite(ageNum) || ageNum < 16 || ageNum > 100) {
        showError('Age must be between 16 and 100');
        setProfileSaveLoading(false);
        return;
      }
      if (!profileForm.gender) {
        showError('Please select a gender');
        setProfileSaveLoading(false);
        return;
      }
      const profileJobTitle = resolvedJobTitleForApi(
        profileForm.jobRoleSelect,
        profileForm.jobRoleCustom
      ).trim().slice(0, 80);
      if (!profileJobTitle) {
        showError('Job role at the restaurant is required');
        setProfileSaveLoading(false);
        return;
      }
      if (profileForm.jobRoleSelect === JOB_ROLE_OTHER && !profileForm.jobRoleCustom.trim()) {
        showError('Enter a custom job role, or choose a preset from the list');
        setProfileSaveLoading(false);
        return;
      }
      if (!Number.isFinite(rateNum) || rateNum < 0) {
        showError('Hourly rate must be a valid non-negative number');
        setProfileSaveLoading(false);
        return;
      }

      const hpwEmpty = profileForm.hoursPerWeek === '' || profileForm.hoursPerWeek == null;
      if (!hpwEmpty) {
        const hw = Number(profileForm.hoursPerWeek);
        if (!Number.isFinite(hw) || hw < 0 || hw > 168) {
          showError('Hours per week must be between 0 and 168');
          setProfileSaveLoading(false);
          return;
        }
      }

      const basePayload =
        selectedStaff.role === 'owner'
          ? {
              name: profileForm.name.trim(),
              email: profileForm.email.trim(),
              isActive: profileForm.isActive
            }
          : {
              name: profileForm.name.trim(),
              email: profileForm.email.trim(),
              role: profileForm.role,
              isActive: profileForm.isActive
            };

      await staffService.updateStaff(selectedStaff._id, {
        ...basePayload,
        staffProfile: {
          age: ageNum,
          gender: profileForm.gender,
          jobTitle: profileJobTitle,
          hourlyRate: rateNum,
          phone: profileForm.phone.trim() || null,
          emergencyContactName: profileForm.emergencyContactName.trim() || null,
          emergencyContactPhone: profileForm.emergencyContactPhone.trim() || null,
          startDate: profileForm.startDate || null,
          notesInternal: profileForm.notesInternal.trim() || null,
          contractType: profileForm.contractType.trim() || null,
          paymentFrequency: profileForm.paymentFrequency.trim() || null,
          hoursPerWeek:
            profileForm.hoursPerWeek === '' || profileForm.hoursPerWeek == null
              ? null
              : Number(profileForm.hoursPerWeek),
          niNumber: profileForm.niNumber.trim() || null,
          taxCode: profileForm.taxCode.trim() || null,
          addressLine1: profileForm.addressLine1.trim() || null,
          addressLine2: profileForm.addressLine2.trim() || null,
          townCity: profileForm.townCity.trim() || null,
          county: profileForm.county.trim() || null,
          postcode: profileForm.postcode.trim() || null,
          bankAccountHolderName: profileForm.bankAccountHolderName.trim() || null,
          bankSortCode: profileForm.bankSortCode.trim().replace(/\D/g, '') || null,
          bankAccountNumber: profileForm.bankAccountNumber.trim().replace(/\s/g, '') || null
        }
      });
      toast.success('Profile updated');
      setProfileEditMode(false);
      fetchStaffMembers();
      const refreshed = await staffService.getStaffMember(selectedStaff._id);
      if (refreshed.data) {
        setSelectedStaff(refreshed.data);
        syncProfileFormFromMember(refreshed.data);
      }
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      showError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setProfileSaveLoading(false);
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

  const formatLastLogin = (lastLogin?: string | null) => {
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
                                    {canManageStaff ? (
                                      <button
                                        type="button"
                                        onClick={() => openStaffProfile(staff)}
                                        className={`font-medium text-gray-800 dark:text-white truncate text-left hover:text-green-600 dark:hover:text-green-400 hover:underline ${
                                          staff.role === 'owner' && !isPlatformAdmin ? 'cursor-not-allowed opacity-60' : ''
                                        }`}
                                        disabled={staff.role === 'owner' && !isPlatformAdmin}
                                        title="View employment profile"
                                      >
                                        {staff.name}
                                      </button>
                                    ) : (
                                      <span className="font-medium text-gray-800 dark:text-white truncate">{staff.name}</span>
                                    )}
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
                                        type="button"
                                        onClick={() => openStaffProfile(staff)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                                        title="Open profile"
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
                        Can view menu and update item availability. Team-only users do not see payroll or HR fields; only owners, managers, and platform admins can enter and edit employment details.
                      </p>
                    </div>
                  </div>
                </div>

                {canManageStaff && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">HR beyond this screen</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Contracts, NI, bank details, hours, and tax codes can be captured in each team member profile (visible only to
                      owners, managers, and platform admins). For full compliance you may still need{' '}
                      <strong className="text-gray-800 dark:text-gray-200">right-to-work evidence</strong>,{' '}
                      <strong>pension opt-out / enrolment</strong>, <strong>holiday accrual from your payroll software</strong>, and{' '}
                      <strong>training or food-hygiene certificates</strong>. Use internal notes for renewal dates, or attach documents
                      in your payroll or HR system — this app does not store uploads.
                    </p>
                  </div>
                )}
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
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <div
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-5xl xl:max-w-6xl w-full transform transition-all max-h-[93vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8">
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

                  {(inviteForm.role === 'staff' || inviteForm.role === 'manager') && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-5 mt-2">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Employment details</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          Required for managers and staff. The assigned restaurant is the workspace you have open now.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Age</label>
                            <input
                              type="number"
                              min={16}
                              max={100}
                              value={inviteForm.age}
                              onChange={(e) => setInviteForm({ ...inviteForm, age: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="e.g. 22"
                              required={inviteForm.role === 'staff' || inviteForm.role === 'manager'}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender</label>
                            <select
                              value={inviteForm.gender}
                              onChange={(e) => setInviteForm({ ...inviteForm, gender: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              required={inviteForm.role === 'staff' || inviteForm.role === 'manager'}
                            >
                              <option value="">Select…</option>
                              {GENDER_OPTIONS.map((g) => (
                                <option key={g.value || 'x'} value={g.value || ''}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Job role at restaurant
                            </label>
                            <select
                              value={inviteForm.jobRoleSelect}
                              onChange={(e) => {
                                const v = e.target.value;
                                setInviteForm((f) => ({
                                  ...f,
                                  jobRoleSelect: v,
                                  jobRoleCustom: v === JOB_ROLE_OTHER ? f.jobRoleCustom : ''
                                }));
                              }}
                              className={fieldInputClassInvite}
                              required={inviteForm.role === 'staff' || inviteForm.role === 'manager'}
                            >
                              <option value="">Select job role…</option>
                              {RESTAURANT_JOB_ROLE_GROUPS.map((grp) => (
                                <optgroup key={grp.group} label={grp.group}>
                                  {grp.roles.map((roleLabel) => (
                                    <option key={`${grp.group}-${roleLabel}`} value={roleLabel}>
                                      {roleLabel}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                              <option value={JOB_ROLE_OTHER}>Other (specify)</option>
                            </select>
                            {inviteForm.jobRoleSelect === JOB_ROLE_OTHER && (
                              <input
                                type="text"
                                value={inviteForm.jobRoleCustom}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, jobRoleCustom: e.target.value })
                                }
                                className={`${fieldInputClassInvite} mt-2`}
                                placeholder="Custom job title"
                                maxLength={80}
                                required={
                                  inviteForm.role === 'staff' || inviteForm.role === 'manager'
                                }
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Hourly pay (GBP)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={inviteForm.hourlyRate}
                              onChange={(e) => setInviteForm({ ...inviteForm, hourlyRate: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="e.g. 12.50"
                              required={inviteForm.role === 'staff' || inviteForm.role === 'manager'}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Work phone (optional)
                            </label>
                            <input
                              type="text"
                              value={inviteForm.phone}
                              onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Mobile for shift contact"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Emergency contact name
                            </label>
                            <input
                              type="text"
                              value={inviteForm.emergencyContactName}
                              onChange={(e) =>
                                setInviteForm({ ...inviteForm, emergencyContactName: e.target.value })
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Emergency contact phone
                            </label>
                            <input
                              type="text"
                              value={inviteForm.emergencyContactPhone}
                              onChange={(e) =>
                                setInviteForm({ ...inviteForm, emergencyContactPhone: e.target.value })
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Start date (optional)
                            </label>
                            <input
                              type="date"
                              value={inviteForm.startDate}
                              onChange={(e) => setInviteForm({ ...inviteForm, startDate: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Internal notes (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={inviteForm.notesInternal}
                              onChange={(e) =>
                                setInviteForm({ ...inviteForm, notesInternal: e.target.value })
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                              placeholder="Visa check due, training, uniform size…"
                              maxLength={500}
                            />
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 pt-5 mt-5">
                          <h5 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
                            Contract & payroll (optional)
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Employment type
                              </label>
                              <select
                                value={inviteForm.contractType}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, contractType: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              >
                                {CONTRACT_TYPE_OPTIONS.map((o) => (
                                  <option key={o.value || 'x'} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Pay frequency
                              </label>
                              <select
                                value={inviteForm.paymentFrequency}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, paymentFrequency: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              >
                                {PAYMENT_FREQUENCY_OPTIONS.map((o) => (
                                  <option key={o.value || 'x'} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Contract hours / week (optional)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={168}
                                step="0.25"
                                value={inviteForm.hoursPerWeek}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, hoursPerWeek: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                National Insurance no. (optional)
                              </label>
                              <input
                                type="text"
                                value={inviteForm.niNumber}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, niNumber: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Tax code (optional)
                              </label>
                              <input
                                type="text"
                                value={inviteForm.taxCode}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, taxCode: e.target.value })
                                }
                                className={fieldInputClassInvite}
                                placeholder="e.g. 1257L"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 pt-5 mt-5">
                          <h5 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
                            Home address (optional)
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Address line 1
                              </label>
                              <input
                                type="text"
                                value={inviteForm.addressLine1}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, addressLine1: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Address line 2
                              </label>
                              <input
                                type="text"
                                value={inviteForm.addressLine2}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, addressLine2: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Town / city
                              </label>
                              <input
                                type="text"
                                value={inviteForm.townCity}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, townCity: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                County
                              </label>
                              <input
                                type="text"
                                value={inviteForm.county}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, county: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Postcode
                              </label>
                              <input
                                type="text"
                                value={inviteForm.postcode}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, postcode: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 pt-5 mt-5">
                          <h5 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
                            Bank payments (optional)
                          </h5>
                          <p className="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-900/25 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-3">
                            Bank details are sensitive. Restrict database and admin access — consider encryption at rest for
                            production.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Account holder name
                              </label>
                              <input
                                type="text"
                                value={inviteForm.bankAccountHolderName}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, bankAccountHolderName: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Sort code (6 digits)
                              </label>
                              <input
                                type="text"
                                value={inviteForm.bankSortCode}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, bankSortCode: e.target.value })
                                }
                                className={fieldInputClassInvite}
                                placeholder="12-34-56"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Account number
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={inviteForm.bankAccountNumber}
                                onChange={(e) =>
                                  setInviteForm({ ...inviteForm, bankAccountNumber: e.target.value })
                                }
                                className={fieldInputClassInvite}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

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

      {/* Staff profile modal (managers / owners / platform admins only) */}
      {isProfileModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
            onClick={() => {
              setIsProfileModalOpen(false);
              setSelectedStaff(null);
              setProfileEditMode(false);
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <div
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl xl:max-w-6xl w-full max-h-[92vh] overflow-y-auto transform transition-all border border-gray-100 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Team member profile</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Account and employment details. Only owners, managers, and platform admins can edit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setSelectedStaff(null);
                      setProfileEditMode(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition shrink-0"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {profileLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <button
                        type="button"
                        onClick={() => setProfileEditMode(true)}
                        disabled={profileEditMode}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      {profileEditMode && selectedStaff && (
                        <button
                          type="button"
                          onClick={() => {
                            syncProfileFormFromMember(selectedStaff);
                            setProfileEditMode(false);
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                        >
                          Discard changes
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleProfileSave} className="space-y-5">
                      <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Restaurant</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {typeof selectedStaff.restaurantId === 'object' &&
                          selectedStaff.restaurantId &&
                          'name' in selectedStaff.restaurantId
                            ? selectedStaff.restaurantId.name
                            : restaurantName}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            disabled={!profileEditMode}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                          <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            disabled={!profileEditMode}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Dashboard permission
                          </label>
                          {selectedStaff.role === 'owner' ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                              Owner — role cannot be changed here.
                            </p>
                          ) : (
                            <select
                              value={profileForm.role}
                              onChange={(e) =>
                                setProfileForm({ ...profileForm, role: e.target.value as RestaurantTeamRole })
                              }
                              disabled={!profileEditMode}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            >
                              {rolesAssignableOnEdit(selectedStaff).map((r) => (
                                <option key={r} value={r}>
                                  {formatRoleLabel(r)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="flex items-center pt-6">
                          <input
                            type="checkbox"
                            id="profileActive"
                            checked={profileForm.isActive}
                            onChange={(e) => setProfileForm({ ...profileForm, isActive: e.target.checked })}
                            disabled={!profileEditMode}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded"
                          />
                          <label htmlFor="profileActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Account active
                          </label>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-600 pt-5">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Employment & contact</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
                            <input
                              type="number"
                              min={16}
                              max={100}
                              value={profileForm.age}
                              onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                              disabled={!profileEditMode}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                            <select
                              value={profileForm.gender}
                              onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                              disabled={!profileEditMode}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            >
                              <option value="">Select…</option>
                              {GENDER_OPTIONS.map((g) => (
                                <option key={g.value} value={g.value}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Job role at restaurant
                            </label>
                            <select
                              value={profileForm.jobRoleSelect}
                              onChange={(e) => {
                                const v = e.target.value;
                                setProfileForm((f) => ({
                                  ...f,
                                  jobRoleSelect: v,
                                  jobRoleCustom: v === JOB_ROLE_OTHER ? f.jobRoleCustom : ''
                                }));
                              }}
                              disabled={!profileEditMode}
                              className={fieldInputClass}
                            >
                              <option value="">Select job role…</option>
                              {RESTAURANT_JOB_ROLE_GROUPS.map((grp) => (
                                <optgroup key={grp.group} label={grp.group}>
                                  {grp.roles.map((roleLabel) => (
                                    <option key={`${grp.group}-${roleLabel}`} value={roleLabel}>
                                      {roleLabel}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                              <option value={JOB_ROLE_OTHER}>Other (specify)</option>
                            </select>
                            {profileForm.jobRoleSelect === JOB_ROLE_OTHER && (
                              <input
                                type="text"
                                value={profileForm.jobRoleCustom}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, jobRoleCustom: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={`${fieldInputClass} mt-2`}
                                placeholder="Custom job title"
                                maxLength={80}
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Hourly pay (GBP)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={profileForm.hourlyRate}
                              onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: e.target.value })}
                              disabled={!profileEditMode}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Work phone
                            </label>
                            <input
                              type="text"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              disabled={!profileEditMode}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Emergency contact name
                            </label>
                            <input
                              type="text"
                              value={profileForm.emergencyContactName}
                              onChange={(e) =>
                                setProfileForm({ ...profileForm, emergencyContactName: e.target.value })
                              }
                              disabled={!profileEditMode}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Emergency contact phone
                            </label>
                            <input
                              type="text"
                              value={profileForm.emergencyContactPhone}
                              onChange={(e) =>
                                setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })
                              }
                              disabled={!profileEditMode}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Start date
                            </label>
                            <input
                              type="date"
                              value={profileForm.startDate}
                              onChange={(e) => setProfileForm({ ...profileForm, startDate: e.target.value })}
                              disabled={!profileEditMode}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-60"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Internal notes
                            </label>
                            <textarea
                              rows={3}
                              value={profileForm.notesInternal}
                              onChange={(e) =>
                                setProfileForm({ ...profileForm, notesInternal: e.target.value })
                              }
                              disabled={!profileEditMode}
                              className={`${fieldInputClass} text-sm`}
                              maxLength={500}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                          <div className="space-y-4">
                            <h5 className="text-sm font-semibold text-gray-800 dark:text-white">
                              Contract & payroll
                            </h5>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Employment type
                              </label>
                              <select
                                value={profileForm.contractType}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, contractType: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              >
                                {CONTRACT_TYPE_OPTIONS.map((o) => (
                                  <option key={o.value || 'y'} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Pay frequency
                              </label>
                              <select
                                value={profileForm.paymentFrequency}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, paymentFrequency: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              >
                                {PAYMENT_FREQUENCY_OPTIONS.map((o) => (
                                  <option key={o.value || 'y'} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Contract hours / week
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={168}
                                step="0.25"
                                value={profileForm.hoursPerWeek}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, hoursPerWeek: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                National Insurance number
                              </label>
                              <input
                                type="text"
                                value={profileForm.niNumber}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, niNumber: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tax code (PAYE)
                              </label>
                              <input
                                type="text"
                                value={profileForm.taxCode}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, taxCode: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h5 className="text-sm font-semibold text-gray-800 dark:text-white">
                              Home address
                            </h5>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address line 1
                              </label>
                              <input
                                type="text"
                                value={profileForm.addressLine1}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, addressLine1: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address line 2
                              </label>
                              <input
                                type="text"
                                value={profileForm.addressLine2}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, addressLine2: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Town / city
                                </label>
                                <input
                                  type="text"
                                  value={profileForm.townCity}
                                  onChange={(e) =>
                                    setProfileForm({ ...profileForm, townCity: e.target.value })
                                  }
                                  disabled={!profileEditMode}
                                  className={fieldInputClass}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  County
                                </label>
                                <input
                                  type="text"
                                  value={profileForm.county}
                                  onChange={(e) =>
                                    setProfileForm({ ...profileForm, county: e.target.value })
                                  }
                                  disabled={!profileEditMode}
                                  className={fieldInputClass}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Postcode
                              </label>
                              <input
                                type="text"
                                value={profileForm.postcode}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, postcode: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                          <h5 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">
                            Bank payments (BACS)
                          </h5>
                          <p className="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-900/25 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4">
                            Store only what you need for payroll. Restrict access to this data and your database backups.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Account holder name
                              </label>
                              <input
                                type="text"
                                value={profileForm.bankAccountHolderName}
                                onChange={(e) =>
                                  setProfileForm({
                                    ...profileForm,
                                    bankAccountHolderName: e.target.value
                                  })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Sort code (6 digits)
                              </label>
                              <input
                                type="text"
                                value={profileForm.bankSortCode}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, bankSortCode: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Account number
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={profileForm.bankAccountNumber}
                                onChange={(e) =>
                                  setProfileForm({ ...profileForm, bankAccountNumber: e.target.value })
                                }
                                disabled={!profileEditMode}
                                className={fieldInputClass}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {profileEditMode && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={profileSaveLoading}
                            className="px-6 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50"
                          >
                            {profileSaveLoading ? 'Saving…' : 'Save changes'}
                          </button>
                        </div>
                      )}
                    </form>
                  </>
                )}
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
