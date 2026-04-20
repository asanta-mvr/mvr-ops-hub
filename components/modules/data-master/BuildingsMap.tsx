'use client'

import { useRef, useEffect } from 'react'
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

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

interface BuildingsMapProps {
  buildings:  BuildingMapItem[]
  selectedId: string | null
  onSelect:   (id: string) => void
}

// Free vector tile style — no API key required
const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
} as const

const STATUS_BG: Record<string, string> = {
  active:     '#1E2D40',
  onboarding: '#B5541C',
  inactive:   '#888888',
}

function CrownPin({
  status,
  isSelected,
  onClick,
}: {
  status:     string
  isSelected: boolean
  onClick:    () => void
}) {
  const bg      = STATUS_BG[status] ?? STATUS_BG.inactive
  const size    = isSelected ? 40 : 28
  const svgW    = isSelected ? 18 : 12
  const svgH    = isSelected ? 16 : 10
  const border  = isSelected ? '3px solid #CEC4B6' : '2.5px solid white'
  const shadow  = isSelected
    ? '0 4px 16px rgba(30,45,64,0.55)'
    : '0 2px 8px rgba(30,45,64,0.30)'

  return (
    <div
      onClick={onClick}
      style={{
        width:          size,
        height:         size,
        borderRadius:   '50%',
        background:     bg,
        border,
        boxShadow:      shadow,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        cursor:         'pointer',
        transition:     'all 0.15s ease',
        transform:      isSelected ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <svg width={svgW} height={svgH} viewBox="0 0 28 24" fill="none">
        <path
          d="M14 2L18.5 10L24 4L22 20H6L4 4L9.5 10L14 2Z"
          fill="#CEC4B6"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="5" y="20" width="18" height="2.5" rx="1" fill="white" opacity="0.85" />
      </svg>
    </div>
  )
}

export default function BuildingsMap({ buildings, selectedId, onSelect }: BuildingsMapProps) {
  const mapRef      = useRef<MapRef>(null)
  const withCoords  = buildings.filter((b) => b.lat != null && b.long != null)

  const initialCenter = withCoords.length > 0
    ? { longitude: withCoords[0].long!, latitude: withCoords[0].lat!, zoom: 13 }
    : { longitude: -80.191788, latitude: 25.761681, zoom: 13 }

  // Fly to selected building
  useEffect(() => {
    if (!selectedId) return
    const b = buildings.find((x) => x.id === selectedId)
    if (b?.lat != null && b?.long != null) {
      mapRef.current?.flyTo({
        center:   [b.long, b.lat],
        zoom:     15,
        duration: 800,
      })
    }
  }, [selectedId, buildings])

  return (
    <Map
      ref={mapRef}
      initialViewState={initialCenter}
      style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
      mapStyle={MAP_STYLE as never}
    >
      <NavigationControl position="top-right" />

      {withCoords.map((b) => (
        <Marker
          key={b.id}
          longitude={b.long!}
          latitude={b.lat!}
          anchor="center"
        >
          <CrownPin
            status={b.status}
            isSelected={selectedId === b.id}
            onClick={() => onSelect(b.id)}
          />
        </Marker>
      ))}
    </Map>
  )
}
