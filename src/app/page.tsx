"use client"

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"

type ViewMode = "kanban" | "list"
type NavItemId = "dashboard" | "applications" | "profile" | "settings"

type NavItem = {
  id: NavItemId
  label: string
  description: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Genel görünüm",
  },
  {
    id: "applications",
    label: "Başvurular",
    description: "Kanban veya liste",
  },
  {
    id: "profile",
    label: "Profil",
    description: "Kariyer hedefin",
  },
  {
    id: "settings",
    label: "Ayarlar",
    description: "Tercihler ve güvenlik",
  },
]

const KANBAN_COLUMNS: Array<{ id: string; title: string }> = [
  { id: "applied", title: "Beklemede" },
  { id: "interviewing", title: "Mülakat Aşamasında" },
  { id: "rejected", title: "Reddedildi" },
  { id: "offer", title: "Kabul Edildi" },
]

type ApplicationStatus = "Applied" | "Interviewing" | "Rejected" | "OfferReceived"

type ApplicationItem = {
  id: string
  companyName: string
  companyLogoUrl: string
  jobTitle: string
  location: string
  applicationDate: string
  jobDescription: string
  hrContact: string
  status: ApplicationStatus
}

type ApplicationFormState = {
  companyName: string
  companyLogoUrl: string
  jobTitle: string
  location: string
  applicationDate: string
  jobDescription: string
  hrContact: string
  status: ApplicationStatus
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Applied: "Beklemede",
  Interviewing: "Mülakat",
  Rejected: "Reddedildi",
  OfferReceived: "Teklif",
}

const STATUS_OPTIONS: Array<ApplicationStatus> = [
  "Applied",
  "Interviewing",
  "Rejected",
  "OfferReceived",
]

const STATUS_TO_COLUMN_ID: Record<ApplicationStatus, string> = {
  Applied: "applied",
  Interviewing: "interviewing",
  Rejected: "rejected",
  OfferReceived: "offer",
}

const LOCATIONS: string[] = [
  "Remote",
  "Hibrit",
  "İstanbul",
  "Ankara",
  "İzmir",
  "Diğer",
]

const cn = (...parts: Array<string | false | undefined>) =>
  parts.filter(Boolean).join(" ")

const getInitials = (label: string) => {
  const words = label.split(" ").filter(Boolean)
  const initials = words.map((w) => w[0]).join("")
  return initials.toUpperCase()
}

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const formatISODate = (iso: string) => {
  const trimmed = iso.trim()
  if (!trimmed) return "—"
  const asDate = new Date(trimmed)
  if (Number.isNaN(asDate.getTime())) return "—"
  return asDate.toLocaleDateString("tr-TR")
}

const extractCareerKeywords = (careerGoal: string) => {
  const raw = careerGoal
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)

  const stopwords = new Set([
    "ve",
    "ile",
    "bir",
    "olan",
    "için",
    "şu",
    "şunlar",
    "şunların",
    "şunları",
    "kullanarak",
    "kullanan",
    "kullanma",
    "şekilde",
    "da",
    "de",
    "yani",
    "vs",
    "vb",
  ])

  return raw
    .filter((w) => w.length >= 3)
    .filter((w) => !stopwords.has(w))
    .slice(0, 18)
}

const computeCareerFitScore = (careerGoal: string, apps: Array<ApplicationItem>) => {
  const keywords = extractCareerKeywords(careerGoal)
  if (keywords.length === 0) return 0

  const topApps = apps.slice(0, 3)
  if (topApps.length === 0) return 0

  const scores = topApps.map((app) => {
    const text = `${app.jobTitle} ${app.companyName} ${app.location}`.toLowerCase()
    const hits = keywords.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0)
    return (hits / keywords.length) * 100
  })

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.max(0, Math.min(100, Math.round(avg)))
}

const SidebarLogo = () => (
  <div className="flex items-center gap-3">
    <div
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-400 via-orange-400 to-amber-300 text-white shadow-[8px_8px_18px_rgba(251,113,133,0.22),_-8px_-8px_18px_rgba(255,255,255,0.75)]"
      role="img"
      aria-label="Job Tracker logosu"
    >
      JT
    </div>
    <div className="leading-tight">
      <p className="text-sm font-semibold text-zinc-900">
        Job Tracker
      </p>
      <p className="text-xs text-zinc-600">
        Başvurular Panosu
      </p>
    </div>
  </div>
)

const KanbanEmptyState = () => (
  <div
    className="grid grid-cols-1 gap-3 lg:grid-cols-4"
    aria-label="Kanban boş görünümü"
  >
    {KANBAN_COLUMNS.map((col) => (
      <div
        key={col.id}
        className="rounded-3xl border border-zinc-200/70 bg-white/60 p-4 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.02),_inset_-2px_-2px_12px_rgba(255,255,255,0.7)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            {col.title}
          </h2>
        </div>

        <div className="mt-4 space-y-2" aria-hidden="true">
          <div className="h-16 rounded-2xl border border-dashed border-zinc-200 bg-white/50" />
          <div className="h-16 rounded-2xl border border-dashed border-zinc-200 bg-white/50" />
        </div>

        <p className="mt-4 text-center text-xs font-medium text-zinc-500">
          Kart eklendiğinde burada görünecek
        </p>
      </div>
    ))}
  </div>
)

