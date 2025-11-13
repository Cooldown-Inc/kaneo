import { useQuery } from "@tanstack/react-query";
import getAvailableMods from "@/fetchers/mods/get-available-mods";

function useGetAvailableMods() {
  return useQuery({
    queryFn: () => getAvailableMods(),
    queryKey: ["mods", "available"],
  });
}

export default useGetAvailableMods;

