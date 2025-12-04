import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import InviteTeamMemberModal from "@/components/team/invite-team-member-modal";
import MembersTable from "@/components/team/members-table";
import { Button } from "@/components/ui/button";
import useGetConfig from "@/hooks/queries/config/use-get-config";
import useGetFullWorkspace from "@/hooks/queries/workspace/use-get-full-workspace";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/members",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const { data: workspace } = useGetFullWorkspace({ workspaceId });
  const { data: config } = useGetConfig();

  const [isInviteTeamMemberModalOpen, setIsInviteTeamMemberModalOpen] =
    useState(false);

  const users = workspace?.members;
  const userInvitations = workspace?.invitations;

  const handleInviteClick = () => {
    if (!config?.hasSmtp) {
      toast.error("Member invitations are disabled", {
        description:
          "Email invitations are not configured for this instance. Please contact your administrator to enable SMTP.",
      });
      return;
    }
    setIsInviteTeamMemberModalOpen(true);
  };

  return (
    <>
      <PageTitle title="Members" />
      <WorkspaceLayout
        title="Members"
        headerActions={
          <Button
            onClick={handleInviteClick}
            variant="outline"
            size="xs"
            className="gap-1 w-full md:w-auto"
          >
            <UserPlus className="w-3 h-3" />
            Invite member
          </Button>
        }
      >
        <MembersTable users={users ?? []} invitations={userInvitations ?? []} />

        <InviteTeamMemberModal
          open={isInviteTeamMemberModalOpen}
          onClose={() => setIsInviteTeamMemberModalOpen(false)}
        />
      </WorkspaceLayout>
    </>
  );
}
