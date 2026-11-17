export interface Artist {
  id: string;
  name: string;
  album_count: number | null;
  cover_art: string | null;
  music_brainz_id: string | null;
  description: string | null; // biografia/resumo do artista (do Navidrome)
}
