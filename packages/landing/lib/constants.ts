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
  MapPin,
  Headset,
  Layers,
  MonitorSmartphone,
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

export const SOCIAL_PROOF_STATS = [
  { value: "500+", numericValue: 500, suffix: "+", label: "Service Businesses" },
  { value: "15+", numericValue: 15, suffix: "+", label: "Industries Served" },
  { value: "50+", numericValue: 50, suffix: "+", label: "Cities Across India" },
  { value: "98%", numericValue: 98, suffix: "%", label: "Customer Retention" },
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
    title: "Replace 5 Tools with One",
    description:
      "Spreadsheets, WhatsApp groups, paper registers, phone calls, and manual tracking — all replaced by a single, purpose-built platform.",
  },
  {
    icon: Link,
    title: "Automated End-to-End Workflows",
    description:
      "A complaint triggers a technician assignment. A completed service triggers an invoice. An AMC expiry triggers a renewal reminder. Automatically.",
  },
  {
    icon: Smartphone,
    title: "Office, Field, and Customer — All in Sync",
    description:
      "Office staff use the web app. Technicians use the mobile app. Customers use the self-service portal. Everyone stays connected, in real time.",
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

export const WHY_CHOOSE_US = [
  {
    icon: MapPin,
    title: "Built Exclusively for India",
    description:
      "GST-compliant invoicing, WhatsApp and SMS integrations, Indian payment gateways, and data hosted on AWS Mumbai. Not a foreign tool localised as an afterthought — built from day one for Indian service businesses.",
  },
  {
    icon: Headset,
    title: "White-Glove Onboarding",
    description:
      "We handle your entire setup — account configuration, customer data migration, workflow design, and hands-on staff training. Your team is fully operational within 1-2 weeks, without lifting a finger.",
  },
  {
    icon: Layers,
    title: "Depth, Not Breadth",
    description:
      "Project X is not a generic CRM with service features bolted on. Every module is purpose-built for recurring service operations — from AMC lifecycle management to technician job tracking with proof of service.",
  },
  {
    icon: MonitorSmartphone,
    title: "One Platform, Three Interfaces",
    description:
      "A web dashboard for your office team, a mobile app for field technicians (works offline), and a branded self-service portal for your customers. Everyone operates from the same system.",
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
    question: "Who is Project X built for?",
    answer:
      "Project X is built for Indian recurring service businesses — companies that run on repeat visits, AMC contracts, and periodic collections. Water purifier services, AC and HVAC maintenance, CCTV installation, pest control, elevator maintenance, facility management — if your business has a regular customer base on service agreements, this platform was designed around your specific workflows.",
  },
  {
    question: "How is pricing handled?",
    answer:
      "We do not publish fixed pricing online. Every business is different in size, service type, and what they actually need from the platform. After your demo call, we put together a custom commercial proposal based on your team size, the modules you need, and how your operation works. No hidden fees, no one-size-fits-all plans — the pricing conversation happens directly with our team, and is tailored to deliver the best value for your specific business.",
  },
  {
    question: "Is there a demo before I commit to anything?",
    answer:
      "Yes — the demo is where everything starts. Book a call and we will walk you through the platform using your real business context: your industry, team structure, and the specific problems you want to solve. There is no pitch, no pressure, and no obligation to proceed.",
  },
  {
    question: "How does onboarding work once we decide to go ahead?",
    answer:
      "Our team handles the full setup end-to-end. We configure your account, import your customer data, set up your workflows and invoice cycles, and train your staff — both the office team and field technicians. We do not hand you a login and leave you to figure it out. Most businesses are fully operational within one to two weeks.",
  },
  {
    question: "We run on Excel and WhatsApp. Can you help us migrate?",
    answer:
      "Yes — this is the most common situation we work with. Our onboarding team takes your existing customer lists, contract records, and transaction history and brings them into the platform. You do not need to re-enter data manually. We have moved businesses off spreadsheets, paper registers, and WhatsApp-based tracking.",
  },
  {
    question: "Do field technicians need smartphones?",
    answer:
      "Yes. The technician mobile app runs on Android or iOS, but it is designed to be lightweight and works well on budget Android phones. It also works offline — technicians can log job completions, upload photos, and capture signatures without an active connection, and the app syncs automatically when connectivity is restored.",
  },
  {
    question: "Can the platform be configured for how our business works?",
    answer:
      "Yes. During onboarding we configure customer categories, asset types, contract templates, billing cycles, job types, complaint workflows, and escalation rules to match exactly how you run your operation. Project X is not a generic tool you force your process into — we fit it around your business.",
  },
  {
    question: "Is our business data secure?",
    answer:
      "All data is encrypted in transit and at rest, hosted on AWS India (Mumbai region) servers, and backed up daily. Your customer records, contract history, and operational data are stored on Indian infrastructure and are never shared with third parties.",
  },
];

export const INLINE_CTA_CONTENT = {
  afterFeatures: {
    text: "Want to see how these modules work for your specific business?",
    buttonText: "Talk to Our Team",
    buttonHref: "/book-demo?intent=talk",
  },
  afterTestimonials: {
    text: "Join hundreds of service businesses already running on Project X.",
    buttonText: "Book a Demo",
    buttonHref: "/book-demo",
  },
};
