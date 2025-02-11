import { User } from '../types/auth';

type Permission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

type ResourcePermissions = {
  interventions: Permission;
  actions: Permission;
};

export function getUserPermissions(user: User | null): ResourcePermissions {
    console.log(user)
  if (!user?.user_metadata.role) {
    return {
      interventions: { view: false, create: false, edit: false, delete: false },
      actions: { view: false, create: false, edit: false, delete: false }
    };
  }

  switch (user.role) {
    case 'super_admin':
      return {
        interventions: { view: true, create: true, edit: true, delete: true },
        actions: { view: true, create: true, edit: true, delete: true }
      };

    case 'leadership':
      return {
        interventions: { view: true, create: true, edit: true, delete: false },
        actions: { view: true, create: true, edit: true, delete: false }
      };

    case 'lead':
      return {
        interventions: { view: true, create: false, edit: true, delete: false },
        actions: { view: true, create: true, edit: true, delete: false }
      };

    case 'supporting_staff':
      return {
        interventions: { view: true, create: false, edit: false, delete: false },
        actions: { view: true, create: false, edit: true, delete: false }
      };

    default:
      return {
        interventions: { view: false, create: false, edit: false, delete: false },
        actions: { view: false, create: false, edit: false, delete: false }
      };
  }
}

export function canViewIntervention(user: User | null): boolean {
    console.log(user)
  return getUserPermissions(user).interventions.view;
}

export function canCreateIntervention(user: User | null): boolean {
  return getUserPermissions(user).interventions.create;
}

export function canEditIntervention(user: User | null): boolean {
  return getUserPermissions(user).interventions.edit;
}

export function canDeleteIntervention(user: User | null): boolean {
  return getUserPermissions(user).interventions.delete;
}

export function canViewAction(user: User | null): boolean {
  return getUserPermissions(user).actions.view;
}

export function canCreateAction(user: User | null): boolean {
  return getUserPermissions(user).actions.create;
}

export function canEditAction(user: User | null): boolean {
  return getUserPermissions(user).actions.edit;
}

export function canDeleteAction(user: User | null): boolean {
  return getUserPermissions(user).actions.delete;
}