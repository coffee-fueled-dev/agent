// Create a memories hook and provider
// The provider should take an optional namespace id and chart id for optional narrowing
// The hook should provide a paginated list of memories and a search function

function useMemories() {
  const memories = usePaginatedQuery();
}
