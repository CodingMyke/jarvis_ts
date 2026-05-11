import { ReelBoardTemplate } from "@/app/design/templates/academy/ReelBoardTemplate";
import { createEmptyReelBoard } from "@/app/design/templates/academy/useReelBoardWorkspace";

export default function AcademyReelsPage() {
  return <ReelBoardTemplate initialBoard={createEmptyReelBoard()} />;
}
