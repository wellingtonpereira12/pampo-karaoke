/// <reference types="vite/client" />

declare module 'yt-search' {
  interface VideoSearchResult {
    type: string;
    videoId: string;
    url: string;
    title: string;
    description: string;
    image: string;
    thumbnail: string;
    seconds: number;
    timestamp: string;
    duration: {
      toString(): string;
      seconds: number;
      timestamp: string;
    };
    views: number;
    genre: string;
    author: {
      name: string;
      url: string;
    };
  }

  interface SearchResult {
    all: unknown[];
    videos: VideoSearchResult[];
    live: unknown[];
    playlists: unknown[];
    channels: unknown[];
  }

  function search(query: string | { query: string; pageStart?: number; pageEnd?: number }): Promise<SearchResult>;

  export default search;
}
