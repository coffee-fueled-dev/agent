import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../ui/input-group";

export function SearchMemories() {
  const { memories } = useMemories();
  return (
    <InputGroup>
      <InputGroupInput placeholder="Type to search..." />
      <InputGroupAddon>
        First {/* Number of results currently shown */} results
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupButton variant="secondary">Search</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
