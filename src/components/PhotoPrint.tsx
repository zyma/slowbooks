/**
 * A photo on the page: square corners, no frame or shadow, like a picture printed in the book.
 * Pass the image as children (next/image for static files, <img> for signed URLs).
 */
export function PhotoPrint({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`photo-print ${className}`}>{children}</div>;
}
