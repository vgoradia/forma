import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/product-image";
import { ProductLink } from "@/components/product-link";

export function ProductCard({
  name,
  subtitle,
  price,
  imageUrl,
  href,
}: {
  name: string;
  subtitle: string;
  price?: number;
  imageUrl?: string;
  href?: string;
}) {
  const card = (
    <div className="w-36 shrink-0 rounded-2xl border border-forma-border bg-white p-3 shadow-sm transition hover:shadow-md lg:w-full lg:shrink">
      <ProductImage
        src={imageUrl}
        alt={name}
        className="mb-3 h-24 w-full rounded-xl lg:h-32"
      />
      <p className="line-clamp-2 text-sm font-medium text-gray-900">{name}</p>
      {price !== undefined ? (
        <p className="mt-1 text-sm font-semibold text-emerald-600">{formatPrice(price)}</p>
      ) : null}
      <p className="mt-1 line-clamp-2 text-xs text-forma-muted">{subtitle}</p>
    </div>
  );

  if (!href) return card;

  if (href.startsWith("http")) {
    return (
      <ProductLink href={href} className="block shrink-0 lg:shrink">
        {card}
      </ProductLink>
    );
  }

  return (
    <Link href={href} className="block shrink-0 lg:shrink">
      {card}
    </Link>
  );
}
