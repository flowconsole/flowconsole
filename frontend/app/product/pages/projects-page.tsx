import { useState } from "react";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flowconsole/ui/components/ui/dialog";
import { Input } from "@flowconsole/ui/components/ui/input";
import { Label } from "@flowconsole/ui/components/ui/label";
import { Textarea } from "@flowconsole/ui/components/ui/textarea";
import { useTranslation } from "react-i18next";

import { toApiError } from "@/lib/api/rtk/errors";
import {
  useCreateProjectMutation,
  useListProjectsQuery,
  type ProjectResponse,
} from "@/lib/api/rtk/projects-models-api";
import { ApiErrorMessage } from "@/components/api-error-message";
import { DashboardHeader } from "@/components/dashboard/header";
import { ProjectCard } from "@/components/project/project-card";
import { ProjectListSkeleton } from "@/components/project/project-list-skeleton";

function ProjectsGrid({ projects }: { projects: ProjectResponse[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function NoProjectsPlaceholder({
  onCreateClick,
}: {
  onCreateClick: () => void;
}) {
  const { t } = useTranslation("projects");
  return (
    <EmptyPlaceholder>
      <EmptyPlaceholder.Icon name="projects" />
      <EmptyPlaceholder.Title>{t("noProjectsTitle")}</EmptyPlaceholder.Title>
      <EmptyPlaceholder.Description>
        {t("noProjectsDescription")}
      </EmptyPlaceholder.Description>
      <Button size="sm" onClick={onCreateClick}>
        {t("createProject")}
      </Button>
    </EmptyPlaceholder>
  );
}

export function ProjectsPage() {
  const { t } = useTranslation("projects");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    data: projectsPage,
    error,
    isLoading,
    refetch,
  } = useListProjectsQuery({});
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();

  const projects = projectsPage?.data ?? [];
  const state = isLoading
    ? "loading"
    : error
      ? "error"
      : projects.length === 0
        ? "empty"
        : "data";

  const openDialog = () => {
    setName("");
    setDescription("");
    setCreateError(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setCreateError("Name is required");
      return;
    }
    setCreateError(null);
    try {
      await createProject({
        createProjectRequest: {
          name: name.trim(),
          description: description.trim() || null,
          defaultMetaSchemaId: null,
        },
      }).unwrap();
      setDialogOpen(false);
    } catch (err: unknown) {
      const resolvedError = toApiError(err);
      setCreateError(
        resolvedError instanceof Error
          ? resolvedError.message
          : "Failed to create project",
      );
    }
  };

  return (
    <>
      <DashboardHeader heading={t("heading")}>
        <Button size="sm" data-testid="new-project-btn" onClick={openDialog}>
          {t("newProject")}
        </Button>
      </DashboardHeader>

      <div className="mt-4">
        {state === "loading" && <ProjectListSkeleton />}
        {state === "empty" && (
          <NoProjectsPlaceholder onCreateClick={openDialog} />
        )}
        {state === "data" && <ProjectsGrid projects={projects} />}
        {state === "error" && (
          <ApiErrorMessage error={toApiError(error)} onRetry={refetch} />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Architecture"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-desc">Description</Label>
              <Textarea
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
