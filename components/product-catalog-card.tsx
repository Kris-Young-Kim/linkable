"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Package } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export type ProductCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  purchase_link: string | null;
  price: number | null;
  category: string | null;
  manufacturer: string | null;
  iso_code: string | null;
  iso_name: string | null;
  updated_at?: string | null;
};

interface ProductCatalogCardProps {
  product: ProductCatalogItem;
}

const DESCRIPTION_MAX_LENGTH = 120;

export function ProductCatalogCard({ product }: ProductCatalogCardProps) {
  const { t } = useLanguage();
  const desc =
    product.description?.slice(0, DESCRIPTION_MAX_LENGTH) +
    (product.description && product.description.length > DESCRIPTION_MAX_LENGTH ? "…" : "");

  return (
    <Card className="flex h-full flex-col overflow-hidden border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="p-0">
        <div className="relative aspect-4/3 w-full bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="h-12 w-12" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.category && (
              <Badge className="bg-white/90 text-xs text-foreground shadow-sm">
                {product.category}
              </Badge>
            )}
            {product.manufacturer && (
              <Badge variant="secondary" className="bg-white/80 text-xs shadow-sm">
                {product.manufacturer}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold leading-tight text-foreground">
          {product.name}
        </h3>
        {desc && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{desc}</p>
        )}
        {product.iso_code && (
          <p className="text-xs text-muted-foreground">
            {t("products.isoCode")}: {product.iso_code}
            {product.iso_name ? ` · ${product.iso_name}` : ""}
          </p>
        )}
        {product.price != null && product.price > 0 && (
          <p className="text-sm font-medium text-foreground">
            {typeof product.price === "number"
              ? `${product.price.toLocaleString("ko-KR")}원`
              : `${product.price}원`}
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t border-border/50 p-4">
        {product.purchase_link ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            asChild
          >
            <a
              href={product.purchase_link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${product.name} ${t("products.buyLink")}`}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t("products.buyLink")}
            </a>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            —
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
