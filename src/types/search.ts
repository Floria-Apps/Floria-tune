import type { Album } from "./album";
import type { Artist } from "./artist";
import type { Song } from "./song";

export interface SearchResults {
  artists: Artist[];
  albums: Album[];
  songs: Song[];
}
