const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');
const { createNotification } = require('../utils/notificationHelper');
const { assertStaffCapacity } = require('../config/plans');

const isPlatformAdminRole = (role) => role === 'platform_admin' || role === 'super_owner';
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const RESTAURANT_TEAM_ROLES = ['owner', 'manager', 'staff'];
const GENDERS = new Set(['female', 'male', 'non_binary', 'prefer_not_say', 'other']);
const CONTRACT_TYPES = new Set([
  'full_time',
  'part_time',
  'zero_hours',
  'fixed_term',
  'casual',
  'apprenticeship'
]);
const PAYMENT_FREQUENCIES = new Set(['weekly', 'fortnightly', 'monthly', 'four_weekly']);

/** Keys accepted on PUT / POST body (flat or under staffProfile) */
const HR_PROFILE_KEYS = [
  'age',
  'gender',
  'jobTitle',
  'hourlyRate',
  'phone',
  'emergencyContactName',
  'emergencyContactPhone',
  'startDate',
  'notesInternal',
  'contractType',
  'addressLine1',
  'addressLine2',
  'townCity',
  'county',
  'postcode',
  'niNumber',
  'taxCode',
  'paymentFrequency',
  'hoursPerWeek',
  'bankAccountHolderName',
  'bankSortCode',
  'bankAccountNumber'
];

const rolesActorMayAssign = (actorRole) => {
  if (isPlatformAdminRole(actorRole)) {
    return ['owner', 'manager', 'staff'];
  }
  if (actorRole === 'owner' || actorRole === 'manager') {
    return ['manager', 'staff'];
  }
  return [];
};

const assertMayAssignRole = (actorRole, targetRole) => {
  if (!RESTAURANT_TEAM_ROLES.includes(targetRole)) {
    return 'Invalid role for a restaurant team member.';
  }
  const allowed = rolesActorMayAssign(actorRole);
  if (!allowed.includes(targetRole)) {
    return `Your role cannot assign "${targetRole}". Owners and managers may only add managers and staff. Platform admins may add owners, managers, and staff.`;
  }
  return null;
};

const canViewStaffHr = (role) =>
  role === 'owner' ||
  role === 'manager' ||
  role === 'platform_admin' ||
  role === 'super_owner';

const toPlainStaff = (doc) => {
  if (!doc) return null;
  const o =
    typeof doc.toObject === 'function'
      ? doc.toObject()
      : JSON.parse(JSON.stringify(doc));
  delete o.password;
  return o;
};

/** Strip payroll/HR fields for dashboard `staff` role viewers. */
const serializeStaffMember = (doc, includeHr) => {
  const o = toPlainStaff(doc);
  if (!includeHr && o && o.staffProfile) {
    delete o.staffProfile;
  }
  return o;
};

const normalizeGender = (g) => {
  const s = String(g || '').trim().toLowerCase();
  return GENDERS.has(s) ? s : null;
};

const parseOptionalDate = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeOptionalContractType = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (!CONTRACT_TYPES.has(s)) return { error: 'Invalid contract type' };
  return { value: s };
};

const normalizeOptionalPaymentFrequency = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (!PAYMENT_FREQUENCIES.has(s)) return { error: 'Invalid payment frequency' };
  return { value: s };
};

const normalizeOptionalSortCode = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const digits = String(v).replace(/\D/g, '');
  if (digits.length !== 6) {
    return { error: 'Sort code must be 6 digits (UK)' };
  }
  return { value: digits };
};

