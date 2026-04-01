import {
  Users,
  Package,
  Receipt,
  Wallet,
  AlertCircle,
  Wrench,
  Shield,
  Globe,
  FileSpreadsheet,
  IndianRupee,
  MessageCircleWarning,
  UserX,
  CalendarX,
  TrendingDown,
  Zap,
  Link,
  Smartphone,
  Droplets,
  Thermometer,
  Camera,
  Sun,
  ArrowUpDown,
  Wifi,
  Refrigerator,
  Flame,
  Bug,
  Building,
} from "lucide-react";

export const SITE_CONFIG = {
  name: "Project X",
  description:
    "The all-in-one operations platform for Indian recurring service businesses.",
  tagline: "Collect Faster. Serve Better. Renew More Customers.",
};

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Industries", href: "#industries" },
  { label: "FAQ", href: "#faq" },
];

export const PAIN_POINTS = [
  {
    icon: FileSpreadsheet,
    title: "Customer data scattered everywhere",
    description:
      "Some in Excel, some in a notebook, some only in your head. Finding a customer's history takes 10 minutes.",
  },
  {
    icon: IndianRupee,
    title: "Payments that slip through the cracks",
    description:
      "You forget who has paid, who hasn't, and by the time you follow up, it's been 3 months.",
  },
  {
    icon: MessageCircleWarning,
    title: "Complaints lost in WhatsApp chats",
    description:
      "Customers message on WhatsApp, call the office, and text your technician. Nobody knows the full picture.",
  },
  {
    icon: UserX,
    title: "Technicians without accountability",
    description:
      "You don't know where your technicians are, what they completed, or whether the customer was actually served.",
  },
  {
    icon: CalendarX,
    title: "AMC renewals that nobody tracks",
    description:
      "Contracts expire silently. By the time you realise, the customer has already moved to your competitor.",
  },
  {
    icon: TrendingDown,
    title: "Growing revenue, growing chaos",
    description:
      "More customers should mean more profit. Instead, it means more confusion, more missed calls, and more fire-fighting.",
  },
];

export const SOLUTION_POINTS = [
  {
    icon: Zap,
    title: "No more juggling",
    description:
      "Replace 5 tools with 1. Spreadsheets, WhatsApp groups, paper registers, and phone calls — all replaced by a single platform.",
  },
  {
    icon: Link,
    title: "Everything talks to everything",
    description:
      "A complaint triggers a technician assignment. A completed service triggers an invoice. An AMC expiry triggers a renewal reminder. Automatically.",
  },
  {
    icon: Smartphone,
    title: "Works where your team works",
    description:
      "Office staff use the web app. Technicians use the mobile app. Customers use the self-service portal. Everyone stays in sync.",
  },
];

export const FEATURES = [
  {
    icon: Users,
    title: "Customer Management",
    description:
      "Know every customer inside out. Complete history, assets, contracts, payments, and complaints — all in one profile. No more searching across 4 different places.",
  },
  {
    icon: Package,
    title: "Asset Tracking",
    description:
      "Track every water purifier, AC unit, CCTV camera, or elevator you service. Know the model, installation date, warranty status, and complete service history of every asset.",
  },
  {
    icon: Receipt,
    title: "Recurring Billing",
    description:
      "Set up monthly, quarterly, or yearly billing cycles. Generate GST-compliant invoices automatically. Send payment reminders via SMS and WhatsApp and track dues by customer.",
  },
  {
    icon: Wallet,
    title: "Collections & Payments",
    description:
      "See who has paid and who hasn't — at a glance. Send automated payment reminders via SMS and WhatsApp. Track partial payments, advances, and overdue accounts.",
  },
  {
    icon: AlertCircle,
    title: "Complaint Management",
    description:
      "Every complaint gets tracked from creation to resolution with clear ownership, timelines, and escalation paths. No more complaints falling through the cracks.",
  },
  {
    icon: Wrench,
    title: "Technician Workflows",
    description:
      "Assign jobs, track field visits, capture service reports with photos, and get digital signatures. Know exactly where your technicians are and what they have completed.",
  },
  {
    icon: Shield,
    title: "AMC & Warranty Management",
    description:
      "Track every Annual Maintenance Contract and warranty. Get alerts before they expire. Generate renewal quotes automatically. Stop losing customers to expired contracts.",
  },
  {
    icon: Globe,
    title: "Customer Self-Service Portal",
    description:
      "Give your customers a branded portal to view assets, raise complaints, see upcoming services, download invoices, and make payments. Look professional, save time.",
  },
];

