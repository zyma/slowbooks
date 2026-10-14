/**
 * A photo print on an album page, held by four paper corners.
 * Pass the image as children (next/image for static files, <img> for signed URLs).
 */
export function PhotoPrint({
  children,
  size = "md",
  className = "",
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={`photo-print ${className}`} data-size={size}>
      {children}
      <span aria-hidden="true" className="photo-corner" data-at="tl" />
      <span aria-hidden="true" className="photo-corner" data-at="tr" />
      <span aria-hidden="true" className="photo-corner" data-at="bl" />
      <span aria-hidden="true" className="photo-corner" data-at="br" />
    </div>
  );
}
