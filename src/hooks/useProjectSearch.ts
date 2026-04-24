import { useMemo, useState } from "react";
import type { Project, ProjectStatus } from "../types";

export type ProjectSortOption = "name" | "updated" | "status";

export function useProjectSearch(projects: Project[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [sortBy, setSortBy] = useState<ProjectSortOption>("updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter by Status
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Smart Search (Fuzzy-ish)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "updated") {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === "status") {
        comparison = a.status.localeCompare(b.status);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [projects, searchQuery, statusFilter, sortBy, sortOrder]);

  return {
    filteredProjects,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  };
}
