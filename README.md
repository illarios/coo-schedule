# COO Πρόγραμμα

PWA εφαρμογή διαχείρισης βαρδιών για το COO cafe-bar, Πτολεμαΐδα.

**Stack:** Next.js 14 · Supabase · Tailwind CSS · TypeScript · Web Push

---

## Δημιουργία λογαριασμών υπαλλήλων

### Βήμα 1 — Δημιουργία χρήστη στο Supabase

1. Supabase Dashboard → **Authentication → Users → Add user**
2. Email: `lenio@coo.internal` *(εσωτερικό, ο υπάλληλος δεν το βλέπει)*
3. Password: *(δυνατός κωδικός που θα δώσεις στον υπάλληλο)*
4. ☑️ **Auto Confirm User**
5. Πάτα **Create User** και αντέγραψε το UUID

### Βήμα 2 — Ενημέρωση του profile

Στο **SQL Editor** του Supabase:

```sql
UPDATE public.profiles
SET
  nickname  = 'Λένιο',
  full_name = 'Λένιο Παπαδόπουλος',
  role      = 'employee',
  color     = '#FFD800',
  active    = true
WHERE id = '<paste-uuid-here>';
```

Για **admin**:
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid>';
```

### Διαθέσιμα χρώματα για avatars

| Χρώμα | Hex |
|-------|-----|
| Κίτρινο | `#FFD800` |
| Κόκκινο | `#E63946` |
| Μπλε | `#7DD3FC` |
| Πράσινο | `#4CAF50` |
| Πορτοκαλί | `#FF8C00` |
| Μωβ | `#9B59B6` |

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/illarios/coo-schedule.git
cd coo-schedule

# 2. Install
npm install

# 3. Environment
cp .env.local.example .env.local
# → βάλε τα Supabase keys

# 4. Database (Supabase SQL Editor, με αυτή τη σειρά)
# supabase/schema.sql
# supabase/auth_helpers.sql
# supabase/push_subscriptions.sql
# supabase/notifications_triggers.sql

# 5. Dev server
npm run dev
# → http://localhost:3000
```

---

## Deployment (Vercel)

### Environment Variables

Βάλε όλα αυτά στο Vercel Dashboard → Project → Settings → Environment Variables:

| Key | Πού το βρίσκεις |
|-----|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | ίδιο |
| `VAPID_EMAIL` | `mailto:terpos77@gmail.com` |
| `COO_INTERNAL_SECRET` | `openssl rand -hex 32` |

### Deploy steps

1. **GitHub repo** συνδεδεμένο στο Vercel ✓
2. **Import .env** στην πρώτη σύνδεση (ή Settings → Env Vars)
3. **Region:** `fra1` (Frankfurt) — ήδη στο `vercel.json`
4. **Cron jobs:** Vercel ανιχνεύει αυτόματα το `vercel.json` — δεν χρειάζεται κάτι άλλο
5. Push στο `main` → αυτόματο deployment

### Supabase Edge Functions (για Web Push)

```bash
# Login
supabase login

# Link
supabase link --project-ref cwipzfjqwbbqljwtzkaf

# Secrets
supabase secrets set \
  APP_URL=https://your-app.vercel.app \
  COO_INTERNAL_SECRET=<same-as-vercel> \
  VAPID_PRIVATE_KEY=<your-key> \
  VAPID_EMAIL=mailto:terpos77@gmail.com

# Deploy
supabase functions deploy send-push-notification

