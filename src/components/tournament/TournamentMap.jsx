import { Icon } from "../ui";
import { googleMapsEmbedUrl, googleMapsSearchUrl } from "../../services/tournament";

export function TournamentMap({ tournament, showMap = true }) {
  const hasLocation = !!(tournament.venue?.trim() || tournament.location?.trim());
  const mapsUrl = tournament.google_maps_url?.trim();
  if (!hasLocation || !mapsUrl) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {showMap && (
        <iframe
          title={`Peta lokasi ${tournament.venue || tournament.name}`}
          src={googleMapsEmbedUrl(tournament)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-64 w-full border-0 sm:h-72"
        />
      )}
      <a
        href={googleMapsSearchUrl(tournament)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-3 p-4 text-sm font-semibold text-electric-700 transition hover:bg-electric-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon name="marker" />
          <span className="truncate">Buka lokasi di Google Maps</span>
        </span>
        <Icon name="arrow-up-right" />
      </a>
    </div>
  );
}
