// Small OTA channel icon — reuses the shared logos in public/icons/ota-*.
// Accepts any OTA string (the dispute tool's 4, or raw vacasa/other) and falls
// back to the generic icon. Mirrors the OTA_IMAGES map in TicketList.tsx.

const OTA_ICON_SRC: Record<string, string> = {
  airbnb: '/icons/ota-airbnb.jpg',
  booking: '/icons/ota-booking.png',
  vrbo: '/icons/ota-vrbo.png',
  expedia: '/icons/ota-expedia.png',
  other: '/icons/ota-other.png',
}

export function OtaIcon({ ota, className = 'h-4 w-4' }: { ota: string; className?: string }) {
  const src = OTA_ICON_SRC[ota] ?? OTA_ICON_SRC.other
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={ota} className={`${className} shrink-0 rounded object-contain`} />
}
