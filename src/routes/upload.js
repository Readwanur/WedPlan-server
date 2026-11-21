import express from "express";

const router = express.Router();

/**
 * POST /api/upload
 * Uploads a base64 image file to ImgBB using process.env.IMGBB_API_KEY.
 * Returns the hosted image URL.
 */
router.post("/", async (req, res) => {
  try {
    const { image, name } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        ok: false,
        error: "No image data provided for upload.",
      });
    }

    // If it's already an https URL, return it directly
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return res.status(200).json({
        ok: true,
        url: image,
        provider: "direct",
      });
    }

    // Strip data:image/...;base64, prefix if present
    const base64Data = image.includes("base64,")
      ? image.split("base64,")[1]
      : image;

    if (!base64Data || base64Data.length < 16) {
      return res.status(400).json({
        ok: false,
        error: "Invalid image file payload.",
      });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (apiKey && apiKey.trim()) {
      const formData = new URLSearchParams();
      formData.append("image", base64Data);
      if (name) {
        formData.append("name", String(name).trim());
      }

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey.trim())}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      const result = await response.json();
      if (!response.ok || !result?.success || !result?.data?.url) {
        return res.status(502).json({
          ok: false,
          error:
            result?.error?.message ||
            "Failed to upload image to ImgBB hosting service.",
        });
      }

      return res.status(200).json({
        ok: true,
        url: result.data.display_url || result.data.url,
        provider: "imgbb",
      });
    }

    // When IMGBB_API_KEY is not configured in .env, return the validated data URL
    // so local image uploads still work without breaking forms
    return res.status(200).json({
      ok: true,
      url: image,
      provider: "inline-fallback",
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return res.status(500).json({
      ok: false,
      error: "Image upload failed. Please try another image file.",
    });
  }
});

export default router;
