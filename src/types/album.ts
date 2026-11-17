export interface Album {
  id: string;
  name: string;
  artist: string | null;
  artist_id: string | null;
  cover_art: string | null;
  year: number | null;
  song_count: number | null;
  duration: number | null;
  genre: string | null;
}
