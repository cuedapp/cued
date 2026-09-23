const nativeFetch = globalThis.fetch;

globalThis.fetch = (input, init) => {
  const requestUrl = input instanceof Request ? input.url : String(input);
  const url = new URL(requestUrl);
  if (url.hostname !== "api.themoviedb.org") return nativeFetch(input, init);

  url.protocol = "http:";
  url.hostname = "127.0.0.1";
  url.port = "4173";
  url.pathname = `/tmdb${url.pathname}`;
  return nativeFetch(url, init);
};
