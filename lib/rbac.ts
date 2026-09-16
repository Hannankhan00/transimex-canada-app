/**
 * Role-Based Access Control (RBAC) System for Transimex Canada Admin Portal
 */

export type PermissionModule =
  | "quotes"
  | "invoices"
  | "shipments"
  | "clients"
  | "carriers"
  | "messages"
  | "support"
  | "analytics"
  | "blog"
  | "resources"
  | "staff"
  | "settings";

export interface PermissionModuleDef {
  id: PermissionModule;
  labelEn: string;
  labelFr: string;
  descriptionEn: string;
  descriptionFr: string;
  icon: string;
}

export const PERMISSION_MODULES: PermissionModuleDef[] = [
  {
    id: "quotes",
    labelEn: "Quotes Management",
    labelFr: "Gestion des Soumissions",
    descriptionEn: "Review, calculate freight rates, approve and reject quote requests.",
    descriptionFr: "Examiner, calculer les taux de fret, approuver et rejeter les demandes de soumission.",
    icon: "FileText",
  },
  {
    id: "invoices",
    labelEn: "Invoices & Payments",
    labelFr: "Factures & Paiements",
    descriptionEn: "Review generated invoices, verify uploaded payment proofs, and manage billing status.",
    descriptionFr: "Consulter les factures générées, vérifier les preuves de paiement téléversées et gérer le statut de facturation.",
    icon: "Receipt",
  },
  {
    id: "shipments",
    labelEn: "Freight & Shipments",
    labelFr: "Fret & Expéditions",
    descriptionEn: "Manage active loads, dispatch tracking, CBSA customs declarations, and manifests.",
    descriptionFr: "Gérer les chargements actifs, le suivi de dispatch, les douanes de l'ASFC et les manifestes.",
    icon: "Truck",
  },
  {
    id: "clients",
    labelEn: "Clients & Accounts",
    labelFr: "Comptes Clients",
    descriptionEn: "Access corporate client profiles, shipper contacts, and billing terms.",
    descriptionFr: "Accéder aux profils des clients corporatifs, contacts expéditeurs et conditions de facturation.",
    icon: "Users",
  },
  {
    id: "carriers",
    labelEn: "Carrier Network",
    labelFr: "Réseau Transporteurs",
    descriptionEn: "Oversee motor carrier partners, fleet capacity, insurance, and safety ratings.",
    descriptionFr: "Superviser les transporteurs partenaires, la capacité de la flotte, les assurances et la conformité.",
    icon: "Briefcase",
  },
  {
    id: "messages",
    labelEn: "Inquiries & Leads",
    labelFr: "Messages & Formulaires",
    descriptionEn: "Read and reply to prospective shipper messages and quote inquiries.",
    descriptionFr: "Lire et répondre aux messages des expéditeurs potentiels et demandes d'information.",
    icon: "Mail",
  },
  {
    id: "support",
    labelEn: "Support Tickets",
    labelFr: "Billets de Support",
    descriptionEn: "View and respond to client support tickets submitted from the client portal.",
    descriptionFr: "Consulter et répondre aux billets de support soumis depuis le portail client.",
    icon: "LifeBuoy",
  },
  {
    id: "analytics",
    labelEn: "Analytics & Reports",
    labelFr: "Analytique & Rapports",
    descriptionEn: "View operational KPIs, revenue and volume trends, and export reporting data.",
    descriptionFr: "Consulter les indicateurs opérationnels, les tendances de revenus et volume, et exporter les données.",
    icon: "BarChart3",
  },
  {
    id: "blog",
    labelEn: "Blog & Content",
    labelFr: "Blogue & Contenu",
    descriptionEn: "Write, edit, and publish articles on the public marketing site.",
    descriptionFr: "Rédiger, modifier et publier des articles sur le site marketing public.",
    icon: "Newspaper",
  },
  {
    id: "resources",
    labelEn: "Resources & FAQ",
    labelFr: "Ressources & FAQ",
    descriptionEn: "Manage public FAQ entries and downloadable resource files.",
    descriptionFr: "Gérer les questions fréquentes et les fichiers de ressources téléchargeables.",
    icon: "BookOpen",
  },
  {
    id: "staff",
    labelEn: "Staff & RBAC",
    labelFr: "Gestion du Personnel & RBAC",
    descriptionEn: "Create internal staff accounts, assign roles, and configure module-level access.",
    descriptionFr: "Créer des comptes pour le personnel, attribuer les rôles et configurer les accès aux modules.",
    icon: "Shield",
  },
  {
    id: "settings",
    labelEn: "System Settings",
    labelFr: "Paramètres Système",
    descriptionEn: "Configure operational parameters, email templates, and view audit trails.",
    descriptionFr: "Configurer les paramètres opérationnels, modèles de courriels et journaux d'audit.",
    icon: "Settings",
  },
];

