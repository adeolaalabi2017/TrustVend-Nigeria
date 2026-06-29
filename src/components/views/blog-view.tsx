"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Image from "next/image";
import { Calendar, Clock, ArrowRight, Newspaper, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { formatDistanceToNow, format } from "date-fns";
import { cn, debounce } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 200;

export function BlogView() {
  const { openBlogPost, goHome } = useAppStore();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const commitQ = useMemo(
    () => debounce((value: string) => setQ(value), SEARCH_DEBOUNCE_MS),
    [],
  );
  useEffect(() => () => commitQ.cancel(), [commitQ]);

  const data = useQuery(api.posts.list, { onlyPublished: true, limit: 12 });
  const isLoading = data === undefined;

  const posts = (data?.items ?? []).filter((p) =>
    !q ? true : (p.title + p.excerpt + (p.tags ?? []).join(" ")).toLowerCase().includes(q.toLowerCase())
  );

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Button variant="ghost" size="sm" onClick={() => goHome()} className="mb-4 -ml-2">
        ← Back to home
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <Newspaper className="h-7 w-7 text-primary" />
          TrustVend Blog
        </h1>
        <p className="text-muted-foreground mt-2">
          Insights, tips, and stories from Nigeria&apos;s vendor community.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={qInput}
          onChange={(e) => {
            setQInput(e.target.value);
            commitQ(e.target.value);
          }}
          placeholder="Search articles..."
          className="pl-9"
          aria-label="Search articles"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-12 text-center">
          <Newspaper className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">No articles yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Check back soon for stories from the TrustVend community.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Featured post */}
          {featured && (
            <Card
              className="overflow-hidden cursor-pointer hover:shadow-lg transition group"
              onClick={() => openBlogPost(featured.id)}
            >
              <div className="grid md:grid-cols-2 gap-0">
                {featured.coverImage && (
                  <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden bg-muted">
                    <Image
                      src={featured.coverImage}
                      alt={featured.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    {featured.tags.slice(0, 2).map((t: string) => (
                      <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight leading-tight group-hover:text-primary transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-muted-foreground mt-2 line-clamp-3">{featured.excerpt}</p>
                  <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                    <span className="font-medium">{featured.authorName ?? "TrustVend"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(featured.createdAt), "MMM d, yyyy")}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {featured.views} views
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Grid of remaining posts */}
          {rest.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((p: any) => (
                <Card
                  key={p.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition group"
                  onClick={() => openBlogPost(p.id)}
                >
                  {p.coverImage && (
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      <Image
                        src={p.coverImage}
                        alt={p.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    {p.tags[0] && (
                      <span className="text-[11px] font-medium text-primary">{p.tags[0]}</span>
                    )}
                    <h3 className="font-bold text-base leading-tight mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{p.excerpt}</p>
                    <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
                      <span>{p.authorName ?? "TrustVend"}</span>
                      <span>•</span>
                      <span>{format(new Date(p.createdAt), "MMM d")}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}