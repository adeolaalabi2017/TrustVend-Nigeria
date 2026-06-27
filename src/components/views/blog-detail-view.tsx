"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { ArrowLeft, Calendar, Clock, Eye, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import { toast } from "sonner";

export function BlogDetailView() {
  const { selectedPostId, openBlog } = useAppStore();
  const data = useQuery(api.posts.getById, { id: selectedPostId ?? "" });
  const isLoading = selectedPostId ? data === undefined : false;

  function share() {
    if (navigator.share) {
      navigator.share({ title: data?.post?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const post = data?.post;
  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
        <p className="text-lg font-semibold">Article not found.</p>
        <Button className="mt-4" onClick={() => openBlog()}>Back to blog</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Button variant="ghost" size="sm" onClick={() => openBlog()} className="mb-4 -ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to blog
      </Button>

      <article>
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map((t: string) => (
              <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {t}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{post.author?.name ?? "TrustVend"}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(post.createdAt), "MMMM d, yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(post.createdAt), "h:mm a")}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {post.views} views
          </span>
        </div>

        {post.coverImage && (
          <div className="mt-6 rounded-2xl overflow-hidden bg-muted">
            <img src={post.coverImage} alt={post.title} className="w-full aspect-[16/9] object-cover" />
          </div>
        )}

        {post.excerpt && (
          <p className="text-lg text-muted-foreground mt-6 leading-relaxed font-medium">
            {post.excerpt}
          </p>
        )}

        <div className="prose prose-sm sm:prose-base max-w-none mt-6 dark:prose-invert">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h2 className="text-2xl font-bold mt-8 mb-3">{children}</h2>,
              h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-2">{children}</h2>,
              p: ({ children }) => <p className="leading-relaxed my-3 text-foreground/90">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>,
              a: ({ href, children }) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noreferrer">{children}</a>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4">{children}</blockquote>,
              code: ({ children }) => <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">{children}</code>,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between">
          <Button variant="outline" onClick={() => openBlog()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> All articles
          </Button>
          <Button variant="ghost" onClick={share}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
      </article>
    </div>
  );
}