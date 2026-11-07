// "Mock for now" data (handoff <pages>, Today): the API doesn't provide these yet, so they render only when
// VITE_USE_MOCKS=true. With the real API, the trip chart becomes a line of text and "This week" is left out.

/** Today's travel time against the usual time, every 15 minutes from 6 to 9 AM. */
export const TRIP_TIMES = {
  labels: ['6 AM', '7 AM', '8 AM', '9 AM'],
  usual: [22, 22, 23, 25, 28, 31, 33, 32, 30, 28, 26, 24, 23],
  today: [24, 25, 27, 31, 36, 41, 44, 42, 39, 35, 31, 28, 26],
};

export const THIS_WEEK = { onTime: 4, total: 5, note: 'One late on Tuesday, in the rain.' };
