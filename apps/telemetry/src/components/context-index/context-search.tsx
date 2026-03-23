import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useRef, useState } from "react";
import { api } from "../../../../../convex/_generated/api.js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { useNamespace } from "./use-namespace.js";

type SearchResults = FunctionReturnType<
  typeof api.context.contextApi.searchContext
>;

export function ContextSearch() {
  const searchContext = useAction(api.context.contextApi.searchContext);
  const [results, setResults] = useState<SearchResults>([]);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { namespace } = useNamespace();

  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await searchContext({
            namespace,
            query: value.trim(),
            limit: 10,
          });
          setResults(res);
        } catch {
          setResults([]);
        }
      }, 300);
    },
    [namespace, searchContext],
  );

  return (
    <Command shouldFilter={false} className="rounded-md border">
      <CommandInput
        value={query}
        onValueChange={handleValueChange}
        placeholder="Search context..."
      />
      {query.trim() && (
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup>
            {results.map((r) => (
              <CommandItem
                key={r.entryId}
                value={r.entryId}
                onSelect={() => {
                  window.location.href = `/context/${encodeURIComponent(r.entryId)}?namespace=${encodeURIComponent(namespace)}`;
                }}
                className="cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  {r.title && (
                    <span className="text-sm font-medium">{r.title}</span>
                  )}
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {r.text.slice(0, 200)}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    Score: {r.score.toFixed(3)}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );
}
