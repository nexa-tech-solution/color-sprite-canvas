import { createFileRoute } from "@tanstack/react-router";
import { ProjectsHome } from "@/components/ProjectsHome";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { open?: "page-picker"; _push?: string } => ({
    open: search.open === "page-picker" ? "page-picker" : undefined,
    _push: typeof search._push === "string" ? search._push : undefined,
  }),
  component: ProjectsHome,
});
