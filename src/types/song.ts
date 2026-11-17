export interface Song {
  id: string;
  title: string;
  artist: string | null;
  artist_id: string | null;
  album: string | null;
  album_id: string | null;
  cover_art: string | null;
  duration: number | null;
  track: number | null;
  disc_number: number | null;
  year: number | null;
  genre: string | null;
  bit_rate: number | null;
  suffix: string | null;
  content_type: string | null;
}
