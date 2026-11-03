export const STORAGE_KEYS = {
  admin: "tms_admin",
  settings: "tms_settings",
  tournaments: "tms_tournaments",
  registrations: "tms_registrations",
  payments: "tms_payments",
  brackets: "tms_brackets",
  matches: "tms_matches",
};

export const DATA_KEYS = Object.values(STORAGE_KEYS);

export const TOURNAMENT_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

export const ADMIN_STATUS_META = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "info" },
  registration_open: { label: "Registration Open", tone: "success" },
  registration_closed: { label: "Registration Closed", tone: "warning" },
  ongoing: { label: "Ongoing", tone: "purple" },
  completed: { label: "Completed", tone: "neutral" },
};

export const PUBLIC_STATUS_META = {
  upcoming: { label: "Upcoming", tone: "info" },
  registration_open: { label: "Registration Open", tone: "success" },
  registration_closed: { label: "Registration Closed", tone: "warning" },
  ongoing: { label: "Ongoing", tone: "purple" },
  completed: { label: "Completed", tone: "neutral" },
};

export const PAYMENT_STATUS_META = {
  pending: { label: "Menunggu Verifikasi", short: "Pending", tone: "warning" },
  approved: { label: "Terverifikasi", short: "Approved", tone: "success" },
  rejected: { label: "Ditolak", short: "Rejected", tone: "danger" },
};

export const PAYMENT_FILTER_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const MATCH_STATUS_META = {
  upcoming: { label: "Upcoming", tone: "info" },
  ongoing: { label: "Ongoing", tone: "purple" },
  completed: { label: "Completed", tone: "success" },
};

export const BRACKET_FORMATS = [
  {
    value: "single_elimination",
    label: "Single Elimination",
    desc: "Kalah satu kali langsung tersingkir.",
    min: 2,
  },
  {
    value: "double_elimination",
    label: "Double Elimination",
    desc: "Winners & Losers bracket, tersingkir setelah dua kali kalah.",
    min: 3,
  },
];

export const SEEDING_METHODS = [
  { value: "random", label: "Random Seeding", desc: "Urutan diacak otomatis." },
  { value: "registration", label: "Registration Order", desc: "Berdasarkan urutan pendaftaran." },
  { value: "manual", label: "Manual Seeding", desc: "Atur urutan seed sendiri." },
];

export const FILE_RULES = {
  types: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  maxSize: 5 * 1024 * 1024,
};

export const MAIN_PLAYER_COUNT = 5;
export const SUB_PLAYER_COUNT = 2;
export const REGISTRATION_STEPS = [
  { key: "team", label: "Info Tim", icon: "users" },
  { key: "players", label: "Data Pemain", icon: "user" },
  { key: "payment", label: "Pembayaran", icon: "wallet" },
  { key: "review", label: "Konfirmasi", icon: "check-circle" },
];
