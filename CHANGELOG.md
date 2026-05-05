# Changelog

All notable changes to Recuring are documented here.
Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [Unreleased]

### In Progress
- Custom SLA tiers
- Reverse charge GST support
- Bulk SMS job notifications

## [0.5.0] — 2026-05-04

### Added
- Nextra docs site (`packages/docs`) at docs.recuring.in
- Weekly backup verification cron + admin dashboard (`/admin/ops/backups`)
- DPDP compliance documentation

## [0.4.0] — 2026-04-20

### Added
- k6 load test suite (`tests/load/k6/`) with 4 scenario scripts
- Performance baseline document (`docs/perf/baseline-2026-05.md`)

## [0.3.0] — 2026-04-10

### Added
- Customer portal (multi-org, invoice/ticket/contract views)
- Multi-organisation membership and org switcher
- Feature flags via GrowthBook
- SEO and consent-gated analytics

## [0.2.0] — 2026-03-15

### Added
- Soft-delete for customers, assets, contracts
- Data retention cron
- Org data export (ZIP archive)

### Fixed
- Invoice GST calculation for partial payments
- Customer portal session handling on mobile

## [0.1.0] — 2026-02-01

### Added
- Initial release: customers, assets, contracts, AMC billing
- Razorpay payment integration
- Mobile technician app
- Complaint management
- Bulk CSV import
- GST-compliant invoices (CGST/SGST/IGST)
- Tally XML and Zoho CSV export
- Admin dashboard with reports