export const INDUSTRIES = [
  { icon: Droplets, name: "Water Purifier Servicing", tagline: "RO installations, filter replacements, AMC tracking" },
  { icon: Thermometer, name: "AC & HVAC Maintenance", tagline: "Seasonal servicing, gas refills, annual contracts" },
  { icon: Camera, name: "CCTV & Security Systems", tagline: "Installation, monitoring, maintenance contracts" },
  { icon: Sun, name: "Solar Panel Maintenance", tagline: "Panel cleaning, inverter checks, performance monitoring" },
  { icon: ArrowUpDown, name: "Elevator Maintenance", tagline: "Periodic inspections, emergency repairs, compliance" },
  { icon: Wifi, name: "Broadband & ISP Services", tagline: "Installation, monthly billing, complaint resolution" },
  { icon: Refrigerator, name: "Appliance Servicing", tagline: "Multi-brand service centers, warranty management" },
  { icon: Flame, name: "Fire Safety & Equipment", tagline: "Annual inspections, compliance tracking, refills" },
  { icon: Bug, name: "Pest Control Services", tagline: "Quarterly treatments, contract renewals, scheduling" },
  { icon: Building, name: "Facility Maintenance", tagline: "Plumbing, electrical, housekeeping contracts" },
];

export const VALUE_PILLARS = [
  {
    metric: "2x",
    title: "Faster Collections",
    description:
      "Automated SMS and WhatsApp reminders, structured follow-ups, and clear overdue tracking mean you spend less time chasing payments and more time getting paid.",
  },
  {
    metric: "90%",
    title: "Fewer Missed Complaints",
    description:
      "When every complaint is logged, assigned, and tracked digitally, nothing falls through the cracks. Your customers feel heard, and your team stays accountable.",
  },
  {
    metric: "40%",
    title: "More Renewals",
    description:
      "When you know exactly which contracts are expiring and can send renewal quotes automatically, you stop losing customers by accident.",
  },
];

export const TESTIMONIALS = [
  {
    name: "Rajesh Kumar",
    role: "Owner",
    company: "KoolBreeze AC Services",
    city: "Jaipur",
    quote:
      "Before Project X, I was tracking 200+ AMC customers in Excel. I had no idea whose contract was expiring. Last quarter, I renewed 35 contracts I would have completely missed.",
  },
  {
    name: "Priya Sharma",
    role: "Operations Manager",
    company: "PureFlow Water Solutions",
    city: "Pune",
    quote:
      "My technicians now check in digitally for every visit. Customers get service reports with photos. Complaints that used to take a week to resolve now close in 2 days.",
  },
  {
    name: "Mohammed Farhan",
    role: "Director",
    company: "SecureVision CCTV Services",
    city: "Hyderabad",
    quote:
      "The billing module alone saved us 15 hours a week. Automated invoices, payment reminders on WhatsApp, and a clear dashboard showing who owes what. Game changer.",
  },
];

export const FAQ_ITEMS = [
  {
    question:
      "Is Project X suitable if I am just starting to digitise my operations?",
    answer:
      "Yes. Project X is built for service businesses of all sizes — whether you manage 50 customers or 5,000. We onboard every customer personally, so the platform is configured around your workflow from day one, not the other way around.",
  },
  {
    question: "Do my technicians need smartphones?",
    answer:
      "Yes, the mobile app requires an Android or iOS smartphone. However, the app is lightweight and works well even on budget smartphones with limited data. It also works offline and syncs when connectivity is restored.",
  },
  {
    question: "Does the platform support digital payment collection?",
    answer:
      "Yes. Project X supports sending payment reminders via SMS and WhatsApp, tracking dues, and recording collections. Online payment link generation is part of the platform and is configured during your onboarding based on how your business currently collects.",
  },
  {
    question: "Does it work with Tally or other accounting software?",
    answer:
      "Yes. We support Tally integration and CSV exports compatible with any accounting software. Zoho Books and QuickBooks integrations are on the roadmap. Our team will configure the right setup for you during onboarding.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Your data is encrypted at rest and in transit, hosted on AWS India (Mumbai region) servers, and backed up daily. We follow industry-standard security practices to keep your business data secure.",
  },
  {
    question: "What kind of support do you provide?",
    answer:
      "Every Project X customer gets hands-on onboarding support — we set up your account, help migrate your existing data, and train your team. Ongoing support is available via WhatsApp and email during business hours (9 AM – 7 PM IST). Larger accounts get a dedicated point of contact.",
  },
  {
    question: "How does the onboarding process work?",
    answer:
      "We start with a demo call where we walk you through the platform using your real business context — customer types, service cycles, team structure. If it is a good fit, our team onboards you directly: setting up your account, configuring your workflows, and training your staff. No self-serve signup; we do this together.",
  },
];
