const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let accessToken = "";
let artistPool = []; // In-memory artist pool

// 🔑 Get Spotify access token using Client Credentials Flow
const getToken = async () => {
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );
    accessToken = response.data.access_token;
    console.log("✅ Access token received.");
  } catch (error) {
    console.error("❌ Failed to get access token:", error.message);
  }
};

// 🔄 Refresh token on startup
getToken();

// 🎧 Route to fetch artist's OWN albums
app.post("/albums", async (req, res) => {
  const { artist } = req.body;
  if (!artist) return res.status(400).json({ error: "Artist name required" });

  try {
    // Step 1: Get artist ID from name using Spotify API
    const searchRes = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: artist,
        type: "artist",
        limit: 1,
      },
    });

    const artistId = searchRes.data.artists.items[0]?.id;
    if (!artistId) return res.status(404).json({ error: "Artist not found" });

    // Step 2: Fetch ONLY that artist's albums from Spotify
    const albumsRes = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        include_groups: "album", // full albums only
        market: "US",
        limit: 50,
      },
    });

    // Step 3: Map Spotify albums with deep links
    const albums = albumsRes.data.items.map((album) => {
      const spotifyWebUrl = album.external_urls?.spotify || "";
      const albumIdMatch = spotifyWebUrl.match(/album\/([a-zA-Z0-9]+)/);
      const spotifyDeepLink = albumIdMatch ? `spotify:album:${albumIdMatch[1]}` : spotifyWebUrl;

      return {
        name: album.name,
        image: album.images?.[0]?.url || "",
        spotifyUrl: spotifyDeepLink,
      };
    });

    res.json({ albums });
  } catch (err) {
    console.error("❌ Failed to fetch albums:", err.message);
    res.status(500).json({ error: "Failed to fetch albums." });
  }
});

// 🔍 Route to fetch artist suggestions
app.get("/suggestions", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Query parameter required" });

  try {
    const searchRes = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: query,
        type: "artist",
        limit: 5,
      },
    });

    const suggestions = searchRes.data.artists.items.map((artist) => artist.name);
    res.json({ suggestions });
  } catch (err) {
    console.error("❌ Failed to fetch suggestions:", err.message);
    res.status(500).json({ error: "Failed to fetch suggestions." });
  }
});

// 🧑‍🎤 Route to add artists to pool
app.post("/add-to-pool", (req, res) => {
  const { artist } = req.body;
  if (!artist || typeof artist !== 'string') {
    return res.status(400).json({ error: "Valid artist name required" });
  }

  if (!artistPool.includes(artist)) {
    artistPool = [...artistPool, artist];
    console.log(`✅ Added ${artist} to pool. Current pool:`, artistPool);
  }

  res.json({ success: true, artistPool });
});

// 🗑️ Route to remove artist from pool
app.post("/remove-from-pool", (req, res) => {
  const { artist } = req.body;
  if (!artist || typeof artist !== 'string') {
    return res.status(400).json({ error: "Valid artist name required" });
  }

  artistPool = artistPool.filter((a) => a !== artist);
  console.log(`✅ Removed ${artist} from pool. Current pool:`, artistPool);
  res.json({ success: true, artistPool });
});

// 📋 Route to get current pool
app.get("/get-pool", (req, res) => {
  res.json({ artistPool });
});

// 🎲 Route to get random album from pool
app.get("/random-album-from-pool", async (req, res) => {
  if (artistPool.length === 0) {
    return res.status(400).json({ error: "Artist pool is empty" });
  }

  try {
    // Step 1: Pick random artist from pool
    const randomArtist = artistPool[Math.floor(Math.random() * artistPool.length)];
    console.log(`🎲 Selected artist: ${randomArtist}`);

    // Step 2: Get artist ID
    const searchRes = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: randomArtist,
        type: "artist",
        limit: 1,
      },
    });

    const artistId = searchRes.data.artists.items[0]?.id;
    if (!artistId) return res.status(404).json({ error: `Artist ${randomArtist} not found` });

    // Step 3: Fetch albums
    const albumsRes = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        include_groups: "album",
        market: "US",
        limit: 50,
      },
    });

    if (albumsRes.data.items.length === 0) {
      return res.status(404).json({ error: `No albums found for ${randomArtist}` });
    }

    // Step 4: Pick random album
    const randomAlbum = albumsRes.data.items[Math.floor(Math.random() * albumsRes.data.items.length)];
    const spotifyWebUrl = randomAlbum.external_urls?.spotify || "";
    const albumIdMatch = spotifyWebUrl.match(/album\/([a-zA-Z0-9]+)/);
    const spotifyDeepLink = albumIdMatch ? `spotify:album:${albumIdMatch[1]}` : spotifyWebUrl;

    res.json({
      album: {
        name: randomAlbum.name,
        image: randomAlbum.images?.[0]?.url || "",
        spotifyUrl: spotifyDeepLink,
        artist: randomArtist,
      }
    });
  } catch (err) {
    console.error("❌ Failed to fetch random album:", err.message);
    res.status(500).json({ error: "Failed to fetch random album." });
  }
});

// 🚀 Start server
app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});