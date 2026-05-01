import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PaginationControls from "../../../components/PaginationControls";
import { usePagination } from "../../../hooks/usePagination";
import InlineSpinner from "../../../components/InlineSpinner";
import {
  ROLE_OPTIONS,
  ROLE_STYLES,
  sortTeamMembers,
  type ProjectRole,
  type TeamMemberView,
} from "./teamUtils";

interface UserSearchResult {
  id: string;
  display_name: string;
  avatar_url?: string;
  email?: string;
}

interface Props {
  members: TeamMemberView[];
  canManage: boolean;
  onAdd: (userId: string, role: ProjectRole) => Promise<void>;
  onUpdateRole: (id: string, role: ProjectRole) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onSearch: (
    query: string
  ) => Promise<{ data: UserSearchResult[] | null; error: any | null }>;
  onAddRedirect?: () => void;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

const TeamCard = ({
  members,
  canManage,
  onAdd,
  onUpdateRole,
  onRemove,
  onSearch,
  onAddRedirect,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortedMembers = useMemo(() => sortTeamMembers(members), [members]);
  const owner = sortedMembers.find((member) => member.role === "owner") ?? null;
  const otherMembers = sortedMembers.filter((member) => member.role !== "owner");
  const pagination = usePagination(otherMembers);

  const shouldShowDropdown =
    !selectedUser &&
    searchQuery.trim().length >= 2 &&
    (searching || !!searchError || searchResults.length > 0 || !searching);

  useEffect(() => {
    if (selectedUser || searchQuery.trim().length < 2) {
      setSearching(false);
      setSearchError(null);
      setSearchResults((current) => (current.length === 0 ? current : []));
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const { data, error } = await onSearch(searchQuery);
        if (error) {
          console.error("Search error:", error);
          setSearchError("Search failed.");
        }
        setSearchResults(data || []);
      } catch (error) {
        console.error("Search users failed", error);
        setSearchError("Error searching users.");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, onSearch, selectedUser]);

  useEffect(() => {
    if (!shouldShowDropdown || !anchorRef.current) {
      setDropdownPosition((current) => (current === null ? current : null));
      return;
    }

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const next = {
        top: rect.bottom + 12,
        left: rect.left,
        width: rect.width,
      };
      setDropdownPosition((current) =>
        current &&
          current.top === next.top &&
          current.left === next.left &&
          current.width === next.width
          ? current
          : next
      );
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [shouldShowDropdown, searchResults, searchError, searching]);

  useEffect(() => {
    if (!shouldShowDropdown) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setSearchResults([]);
      setSearchError(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [shouldShowDropdown]);

  useEffect(() => {
    if (!shouldShowDropdown) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSearchResults([]);
      setSearchError(null);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [shouldShowDropdown]);

  const hasEmptySearch =
    !searching && !searchError && searchQuery.trim().length >= 2 && searchResults.length === 0;

  const renderAvatar = (
    member: { display_name: string; avatar_url?: string },
    className: string,
    textClassName: string
  ) => (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-xl border border-stroke bg-panel ${className}`}
    >
      {member.avatar_url ? (
        <img src={member.avatar_url} alt={member.display_name} className="h-full w-full object-cover" />
      ) : (
        <span className={`font-bold uppercase text-fg-secondary ${textClassName}`}>
          {member.display_name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  const handleAdd = async () => {
    if (!selectedUser) return;

    setBusy(true);
    try {
      await onAdd(selectedUser.id, selectedRole);
      setSearchQuery("");
      setSelectedUser(null);
      setSearchResults([]);
      setSearchError(null);
    } catch (error: any) {
      console.error("Failed to add member:", error);
      alert("Failed to add member: " + (error.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await onRemove(id);
    } catch {
      alert("Failed to remove member.");
    }
  };

  const handleRoleChange = async (id: string, role: ProjectRole) => {
    try {
      await onUpdateRole(id, role);
    } catch {
      alert("Failed to update role.");
    }
  };

  const dropdown =
    shouldShowDropdown && dropdownPosition
      ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[80] rounded-2xl border border-stroke bg-panel shadow-2xl ring-1 ring-black/40"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
            {searching ? (
              <div className="px-4 py-5 text-sm text-fg-muted flex items-center gap-3">
                <InlineSpinner compact />
                <span>Searching users...</span>
              </div>
            ) : searchError ? (
              <div className="px-4 py-4 text-sm text-rose-300">{searchError}</div>
            ) : hasEmptySearch ? (
              <div className="px-4 py-4 text-sm text-fg-muted">No users found</div>
            ) : (
              searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchQuery(user.display_name);
                    setSearchResults([]);
                    setSearchError(null);
                  }}
                  className="w-full rounded-xl px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-surface active:bg-surface transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {renderAvatar(user, "h-10 w-10", "text-sm")}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-fg truncate">{user.display_name}</p>
                      <p className="text-[11px] text-fg-muted truncate">
                        {user.email || "Team member"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg font-black tracking-widest">
                    SELECT
                  </span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )
      : null;

  const selectedUserPreview = selectedUser ? (
    <div className="flex items-center gap-3 px-1">
      {renderAvatar(selectedUser, "h-8 w-8", "text-xs")}
      <p className="text-[11px] text-fg-muted">
        Selected: <span className="text-fg-secondary font-semibold">{selectedUser.display_name}</span>
      </p>
    </div>
  ) : null;

  return (
    <>
      <div className="space-y-6">
        {canManage && !onAddRedirect && (
          <div className="glass-panel p-6 sm:p-8 space-y-6 border-primary/20 bg-primary/[0.02]">
            <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
              <span className="text-xl">Team</span>
              <div>
                <h3 className="text-lg font-black text-fg tracking-tight">Project Teammates</h3>
                <p className="text-[10px] text-fg-muted font-bold uppercase tracking-widest">
                  Build your collaboration layer
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-3">
                <label className="text-[10px] font-black text-fg-muted uppercase tracking-widest ml-1">
                  Find Teammate
                </label>
                <div ref={anchorRef} className="relative">
                  <input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSelectedUser(null);
                    }}
                    className="w-full rounded-xl bg-panel border border-stroke px-5 py-3.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-fg shadow-inner"
                  />
                  {searching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <InlineSpinner compact />
                    </div>
                  )}
                </div>
                {selectedUserPreview}
              </div>

              <div className="lg:col-span-5 space-y-3">
                <label className="text-[10px] font-black text-fg-muted uppercase tracking-widest ml-1">
                  Access Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.filter((role) => role !== "owner").map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`px-3 py-3 rounded-xl border-2 text-[10px] font-black transition uppercase tracking-widest ${selectedRole === role
                          ? `${ROLE_STYLES[role]} border-primary/50 shadow-md scale-[1.02]`
                          : "bg-panel border-stroke text-fg-muted hover:border-stroke"
                        }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 lg:pt-7">
                <button
                  disabled={!selectedUser || busy}
                  onClick={handleAdd}
                  className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-black tracking-widest uppercase text-[10px] hover:brightness-110 shadow-lg shadow-primary/20 transition disabled:opacity-30 active:scale-95"
                >
                  {busy ? <InlineSpinner compact /> : "Grant"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-stroke pb-4">
            <div className="flex items-center gap-2">
              <span className="text-base text-primary">Team</span>
              <h3 className="font-black text-fg text-xs tracking-widest uppercase">Member Stream</h3>
            </div>

            {onAddRedirect && (
              <button
                onClick={onAddRedirect}
                className="text-xs text-primary font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition"
              >
                Open Team Tab
              </button>
            )}

            <span className="text-[10px] text-fg-muted font-mono font-bold">
              {sortedMembers.length} collaborators
            </span>
          </div>

          {sortedMembers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-stroke rounded-3xl bg-panel/10">
              <span className="text-3xl opacity-20">People</span>
              <div className="space-y-1">
                <p className="text-xs font-black text-fg-muted uppercase tracking-widest">
                  No team members yet
                </p>
                <p className="text-[10px] text-fg-muted font-medium">
                  Add collaborators to start working together.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {owner ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 flex items-center gap-4">
                  {renderAvatar(owner, "w-11 h-11 border-primary/30 shadow-xl", "text-sm")}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-fg truncate flex items-center gap-2">
                      <span className="truncate">{owner.display_name}</span>
                      <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.24em] text-primary">
                        Owner
                      </span>
                    </p>
                    <p className="text-sm text-fg-muted truncate">{owner.email || "Project lead"}</p>
                  </div>
                </div>
              ) : null}

              {otherMembers.length === 0 ? (
                <div className="rounded-2xl border border-stroke bg-panel/20 px-4 py-4 text-sm text-fg-muted">
                  No additional team members yet.
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-fg-muted px-1">
                    Members
                  </p>
                  <ul className="divide-y divide-slate-800/50">
                    {pagination.paginatedItems.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center gap-4 py-4 group hover:bg-surface/20 px-4 rounded-xl transition"
                      >
                        {renderAvatar(
                          member,
                          "w-10 h-10 group-hover:border-primary/40 transition shadow-xl",
                          "text-sm"
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-fg-secondary truncate">{member.display_name}</p>
                          <p className="text-[10px] text-fg-muted font-mono tracking-tighter truncate uppercase">
                            {member.email || "Collaborator"}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          {canManage ? (
                            <select
                              value={member.role}
                              onChange={(event) =>
                                handleRoleChange(member.id, event.target.value as ProjectRole)
                              }
                              className={`text-[10px] font-black border-2 rounded-xl px-3 py-2 bg-panel outline-none cursor-pointer hover:border-primary/40 transition uppercase tracking-widest ${ROLE_STYLES[member.role]}`}
                            >
                              {ROLE_OPTIONS.filter((role) => role !== "owner").map((role) => (
                                <option
                                  key={role}
                                  value={role}
                                  className="bg-panel text-fg-secondary font-bold"
                                >
                                  {role.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`text-[10px] font-black border-2 rounded-xl px-4 py-2 uppercase tracking-widest ${ROLE_STYLES[member.role]}`}
                            >
                              {member.role.toUpperCase()}
                            </span>
                          )}

                          {canManage && (
                            <button
                              onClick={() => handleRemove(member.id)}
                              className="text-fg-muted hover:text-rose-400 p-2.5 bg-panel rounded-xl hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100 shadow-xl"
                              title="Revoke Access"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {otherMembers.length > 0 && (
                <PaginationControls
                  currentPage={pagination.currentPage}
                  pageSize={pagination.pageSize}
                  totalItems={otherMembers.length}
                  totalPages={Math.max(1, Math.ceil(otherMembers.length / pagination.pageSize))}
                  startItem={otherMembers.length === 0 ? 0 : (pagination.currentPage - 1) * pagination.pageSize + 1}
                  endItem={Math.min(pagination.currentPage * pagination.pageSize, otherMembers.length)}
                  onPageChange={pagination.setCurrentPage}
                  onPageSizeChange={pagination.setPageSize}
                  itemLabel="members"
                />
              )}
            </div>
          )}
        </div>
      </div>
      {dropdown}
    </>
  );
};

export { type TeamMemberView, type ProjectRole };
export default TeamCard;
