import { LinkIcon } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardFooter } from "../../../../components/ui/card";

export function EntryFileCard({
  file,
  title,
}: {
  file: { mimeType: string; url: string | null };
  title: string;
}) {
  return (
    <Card className="relative w-full max-w-sm overflow-hidden pt-0 shadow-none mx-auto">
      {file.mimeType.startsWith("image/") && file.url ? (
        <img
          src={file.url}
          alt={title}
          className="relative z-20 w-full object-cover"
        />
      ) : null}
      {file.url ? (
        <CardFooter>
          <Button asChild className="w-full" variant="outline">
            <a href={file.url} target="_blank" rel="noreferrer">
              <LinkIcon className="size-4" />
              Open file
            </a>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
