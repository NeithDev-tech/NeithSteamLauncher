(() => {
  const player = document.querySelector('[data-neith-trailer]');
  if (!player) return;

  const poster = player.querySelector('.neith-trailer-poster');
  const videoId = player.dataset.videoId;
  if (!poster || !videoId) return;

  const startTrailer = (event) => {
    if (event) event.preventDefault();
    if (player.querySelector('iframe')) return;

    const iframe = document.createElement('iframe');
    iframe.className = 'neith-home-youtube';
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1&vq=hd2160`;
    iframe.title = 'Tráiler oficial de Neith Steam Launcher';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';

    player.replaceChildren(iframe);
  };

  poster.addEventListener('click', startTrailer, { once:true });
})();
