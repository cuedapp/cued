import { createServer } from "node:http";
import { fakeJellyfinServerId, fakeMovie, fakeUser } from "./constants.mjs";

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (url.pathname === "/healthz") return send(response, 200, { status: "ok" });

  if (url.pathname === "/jellyfin/Users/AuthenticateByName" && request.method === "POST") {
    const body = await readJson(request);
    if (body?.Username !== fakeUser.username || body?.Pw !== fakeUser.password)
      return send(response, 401, { Message: "Invalid username or password" });
    return send(response, 200, {
      ServerId: fakeJellyfinServerId,
      AccessToken: "e2e-jellyfin-access-token",
      User: {
        Id: fakeUser.id,
        Name: fakeUser.username,
        Policy: { IsAdministrator: false, IsDisabled: false, EnableAllFolders: true, EnabledFolders: [] },
      },
    });
  }

  if (url.pathname === "/tmdb/3/configuration") {
    return send(response, 200, { images: { secure_base_url: "https://image.tmdb.org/t/p/" } });
  }
  if (url.pathname === "/tmdb/3/search/multi") {
    const results = url.searchParams.get("query")
      ? [
          {
            id: fakeMovie.id,
            media_type: "movie",
            title: fakeMovie.title,
            original_title: fakeMovie.title,
            overview: "A stable movie fixture for Cued browser tests.",
            release_date: "2025-01-01",
            popularity: 10,
            vote_average: 7.5,
            vote_count: 20,
            genre_ids: [],
          },
        ]
      : [];
    return send(response, 200, { page: 1, total_pages: 1, total_results: results.length, results });
  }
  if (/^\/tmdb\/3\/movie\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/").at(-1));
    const title = id === fakeMovie.id ? fakeMovie.title : "E2E Recommendation Fixture";
    return send(response, 200, {
      id,
      title,
      original_title: title,
      overview: "A stable movie fixture for Cued browser tests.",
      release_date: "2025-01-01",
      runtime: 100,
      genres: [],
      vote_average: 7.5,
      vote_count: 200,
      production_countries: [],
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      external_ids: { imdb_id: null },
      release_dates: { results: [] },
    });
  }
  if (url.pathname === "/tmdb/3/discover/movie") {
    const title = "E2E Recommendation Fixture";
    return send(response, 200, {
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [
        {
          id: 424243,
          title,
          original_title: title,
          overview: "A stable recommendation fixture for Cued browser tests.",
          release_date: "2025-01-01",
          original_language: "en",
          popularity: 15,
          vote_average: 7.5,
          vote_count: 200,
          genre_ids: [],
        },
      ],
    });
  }
  if (url.pathname.startsWith("/tmdb/3/movie/") || url.pathname.startsWith("/tmdb/3/discover/")) {
    return send(response, 200, { page: 1, total_pages: 1, total_results: 0, results: [] });
  }

  return send(response, 404, { status: "not_found" });
});

server.listen(4173, "127.0.0.1");

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

function send(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}