const assignOptionalHrFields = (out, body) => {
  const {
    contractType,
    addressLine1,
    addressLine2,
    townCity,
    county,
    postcode,
    niNumber,
    taxCode,
    paymentFrequency,
    hoursPerWeek,
    bankAccountHolderName,
    bankSortCode,
    bankAccountNumber
  } = body;

  if (contractType !== undefined) {
    if (contractType === '' || contractType == null) out.contractType = null;
    else {
      const c = normalizeOptionalContractType(contractType);
      if (c && c.error) return c;
      out.contractType = c.value;
    }
  }
  if (addressLine1 !== undefined) {
    out.addressLine1 =
      addressLine1 === '' || addressLine1 == null
        ? null
        : String(addressLine1).trim().slice(0, 120);
  }
  if (addressLine2 !== undefined) {
    out.addressLine2 =
      addressLine2 === '' || addressLine2 == null
        ? null
        : String(addressLine2).trim().slice(0, 120);
  }
  if (townCity !== undefined) {
    out.townCity =
      townCity === '' || townCity == null ? null : String(townCity).trim().slice(0, 80);
  }
  if (county !== undefined) {
    out.county = county === '' || county == null ? null : String(county).trim().slice(0, 80);
  }
  if (postcode !== undefined) {
    out.postcode =
      postcode === '' || postcode == null ? null : String(postcode).trim().slice(0, 16);
  }
  if (niNumber !== undefined) {
    out.niNumber =
      niNumber === '' || niNumber == null ? null : String(niNumber).trim().toUpperCase().slice(0, 16);
  }
  if (taxCode !== undefined) {
    out.taxCode =
      taxCode === '' || taxCode == null ? null : String(taxCode).trim().toUpperCase().slice(0, 16);
  }
  if (paymentFrequency !== undefined) {
    if (paymentFrequency === '' || paymentFrequency == null) out.paymentFrequency = null;
    else {
      const p = normalizeOptionalPaymentFrequency(paymentFrequency);
      if (p && p.error) return p;
      out.paymentFrequency = p.value;
    }
  }
  if (hoursPerWeek !== undefined) {
    if (hoursPerWeek === '' || hoursPerWeek == null) out.hoursPerWeek = null;
    else {
      const n = Number(hoursPerWeek);
      if (!Number.isFinite(n) || n < 0 || n > 168) {
        return { error: 'Hours per week must be between 0 and 168' };
      }
      out.hoursPerWeek = Math.round(n * 100) / 100;
    }
  }
  if (bankAccountHolderName !== undefined) {
    out.bankAccountHolderName =
      bankAccountHolderName === '' || bankAccountHolderName == null
        ? null
        : String(bankAccountHolderName).trim().slice(0, 120);
  }
  if (bankSortCode !== undefined) {
    if (bankSortCode === '' || bankSortCode == null) out.bankSortCode = null;
    else {
      const sc = normalizeOptionalSortCode(bankSortCode);
      if (sc && sc.error) return sc;
      out.bankSortCode = sc.value;
    }
  }
  if (bankAccountNumber !== undefined) {
    if (bankAccountNumber === '' || bankAccountNumber == null) out.bankAccountNumber = null;
    else {
      const acct = String(bankAccountNumber).replace(/\s/g, '');
      if (!/^\d{6,18}$/.test(acct)) {
        return { error: 'Account number must be 6–18 digits' };
      }
      out.bankAccountNumber = acct;
    }
  }
  return null;
};

/**
 * Build staffProfile from invite/update body. When requireAll is true (new manager/staff), age, gender, jobTitle, hourlyRate required.
 */
const buildStaffProfilePayload = (body, { requireAll }) => {
  const {
    age,
    gender,
    jobTitle,
    hourlyRate,
    phone,
    emergencyContactName,
    emergencyContactPhone,
    startDate,
    notesInternal
  } = body;

  if (!requireAll) {
    const out = {};
    if (age !== undefined) {
      if (age === '' || age === null) out.age = null;
      else {
        const n = Number(age);
        if (!Number.isFinite(n) || n < 16 || n > 100) {
          return { error: 'Age must be a number between 16 and 100' };
        }
        out.age = n;
      }
    }
    if (gender !== undefined) {
      const g = normalizeGender(gender);
      if (gender !== '' && gender != null && !g) {
        return { error: 'Invalid gender value' };
      }
      out.gender = g;
    }
    if (jobTitle !== undefined) {
      out.jobTitle = jobTitle === '' || jobTitle == null ? null : String(jobTitle).trim().slice(0, 80);
    }
    if (hourlyRate !== undefined) {
      if (hourlyRate === '' || hourlyRate == null) out.hourlyRate = null;
      else {
        const n = Number(hourlyRate);
        if (!Number.isFinite(n) || n < 0) {
          return { error: 'Hourly rate must be a non-negative number (GBP)' };
        }
        out.hourlyRate = Math.round(n * 100) / 100;
      }
    }
    if (phone !== undefined) {
      out.phone = phone === '' || phone == null ? null : String(phone).trim().slice(0, 20);
    }
    if (emergencyContactName !== undefined) {
      out.emergencyContactName =
        emergencyContactName === '' || emergencyContactName == null
          ? null
          : String(emergencyContactName).trim().slice(0, 80);
    }
    if (emergencyContactPhone !== undefined) {
      out.emergencyContactPhone =
        emergencyContactPhone === '' || emergencyContactPhone == null
          ? null
          : String(emergencyContactPhone).trim().slice(0, 20);
    }
    if (startDate !== undefined) {
      out.startDate = parseOptionalDate(startDate);
    }
    if (notesInternal !== undefined) {
      out.notesInternal =
        notesInternal === '' || notesInternal == null
          ? null
          : String(notesInternal).trim().slice(0, 500);
    }
    const hrExtrasErr = assignOptionalHrFields(out, body);
    if (hrExtrasErr) return hrExtrasErr;
    return { profile: out };
  }

  const nAge = Number(age);
  if (!Number.isFinite(nAge) || nAge < 16 || nAge > 100) {
    return { error: 'Please provide a valid age between 16 and 100' };
  }
  const g = normalizeGender(gender);
  if (!g) {
    return { error: 'Please select a gender option' };
  }
  const jt = String(jobTitle || '').trim();
  if (!jt) {
    return { error: 'Please provide a job title or role at the restaurant (e.g. Server, Chef)' };
  }
  const hr = Number(hourlyRate);
  if (!Number.isFinite(hr) || hr < 0) {
    return { error: 'Please provide a valid hourly pay rate in GBP' };
  }

  const profile = {
    age: nAge,
    gender: g,
    jobTitle: jt.slice(0, 80),
    hourlyRate: Math.round(hr * 100) / 100,
    phone: phone ? String(phone).trim().slice(0, 20) : null,
    emergencyContactName: emergencyContactName
      ? String(emergencyContactName).trim().slice(0, 80)
      : null,
    emergencyContactPhone: emergencyContactPhone
      ? String(emergencyContactPhone).trim().slice(0, 20)
      : null,
    startDate: parseOptionalDate(startDate),
    notesInternal: notesInternal ? String(notesInternal).trim().slice(0, 500) : null
  };
  const inviteExtrasErr = assignOptionalHrFields(profile, body);
  if (inviteExtrasErr) return inviteExtrasErr;
  return {
    profile
  };
};

