import Image from "next/image";

export interface RelatedStory {
  id: string;
  category: string;
  region: string;
  title: string;
  imageUrl: string;
  date: string;
  readTime: string;
}

export function RelatedStoryCard({ story }: { story: RelatedStory }) {
  return (
    <div className="flex gap-4 rounded-lg border border-border bg-background p-3 shadow-sm">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md">
        <Image src={story.imageUrl} alt="" fill className="object-cover" sizes="80px" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {story.category} · {story.region}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {story.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {story.date} · {story.readTime}
        </p>
      </div>
    </div>
  );
}
