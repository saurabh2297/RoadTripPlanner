import { useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CalendarDays,
  CarFront,
  ChevronDown,
  Compass,
  Download,
  Fuel,
  Heart,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Mountain,
  Share2,
  Sparkles,
  Star,
  Trees,
  Utensils,
  UsersRound,
  Landmark,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Destination = {
  name: string
  image: string
  description: string
}

type Activity = {
  time: string
  name: string
  description: string
  location: string
  category: string
  estimated_duration_minutes: number
}

type DayPlan = {
  day: number
  title: string
  activities: Activity[]
  overnight_location: string
}

type CostAnalysis = {
  fuel_or_charging_cost: number
  accommodation_cost: number
  food_cost: number
  activities_cost: number
  miscellaneous_cost: number
  total_cost: number
  assumptions: string[]
}

type TripResponse = {
  destination: string
  starting_location: string
  duration_days: number
  overview: string
  one_way_distance_km: number
  total_driving_distance_km: number
  cost_analysis: CostAnalysis
  days: DayPlan[]
  travel_tips: string[]
}

type TripRequest = {
  starting_location: string
  destination: string
  days: number
  preferences: string[]
  travel_group: string
  vehicle: {
    type: 'car' | 'bike'
    model: string | null
    fuel_type: string
    fuel_price: number | null
  }
}

const destinations: Destination[] = [
  {
    name: 'Coorg',
    image:
      'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=640&q=80',
    description: 'Coffee country & misty hills',
  },
  {
    name: 'Chikmagalur',
    image:
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=640&q=80',
    description: 'Mountain air & coffee trails',
  },
  {
    name: 'Gokarna',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=640&q=80',
    description: 'Coastal hideaways & sunsets',
  },
  {
    name: 'Hampi',
    image:
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=640&q=80',
    description: 'Ancient ruins & golden stone',
  },
]

const durationPresets = [
  { nights: 1, days: 2 },
  { nights: 2, days: 3 },
  { nights: 3, days: 4 },
  { nights: 4, days: 5 },
]

const preferences: { label: string; icon: LucideIcon }[] = [
  { label: 'Scenic & Nature', icon: Trees },
  { label: 'Heritage & Temples', icon: Landmark },
  { label: 'Foodie Stops', icon: Utensils },
  { label: 'Adventure', icon: Mountain },
]

const travelGroups: { label: string; icon: LucideIcon }[] = [
  { label: 'Solo', icon: CarFront },
  { label: 'Couple', icon: Heart },
  { label: 'Family', icon: UsersRound },
  { label: 'Friends', icon: UsersRound },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTripResponse(value: unknown): value is TripResponse {
  if (
    !isRecord(value) ||
    typeof value.destination !== 'string' ||
    typeof value.starting_location !== 'string' ||
    typeof value.duration_days !== 'number' ||
    typeof value.overview !== 'string' ||
    typeof value.one_way_distance_km !== 'number' ||
    typeof value.total_driving_distance_km !== 'number' ||
    !Array.isArray(value.days) ||
    !Array.isArray(value.travel_tips) ||
    !value.travel_tips.every((tip) => typeof tip === 'string')
  ) {
    return false
  }

  const cost = value.cost_analysis
  if (!isRecord(cost)) return false

  const costFields: (keyof CostAnalysis)[] = [
    'fuel_or_charging_cost',
    'accommodation_cost',
    'food_cost',
    'activities_cost',
    'miscellaneous_cost',
    'total_cost',
  ]
  if (
    !costFields.every((field) => typeof cost[field] === 'number') ||
    !Array.isArray(cost.assumptions) ||
    !cost.assumptions.every((assumption) => typeof assumption === 'string')
  ) {
    return false
  }

  return value.days.every(
    (day) =>
      isRecord(day) &&
      typeof day.day === 'number' &&
      typeof day.title === 'string' &&
      typeof day.overnight_location === 'string' &&
      Array.isArray(day.activities) &&
      day.activities.every(
        (activity) =>
          isRecord(activity) &&
          typeof activity.time === 'string' &&
          typeof activity.name === 'string' &&
          typeof activity.description === 'string' &&
          typeof activity.location === 'string' &&
          typeof activity.category === 'string' &&
          typeof activity.estimated_duration_minutes === 'number',
      ),
  )
}

function getApiError(payload: unknown, status: number): string {
  if (isRecord(payload)) {
    if (typeof payload.detail === 'string') return payload.detail
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail
        .filter(isRecord)
        .map((detail) => {
          const location = Array.isArray(detail.loc) ? detail.loc.join(' → ') : ''
          const message = typeof detail.msg === 'string' ? detail.msg : 'Invalid value'
          return location ? `${location}: ${message}` : message
        })
      if (messages.length) return messages.join('; ')
    }
  }
  return `The itinerary service returned an error (${status}). Please try again.`
}

function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function LinkedText({ text }: { text: string }) {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"']+)/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    let href = match[2] ?? match[3]
    let trailingPunctuation = ''
    if (match[3]) {
      while (/[.,!?;:]$/.test(href)) {
        trailingPunctuation = href.slice(-1) + trailingPunctuation
        href = href.slice(0, -1)
      }
      while (href.endsWith(')') && (href.match(/\)/g)?.length ?? 0) > (href.match(/\(/g)?.length ?? 0)) {
        trailingPunctuation = `)${trailingPunctuation}`
        href = href.slice(0, -1)
      }
    }

    let safeHref: string | null = null
    try {
      const url = new URL(href)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        safeHref = url.href
      }
    } catch {
      // Keep malformed URLs as plain text.
    }

    if (safeHref) {
      parts.push(
        <a
          key={`link-${parts.length}`}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-evergreen underline decoration-evergreen/50 underline-offset-2 hover:text-tangerine"
        >
          {match[1] ?? href}
        </a>,
      )
      if (trailingPunctuation) parts.push(trailingPunctuation)
    } else {
      parts.push(match[0])
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`
}

function formatDestination(destination: string): string {
  const cleanDestination = destination.trim()
  if (cleanDestination.includes(',')) return cleanDestination
  const stateByDestination: Record<string, string> = {
    coorg: 'Karnataka',
    madikeri: 'Karnataka',
    chikmagalur: 'Karnataka',
    gokarna: 'Karnataka',
    hampi: 'Karnataka',
    ooty: 'Tamil Nadu',
    wayanad: 'Kerala',
  }
  const state = stateByDestination[cleanDestination.toLowerCase()]
  return state ? `${cleanDestination}, ${state}` : cleanDestination
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 text-left">
      <div className="relative flex h-10 w-12 items-center justify-center text-evergreen">
        <Mountain className="absolute left-0 top-1 h-8 w-8 stroke-[2.4]" />
        <Mountain className="absolute bottom-0 right-0 h-7 w-7 stroke-[2.4]" />
        <Sparkles className="absolute right-1 top-0 h-3 w-3 text-tangerine" />
      </div>
      <span className="text-[16px] font-extrabold leading-[1.05] tracking-tight text-evergreen">
        RoadTrip
        <br />
        Planner
      </span>
    </div>
  )
}

function Header({ itinerary, onPlan }: { itinerary: boolean; onPlan: () => void }) {
  return (
    <header className="relative z-10 flex h-[62px] shrink-0 items-center justify-between border-b border-[#e9e5db] bg-white/90 px-5 sm:px-7">
      <Brand />
      <div className="flex items-center gap-3 sm:gap-6">
        {itinerary && (
          <button
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slateink transition hover:bg-[#f4f3ec] sm:flex"
            onClick={onPlan}
          >
            <Compass size={16} />
            Plan a New Trip
          </button>
        )}
        <button
          aria-label="Open profile menu"
          className="flex items-center gap-1.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eed8bd] text-sm font-bold text-evergreen ring-2 ring-white">
            SG
          </span>
          <ChevronDown size={14} className="text-slateink" />
        </button>
      </div>
    </header>
  )
}

function Planner({
  startingLocation,
  setStartingLocation,
  destination,
  setDestination,
  days,
  setDays,
  group,
  setGroup,
  vehicleType,
  setVehicleType,
  vehicleModel,
  setVehicleModel,
  fuelType,
  setFuelType,
  fuelPrice,
  setFuelPrice,
  selectedPreferences,
  setSelectedPreferences,
  isGenerating,
  errorMessage,
  onGenerate,
}: {
  startingLocation: string
  setStartingLocation: (value: string) => void
  destination: string
  setDestination: (value: string) => void
  days: number
  setDays: (value: number) => void
  group: string
  setGroup: (value: string) => void
  vehicleType: 'car' | 'bike'
  setVehicleType: (value: 'car' | 'bike') => void
  vehicleModel: string
  setVehicleModel: (value: string) => void
  fuelType: string
  setFuelType: (value: string) => void
  fuelPrice: number
  setFuelPrice: (value: number) => void
  selectedPreferences: string[]
  setSelectedPreferences: Dispatch<SetStateAction<string[]>>
  isGenerating: boolean
  errorMessage: string
  onGenerate: () => void
}) {
  const [customDuration, setCustomDuration] = useState(false)

  const togglePreference = (label: string) => {
    setSelectedPreferences((selected) =>
      selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label],
    )
  }

  return (
    <>
      <div className="planner-hero relative flex min-h-[310px] flex-col justify-center overflow-hidden px-6 pb-16 pt-8 text-white sm:px-10 lg:min-h-[332px]">
        <div className="relative z-[1] max-w-[500px]">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
            <Sparkles size={13} className="text-orange-300" />
            Your next great escape starts here
          </p>
          <h1 className="max-w-[530px] text-[36px] font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-[44px]">
            Where are we driving from?
          </h1>
          <p className="mt-3 text-sm font-medium text-white/90 sm:text-base">
            Plan your perfect road trip with AI <Sparkles className="mb-0.5 inline h-4 w-4 text-orange-300" />
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-xs font-medium text-evergreen shadow-sm">
            <MapPin size={15} className="fill-evergreen text-evergreen" />
            Starting point: <strong>{startingLocation || 'Not set'}</strong>
          </div>
        </div>
        <div className="absolute bottom-6 right-7 hidden -rotate-6 text-right font-display text-2xl italic leading-tight text-white drop-shadow-lg md:block">
          Explore.
          <br />
          Drive. Repeat.
        </div>
      </div>

      <section className="relative z-[2] mx-4 -mt-[66px] rounded-2xl border border-white/80 bg-white/95 p-4 shadow-card backdrop-blur sm:mx-7 sm:p-5">
        <div className="space-y-4">
          <div>
            <label htmlFor="starting-location" className="mb-2 flex items-center gap-2 text-sm font-bold text-slateink">
              <MapPin size={16} className="text-evergreen" />
              Starting location
            </label>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-[#e8e4dc] bg-white px-3.5 transition focus-within:border-evergreen focus-within:ring-2 focus-within:ring-evergreen/10">
              <input
                id="starting-location"
                required
                value={startingLocation}
                onChange={(event) => setStartingLocation(event.target.value)}
                placeholder="Enter starting city, e.g. Bengaluru, Karnataka"
                className="min-w-0 flex-1 bg-transparent text-sm text-slateink outline-none placeholder:text-slateink/50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="destination" className="mb-2 flex items-center gap-2 text-sm font-bold text-slateink">
              <MapPin size={16} className="text-evergreen" />
              Destination
            </label>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-[#e8e4dc] bg-white px-3.5 transition focus-within:border-evergreen focus-within:ring-2 focus-within:ring-evergreen/10">
              <Compass size={18} className="shrink-0 text-slateink/70" />
              <input
                id="destination"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Enter destination city, e.g. Coorg, Chikmagalur, Wayanad, Ooty..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slateink outline-none placeholder:text-slateink/50"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slateink">
              <CalendarDays size={16} className="text-evergreen" />
              Trip duration
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {durationPresets.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => {
                    setDays(preset.days)
                    setCustomDuration(false)
                  }}
                  className={`rounded-full border px-3 py-2.5 text-xs font-bold transition sm:text-sm ${
                    days === preset.days && !customDuration
                      ? 'border-evergreen bg-evergreen text-white shadow-sm'
                      : 'border-[#ebe7df] bg-[#fbfaf7] text-slateink hover:border-evergreen/50'
                  }`}
                >
                  {preset.nights}N / {preset.days}D
                </button>
              ))}
              <button
                onClick={() => setCustomDuration(true)}
                className={`rounded-full border px-3 py-2.5 text-xs font-bold transition sm:text-sm ${
                  customDuration
                    ? 'border-evergreen bg-evergreen text-white'
                    : 'border-[#ebe7df] bg-[#fbfaf7] text-slateink hover:border-evergreen/50'
                }`}
              >
                + Custom
              </button>
            </div>
            {customDuration && (
              <label className="mt-2 flex items-center gap-3 text-xs font-semibold text-slateink">
                Days
                <input
                  aria-label="Custom trip duration in days"
                  className="w-20 rounded-lg border border-[#e8e4dc] px-3 py-2 text-sm"
                  type="number"
                  min={2}
                  max={14}
                  value={days}
                  onChange={(event) => setDays(Math.min(14, Math.max(2, Number(event.target.value) || 2)))}
                />
                <span className="font-normal text-slateink/70">We’ll plan a {days - 1}-night trip</span>
              </label>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 flex items-center gap-2 text-sm font-bold text-slateink">
              <Star size={16} className="fill-evergreen text-evergreen" />
              Travel preferences <span className="font-normal text-slateink/60">(optional)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {preferences.map(({ label, icon: Icon }) => {
                const active = selectedPreferences.includes(label)
                return (
                  <button
                    key={label}
                    aria-pressed={active}
                    onClick={() => togglePreference(label)}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-xs font-semibold transition sm:flex-none sm:text-sm ${
                      active
                        ? 'border-evergreen/35 bg-[#f0f5eb] text-evergreen'
                        : 'border-[#ebe7df] bg-[#fbfaf7] text-slateink hover:border-evergreen/40'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-evergreen' : 'text-slateink/75'} />
                    {label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 flex items-center gap-2 text-sm font-bold text-slateink">
              <UsersRound size={16} className="fill-evergreen text-evergreen" />
              Travel group
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {travelGroups.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  aria-pressed={group === label}
                  onClick={() => setGroup(label)}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-semibold transition ${
                    group === label
                      ? 'border-evergreen bg-evergreen text-white shadow-sm'
                      : 'border-[#ebe7df] bg-[#fbfaf7] text-slateink hover:border-evergreen/50'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 flex items-center gap-2 text-sm font-bold text-slateink">
              {vehicleType === 'car' ? (
                <CarFront size={16} className="text-evergreen" />
              ) : (
                <Bike size={16} className="text-evergreen" />
              )}
              Your vehicle <span className="font-normal text-slateink/60">(optional)</span>
            </legend>
            <div className="mb-2 grid grid-cols-2 gap-2">
              {(['car', 'bike'] as const).map((type) => {
                const Icon = type === 'car' ? CarFront : Bike
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={vehicleType === type}
                    onClick={() => setVehicleType(type)}
                    className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold capitalize transition ${
                      vehicleType === type
                        ? 'border-evergreen bg-evergreen text-white shadow-sm'
                        : 'border-[#ebe7df] bg-[#fbfaf7] text-slateink hover:border-evergreen/50'
                    }`}
                  >
                    <Icon size={16} />
                    {type}
                  </button>
                )
              })}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e8e4dc] bg-white px-3 transition focus-within:border-evergreen focus-within:ring-2 focus-within:ring-evergreen/10">
                {vehicleType === 'car' ? (
                  <CarFront size={16} className="shrink-0 text-slateink/60" />
                ) : (
                  <Bike size={16} className="shrink-0 text-slateink/60" />
                )}
                <input
                  aria-label={`${vehicleType === 'car' ? 'Car' : 'Bike'} model (optional)`}
                  value={vehicleModel}
                  onChange={(event) => setVehicleModel(event.target.value)}
                  placeholder={vehicleType === 'car' ? 'Car model (e.g. Hyundai Creta)' : 'Bike model (e.g. Royal Enfield Classic 350)'}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slateink outline-none placeholder:text-slateink/50"
                />
              </label>
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e8e4dc] bg-white px-3 transition focus-within:border-evergreen focus-within:ring-2 focus-within:ring-evergreen/10">
                <Fuel size={16} className="shrink-0 text-slateink/60" />
                <select
                  aria-label="Fuel type (optional)"
                  value={fuelType}
                  onChange={(event) => setFuelType(event.target.value)}
                  className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${fuelType ? 'text-slateink' : 'text-slateink/50'}`}
                >
                  <option value="">Select fuel type</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="CNG">CNG</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </label>
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e8e4dc] bg-white px-3 transition focus-within:border-evergreen focus-within:ring-2 focus-within:ring-evergreen/10">
                <span className="shrink-0 text-xs font-bold text-slateink/60">₹</span>
                <input
                  aria-label="Fuel price per unit"
                  type="number"
                  min={0}
                  step="0.1"
                  value={fuelPrice}
                  onChange={(event) => setFuelPrice(Math.max(0, Number(event.target.value) || 0))}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slateink outline-none"
                />
                <span className="shrink-0 text-xs text-slateink/60">per unit</span>
              </label>
            </div>
            <p className="mt-1.5 text-[11px] text-slateink/60">
              Model is optional. Fuel defaults to Petrol at ₹103.50 per unit; update it for your vehicle.
            </p>
          </fieldset>

          <button
            onClick={onGenerate}
            disabled={!startingLocation.trim() || !destination.trim() || isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-tangerine px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_6px_15px_rgba(237,112,54,0.2)] transition hover:-translate-y-0.5 hover:bg-[#e8662e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {isGenerating ? 'Generating your itinerary...' : 'Generate my itinerary'}
            {!isGenerating && <ArrowRight size={17} />}
          </button>
          {errorMessage && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {errorMessage}
            </p>
          )}
        </div>
      </section>

      <section className="px-4 pb-7 pt-6 sm:px-7">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slateink">Popular getaway ideas</h2>
            <p className="mt-0.5 text-xs text-slateink/60">A little inspiration for your next drive</p>
          </div>
        </div>
        <div id="popular-getaways" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {destinations.map((place) => (
            <button
              key={place.name}
              onClick={() => setDestination(place.name)}
              className="group overflow-hidden rounded-xl border border-[#eeeae2] bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-card"
            >
              <img src={place.image} alt="" className="h-[92px] w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="p-2.5">
                <span className="block text-sm font-extrabold text-slateink">{place.name}</span>
                <span className="mt-0.5 block text-[11px] text-slateink/65">{place.description}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

function Itinerary({
  trip,
  group,
  vehicleType,
  vehicleModel,
  fuelType,
  onPlan,
}: {
  trip: TripResponse
  group: string
  vehicleType: 'car' | 'bike'
  vehicleModel: string
  fuelType: string
  onPlan: () => void
}) {
  const [activeDay, setActiveDay] = useState(1)
  const [shareMessage, setShareMessage] = useState('')
  const tripDays = trip.days

  const shareItinerary = async () => {
    try {
      await navigator.clipboard.writeText(`${trip.destination} road trip itinerary from ${trip.starting_location}`)
      setShareMessage('Trip link copied!')
    } catch {
      setShareMessage('Clipboard access is unavailable in this browser.')
    }
    window.setTimeout(() => setShareMessage(''), 3000)
  }

  return (
    <>
      <section className="itinerary-hero relative overflow-hidden px-5 pb-6 pt-5 text-slateink sm:px-8 sm:pb-7 sm:pt-6">
        <button onClick={onPlan} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-evergreen hover:underline">
          <ArrowLeft size={15} />
          Back to plan
        </button>
        <div className="relative z-[1]">
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-evergreen">
            Your road trip, made for you
            <Sparkles size={14} />
          </p>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[36px]">
            {trip.starting_location} <span className="text-tangerine">→</span> {trip.destination}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slateink/80">
            <CalendarDays size={15} />
            {trip.duration_days - 1} Nights / {trip.duration_days} Days
            <span className="mx-1 text-slateink/30">·</span>
            {group} trip
          </p>
          <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-slateink/80">
            <LinkedText text={trip.overview} />
          </p>
          {(vehicleModel.trim() || fuelType) && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-evergreen shadow-sm">
              {vehicleType === 'car' ? <CarFront size={14} /> : <Bike size={14} />}
              {[vehicleModel.trim(), fuelType].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="mt-5 grid max-w-[660px] grid-cols-2 divide-x divide-y divide-[#dedacf] rounded-xl border border-white/70 bg-white/75 py-3 text-center shadow-sm backdrop-blur sm:grid-cols-4 sm:divide-y-0">
          <div>
            <CarFront className="mx-auto mb-1 text-evergreen" size={19} />
            <strong className="block text-sm font-extrabold text-slateink">~ {trip.total_driving_distance_km} km</strong>
            <span className="text-[10px] text-slateink/60">(Round trip)</span>
          </div>
          <div>
            <MapPin className="mx-auto mb-1 text-evergreen" size={19} />
            <strong className="block text-sm font-extrabold text-slateink">~ {trip.one_way_distance_km} km</strong>
            <span className="text-[10px] text-slateink/60">(One way)</span>
          </div>
          <div>
            <Fuel className="mx-auto mb-1 text-evergreen" size={19} />
            <strong className="block text-sm font-extrabold text-slateink">{formatCurrency(trip.cost_analysis.fuel_or_charging_cost)}</strong>
            <span className="text-[10px] text-slateink/60">(Fuel / charging)</span>
          </div>
          <div>
            <Sparkles className="mx-auto mb-1 text-evergreen" size={19} />
            <strong className="block text-sm font-extrabold text-slateink">{formatCurrency(trip.cost_analysis.total_cost)}</strong>
            <span className="text-[10px] text-slateink/60">(Est. total trip)</span>
          </div>
        </div>
        <div className="absolute right-5 top-6 hidden -rotate-6 text-right font-display text-2xl italic leading-tight text-white drop-shadow-md sm:block">
          Good vibes
          <br />
          only.
        </div>
      </section>

      <div className="day-navigation px-4 pt-3 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tripDays.map((day) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(day.day)}
              className={`min-w-[82px] flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                activeDay === day.day
                  ? 'border-evergreen bg-evergreen text-white shadow-sm'
                  : 'border-[#ebe7df] bg-[#fbfaf7] text-slateink hover:border-evergreen/50'
              }`}
            >
              Day {day.day}
            </button>
          ))}
        </div>
      </div>

      {tripDays.map((day) => (
        <div
          key={day.day}
          className={`itinerary-day ${day.day === activeDay ? 'is-active' : ''}`}
        >
          <section className="px-4 pb-4 pt-2 sm:px-6">
            <div className="mb-3">
              <h2 className="text-lg font-extrabold text-evergreen">
                Day {day.day}: <LinkedText text={day.title} />
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slateink/75">
                <MapPin size={14} className="text-evergreen" />
                Overnight in <LinkedText text={day.overnight_location} />
              </p>
            </div>

            <div className="relative space-y-2 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-evergreen/40 sm:space-y-2.5">
              {day.activities.map((activity) => (
                <article key={`${day.day}-${activity.time}-${activity.name}`} className="relative flex gap-3">
                  <div className="relative z-[1] mt-4 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-[3px] border-[#f7f5ee] bg-evergreen ring-1 ring-evergreen/25" />
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#eeeae2] bg-white p-2.5 shadow-sm sm:gap-4 sm:px-3">
                    <span className="w-[70px] shrink-0 rounded-full bg-[#f0f3e7] px-2 py-1.5 text-center text-[10px] font-extrabold text-evergreen sm:w-[82px] sm:text-xs">
                      {activity.time}
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <h3 className="text-[13px] font-extrabold leading-tight text-slateink sm:text-sm">
                        <LinkedText text={activity.name} />
                      </h3>
                      <p className="mt-1 text-[11px] leading-snug text-slateink/75 sm:text-xs">
                        <LinkedText text={activity.description} />
                      </p>
                      <p className="mt-1 text-[10px] text-slateink/60">
                        <LinkedText
                          text={[activity.location, activity.category, formatDuration(activity.estimated_duration_minutes)]
                            .filter(Boolean)
                            .join(' · ')}
                        />
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="mx-4 mb-4 rounded-xl bg-[#eff1e4] px-3.5 py-3 text-xs text-slateink sm:mx-6">
            <p className="flex items-start gap-2">
              <Lightbulb size={17} className="shrink-0 text-evergreen" />
              <strong>Travel tips</strong>
            </p>
            <ul className="ml-6 mt-1 list-disc space-y-1">
              {trip.travel_tips.map((tip) => <li key={tip}><LinkedText text={tip} /></li>)}
              <li>Overnight stay: <LinkedText text={day.overnight_location} /></li>
            </ul>
          </div>
        </div>
      ))}

      <details className="mx-4 mb-4 rounded-xl border border-[#eeeae2] bg-white px-4 py-3 text-sm text-slateink sm:mx-6">
        <summary className="cursor-pointer font-bold text-evergreen">
          Estimated cost breakdown · {formatCurrency(trip.cost_analysis.total_cost)}
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <div><dt className="text-slateink/60">Fuel / charging</dt><dd className="font-bold">{formatCurrency(trip.cost_analysis.fuel_or_charging_cost)}</dd></div>
          <div><dt className="text-slateink/60">Accommodation</dt><dd className="font-bold">{formatCurrency(trip.cost_analysis.accommodation_cost)}</dd></div>
          <div><dt className="text-slateink/60">Food</dt><dd className="font-bold">{formatCurrency(trip.cost_analysis.food_cost)}</dd></div>
          <div><dt className="text-slateink/60">Activities</dt><dd className="font-bold">{formatCurrency(trip.cost_analysis.activities_cost)}</dd></div>
          <div><dt className="text-slateink/60">Miscellaneous</dt><dd className="font-bold">{formatCurrency(trip.cost_analysis.miscellaneous_cost)}</dd></div>
        </dl>
        {trip.cost_analysis.assumptions.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slateink/70">
            {trip.cost_analysis.assumptions.map((assumption) => (
              <li key={assumption}><LinkedText text={assumption} /></li>
            ))}
          </ul>
        )}
      </details>

      <div className="relative flex flex-col gap-2 border-t border-[#eeeae2] bg-white/70 px-4 py-4 sm:flex-row sm:px-6">
        <button
          onClick={onPlan}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-evergreen px-4 py-3 text-sm font-bold text-evergreen transition hover:bg-[#f0f5eb]"
        >
          <ArrowLeft size={16} />
          Plan another trip
        </button>
        <button
          onClick={shareItinerary}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-evergreen px-4 py-3 text-sm font-bold text-evergreen transition hover:bg-[#f0f5eb]"
        >
          <Share2 size={16} />
          Share itinerary
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-tangerine px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e8662e]"
        >
          <Download size={16} />
          Download / print
        </button>
        {shareMessage && (
          <span role="status" className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-slateink px-3 py-2 text-xs font-semibold text-white shadow-lg">
            {shareMessage}
          </span>
        )}
      </div>
    </>
  )
}

function App() {
  const [screen, setScreen] = useState<'planner' | 'itinerary'>('planner')
  const [startingLocation, setStartingLocation] = useState('')
  const [destination, setDestination] = useState('Coorg')
  const [days, setDays] = useState(5)
  const [group, setGroup] = useState('Family')
  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>('car')
  const [vehicleModel, setVehicleModel] = useState('')
  const [fuelType, setFuelType] = useState('Petrol')
  const [fuelPrice, setFuelPrice] = useState(103.5)
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(['Scenic & Nature'])
  const [trip, setTrip] = useState<TripResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const generateItinerary = async () => {
    setIsGenerating(true)
    setErrorMessage('')

    const API_BASE_URL = 'https://roadtripplanner.onrender.com'

    const request: TripRequest = {
      starting_location: startingLocation.trim(),
      destination: formatDestination(destination),
      days,
      preferences: selectedPreferences,
      travel_group: group,
      vehicle: {
        type: vehicleType,
        model: vehicleModel.trim() || null,
        fuel_type: fuelType || 'Petrol',
        fuel_price: fuelPrice,
      },
    }

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })
      const responseText = await response.text()
      let payload: unknown

      try {
        payload = JSON.parse(responseText)
      } catch {
        if (!response.ok) {
          throw new Error(`The itinerary service returned an error (${response.status}). Please try again.`)
        }
        throw new Error('The itinerary service returned an unreadable response.')
      }

      if (!response.ok) {
        throw new Error(getApiError(payload, response.status))
      }
      if (!isTripResponse(payload) || payload.days.length === 0) {
        throw new Error('The itinerary service returned an incomplete itinerary. Please try again.')
      }

      setTrip(payload)
      setScreen('itinerary')
    } catch (error) {
      setErrorMessage(
        error instanceof TypeError
          ? 'Could not connect to the itinerary API. Make sure the backend is running at http://localhost:8000.'
          : error instanceof Error
            ? error.message
            : 'Unable to generate your itinerary. Check the API connection and try again.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="app-backdrop min-h-screen px-3 py-3 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[860px] overflow-hidden rounded-[24px] border border-white/80 bg-[#fbfaf6] shadow-shell">
        <Header itinerary={screen === 'itinerary'} onPlan={() => setScreen('planner')} />
        {screen === 'planner' ? (
          <Planner
            startingLocation={startingLocation}
            setStartingLocation={setStartingLocation}
            destination={destination}
            setDestination={setDestination}
            days={days}
            setDays={setDays}
            group={group}
            setGroup={setGroup}
            vehicleType={vehicleType}
            setVehicleType={setVehicleType}
            vehicleModel={vehicleModel}
            setVehicleModel={setVehicleModel}
            fuelType={fuelType}
            setFuelType={setFuelType}
            fuelPrice={fuelPrice}
            setFuelPrice={setFuelPrice}
            selectedPreferences={selectedPreferences}
            setSelectedPreferences={setSelectedPreferences}
            isGenerating={isGenerating}
            errorMessage={errorMessage}
            onGenerate={generateItinerary}
          />
        ) : trip ? (
          <Itinerary
            trip={trip}
            group={group}
            vehicleType={vehicleType}
            vehicleModel={vehicleModel}
            fuelType={fuelType}
            onPlan={() => setScreen('planner')}
          />
        ) : null}
      </div>
      <footer className="mx-auto max-w-[860px] px-2 py-4 text-center text-[11px] font-medium text-slateink/55">
        Made for the long way around <span aria-hidden="true">·</span> India
      </footer>
    </main>
  )
}

export default App
