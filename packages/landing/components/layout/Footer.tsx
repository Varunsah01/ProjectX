import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SITE_CONFIG } from "@/lib/constants";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Industries", href: "#industries" },
  ],
  Company: [
    { label: "Book a Demo", href: "/book-demo" },
    { label: "Contact", href: "/book-demo?intent=talk" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 lg:pr-4">
            <Image
              src="/logo.svg"
              alt="Project X"
              width={140}
              height={36}
            />
            <p className="mt-4 text-sm text-slate-500 leading-relaxed">
              The operating system for recurring service businesses in India.
            </p>
            {/* India badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              <span>Made with</span>
              <span className="text-red-500">&hearts;</span>
              <span>in India</span>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-brand-600"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} {SITE_CONFIG.name}. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