const ListEmptyState = () => (
  <div className="rounded-3xl border border-zinc-200/70 bg-white/60 p-4 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.02),_inset_-2px_-2px_12px_rgba(255,255,255,0.7)]">
    <div className="grid grid-cols-12 gap-2 rounded-2xl bg-gradient-to-r from-pink-50/70 via-blue-50/70 to-emerald-50/70 px-3 py-2 text-xs font-semibold text-zinc-700">
      <div className="col-span-4">Şirket / Pozisyon</div>
      <div className="col-span-3">Konum</div>
      <div className="col-span-2">Tarih</div>
      <div className="col-span-2">Durum</div>
      <div className="col-span-1 text-right">Puan</div>
    </div>

    <div className="mt-3 space-y-2" aria-label="Boş liste görünümü">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="grid grid-cols-12 gap-2 rounded-2xl border border-dashed border-zinc-200 bg-white/50 px-3 py-3"
        >
          <div className="col-span-4">
            <div className="h-3 w-10 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-24 rounded bg-zinc-200" />
          </div>
          <div className="col-span-3">
            <div className="h-3 w-20 rounded bg-zinc-200" />
          </div>
          <div className="col-span-2">
            <div className="h-3 w-14 rounded bg-zinc-200" />
          </div>
          <div className="col-span-2">
            <div className="h-7 w-24 rounded-xl bg-zinc-100" />
          </div>
          <div className="col-span-1 flex items-center justify-end">
            <div className="h-7 w-8 rounded-xl bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const EmptyNavPanel = ({ title }: { title: string }) => (
  <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-8 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.02),_inset_-2px_-2px_12px_rgba(255,255,255,0.65)]">
    <div className="flex items-start justify-between gap-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Bu bölüm için UI iskeleti hazır. İçerik daha sonra eklenecek
        </p>
      </div>
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white/40 px-4 py-3 text-xs font-semibold text-zinc-500">
        Yakında
      </div>
    </div>
  </div>
)

