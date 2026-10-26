import { SearchBar } from "../components/search/SearchBar";
import { FilterPills } from "../components/search/FilterPills";
import { ExploreGenresGrid } from "../components/search/ExploreGenresGrid";
import { CategorizedResults } from "../components/search/CategorizedResults";
import { EmptySearchState } from "../components/search/EmptySearchState";
import { useSearchStore } from "../store/useSearchStore";

interface SearchProps {
  onNavigate?: (nav: string) => void;
}

export function Search({ onNavigate }: SearchProps = {}) {
  const query = useSearchStore((state) => state.query);
  const results = useSearchStore((state) => state.results);
  const isSearching = useSearchStore((state) => state.isSearching);

  const hasQuery = query.trim().length > 0;
  const hasNoResults = hasQuery && !isSearching && results.totalMatches === 0;

  return (
    <main
      role="main"
      aria-label="Search and explore screen"
      className="min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 max-lg:p-4 max-sm:p-3 flex flex-col gap-7 max-sm:gap-5 bg-[radial-gradient(900px_420px_at_70%_0,rgba(214,122,84,0.12),transparent_70%)] bg-[#110c0a]"
    >
      {/* Search Header Container */}
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <SearchBar />
        <FilterPills />
      </header>

      {/* Main Dynamic View Content */}
      {!hasQuery ? (
        <ExploreGenresGrid />
      ) : hasNoResults ? (
        <EmptySearchState />
      ) : (
        <CategorizedResults onNavigate={onNavigate} />
      )}
    </main>
  );
}
