import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Badge } from "@flowconsole/ui/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flowconsole/ui/components/ui/card";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  modelCount?: number;
  className?: string;
}

export function ProjectCard({
  project,
  modelCount,
  className,
}: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className={cn("block", className)}
      data-testid={`project-card-${project.id}`}
    >
      <Card className="h-full transition-colors hover:border-foreground/20 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="truncate text-base">{project.name}</CardTitle>
            {modelCount !== undefined && (
              <Badge variant="secondary">
                {modelCount} {modelCount === 1 ? "model" : "models"}
              </Badge>
            )}
          </div>
          {project.description && (
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    </Link>
  );
}
