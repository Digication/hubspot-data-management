# Cloud Backup Location — 2026-04-20 HubSpot Export

This local folder (`backups/data/2026-04-20/`) is **gitignored** and only exists on Jeff's machine. The authoritative off-machine copy lives in Google Drive.

## Google Drive location

- **Account:** jyan@digication.com (Digication work Drive)
- **Location:** My Drive (personal, NOT a Shared Drive)
- **Folder:** `Hubspot Backup / 2026-04-20 /`
- **URL:** https://drive.google.com/drive/folders/1U96zGDvDMCbJinC2X_AZkow01QcoUxYT
- **Drive folder IDs:**
  - `Hubspot Backup` parent → `1U96zGDvDMCbJinC2X_AZkow01QcoUxYT`
  - `2026-04-20` subfolder → `1wUO1xo6CDIVW8Yz8GqaKoJW1t0hF4WWP`

## What's in the Drive backup

Three HubSpot-native export ZIPs. Each zip contains the full CSV for one object type:

| ZIP file | Contains | CSV size (uncompressed) |
|----------|----------|-------------------------|
| `hubspot-crm-exports-all-companies-2026-04-20-2026-04-20.zip` | `all-companies-2026-04-20.csv` | 17 MB |
| `hubspot-crm-exports-all-contacts-2026-04-20-2026-04-20.zip` | `all-contacts-2026-04-20.csv` | 34 MB |
| `hubspot-crm-exports-all-deals-2026-04-20-2026-04-20.zip` | `all-deals-2026-04-20.csv` | 8.9 MB |

The ZIPs are the native HubSpot export format. The loose CSVs on Jeff's disk are just extracted copies of what's inside the ZIPs — same data.

## Permissions (verified 2026-04-21 via Drive API)

- **Owner:** jyan@digication.com only
- **Other access:** none
- **General access:** Restricted (not "anyone with link")
- Verified both the parent folder and the dated subfolder. Verified ZIP-level permissions match.

## Do NOT

- Move these files into a Shared Drive
- Share the folder with anyone (even other Digication staff)
- Turn on "anyone with link" access
- Delete from Drive until all of Phase 2 is complete AND a newer backup exists

## Purpose

This is the **pre-Phase-2 safety backup**. If anything goes catastrophically wrong during Phase 2 execution — wrong field deleted, wrong contacts removed, runaway script — these files can be used to restore data back into HubSpot via the Import tool.
