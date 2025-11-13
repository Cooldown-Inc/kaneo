import { Button } from "@/components/ui/button";
import { MODS_ROW_HEIGHT } from "@/constants/mods";
import useGetAvailableMods from "@/hooks/queries/mods/use-get-available-mods";

export default function AvailableModsRow() {
  const { data: mods } = useGetAvailableMods();

  return (
    <div
      className="available-mods-row fixed top-0 left-0 right-0 z-50 flex items-center gap-2 border-b border-border bg-card w-full shrink-0"
      style={{ height: `${MODS_ROW_HEIGHT}px` }}
    >
      {mods && mods.length > 0 ? (
        mods.map((mod) => (
          <Button key={mod.id} variant="outline" size="sm">
            {mod.title}
          </Button>
        ))
      ) : null}
    </div>
  );
}

