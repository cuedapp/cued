import { createServer } from "node:http";
import { fakeJellyfinServerId, fakeMovie, fakeUser } from "./constants.mjs";

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (url.pathname === "/healthz") return send(response, 200, { status: "ok" });
  if (url.pathname.startsWith("/radarr/api/v3/") && request.method === "GET") {
    if (request.headers["x-api-key"] !== "e2e-radarr-api-key") {
      return send(response, 401, { message: "Invalid API key" });
    }
    if (url.pathname === "/radarr/api/v3/movie") return send(response, 200, []);
    if (url.pathname === "/radarr/api/v3/rootfolder") {
      return send(response, 200, [{ id: 1, path: "/e2e/movies" }]);
    }
    if (url.pathname === "/radarr/api/v3/qualityprofile") {
      return send(response, 200, [{ id: 1, name: "E2E HD" }]);
    }
  }
  if (url.pathname === "/m3u/player_api.php" && request.method === "POST") {
    const body = new URLSearchParams(await readText(request));
    if (body.get("action") !== "get_series_info") return send(response, 200, {});
    const episodes =
      body.get("series_id") === "501"
        ? [
            { id: "primary-101", episode_num: 1, title: "Pilot", container_extension: "mkv" },
            { id: "primary-103", episode_num: 3, title: "Finale", container_extension: "mkv" },
          ]
        : [
            { id: "secondary-101", episode_num: 1, title: "Pilot backup", container_extension: "mkv" },
            { id: "secondary-102", episode_num: 2, title: "Middle", container_extension: "mkv" },
          ];
    return send(response, 200, { episodes: { 1: episodes } });
  }

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
  if (/^\/tmdb\/3\/genre\/(movie|tv)\/list$/.test(url.pathname)) {
    const language = url.searchParams.get("language") ?? "en-US";
    return send(response, 200, {
      genres: [
        ...(url.pathname.includes("/movie/")
          ? [{ id: 27, name: language.startsWith("sv") ? "Skräck" : "Horror" }]
          : []),
        { id: 35, name: language.startsWith("sv") ? "Komedi" : language.startsWith("nl") ? "Komedie" : "Comedy" },
      ],
    });
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
    const seasonalTitles = {
      424244: "E2E Seasonal Fixture",
      424245: "E2E More Seasonal",
      424247: "E2E Upcoming Seasonal",
    };
    const title = id === fakeMovie.id ? fakeMovie.title : (seasonalTitles[id] ?? "E2E Recommendation Fixture");
    return send(response, 200, {
      id,
      title,
      original_title: title,
      overview: "A stable movie fixture for Cued browser tests.",
      release_date: "2025-01-01",
      runtime: 100,
      genres:
        id === 424244 || id === 424247
          ? [{ id: 27, name: "Horror" }]
          : id === 424245
            ? [{ id: 35, name: "Comedy" }]
            : [],
      vote_average: 7.5,
      vote_count: 200,
      production_countries: [],
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      external_ids: { imdb_id: null },
      release_dates: { results: [] },
    });
  }
  if (/^\/tmdb\/3\/tv\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/").at(-1));
    const name = id === 800003 ? "Requestable Series" : "E2E Series";
    return send(response, 200, {
      id,
      name,
      original_name: name,
      overview: "A stable series fixture for Cued browser tests.",
      first_air_date: "2020-01-01",
      number_of_seasons: 2,
      number_of_episodes: 12,
      genres: [],
      vote_average: 7.5,
      vote_count: 200,
      production_countries: [],
      networks: [],
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      external_ids: { imdb_id: null },
      seasons: [],
    });
  }
  if (url.pathname === "/tmdb/3/search/keyword") {
    return send(response, 200, { results: [{ id: 9901, name: "Halloween" }] });
  }
  if (/^\/tmdb\/3\/(movie|tv)\/\d+\/keywords$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/").at(-2));
    const keywords = id === 424244 ? [{ id: 9901, name: "Halloween" }] : [];
    return send(response, 200, url.pathname.includes("/tv/") ? { results: keywords } : { keywords });
  }
  if (/^\/tmdb\/3\/trending\/(movie|tv)\/week$/.test(url.pathname)) {
    return send(response, 200, {
      page: 1,
      total_pages: 1,
      results: url.pathname.includes("/tv/")
        ? []
        : [
            {
              id: 424246,
              title: "E2E Unrelated Trending",
              release_date: "2025-01-01",
              popularity: 30,
              vote_average: 8,
              vote_count: 200,
              genre_ids: [],
            },
            {
              id: 424244,
              title: "E2E Seasonal Fixture",
              release_date: "2025-10-01",
              popularity: 20,
              vote_average: 7.5,
              vote_count: 200,
              genre_ids: [],
            },
          ],
    });
  }
  if (url.pathname === "/tmdb/3/discover/movie" && url.searchParams.get("with_keywords") === "9901") {
    const page = Number(url.searchParams.get("page") ?? 1);
    const upcoming = url.searchParams.has("primary_release_date.gte");
    const first = {
      id: 424244,
      title: "E2E Seasonal Fixture",
      overview: "A seasonal discovery fixture.",
      release_date: "2025-10-01",
      popularity: 9,
      vote_average: 7.5,
      vote_count: 200,
      genre_ids: [27],
    };
    const second = {
      ...first,
      id: 424245,
      title: "E2E More Seasonal",
      popularity: 8,
      vote_average: 9,
      release_date: "2024-10-01",
      genre_ids: [35],
    };
    const candidates = upcoming
      ? [
          {
            ...first,
            id: 424247,
            title: "E2E Upcoming Seasonal",
            release_date: "2099-10-01",
            vote_average: 0,
            vote_count: 0,
          },
        ]
      : [first, second];
    const genre = Number(url.searchParams.get("with_genres"));
    const rating = Number(url.searchParams.get("vote_average.gte"));
    const filtered = candidates.filter(
      (item) => (!genre || item.genre_ids.includes(genre)) && item.vote_average >= rating,
    );
    const sort = url.searchParams.get("sort_by");
    filtered.sort((left, right) =>
      sort === "vote_average.desc"
        ? right.vote_average - left.vote_average
        : sort === "primary_release_date.asc"
          ? left.release_date.localeCompare(right.release_date)
          : sort === "primary_release_date.desc"
            ? right.release_date.localeCompare(left.release_date)
            : right.popularity - left.popularity,
    );
    return send(response, 200, {
      page,
      total_pages: filtered.length,
      results: filtered.slice(page - 1, page),
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
async function readText(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function send(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}
