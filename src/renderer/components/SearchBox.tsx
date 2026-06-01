import { Search } from "lucide-react";
import type { RefObject } from "react";

type SearchBoxProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  showDone: boolean;
  onQueryChange: (value: string) => void;
  onShowDoneChange: (value: boolean) => void;
};

const SearchBox = ({
  inputRef,
  query,
  showDone,
  onQueryChange,
  onShowDoneChange,
}: SearchBoxProps) => (
  <div className="toolbar">
    <label className="search-box">
      <Search size={17} />
      <input
        ref={inputRef}
        value={query}
        placeholder="Search workstreams"
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </label>
    <label className="toggle">
      <input
        checked={showDone}
        type="checkbox"
        onChange={(event) => onShowDoneChange(event.target.checked)}
      />
      <span>Done</span>
    </label>
  </div>
);

export default SearchBox;
