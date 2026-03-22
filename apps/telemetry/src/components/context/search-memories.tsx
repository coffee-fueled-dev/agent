import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../ui/input-group";
import { useChart } from "./use-chart";
import { useMemories } from "./use-memories";

export function SearchMemories() {
  const { selectedCount } = useChart();
  const { memories, query, setQuery, search, isSearching } = useMemories();

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        void search();
      }}
    >
      <InputGroup>
        <InputGroupInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this namespace..."
        />
        <InputGroupAddon>
          {memories.length} results
          {selectedCount > 0 ? ` · ${selectedCount} charts selected` : ""}
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit"
            variant="secondary"
            disabled={isSearching}
          >
            {isSearching ? "Searching..." : "Search"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