const applyStaffProfilePatch = (staffDoc, patch) => {
  if (!patch || typeof patch !== 'object') return;
  staffDoc.staffProfile = staffDoc.staffProfile || {};
  for (const [k, v] of Object.entries(patch)) {
    staffDoc.staffProfile[k] = v;
  }
  staffDoc.markModified('staffProfile');
};

exports.getStaff = async (req, res, next) => {
  try {
    let staff = [];

    if (isPlatformAdminRole(req.user.role)) {
      if (!req.restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Select an active restaurant workspace before viewing staff'
        });
      }
      staff = await User.find({
        restaurantId: req.restaurantId,
        _id: { $ne: req.user.id }
      })
        .select('-password')
        .populate('restaurantId', 'name')
        .sort({ createdAt: -1 });
    } else {
      const userRestaurantId = req.user.restaurantId;

      if (!userRestaurantId) {
        return res.status(400).json({
          success: false,
          message: 'User does not have a restaurant assigned'
        });
      }

      staff = await User.find({
        restaurantId: userRestaurantId
      })
        .select('-password')
        .populate('restaurantId', 'name')
        .sort({ createdAt: -1 });
    }

    const pendingInvitations = await User.countDocuments({
      restaurantId: req.restaurantId,
      invitationAccepted: false
    });

    const includeHr = canViewStaffHr(req.user.role);
    const data = staff.map((u) => serializeStaffMember(u, includeHr));

    res.status(200).json({
      success: true,
      count: data.length,
      pendingInvitations,
      data
    });
  } catch (error) {
    console.error('Error in getStaff:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff',
      error: error.message
    });
  }
};

/** Full member record including HR — managers, owners, platform admins only (route enforced). */
exports.getStaffMember = async (req, res, next) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    })
      .select('-password')
      .populate('restaurantId', 'name');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    res.status(200).json({
      success: true,
      data: serializeStaffMember(staff, true)
    });
  } catch (error) {
    next(error);
  }
};

