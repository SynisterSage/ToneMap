export const SPOTIFY_CONFIG = {
  clientId: 'c1e41e230df9466986f6fcbfb6a34d1b',
  redirectUrl: 'tonemap://auth',
  scopes: [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-recently-played',
    'user-top-read',
    'user-read-private',
    'user-read-email',
    'user-library-read',
    'user-read-playback-state',
    'user-read-currently-playing',
  ],
  serviceConfiguration: {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  },
};

export type SpotifyAuthResult = {
  accessToken: string;
  accessTokenExpirationDate: string;
  refreshToken?: string;
  tokenType?: string;
  [key: string]: any;
};
