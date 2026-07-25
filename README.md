# NC Groups - Neighborhood Church Group Manager

A staff-only app for managing church contacts and enabling quick group communication via text.

## Features

- 👥 **NC Vault Directory**: Search the staff-safe people records published from Obsidian
- 📁 **Vault-managed Groups**: Ministry groups and memberships come from the NC Vault
- 🔍 **Smart Filtering**: Filter by group AND demographic (e.g., "Adult Ladies in Hospitality")
- 💬 **Group Text**: Open native SMS with multiple recipients
- 📢 **Text Blast**: Send announcements via Twilio (one-way)
- 🚫 **Consent Tracking**: START and STOP preferences follow the phone number and are honored everywhere
- 📋 **Paste & Text**: Paste a clean list or an Obsidian table column without losing the existing mobile workflow

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React + Tailwind CSS
- **Hosting**: Frontend on Vercel, Backend on Railway
- **SMS**: Twilio

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (Railway provides this)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/davepartin/ncgroups.git
   cd nc-groups
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. Initialize the database:
   ```bash
   # Option A: Using Prisma (recommended)
   npm run db:push
   
   # Option B: Using raw SQL
   psql $DATABASE_URL < prisma/schema.sql
   ```
   If you already have a database with the old gender enum (Guy/Lady), run once:
   `psql $DATABASE_URL -f prisma/migrate-gender-to-male-female.sql`

   Before deploying the NC Vault sync to an existing database, run once:
   `psql $DATABASE_URL -f prisma/vault-sync-migration.sql`

5. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

6. Import initial data:
   ```bash
   # Place your CSV in data/ folder, then:
   npm run import
   # Or specify a path:
   npm run import /path/to/your/data.csv
   ```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT authentication |
| `STAFF_PASSWORD` | Password for staff login |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (from Twilio Console) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token (from Twilio Console) |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for sending SMS |
| `ADMIN_PHONE_NUMBER` | Optional staff number for delivery and opt-out notices |
| `APP_URL` | Public Railway API URL used for Twilio delivery callbacks |
| `TWILIO_WEBHOOK_BASE_URL` | Exact public Railway API URL used to validate Twilio webhook signatures |
| `TWILIO_VALIDATE_WEBHOOKS` | Keep `true` in production; `false` is only for local webhook testing |
| `NCGROUPS_SYNC_TOKEN` | Dedicated long random token used only by the NC Vault publisher |
| `PORT` | Server port (default: 3000) |

## NC Vault Sync

The staff-safe NC Obsidian vault is the source of truth for people, groups, contact information, and group membership. NCGroups stores a published copy for fast use on staff phones. Text consent stays in NCGroups because it changes through Twilio START and STOP replies.

The publisher always previews changes first and reports creates, updates, archives, shared phones, and matching conflicts. It only applies the same reviewed payload and never sends a text.

From the NC vault, staff can double-click `scripts/Publish NCGroups.command`, or run:

```bash
python3 scripts/sync_ncgroups.py --audit
python3 scripts/sync_ncgroups.py
python3 scripts/sync_ncgroups.py --apply
```

Store the sync token in macOS Keychain instead of an Obsidian note:

```bash
security add-generic-password -a "$USER" -s ncgroups-sync-token -w
```

The first command is a local audit. The second previews the live changes. The third previews again and requires confirmation before publishing.

## Data Import

The import script (`scripts/import-data.js`) handles:

- **Name splitting**: "First Last" → firstName + lastName
- **Couples**: "Jessie and Brett Lafollette" → 2 separate records
- **Phone cleaning**: Removes commas, non-digits, validates 10-digit US numbers
- **Gender mapping**: f → Female, m → Male
- **Age groups**: M → Adult, Y → Youth, C → Child, YP → Adult + Youth Parents group
- **Adult texting eligibility**: Adults are textable only when membership is Member, Regular Attender, or Visitor. Youth Parent Non-NC, blank/Other, and Fourth Circle adult records remain available for lookup but are excluded from normal adult texting.
- **Opt-outs**: Detects "opt out" in name field
- **Group memberships**: Reads TRUE/FALSE from 29+ group columns

### Groups Created

**Leadership & D-Groups:**
Staff/Elder, Dave D-Group, Joel D-Group, Curtis D-Group, Rob D-Group, Rivers D-Group, Lori D-Group, Elaine D-Group, Maria D-Group, Purviance Group, NeighGrp Vonder

**Ministry Teams:**
Young Adults, JOY Club, Youth Ministry, Kids Ministry, Hospitality, Greeting, Band, Tech, Prayer, Care & Meals, Sports Camp, Cleaning, Grounds Crew, Building & Maint, Preaching Team, Finance/Counting, Send Relief Trained, Service Leader

**Special Groups:**
ALL NCYG, Kids Min Parents, Youth Parents

## Development

```bash
# Start development server with auto-reload
npm run dev

# Open Prisma Studio (database GUI)
npm run db:studio

# Run database migrations
npm run db:migrate
```

## Deployment

### Live Application
- **Frontend**: https://nc-groups-frontend.vercel.app/
- **Backend API**: https://ncgroups-api-production.up.railway.app
- **GitHub**: https://github.com/davepartin/ncgroups
- **Twilio Console**: https://console.twilio.com/?frameUrl=%2Fconsole%3Fx-target-region%3Dus1

### Backend (Railway)

- **Railway Project**: https://railway.com/project/d15a9a99-cd22-4318-9667-401bdc9df4ee?environmentId=cc814241-b48b-4615-8bc1-e232f74f4136

1. Create a new Railway project
2. Add PostgreSQL database
3. Connect your GitHub repo
4. Set environment variables in Railway dashboard
5. Deploy!

Railway will automatically run `npm install` and `npm start`.

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set root directory to `nc-groups-frontend`
3. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Set environment variable `VITE_API_URL` to your Railway backend URL
5. Deploy!

Text Blast sends SMS directly via the Twilio API using the credentials above.

## License

Private - Neighborhood Church internal use only.