export type RoleType =
  | "superadmin"
  | "admin"
  | "dispatcher"
  | "customs_agent"
  | "support"
  | "custom";

export interface RolePreset {
  id: RoleType;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  badgeClass: string;
  defaultPermissions: PermissionModule[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: "superadmin",
    titleEn: "Super Admin",
    titleFr: "Super Administrateur",
    descriptionEn: "Unrestricted master access to all operations, financial data, and staff governance.",
    badgeClass: "bg-slate-900 text-amber-400 border border-amber-400/30",
    defaultPermissions: ["quotes", "invoices", "shipments", "clients", "carriers", "messages", "support", "analytics", "blog", "resources", "staff", "settings"],
  },
  {
    id: "admin",
    titleEn: "Operations Manager",
    titleFr: "Gestionnaire Opérations",
    descriptionEn: "Full access to freight quotes, shipments, carriers, and clients without staff account creation.",
    badgeClass: "bg-[#0B2545] text-white border border-white/20",
    defaultPermissions: ["quotes", "invoices", "shipments", "clients", "carriers", "messages", "support", "analytics"],
  },
  {
    id: "dispatcher",
    titleEn: "Freight Dispatcher",
    titleFr: "Répartiteur de Fret",
    descriptionEn: "Focused on daily freight routing, active shipment tracking, and carrier management.",
    badgeClass: "bg-emerald-950 text-emerald-300 border border-emerald-500/30",
    defaultPermissions: ["quotes", "shipments", "carriers"],
  },
  {
    id: "customs_agent",
    titleEn: "Customs Specialist",
    titleFr: "Spécialiste Douanes",
    descriptionEn: "Restricted to shipment CBSA paperwork, clearance holds, and quote verifications.",
    badgeClass: "bg-blue-950 text-blue-300 border border-blue-500/30",
    defaultPermissions: ["quotes", "shipments"],
  },
  {
    id: "support",
    titleEn: "Support Specialist",
    titleFr: "Spécialiste Service Client",
    descriptionEn: "Handles customer inquiries, leads, and basic client contact records.",
    badgeClass: "bg-purple-950 text-purple-300 border border-purple-500/30",
    defaultPermissions: ["messages", "clients", "support"],
  },
  {
    id: "custom",
    titleEn: "Custom Staff Role",
    titleFr: "Rôle Personnalisé",
    descriptionEn: "Customized set of operational permissions selected individually by an administrator.",
    badgeClass: "bg-amber-950 text-amber-300 border border-amber-500/30",
    defaultPermissions: ["quotes"],
  },
];

export const ALL_STAFF_ROLES: string[] = [
  "superadmin",
  "admin",
  "subadmin",
  "dispatcher",
  "customs_agent",
  "support",
  "custom",
];

export function isStaffRole(role?: string): boolean {
  if (!role) return false;
  return ALL_STAFF_ROLES.includes(role.toLowerCase());
}

export function getRolePreset(roleId?: string): RolePreset {
  const normalized = (roleId || "").toLowerCase();
  if (normalized === "subadmin") {
    return ROLE_PRESETS.find((r) => r.id === "admin") || ROLE_PRESETS[1];
  }
  return (
    ROLE_PRESETS.find((r) => r.id === normalized) ||
    ROLE_PRESETS.find((r) => r.id === "dispatcher") ||
    ROLE_PRESETS[2]
  );
}

/**
 * Checks whether a user possesses permission for a given module.
 * Super Admin unconditionally has all permissions.
 */
export function hasModulePermission(
  user: { role?: string; permissions?: string[] } | null | undefined,
  module: PermissionModule
): boolean {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();

  // Super Admin has master permission
  if (role === "superadmin") return true;

  // If user has explicit permissions array
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(module) || user.permissions.includes("*");
  }

  // Fallback to role's default permissions if permissions array wasn't set yet
  const preset = getRolePreset(role);
  return preset.defaultPermissions.includes(module);
}