# DB Webhook (Supabase Dashboard → Database → Webhooks)
# Table: notifications | Event: INSERT
# URL: https://cwipzfjqwbbqljwtzkaf.supabase.co/functions/v1/send-push-notification
# Header: Authorization: Bearer <service_role_key>
```

---

## Checklist Δοκιμών

### 1. Login flow
- [ ] Σύνδεση με σωστό nickname + password → redirect στο `/schedule`
- [ ] Λάθος password → εμφανίζεται "Λάθος όνομα ή κωδικός"
- [ ] Λάθος nickname → ίδιο μήνυμα (δεν αποκαλύπτει αν υπάρχει ο χρήστης)
- [ ] Με σωστά credentials → δεν ξαναεμφανίζεται login

### 2. Δήλωση διαθεσιμότητας
- [ ] Tap σε μέρα → άνοιγμα day card
- [ ] Επιλογή ΠΡΩΙ / ΒΡΑΔΥ / ΣΠΑΣΤΟ / ΟΠΟΤΕ / ΚΛΕΙΣΤΟ → αυτόματη αποθήκευση (400ms)
- [ ] Toast επιβεβαίωσης εμφανίζεται
- [ ] Refresh → επιλογή παραμένει
- [ ] Admin grid δείχνει σωστά τα χρώματα

### 3. Admin: ανάθεση βάρδιας
- [ ] Login ως admin
- [ ] `/schedule` → tap σε βάρδια → modal επιλογής υπαλλήλου
- [ ] Επιλογή υπαλλήλου → βάρδια ανατίθεται + εμφανίζεται chip
- [ ] Ο υπάλληλος λαμβάνει in-app notification
- [ ] Realtime: άλλη καρτέλα ανανεώνεται αυτόματα

### 4. Αίτηση swap
- [ ] Employee: tap στη βάρδια του → "Αίτηση Swap"
- [ ] Επιλογή συναδέλφου → προαιρετικό μήνυμα → αποστολή
- [ ] Target employee λαμβάνει notification
- [ ] Target: tap notification → respond modal → "Αποδοχή"
- [ ] Admin λαμβάνει notification "προς έγκριση"
- [ ] Admin: `/admin/swaps` → "Εγκρίθηκε"
- [ ] Και οι δύο λαμβάνουν notification επιβεβαίωσης
- [ ] Βάρδιες αλλάζουν στο schedule

### 5. Notifications
- [ ] Bell icon στο bottom nav δείχνει badge με αριθμό unread
- [ ] Tap bell → bottom sheet με λίστα
- [ ] Unread: bold + κίτρινο φόντο, read: λευκό
- [ ] Tap notification → mark as read + navigate
- [ ] "Σήμανση όλων" → όλα γίνονται read
- [ ] Realtime: νέα notification εμφανίζεται χωρίς refresh

### 6. Web Push
- [ ] Πρώτο login → 3 δευτ αργότερα εμφανίζεται permission prompt
- [ ] "Allow" → notification permission granted
- [ ] Ανάθεση βάρδιας → push notification στο κλειδωμένο κινητό

### 7. PWA Installation

**Android (Chrome):**
- [ ] Εμφανίζεται install banner στη 2η επίσκεψη
- [ ] Tap "Εγκατάσταση" → Chrome prompt → Add
- [ ] Εφαρμογή εμφανίζεται στο home screen
- [ ] Άνοιγμα → standalone mode (χωρίς browser chrome)
- [ ] Splash screen με κίτρινο φόντο

**iOS (Safari):**
- [ ] Εμφανίζεται banner με οδηγίες (Share → Add to Home Screen)
- [ ] Ακολουθείς οδηγίες → εφαρμογή στο home screen
- [ ] Άνοιγμα → standalone mode

### 8. Offline behavior
- [ ] Ανοιχτή εφαρμογή → απενεργοποίηση WiFi
- [ ] Navigate → εμφανίζεται `/offline` page
- [ ] Ενεργοποίηση WiFi → "Δοκίμασε ξανά" → επιστροφή κανονικά

---

## Αρχιτεκτονική

```
app/
  (auth)/login/         ← Nickname + password login
  (app)/
    schedule/           ← Κεντρική σελίδα βαρδιών
    availability/       ← Δήλωση διαθεσιμότητας
    history/            ← Ιστορικό ωρών (coming soon)
    admin/
      swaps/            ← Διαχείριση swap requests
      assign/           ← Ανάθεση βαρδιών
      employees/        ← Διαχείριση υπαλλήλων

components/
  app-shell.tsx         ← Layout wrapper, notifications, install banner
  schedule-realtime.tsx ← Schedule με realtime + modals
  swap-*.tsx            ← 3-party swap flow modals

supabase/
  schema.sql            ← Βασικό schema (τρέξε πρώτο)
  auth_helpers.sql      ← Nickname→email RPC (τρέξε δεύτερο)
  push_subscriptions.sql
  notifications_triggers.sql

supabase/functions/
  send-push-notification/  ← DB webhook → Web Push
  shift-reminders/         ← Cron: υπενθυμίσεις 2h πριν
```

---

## Shift types

| Τύπος | Ώρες | Hours |
|-------|------|-------|
| `morning` | 08:00–15:00 | 7h |
| `evening` | 16:00–23:00 | 7h |
| `split`   | 11:00–15:00 + 19:00–23:00 | 8h |
