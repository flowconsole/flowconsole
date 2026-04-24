
import { Badge } from "@flowconsole/ui/components/ui/badge";
import type { ProjectMember, MemberRole } from "@/lib/api/view-models";

interface ProjectMembersListProps {
  members: ProjectMember[];
}

const roleVariant: Record<MemberRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  editor: "secondary",
  viewer: "outline",
};

export function ProjectMembersList({ members }: ProjectMembersListProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No members yet.</p>
    );
  }
  return (
    <div className="divide-y rounded-lg border">
      {members.map((m) => (
        <div
          key={m.userId}
          className="flex items-center justify-between px-4 py-3"
          data-testid={`member-row-${m.userId}`}
        >
          <div>
            <div className="text-sm font-medium">{m.userName ?? m.email}</div>
            {m.userName && (
              <div className="text-xs text-muted-foreground">{m.email}</div>
            )}
          </div>
          <Badge variant={roleVariant[m.role]} className="text-[11px]">
            {m.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}
