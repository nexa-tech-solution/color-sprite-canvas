import { createFileRoute } from "@tanstack/react-router";
import { ProjectsHome } from "@/components/ProjectsHome";

export const Route = createFileRoute("/")({
  component: ProjectsHome,
});
