"use client";
import { useState, useEffect, useRef } from "react";

interface Album {
  name: string;
  image: string;
  spotifyUrl: string;
  artist: string;
}

export default function Home() {
  const [artist, setArtist] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [artistPool, setArtistPool] = useState<string[]>([]);
  const [randomAlbum, setRandomAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLDivElement>(null); // Ref for input and dropdown

  // Fetch suggestions (debounced)
  useEffect(() => {
    if (!artist.trim()) {
      setSuggestions([]);
      return;
    }

    const debounce = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:3001/suggestions?query=${encodeURIComponent(artist)}`);
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [artist]);

  // Hide suggestions on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Load initial pool
  useEffect(() => {
    const fetchPool = async () => {
      try {
        const res = await fetch("http://localhost:3001/get-pool");
        if (res.ok) {
          const data = await res.json();
          setArtistPool(data.artistPool || []);
        }
      } catch (err) {
        console.error("Error fetching pool:", err);
      }
    };
    fetchPool();
  }, []);

  const handleSelectSuggestion = (suggestion: string) => {
    setArtist(suggestion);
    setSuggestions([]);
  };

  const handleAddToPool = async () => {
    if (!artist.trim() || artistPool.includes(artist)) {
      setError(artist.trim() ? "Artist already in pool" : "Please enter an artist");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/add-to-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist }),
      });
      if (!res.ok) throw new Error("Failed to add artist");
      const data = await res.json();
      setArtistPool(data.artistPool);
      setArtist("");
      setError(null);
    } catch (err) {
      setError("Failed to add artist");
      console.error(err);
    }
  };

  const handleRemoveFromPool = async (artistToRemove: string) => {
    try {
      const res = await fetch("http://localhost:3001/remove-from-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist: artistToRemove }),
      });
      if (!res.ok) throw new Error("Failed to remove artist");
      const data = await res.json();
      setArtistPool(data.artistPool);
    } catch (err) {
      setError("Failed to remove artist");
      console.error(err);
    }
  };

  const fetchRandomAlbumFromPool = async () => {
    setLoading(true);
    setRandomAlbum(null);
    setError(null);

    try {
      const res = await fetch("http://localhost:3001/random-album-from-pool");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch album");
      }
      const data = await res.json();
      if (
        data.album &&
        typeof data.album.name === "string" &&
        typeof data.album.image === "string" &&
        typeof data.album.spotifyUrl === "string" &&
        typeof data.album.artist === "string"
      ) {
        setRandomAlbum(data.album as Album);
      } else {
        throw new Error("Invalid album data received");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong while fetching the album");
      console.error("Error in fetchRandomAlbumFromPool:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRandomAlbum = async () => {
    if (!artist.trim()) {
      setError("Please enter a valid artist name.");
      return;
    }

    setLoading(true);
    setRandomAlbum(null);
    setError(null);

    try {
      const res = await fetch("http://localhost:3001/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ artist: artist.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch albums.");
      }

      const data = await res.json();
      if (data.albums?.length > 0) {
        const random = data.albums[Math.floor(Math.random() * data.albums.length)];
        setRandomAlbum({ ...random, artist: artist.trim() });
      } else {
        setError("No albums found for this artist.");
      }
    } catch (err: any) {
      console.error("Error fetching albums:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white font-sans">
      <h1 className="text-4xl font-bold mb-6 text-green-400">🎶 Music Randomizer</h1>

      <div className="w-full max-w-md bg-white/10 backdrop-blur p-6 rounded-xl shadow-lg border border-white/10">
        <div className="relative" ref={inputRef}>
          <input
            className="text-black px-4 py-3 rounded w-full mb-4 text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            type="text"
            placeholder="Enter artist name (e.g., Drake)"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            disabled={loading}
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white text-black rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded flex-1 text-lg font-semibold disabled:bg-gray-400 transition-all duration-200"
            onClick={handleAddToPool}
            disabled={loading}
          >
            Add to Pool
          </button>
          <button
            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded flex-1 text-lg font-semibold disabled:bg-gray-400 transition-all duration-200"
            onClick={fetchRandomAlbum}
            disabled={loading}
          >
            Single Artist Album
          </button>
        </div>

        {artistPool.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-green-300">Artist Pool:</h3>
            <ul className="list-disc pl-5">
              {artistPool.map((artist, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span>{artist}</span>
                  <button
                    className="text-red-400 hover:text-red-500 text-sm"
                    onClick={() => handleRemoveFromPool(artist)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded w-full mt-2 text-lg font-semibold disabled:bg-gray-400 transition-all duration-200"
              onClick={fetchRandomAlbumFromPool}
              disabled={loading || artistPool.length === 0}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8h8a8 8 0 11-16 0z"
                    ></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                "Random Album from Pool"
              )}
            </button>
          </div>
        )}

        {error && (
          <p className="text-red-400 mt-4 text-center">{error}</p>
        )}

        {randomAlbum && (
          <div className="mt-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-green-300">{randomAlbum.name}</h2>
            <p className="text-gray-300 mb-2">by {randomAlbum.artist}</p>
            <img
              src={randomAlbum.image || "/placeholder-album.jpg"}
              alt={randomAlbum.name}
              className="rounded-lg shadow-lg mb-2 mx-auto"
              width={300}
              height={300}
              onError={(e) => (e.currentTarget.src = "/placeholder-album.jpg")}
            />
            <div className="space-y-2">
              {randomAlbum.spotifyUrl && (
                <a
                  href={randomAlbum.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline block"
                >
                  Open in Spotify
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}