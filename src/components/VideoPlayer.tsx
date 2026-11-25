interface VideoPlayerProps {
  url: string;
  title?: string;
}

export default function VideoPlayer({ url, title = "Recipe Video Tutorial" }: VideoPlayerProps) {
  if (!url || !url.trim()) return null;

  const cleanUrl = url.trim();

  // 1. YouTube (Standard, Short, or Shorts)
  const isYouTube =
    cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be");

  if (isYouTube) {
    let embedUrl = cleanUrl;

    if (cleanUrl.includes("watch?v=")) {
      const videoId = cleanUrl.split("watch?v=")[1].split("&")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (cleanUrl.includes("youtu.be/")) {
      const videoId = cleanUrl.split("youtu.be/")[1].split("?")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (cleanUrl.includes("/shorts/")) {
      const videoId = cleanUrl.split("/shorts/")[1].split("?")[0].split("/")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    return (
      <div className="video-player-container">
        <iframe
          className="recipe-video-frame"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. Instagram (Reels or Posts)
  const isInstagram = cleanUrl.includes("instagram.com");

  if (isInstagram) {
    // Extract post or reel identifier
    let instagramEmbedUrl = cleanUrl;
    const match = cleanUrl.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#&]+)/i);

    if (match && match[1]) {
      const postId = match[1];
      const type = cleanUrl.includes("/reel/") ? "reel" : "p";
      instagramEmbedUrl = `https://www.instagram.com/${type}/${postId}/embed/`;
    }

    return (
      <div className="video-player-container instagram-container">
        <iframe
          className="recipe-video-frame instagram-frame"
          src={instagramEmbedUrl}
          title={title}
          allowTransparency
          allow="encrypted-media"
          scrolling="no"
        />
        <div className="video-external-helper">
          <span>Instagram Video Tutorial</span>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="video-open-external"
          >
            Open Original Post on Instagram ↗
          </a>
        </div>
      </div>
    );
  }

  // 3. Vimeo
  const isVimeo = cleanUrl.includes("vimeo.com");
  if (isVimeo) {
    const vimeoId = cleanUrl.split("vimeo.com/")[1]?.split("?")[0]?.split("/")[0];
    const vimeoEmbed = `https://player.vimeo.com/video/${vimeoId}`;
    return (
      <div className="video-player-container">
        <iframe
          className="recipe-video-frame"
          src={vimeoEmbed}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 4. Direct video files / uploads (MP4, WebM, MOV, /uploads/...)
  const isDirectVideo =
    cleanUrl.startsWith("data:video/") ||
    cleanUrl.startsWith("blob:") ||
    cleanUrl.includes("/uploads/") ||
    /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(cleanUrl);

  if (isDirectVideo) {
    return (
      <div className="video-player-container">
        <video
          className="recipe-video-player"
          src={cleanUrl}
          controls
          playsInline
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // 5. Fallback for external links (TikTok, food blogs, external web players)
  return (
    <div className="video-player-container fallback-container">
      <div className="video-fallback-card">
        <div className="fallback-info">
          <strong>External Video Tutorial</strong>
          <p>This video is hosted on an external culinary website.</p>
        </div>
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="video-open-external-btn"
        >
          Watch Video on External Site ↗
        </a>
      </div>
    </div>
  );
}

