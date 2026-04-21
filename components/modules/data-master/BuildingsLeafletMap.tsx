'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface BuildingMapItem {
  id:       string
  name:     string
  nickname: string | null
  status:   string
  lat:      number | null
  long:     number | null
  address:  string | null
  zone:     string | null
}

interface BuildingsLeafletMapProps {
  buildings:  BuildingMapItem[]
  selectedId: string | null
  onSelect:   (id: string) => void
}

const STATUS_BG: Record<string, string> = {
  active:     '#1E2D40',
  onboarding: '#B5541C',
  inactive:   '#888888',
}

function buildingIcon(status: string, isSelected: boolean) {
  const bg    = STATUS_BG[status] ?? STATUS_BG.inactive
  const size  = isSelected ? 38 : 28
  const sw    = isSelected ? 16 : 12
  const sh    = isSelected ? 14 : 10
  const ring  = isSelected ? '3px solid #CEC4B6' : '2px solid white'
  const shadow = isSelected
    ? '0 4px 14px rgba(30,45,64,0.50)'
    : '0 2px 6px rgba(30,45,64,0.30)'

  // Single-line HTML — no newlines, no extra whitespace — Leaflet is finicky with multiline divIcon html
  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${ring};box-shadow:${shadow};display:flex;align-items:center;justify-content:center;line-height:0;cursor:pointer;transition:all 0.15s ease;"><svg width="${sw}" height="${sh}" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2L18.5 10L24 4L22 20H6L4 4L9.5 10L14 2Z" fill="#CEC4B6" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><rect x="5" y="20" width="18" height="2.5" rx="1" fill="white" opacity="0.8"/></svg></div>`

  return L.divIcon({
    className: '',
    html,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function MapController({ buildings, selectedId }: { buildings: BuildingMapItem[]; selectedId: string | null }) {
  const map = useMap()

  useEffect(() => {
    if (!selectedId) return
    const b = buildings.find((x) => x.id === selectedId)
    if (b?.lat != null && b?.long != null) {
      map.flyTo([b.lat, b.long], 15, { animate: true, duration: 0.8 })
    }
  }, [selectedId, buildings, map])

  return null
}

export default function BuildingsLeafletMap({
  buildings,
  selectedId,
  onSelect,
}: BuildingsLeafletMapProps) {
  const withCoords = buildings.filter((b) => b.lat != null && b.long != null)

  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].lat!, withCoords[0].long!]
      : [25.761681, -80.191788]

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-full rounded-xl"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController buildings={buildings} selectedId={selectedId} />

      {withCoords.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat!, b.long!]}
          icon={buildingIcon(b.status, selectedId === b.id)}
          eventHandlers={{ click: () => onSelect(b.id) }}
        />
      ))}
    </MapContainer>
  )
}
