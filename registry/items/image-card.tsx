import "./tokens.css";
import { Card, type CardProps } from "./card";
export type ImageCardProps = Omit<CardProps, "children"> & {
  /** Face image URL, such as a card view's `frontImage` or a hidden card's `backImage`. */
  src: string;
  /** Names the face, or "Face-down card" for a back. */
  alt: string;
};
/** A card drawn by its face image, keeping the image's own shape. */
export function ImageCard({
  src,
  alt,
  className = "",
  ...props
}: ImageCardProps) {
  return (
    <Card
      role="img"
      aria-label={alt}
      {...props}
      className={`db-image-card ${className}`}
    >
      <img src={src} alt="" draggable={false} />
    </Card>
  );
}
