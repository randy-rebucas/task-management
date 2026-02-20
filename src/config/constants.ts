export const APP_NAME = "Task Manager";

export const TASK_TYPES: { value: string; label: string }[] = [
  { value: "field_visit", label: "Field Visit" },
  { value: "client_meeting", label: "Client Meeting" },
  { value: "orientation_event", label: "Orientation Event" },
  { value: "lead_follow_up", label: "Lead Follow-up" },
  { value: "proposal_submission", label: "Proposal Submission" },
  { value: "collection_payment", label: "Collection / Payment Follow-up" },
  { value: "partner_onboarding", label: "Partner Onboarding" },
  { value: "internal_task", label: "Internal Task" },
];

export const PREDEFINED_TAGS = [
  "Hotel",
  "LGU",
  "Construction",
  "Salon",
  "Restaurant",
  "Retail",
  "Healthcare",
  "Education",
  "Finance",
  "Technology",
  "NGO",
  "Manufacturing",
];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

export const FILE_UPLOAD = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
    // Voice notes
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
  ],
  voiceNoteTypes: [
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
  ],
};
