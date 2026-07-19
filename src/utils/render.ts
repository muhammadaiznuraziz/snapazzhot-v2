export interface RenderMediaOptions {
  ctx: CanvasRenderingContext2D;
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
  x: number; // destination X
  y: number; // destination Y
  width: number; // destination width
  height: number; // destination height
  objectFit?: "cover" | "contain" | "fill";
  mirror?: boolean;
  zoom?: number; // digital zoom scale (1.0 to 2.5)
}

/**
 * Unified rendering utility to ensure that live preview, BTS video, captured photo,
 * and export PNG/BTS have mathematically identical crop, scale, zoom, and aspect ratio.
 */
export function renderMedia({
  ctx,
  source,
  x,
  y,
  width,
  height,
  objectFit = "cover",
  mirror = false,
  zoom = 1.0,
}: RenderMediaOptions) {
  let srcWidth = 0;
  let srcHeight = 0;

  if (source instanceof HTMLVideoElement) {
    srcWidth = source.videoWidth;
    srcHeight = source.videoHeight;
  } else if (source instanceof HTMLImageElement) {
    srcWidth = source.naturalWidth;
    srcHeight = source.naturalHeight;
  } else if (source instanceof HTMLCanvasElement) {
    srcWidth = source.width;
    srcHeight = source.height;
  }

  if (!srcWidth || !srcHeight) {
    // If media is not yet loaded, clear destination or draw a clean dark fallback
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, y, width, height);
    return;
  }

  const srcAspect = srcWidth / srcHeight;
  const dstAspect = width / height;

  let sx = 0;
  let sy = 0;
  let sWidth = srcWidth;
  let sHeight = srcHeight;

  if (objectFit === "cover") {
    if (srcAspect > dstAspect) {
      sWidth = srcHeight * dstAspect;
      sx = (srcWidth - sWidth) / 2;
    } else {
      sHeight = srcWidth / dstAspect;
      sy = (srcHeight - sHeight) / 2;
    }
  } else if (objectFit === "contain") {
    if (srcAspect > dstAspect) {
      const scale = width / srcWidth;
      const h = srcHeight * scale;
      const offset = (height - h) / 2;
      ctx.save();
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, width, height);
      if (mirror) {
        ctx.translate(x + width / 2, y + height / 2);
        ctx.scale(-1, 1);
        ctx.translate(-(x + width / 2), -(y + height / 2));
      }
      ctx.drawImage(source, 0, 0, srcWidth, srcHeight, x, y + offset, width, h);
      ctx.restore();
      return;
    } else {
      const scale = height / srcHeight;
      const w = srcWidth * scale;
      const offset = (width - w) / 2;
      ctx.save();
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, width, height);
      if (mirror) {
        ctx.translate(x + width / 2, y + height / 2);
        ctx.scale(-1, 1);
        ctx.translate(-(x + width / 2), -(y + height / 2));
      }
      ctx.drawImage(source, 0, 0, srcWidth, srcHeight, x + offset, y, w, height);
      ctx.restore();
      return;
    }
  }

  // Apply digital zoom scale symmetrically relative to the crop center
  if (zoom > 1.0) {
    const origSWidth = sWidth;
    const origSHeight = sHeight;
    sWidth = sWidth / zoom;
    sHeight = sHeight / zoom;
    sx = sx + (origSWidth - sWidth) / 2;
    sy = sy + (origSHeight - sHeight) / 2;
  }

  ctx.save();

  // Handle mirroring around the destination rectangle center
  if (mirror) {
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(-1, 1);
    ctx.translate(-(x + width / 2), -(y + height / 2));
  }

  // Draw on the canvas
  ctx.drawImage(
    source,
    Math.max(0, Math.floor(sx)),
    Math.max(0, Math.floor(sy)),
    Math.min(srcWidth - sx, Math.floor(sWidth)),
    Math.min(srcHeight - sy, Math.floor(sHeight)),
    x,
    y,
    width,
    height
  );

  ctx.restore();
}
