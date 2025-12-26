export const DEFAULT_TLE_SOURCES = [
  {
    name: 'SatNOGS DB',
    url: 'https://db.satnogs.org/api/tle/?format=json',
    parser: 'satnogsdbJson',
    updatedAt: '1970-01-01T00:00:00Z', // to trigger immediate update on first run
  },
  {
    name: 'Celestrak GOES',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=goes&FORMAT=tle',
    parser: 'rawText',
    updatedAt: '1970-01-01T00:00:00Z',
  },
  // Note: all of these should be included in the SatNOGS DB as well
  // {
  //   name: 'Amateur Radio',
  //   url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle',
  //   parser: 'rawText',
  // },
  // {
  //   name: 'Weather Satellites',
  //   url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle',
  //   parser: 'rawText',
  // },
  // {
  //   name: 'NOAA',
  //   url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=noaa&FORMAT=tle',
  //   parser: 'rawText',
  // },
  // {
  //   name: 'CubeSats',
  //   url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=cubesat&FORMAT=tle',
  //   parser: 'rawText',
  // },
  // {
  //   name: 'Space Stations (ISS)',
  //   url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
  //   parser: 'rawText',
  // },
  // {
  //   name: 'Orbcomm',
  //   url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=orbcomm&FORMAT=tle',
  //   parser: 'rawText',
  // },
];