const DashboardPanel = ({ applications }: { applications: Array<ApplicationItem> }) => {
  const total = applications.length

  const counts = applications.reduce(
    (acc, app) => {
      acc[app.status] += 1
      return acc
    },
    {
      Applied: 0,
      Interviewing: 0,
      Rejected: 0,
      OfferReceived: 0,
    } as Record<ApplicationStatus, number>,
  )

  const nextSteps = applications
    .filter((a) => a.status === "Applied" || a.status === "Interviewing")
    .slice(0, 4)

  const recent = applications.slice(0, 5)

  const renderCard = (status: ApplicationStatus, accent: string, ring: string) => {
    const count = counts[status]
    return (
      <div
        className={[
          "rounded-3xl border border-zinc-200/70 bg-white/70 p-4 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.02),_inset_-2px_-2px_12px_rgba(255,255,255,0.65)]",
        ].join(" ")}
        aria-label={`${STATUS_LABELS[status]} sayısı`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-600">{STATUS_LABELS[status]}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{count}</p>
          </div>
          <div
            className={[
              "inline-flex h-10 w-10 items-center justify-center rounded-3xl border",
              ring,
              accent,
            ].join(" ")}
            aria-hidden="true"
          >
            <div className="h-3 w-3 rounded-full bg-current" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-zinc-200/70 bg-white/60 p-4 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.02),_inset_-2px_-2px_12px_rgba(255,255,255,0.65)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-zinc-900">Bugün ne durumda?</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Toplam <span className="font-semibold">{total}</span> başvuru
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-50/70 via-blue-50/70 to-emerald-50/70 px-3 py-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-pink-500" aria-hidden="true" />
          <p className="text-xs font-semibold text-zinc-700">Hızlı durum özeti</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {renderCard("Applied", "text-pink-600", "border-pink-200 bg-pink-50/70")}
        {renderCard("Interviewing", "text-blue-600", "border-blue-200 bg-blue-50/70")}
        {renderCard("Rejected", "text-rose-600", "border-rose-200 bg-rose-50/70")}
        {renderCard("OfferReceived", "text-emerald-600", "border-emerald-200 bg-emerald-50/70")}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-900">Takip önerileri</h3>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {nextSteps.length === 0 ? "Hazır" : `${nextSteps.length} adım`}
            </span>
          </div>

          {nextSteps.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              Şu an ilerletilecek bir başvuru görünmüyor. İstersen yeni başvurular ekleyebilirsin.
            </p>
          ) : null}

          {nextSteps.length > 0 ? (
            <div className="mt-3 space-y-2">
              {nextSteps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/60 px-3 py-2"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <CompanyAvatar companyName={app.companyName} companyLogoUrl={app.companyLogoUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">{app.jobTitle}</p>
                      <p className="truncate text-xs text-zinc-600">{app.companyName}</p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-900">Son eklenenler</h3>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {recent.length === 0 ? "—" : `${recent.length}`}
            </span>
          </div>

          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">Henüz bir kayıt yok. “Yeni Ekle” ile başlayabilirsin.</p>
          ) : null}

          {recent.length > 0 ? (
            <div className="mt-3 space-y-2">
              {recent.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/60 px-3 py-2"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <CompanyAvatar companyName={app.companyName} companyLogoUrl={app.companyLogoUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">{app.jobTitle}</p>
                      <p className="truncate text-xs text-zinc-600">{formatISODate(app.applicationDate)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-zinc-500">{app.location}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const ProfilePanel = ({
  applications,
  careerGoal,
  onSave,
}: {
  applications: Array<ApplicationItem>
  careerGoal: string
  onSave: (next: string) => void
}) => {
  const [draft, setDraft] = useState(careerGoal)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(careerGoal)
    setError(null)
  }, [careerGoal])

  const keywordCount = extractCareerKeywords(draft).length
  const fitScore = computeCareerFitScore(draft, applications)

  const handleSubmit = () => {
    const next = draft.trim()
    if (next.length < 8) {
      setError("Ana hedef metni biraz daha detaylı olmalı (en az 8 karakter)")
      return
    }

    onSave(next)
    setError(null)
  }

  const progressWidth = `${fitScore}%`

  return (
    <div className="rounded-3xl border border-zinc-200/70 bg-white/60 p-4 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.02),_inset_-2px_-2px_12px_rgba(255,255,255,0.65)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-zinc-900">Ana Hedefin</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Başvurularının hangi role yakın olduğunu anlamak için kullanılır
          </p>
        </div>
        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-zinc-600">Hedef uyumu</p>
            <span className="text-sm font-semibold text-zinc-900">{fitScore}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-gradient-to-r from-pink-100 via-blue-100 to-emerald-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-400 via-orange-400 to-amber-300"
              style={{ width: progressWidth }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Son başvurularına göre anahtar kelime eşleşmesi
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200/70 bg-white/70 p-4">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="careerGoal">
            “Benim asıl aradığım pozisyon ve yeteneklerim şunlar”
          </label>
          <textarea
            id="careerGoal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Ana hedef metni"
            className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-pink-100"
            placeholder="Örn: React + TypeScript ile mid-level fullstack. Backend tarafında Node.js, PostgreSQL ve sistem tasarımı."
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-600">
              {draft.trim().length} karakter · {keywordCount} anahtar kelime
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                tabIndex={0}
                aria-label="Formu sıfırla"
                onClick={() => {
                  setDraft(careerGoal)
                  setError(null)
                }}
                className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100"
              >
                İptal
              </button>
              <button
                type="button"
                tabIndex={0}
                aria-label="Ana hedefi kaydet"
                onClick={handleSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-400 via-orange-400 to-amber-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-[0_14px_30px_rgba(251,113,133,0.22)] transition hover:shadow-[0_18px_40px_rgba(251,113,133,0.28)] focus:outline-none focus:ring-4 focus:ring-pink-200"
              >
                Kaydet
              </button>
            </div>
          </div>
          {error ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Öneri</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Daha iyi eşleşme için rol, teknoloji ve domain kelimelerini eklemeyi deneyebilirsin.
          </p>

          <div className="mt-3 space-y-2">
            <div className="rounded-2xl border border-zinc-200/70 bg-white/60 px-3 py-2">
              <p className="text-xs font-semibold text-zinc-700">İyi örnek</p>
              <p className="mt-1 text-xs text-zinc-600">“React, TypeScript, Node.js, PostgreSQL, ürün odaklı geliştirme”</p>
            </div>
            <div className="rounded-2xl border border-zinc-200/70 bg-white/60 px-3 py-2">
              <p className="text-xs font-semibold text-zinc-700">Kısa tut ama net</p>
              <p className="mt-1 text-xs text-zinc-600">Tek cümle bile yeterli olabilir, sonra genişletirsin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SettingsPanel = ({
  defaultViewMode,
  onSetDefaultViewMode,
}: {
  defaultViewMode: ViewMode
  onSetDefaultViewMode: (next: ViewMode) => void
}) => {
  return (
    <div className="rounded-3xl border border-zinc-200/70 bg-white/60 p-4 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.02),_inset_-2px_-2px_12px_rgba(255,255,255,0.65)] md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-zinc-900">Ayarlar</h2>
          <p className="mt-1 text-sm text-zinc-600">Konforunu ayarla, panelin davranışını kişiselleştir</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm">
          <span className="inline-flex h-2 w-2 rounded-full bg-orange-400" aria-hidden="true" />
          <p className="text-xs font-semibold text-zinc-700">Tailwind + pastel vibe</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Varsayılan görünüm</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Başvurular sekmesine geri döndüğünde kullanılacak başlangıç görünümü
          </p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-50/70 via-blue-50/70 to-emerald-50/70 p-1">
            <button
              type="button"
              tabIndex={0}
              aria-label="Varsayılan görünüm olarak Kanban seç"
              aria-pressed={defaultViewMode === "kanban"}
              onClick={() => onSetDefaultViewMode("kanban")}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return
                e.preventDefault()
                onSetDefaultViewMode("kanban")
              }}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-pink-200/70",
                defaultViewMode === "kanban"
                  ? "bg-white text-zinc-900 shadow"
                  : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              Kanban
            </button>
            <button
              type="button"
              tabIndex={0}
              aria-label="Varsayılan görünüm olarak Liste seç"
              aria-pressed={defaultViewMode === "list"}
              onClick={() => onSetDefaultViewMode("list")}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return
                e.preventDefault()
                onSetDefaultViewMode("list")
              }}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-pink-200/70",
                defaultViewMode === "list"
                  ? "bg-white text-zinc-900 shadow"
                  : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              Liste
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Hızlı not</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Bu demo şu an sadece arayüz + client-side state içerir. İleride gerçek veritabanı entegrasyonu eklenince burada senkronizasyon ayarları da görünecek.
          </p>
          <div className="mt-3 rounded-2xl border border-zinc-200/70 bg-gradient-to-r from-pink-50/70 via-blue-50/70 to-emerald-50/70 px-3 py-2">
            <p className="text-xs font-semibold text-zinc-700">İpucu</p>
            <p className="mt-1 text-xs text-zinc-600">“Profil” ekranına ana hedefini girince Dashboard’daki eşleşme önerileri canlanır</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const Icon = ({ name }: { name: NavItemId | "plus" | "x" | "edit" }) => {
  const common = "h-5 w-5"
  switch (name) {
    case "dashboard":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 13.5C4 12.1193 4 11.4289 4.2716 10.8787C4.5096 10.3951 4.8903 10.0144 5.3739 9.77638C5.92408 9.50478 6.6145 9.50478 7.99525 9.50478H16.0048C17.3855 9.50478 18.0759 9.50478 18.6261 9.77638C19.1097 10.0144 19.4904 10.3951 19.7284 10.8787C20 11.4289 20 12.1193 20 13.5V17C20 18.6569 18.6569 20 17 20H7C5.34315 20 4 18.6569 4 17V13.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M7 9.5V7.8C7 6.11984 8.11984 5 9.8 5H14.2C15.8802 5 17 6.11984 17 7.8V9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case "applications":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M7 3.8C5.89543 3.8 5 4.69543 5 5.8V18.2C5 19.3046 5.89543 20.2 7 20.2H17C18.1046 20.2 19 19.3046 19 18.2V5.8C19 4.69543 18.1046 3.8 17 3.8H7Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 8H16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8 12H13.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8 16H11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case "profile":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M12 12.2C14.2091 12.2 16 10.4091 16 8.2C16 5.99086 14.2091 4.2 12 4.2C9.79086 4.2 8 5.99086 8 8.2C8 10.4091 9.79086 12.2 12 12.2Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4.5 19.4C5.95 16.55 8.7 14.9 12 14.9C15.3 14.9 18.05 16.55 19.5 19.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case "settings":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M12 15.6C13.9898 15.6 15.6 13.9898 15.6 12C15.6 10.0102 13.9898 8.4 12 8.4C10.0102 8.4 8.4 10.0102 8.4 12C8.4 13.9898 10.0102 15.6 12 15.6Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19.4 12C19.4 12.45 19.35 12.88 19.25 13.29L21 14.1L19.4 17.3L17.5 16.6C16.85 17.35 16.08 17.95 15.2 18.35L15 20.5H9L8.8 18.35C7.92 17.95 7.15 17.35 6.5 16.6L4.6 17.3L3 14.1L4.75 13.29C4.65 12.88 4.6 12.45 4.6 12C4.6 11.55 4.65 11.12 4.75 10.71L3 9.9L4.6 6.7L6.5 7.4C7.15 6.65 7.92 6.05 8.8 5.65L9 3.5H15L15.2 5.65C16.08 6.05 16.85 6.65 17.5 7.4L19.4 6.7L21 9.9L19.25 10.71C19.35 11.12 19.4 11.55 19.4 12Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case "plus":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case "x":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M6.5 6.5L17.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17.5 6.5L6.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case "edit":
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M14.5 4.5L19.5 9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8 20H4V16L16.8 3.2C17.4 2.6 18.4 2.6 19 3.2L20.8 5C21.4 5.6 21.4 6.6 20.8 7.2L8 20Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    default:
      return null
  }
}

const NavIconWrapper = ({ id }: { id: NavItemId }) => {
  const color =
    id === "dashboard"
      ? "text-blue-500"
      : id === "applications"
        ? "text-pink-500"
        : id === "profile"
          ? "text-emerald-500"
          : "text-orange-500"

  return (
    <div
      className={[
        "mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm",
        id === "dashboard" && "border-blue-100 bg-blue-50/70",
        id === "applications" && "border-pink-100 bg-pink-50/70",
        id === "profile" && "border-emerald-100 bg-emerald-50/70",
        id === "settings" && "border-orange-100 bg-orange-50/70",
      ].join(" ")}
      aria-hidden="true"
    >
      <div className={color}>
        <Icon name={id} />
      </div>
    </div>
  )
}

const CompanyAvatar = ({ companyName, companyLogoUrl }: { companyName: string; companyLogoUrl: string }) => {
  const [isBroken, setIsBroken] = useState(false)
  const initials = getInitials(companyName)

  if (companyLogoUrl.trim() && !isBroken) {
    return (
      <img
        src={companyLogoUrl.trim()}
        alt={`${companyName} amblemi`}
        className="h-10 w-10 rounded-2xl bg-white/70 object-cover shadow-sm ring-1 ring-zinc-200/80"
        onError={() => setIsBroken(true)}
      />
    )
  }

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-sm font-bold text-zinc-800 shadow-sm ring-1 ring-zinc-200/80"
      aria-hidden="true"
    >
      {initials || "CT"}
    </div>
  )
}

const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const cfg =
    status === "Applied"
      ? {
          bg: "bg-pink-50",
          border: "border-pink-200",
          text: "text-pink-800",
        }
      : status === "Interviewing"
        ? {
            bg: "bg-blue-50",
            border: "border-blue-200",
            text: "text-blue-800",
          }
        : status === "Rejected"
          ? {
              bg: "bg-rose-50",
              border: "border-rose-200",
              text: "text-rose-800",
            }
          : {
              bg: "bg-emerald-50",
              border: "border-emerald-200",
              text: "text-emerald-800",
            }

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        cfg.bg,
        cfg.border,
        cfg.text,
      ].join(" ")}
      aria-label={`Başvuru durumu: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

const ApplicationsListView = ({
  applications: apps,
  onEdit,
}: {
  applications: Array<ApplicationItem>
  onEdit: (application: ApplicationItem) => void
}) => {
  return (
    <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.03),_inset_-2px_-2px_12px_rgba(255,255,255,0.65)]">
      <div className="grid grid-cols-12 gap-2 rounded-2xl bg-gradient-to-r from-pink-50/70 via-blue-50/70 to-emerald-50/70 px-3 py-2 text-xs font-semibold text-zinc-700">
        <div className="col-span-4">Şirket / Pozisyon</div>
        <div className="col-span-3">Konum</div>
        <div className="col-span-2">Tarih</div>
        <div className="col-span-2">Durum</div>
        <div className="col-span-1 text-right">Puan</div>
      </div>

      <div className="mt-3 space-y-2" aria-label="Başvurular listesi">
        {apps.map((app) => (
          <div
            key={app.id}
            className="grid grid-cols-12 gap-2 rounded-2xl border border-zinc-200/70 bg-white/70 px-3 py-3 shadow-sm transition-shadow hover:shadow-md"
            role="article"
          >
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <CompanyAvatar companyName={app.companyName} companyLogoUrl={app.companyLogoUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">{app.jobTitle}</p>
                <p className="truncate text-xs text-zinc-600">{app.companyName}</p>
              </div>
            </div>

            <div className="col-span-3 flex items-center text-sm text-zinc-700">
              {app.location}
            </div>

            <div className="col-span-2 flex items-center text-sm text-zinc-700">
              {formatISODate(app.applicationDate)}
            </div>

            <div className="col-span-2 flex items-center justify-start">
              <StatusBadge status={app.status} />
            </div>

            <div className="col-span-1 flex items-center justify-end">
              <span className="text-xs font-semibold text-zinc-500">—</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ApplicationsKanbanView = ({
  applications: apps,
  onEdit,
}: {
  applications: Array<ApplicationItem>
  onEdit: (application: ApplicationItem) => void
}) => {
  const grouped: Record<string, Array<ApplicationItem>> = apps.reduce(
    (acc, app) => {
      const columnId = STATUS_TO_COLUMN_ID[app.status]
      const next = acc[columnId] ?? []
      next.push(app)
      return { ...acc, [columnId]: next }
    },
    {} as Record<string, Array<ApplicationItem>>,
  )

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4" aria-label="Başvurular Kanban görünümü">
      {KANBAN_COLUMNS.map((col) => {
        const colApps = grouped[col.id] ?? []
        return (
          <div
            key={col.id}
            className="rounded-3xl border border-zinc-200/70 bg-white/60 p-4 shadow-[inset_2px_2px_12px_rgba(0,0,0,0.02),_inset_-2px_-2px_12px_rgba(255,255,255,0.6)]"
            role="region"
            aria-label={`${col.title} sütunu`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">{col.title}</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                {colApps.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {colApps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 px-3 py-4 text-xs font-semibold text-zinc-500">
                  Kart yok
                </div>
              ) : null}

              {colApps.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl border border-zinc-200/70 bg-white/70 p-3 shadow-sm transition-shadow hover:shadow-md"
                  role="article"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <CompanyAvatar companyName={app.companyName} companyLogoUrl={app.companyLogoUrl} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{app.jobTitle}</p>
                        <p className="truncate text-xs text-zinc-600">{app.companyName}</p>
                        <p className="mt-2 text-xs font-medium text-zinc-700">{app.location}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      tabIndex={0}
                      aria-label={`Başvuruyu düzenle: ${app.companyName} - ${app.jobTitle}`}
                      onClick={() => onEdit(app)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return
                        e.preventDefault()
                        onEdit(app)
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200/70 bg-white/70 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-4 focus:ring-pink-200/70"
                    >
                      <Icon name="edit" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                      {formatISODate(app.applicationDate)}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const AddApplicationModal = ({
  isOpen,
  onClose,
  mode,
  form,
  setForm,
  error,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
  form: ApplicationFormState
  setForm: Dispatch<SetStateAction<ApplicationFormState>>
  error: string | null
  onSave: () => void
}) => {
  if (!isOpen) return null

  const isEdit = mode === "edit"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Başvuruyu düzenle" : "Yeni başvuru ekle"}
    >
      <button
        type="button"
        tabIndex={0}
        onClick={onClose}
        aria-label="Modal arka planını kapat"
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-3xl rounded-3xl border border-zinc-200/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.18),_inset_2px_2px_20px_rgba(255,255,255,0.8)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-100 to-blue-100 px-3 py-1 text-xs font-semibold text-zinc-800">
              <span className="inline-flex h-2 w-2 rounded-full bg-pink-500" aria-hidden="true" />
              PRD Form
            </div>
            <h2 className="mt-3 text-lg font-semibold text-zinc-900">
              {isEdit ? "Başvuruyu Düzenle" : "Yeni Başvuru"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {isEdit ? "Değişiklikleri yap, “Kaydet” ile güncelle" : "Bilgileri gir, “Kaydet” ile listeye ekle"}
            </p>
          </div>

          <button
            type="button"
            tabIndex={0}
            onClick={onClose}
            aria-label="Modalı kapat"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white/70 text-zinc-700 shadow-sm transition hover:bg-white"
          >
            <Icon name="x" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-zinc-800" htmlFor="companyName">
              Şirket Adı <span className="text-pink-500">*</span>
            </label>
            <input
              id="companyName"
              type="text"
              value={form.companyName}
              onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
              aria-label="Şirket Adı"
              className="mt-2 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-pink-100"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-zinc-800" htmlFor="companyLogoUrl">
              Şirket Amblemi (URL)
            </label>
            <input
              id="companyLogoUrl"
              type="url"
              value={form.companyLogoUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, companyLogoUrl: e.target.value }))}
              aria-label="Şirket Amblemi (URL)"
              className="mt-2 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-blue-100"
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-zinc-800" htmlFor="jobTitle">
              Pozisyon Adı <span className="text-pink-500">*</span>
            </label>
            <input
              id="jobTitle"
              type="text"
              value={form.jobTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
              aria-label="Pozisyon Adı"
              className="mt-2 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-pink-100"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-zinc-800" htmlFor="location">
              Konum
            </label>
            <select
              id="location"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              aria-label="Konum"
              className="mt-2 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-zinc-800" htmlFor="applicationDate">
              Başvuru Tarihi
            </label>
            <input
              id="applicationDate"
              type="date"
              value={form.applicationDate}
              onChange={(e) => setForm((prev) => ({ ...prev, applicationDate: e.target.value }))}
              aria-label="Başvuru Tarihi"
              className="mt-2 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-semibold text-zinc-800" htmlFor="status">
              Durum
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as ApplicationStatus,
                }))
              }
              aria-label="Durum"
              className="mt-2 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-zinc-500">
              Seçim, kartın kanban kolonunu belirler
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-zinc-800" htmlFor="jobDescription">
              İş Tanımı
            </label>
            <textarea
              id="jobDescription"
              value={form.jobDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, jobDescription: e.target.value }))}
              aria-label="İş Tanımı"
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-blue-100"
              placeholder="İlan metnini buraya yapıştırabilirsin"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-zinc-800" htmlFor="hrContact">
              İK Bilgisi
            </label>
            <textarea
              id="hrContact"
              value={form.hrContact}
              onChange={(e) => setForm((prev) => ({ ...prev, hrContact: e.target.value }))}
              aria-label="İK Bilgisi"
              className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-zinc-900 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-emerald-100"
              placeholder="İsim, e-posta, LinkedIn vb."
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            tabIndex={0}
            onClick={onClose}
            aria-label="Modalı iptal et"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-200"
          >
            İptal
          </button>

          <button
            type="button"
            tabIndex={0}
            onClick={onSave}
            aria-label="Kaydet"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-400 via-orange-400 to-amber-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-[0_14px_30px_rgba(251,113,133,0.28)] transition hover:shadow-[0_18px_40px_rgba(251,113,133,0.32)] focus:outline-none focus:ring-4 focus:ring-pink-200"
          >
            <Icon name="plus" />
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [activeNav, setActiveNav] = useState<NavItemId>("applications")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [defaultViewMode, setDefaultViewMode] = useState<ViewMode>("list")
  const [applications, setApplications] = useState<Array<ApplicationItem>>([])
  const [careerGoal, setCareerGoal] = useState<string>("")

  const initialForm: ApplicationFormState = {
    companyName: "",
    companyLogoUrl: "",
    jobTitle: "",
    location: "Remote",
    applicationDate: "",
    jobDescription: "",
    hrContact: "",
    status: "Applied",
  }

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editApplicationId, setEditApplicationId] = useState<string | null>(null)
  const [form, setForm] = useState<ApplicationFormState>(initialForm)
  const [formError, setFormError] = useState<string | null>(null)

  const activeItem = NAV_ITEMS.find((i) => i.id === activeNav) ?? NAV_ITEMS[1]

  const handleSelectNav = (id: NavItemId) => {
    setActiveNav(id)
  }

  const handleNavKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    id: NavItemId,
  ) => {
    if (e.key !== "Enter" && e.key !== " ") return
    e.preventDefault()
    handleSelectNav(id)
  }

  const handleSetViewMode = (next: ViewMode) => {
    setViewMode(next)
  }

  const handleSetDefaultViewMode = (next: ViewMode) => {
    setDefaultViewMode(next)
    if (activeNav === "applications") {
      setViewMode(next)
    }
  }

  const handleOpenAddModal = () => {
    setFormError(null)
    setEditApplicationId(null)
    setForm(initialForm)
    setIsAddModalOpen(true)
  }

  const handleCloseAddModal = () => {
    setFormError(null)
    setEditApplicationId(null)
    setIsAddModalOpen(false)
  }

  const handleOpenEditModal = (application: ApplicationItem) => {
    setFormError(null)
    setEditApplicationId(application.id)
    setForm({
      companyName: application.companyName,
      companyLogoUrl: application.companyLogoUrl,
      jobTitle: application.jobTitle,
      location: application.location,
      applicationDate: application.applicationDate,
      jobDescription: application.jobDescription,
      hrContact: application.hrContact,
      status: application.status,
    })
    setIsAddModalOpen(true)
  }

  useEffect(() => {
    if (activeNav !== "applications") return
    setViewMode(defaultViewMode)
  }, [activeNav, defaultViewMode])

  useEffect(() => {
    if (!isAddModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseAddModal()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isAddModalOpen])

  const handleSaveApplication = () => {
    const companyName = form.companyName.trim()
    const jobTitle = form.jobTitle.trim()
    const location = form.location.trim()

    if (!companyName) {
      setFormError("Şirket Adı zorunludur")
      return
    }

    if (!jobTitle) {
      setFormError("Pozisyon Adı zorunludur")
      return
    }

    if (!location) {
      setFormError("Konum zorunludur")
      return
    }

    const nextApplicationBase = {
      companyName,
      companyLogoUrl: form.companyLogoUrl.trim(),
      jobTitle,
      location,
      applicationDate: form.applicationDate,
      jobDescription: form.jobDescription.trim(),
      hrContact: form.hrContact.trim(),
    }

    if (editApplicationId) {
      const updatedApplication: ApplicationItem = {
        id: editApplicationId,
        ...nextApplicationBase,
        status: form.status,
      }

      setApplications((prev) =>
        prev.map((a) => (a.id === editApplicationId ? updatedApplication : a)),
      )
      handleCloseAddModal()
      return
    }

    const newApplication: ApplicationItem = {
      id: createId(),
      ...nextApplicationBase,
      status: form.status,
    }

    setApplications((prev) => [newApplication, ...prev])
    handleCloseAddModal()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff7fb] via-[#f6fbff] to-[#f7fff6] text-zinc-900">
      <div className="mx-auto flex max-w-[1400px]">
        <aside
          className="hidden w-80 flex-col border-r border-zinc-200 bg-white/60 px-6 py-6 md:flex backdrop-blur shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.02),inset_4px_4px_10px_rgba(255,255,255,0.7)]"
          aria-label="Sol menü"
        >
          <SidebarLogo />

          <nav className="mt-8 flex flex-col gap-2" aria-label="Menü">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeNav

              return (
                <button
                  key={item.id}
                  type="button"
                  tabIndex={0}
                  aria-label={`${item.label} menü öğesi`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleSelectNav(item.id)}
                  onKeyDown={(e) => handleNavKeyDown(e, item.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors focus:outline-none focus:ring-4 focus:ring-pink-200/70",
                    isActive &&
                      "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-[0_18px_40px_rgba(251,113,133,0.22)]",
                    !isActive &&
                      "text-zinc-700 hover:bg-pink-50/70 hover:text-zinc-900",
                  )}
                >
                  <NavIconWrapper id={item.id} />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {item.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)]">
            <p className="text-xs font-medium text-zinc-600">
              Hızlı durum
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              0 yeni güncelleme
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Bu bilgi daha sonra gerçek verilerle doldurulacak
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="md:hidden border-b border-zinc-200 bg-white/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <SidebarLogo />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Mobil menü">
              {NAV_ITEMS.map((item) => {
                const isActive = item.id === activeNav
                return (
                  <button
                    key={item.id}
                    type="button"
                    tabIndex={0}
                    aria-label={`${item.label} menü öğesi`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => handleSelectNav(item.id)}
                    onKeyDown={(e) => handleNavKeyDown(e, item.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-pink-200/70",
                        isActive &&
                        "border-pink-200 bg-gradient-to-r from-pink-500 to-orange-400 text-white",
                        !isActive &&
                        "border-zinc-200 bg-white/70 text-zinc-700 hover:bg-pink-50/70",
                    )}
                  >
                    <NavIconWrapper id={item.id} />
                    <span className="sr-only">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <main className="flex min-w-0 flex-col px-4 py-6 md:px-8">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  {activeItem.label}
                </h1>
                <p className="mt-1 text-sm text-zinc-600">
                  {activeItem.description}
                </p>
              </div>

              {activeNav === "applications" ? (
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div
                    className="inline-flex rounded-full bg-white/70 p-1 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.03)] backdrop-blur"
                    role="tablist"
                    aria-label="Görünüm seçici"
                  >
                    <button
                      type="button"
                      tabIndex={0}
                      role="tab"
                      aria-selected={viewMode === "kanban"}
                      aria-label="Kanban görünümünü seç"
                      onClick={() => handleSetViewMode("kanban")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-pink-200/70",
                        viewMode === "kanban" &&
                          "bg-white text-zinc-900 shadow",
                        viewMode !== "kanban" &&
                          "text-zinc-600 hover:text-zinc-900",
                      )}
                    >
                      Kanban
                    </button>
                    <button
                      type="button"
                      tabIndex={0}
                      role="tab"
                      aria-selected={viewMode === "list"}
                      aria-label="Liste görünümünü seç"
                      onClick={() => handleSetViewMode("list")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-pink-200/70",
                        viewMode === "list" &&
                          "bg-white text-zinc-900 shadow",
                        viewMode !== "list" &&
                          "text-zinc-600 hover:text-zinc-900",
                      )}
                    >
                      Liste
                    </button>
                  </div>

                  <button
                    type="button"
                    tabIndex={0}
                    aria-label="Yeni başvuru ekle"
                    onClick={handleOpenAddModal}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return
                      e.preventDefault()
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300 px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-[0_18px_40px_rgba(251,113,133,0.18)] transition hover:shadow-[0_24px_60px_rgba(251,113,133,0.22)] focus:outline-none focus:ring-4 focus:ring-pink-200/70"
                  >
                    <Icon name="plus" />
                    Yeni Ekle
                  </button>
                </div>
              ) : null}
            </header>

            <section className="mt-6">
              {activeNav === "applications" ? (
                viewMode === "kanban" ? (
                  applications.length === 0 ? (
                    <KanbanEmptyState />
                  ) : (
                    <ApplicationsKanbanView applications={applications} onEdit={handleOpenEditModal} />
                  )
                ) : applications.length === 0 ? (
                  <ListEmptyState />
                ) : (
                  <ApplicationsListView applications={applications} onEdit={handleOpenEditModal} />
                )
              ) : activeNav === "dashboard" ? (
                <DashboardPanel applications={applications} />
              ) : activeNav === "profile" ? (
                <ProfilePanel
                  applications={applications}
                  careerGoal={careerGoal}
                  onSave={(next) => setCareerGoal(next)}
                />
              ) : (
                <SettingsPanel
                  defaultViewMode={defaultViewMode}
                  onSetDefaultViewMode={handleSetDefaultViewMode}
                />
              )}
            </section>
          </main>

          <AddApplicationModal
            isOpen={isAddModalOpen}
            onClose={handleCloseAddModal}
            mode={editApplicationId ? "edit" : "create"}
            form={form}
            setForm={setForm}
            error={formError}
            onSave={handleSaveApplication}
          />
        </div>
      </div>
    </div>
  )
}
