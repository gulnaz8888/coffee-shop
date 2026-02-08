const express = require("express");
const router = express.Router();

router.get("/random", async (req, res) => { 
  try {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) {
      return res.status(500).json({ 
        message: "UNSPLASH_ACCESS_KEY is missing in .env file" 
      });
    }

    const query = String(req.query.query || "coffee");
    const count = Math.min(parseInt(req.query.count || "6", 10), 12);

    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&count=${count}`;
    
    const response = await fetch(url, {
      headers: { 
        Authorization: `Client-ID ${key}`,
        'Accept-Version': 'v1'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        message: "Unsplash API error", 
        details: data 
      });
    }

    const photos = (Array.isArray(data) ? data : [data]).map(p => ({
      id: p.id,
      alt: p.alt_description || "photo",
      thumb: p.urls?.small,
      full: p.urls?.regular,
      author: p.user?.name,
      urls: p.urls
    }));

    res.json({ photos });
    
  } catch (error) {
    console.error("Unsplash route error:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

module.exports = router;