exports.addStaff = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { name, email, password, role } = body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role'
      });
    }

    if (!req.restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'No restaurant context — select an active restaurant workspace first'
      });
    }

    const assignErr = assertMayAssignRole(req.user.role, role);
    if (assignErr) {
      const status = assignErr.startsWith('Invalid') ? 400 : 403;
      return res.status(status).json({
        success: false,
        message: assignErr
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const restaurant = await Restaurant.findById(req.restaurantId).select('subscription');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    const capacity = await assertStaffCapacity(restaurant, User, req.restaurantId);
    if (!capacity.ok) {
      return res.status(403).json({ success: false, message: capacity.message });
    }

    let staffProfile;
    if (role === 'staff' || role === 'manager') {
      const built = buildStaffProfilePayload(body, { requireAll: true });
      if (built.error) {
        return res.status(400).json({ success: false, message: built.error });
      }
      const optionalExtras = buildStaffProfilePayload(body, { requireAll: false });
      if (optionalExtras.error) {
        return res.status(400).json({ success: false, message: optionalExtras.error });
      }
      staffProfile = { ...optionalExtras.profile, ...built.profile };
    }

    const staff = await User.create({
      restaurantId: req.restaurantId,
      name,
      email: normalizedEmail,
      password,
      role,
      invitationAccepted: false,
      ...(staffProfile && { staffProfile })
    });

    if (typeof staff.populate === 'function') {
      await staff.populate('restaurantId', 'name');
    }

    await createNotification({
      restaurantId: req.restaurantId,
      type: 'staff_invited',
      title: 'New staff member invited',
      message: `${req.user.name || req.user.email} invited ${staff.name} as ${role}.`,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: serializeStaffMember(staff, true)
    });
  } catch (error) {
    next(error);
  }
};

const respondUpdatedStaff = (res, staff) => {
  res.status(200).json({
    success: true,
    data: serializeStaffMember(staff, true)
  });
};

exports.updateStaff = async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body || {};
    const normalizedEmail = email ? normalizeEmail(email) : '';

    const staff = await User.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    if (staff.role === 'owner') {
      if (!isPlatformAdminRole(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only a platform admin can modify an owner account'
        });
      }
      if (role && role !== 'owner') {
        return res.status(400).json({
          success: false,
          message: 'Owner role cannot be changed here. Contact platform support if you need to transfer ownership.'
        });
      }
      if (name) staff.name = name;
      if (normalizedEmail) staff.email = normalizedEmail;
      if (typeof isActive === 'boolean') staff.isActive = isActive;

      const ownerProfileFlat =
        typeof req.body.staffProfile === 'object' && req.body.staffProfile !== null
          ? req.body.staffProfile
          : req.body;
      if (HR_PROFILE_KEYS.some((k) => ownerProfileFlat[k] !== undefined)) {
        const built = buildStaffProfilePayload(ownerProfileFlat, { requireAll: false });
        if (built.error) {
          return res.status(400).json({ success: false, message: built.error });
        }
        applyStaffProfilePatch(staff, built.profile);
      }

      await staff.save();
      if (typeof staff.populate === 'function') {
        await staff.populate('restaurantId', 'name');
      }
      await createNotification({
        restaurantId: staff.restaurantId || req.restaurantId,
        type: 'staff_updated',
        title: 'Staff member updated',
        message: `${req.user.name || req.user.email} updated ${staff.name}'s profile.`,
        createdBy: req.user.id
      });
      return respondUpdatedStaff(res, staff);
    }

    if (role) {
      const assignErr = assertMayAssignRole(req.user.role, role);
      if (assignErr) {
        const status = assignErr.startsWith('Invalid') ? 400 : 403;
        return res.status(status).json({ success: false, message: assignErr });
      }
    }

    if (name) staff.name = name;
    if (normalizedEmail) staff.email = normalizedEmail;
    if (role) staff.role = role;
    if (typeof isActive === 'boolean') staff.isActive = isActive;

    const profileSource =
      req.body.staffProfile !== undefined && typeof req.body.staffProfile === 'object'
        ? req.body.staffProfile
        : req.body;
    const hasProfileKeys = HR_PROFILE_KEYS.some((k) => profileSource && profileSource[k] !== undefined);
    if (hasProfileKeys) {
      const built = buildStaffProfilePayload(profileSource, { requireAll: false });
      if (built.error) {
        return res.status(400).json({ success: false, message: built.error });
      }
      applyStaffProfilePatch(staff, built.profile);
    }

    await staff.save();
    if (typeof staff.populate === 'function') {
      await staff.populate('restaurantId', 'name');
    }

    await createNotification({
      restaurantId: staff.restaurantId || req.restaurantId,
      type: 'staff_updated',
      title: 'Staff member updated',
      message: `${req.user.name || req.user.email} updated ${staff.name}'s profile.`,
      createdBy: req.user.id
    });

    respondUpdatedStaff(res, staff);
  } catch (error) {
    next(error);
  }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    if (staff.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete owner account'
      });
    }

    const deletedStaffName = staff.name;
    const targetRestaurantId = staff.restaurantId || req.restaurantId;

    await User.findByIdAndDelete(req.params.id);

    await createNotification({
      restaurantId: targetRestaurantId,
      type: 'staff_deleted',
      title: 'Staff member removed',
      message: `${req.user.name || req.user.email} removed ${deletedStaffName} from the team.`,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptInvitation = async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.invitationAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Invitation already accepted'
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password with at least 6 characters'
      });
    }

    user.password = newPassword.trim();
    user.invitationAccepted = true;
    await user.save();

    await createNotification({
      restaurantId: user.restaurantId,
      type: 'invitation_accepted',
      title: 'Invitation accepted',
      message: `${user.name} accepted their team invitation.`,
      createdBy: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        id: user._id,
        invitationAccepted: user.invitationAccepted
      }
    });
  } catch (error) {
    next(error);
  }
};
