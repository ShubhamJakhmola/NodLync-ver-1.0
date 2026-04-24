import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAppStore from "../store/useAppStore";
import { getProjects, createProject, updateProject, deleteProject } from "../api/projectsApi";
import type { Project, ProjectStatus } from "../types";

const PROJECTS_KEY = ["projects"];

/**
 * Hook for managing projects with React Query (caching, deduplication, optimistic updates).
 */
export function useProjects() {
  const queryClient = useQueryClient();
  const {
    user,
    selectedProject,
    setSelectedProject,
    isCreateMode,
    setIsCreateMode,
  } = useAppStore();

  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...PROJECTS_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await getProjects(user.id);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Create Mutation with Optimistic Update
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description: string; status: ProjectStatus }) => {
      if (!user) throw new Error("Not authenticated");
      return createProject({ ...payload, user_id: user.id });
    },
    onMutate: async (newProject) => {
      await queryClient.cancelQueries({ queryKey: [...PROJECTS_KEY, user?.id] });
      const previousProjects = queryClient.getQueryData<Project[]>([...PROJECTS_KEY, user?.id]);
      
      const optimisticProject: Project = {
        ...newProject,
        id: `temp-${Date.now()}`,
        user_id: user?.id || "",
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Project[]>([...PROJECTS_KEY, user?.id], (old) => [
        optimisticProject,
        ...(old || []),
      ]);

      return { previousProjects };
    },
    onError: (_err, _newProject, context) => {
      queryClient.setQueryData([...PROJECTS_KEY, user?.id], context?.previousProjects);
    },
    onSuccess: (res) => {
      if (res.data) {
        setSelectedProject(res.data);
        setIsCreateMode(false);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, user?.id] });
    },
  });

  // Update Mutation with Optimistic Update
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Project> }) => 
      updateProject(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: [...PROJECTS_KEY, user?.id] });
      const previousProjects = queryClient.getQueryData<Project[]>([...PROJECTS_KEY, user?.id]);

      queryClient.setQueryData<Project[]>([...PROJECTS_KEY, user?.id], (old) =>
        old?.map((p) => (p.id === id ? { ...p, ...payload } : p))
      );

      return { previousProjects };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData([...PROJECTS_KEY, user?.id], context?.previousProjects);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, user?.id] });
    },
  });

  // Delete Mutation with Optimistic Update
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [...PROJECTS_KEY, user?.id] });
      const previousProjects = queryClient.getQueryData<Project[]>([...PROJECTS_KEY, user?.id]);

      queryClient.setQueryData<Project[]>([...PROJECTS_KEY, user?.id], (old) =>
        old?.filter((p) => p.id !== id)
      );

      return { previousProjects };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData([...PROJECTS_KEY, user?.id], context?.previousProjects);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, user?.id] });
    },
  });

  const handleCreate = async (payload: { name: string; description: string; status: ProjectStatus }) => {
    const res = await createMutation.mutateAsync(payload);
    return res;
  };

  const handleUpdate = async (id: string, payload: Partial<Project>) => {
    const res = await updateMutation.mutateAsync({ id, payload });
    return res;
  };

  const handleDelete = async (id: string) => {
    const res = await deleteMutation.mutateAsync(id);
    return res;
  };

  const handleBulkUpdate = async (ids: string[], payload: Partial<Project>) => {
    // Process in sequence to avoid race conditions on optimistic updates
    for (const id of ids) {
      await handleUpdate(id, payload);
    }
  };

  return {
    projects,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    selectedProject,
    isCreateMode,
    fetchProjects: refetch,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleBulkUpdate,
    setSelectedProject,
    setIsCreateMode,
    user,
  };
}
