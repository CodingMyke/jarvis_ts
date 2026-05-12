import { ReelBoardTemplate } from "@/app/design/templates/academy/ReelBoardTemplate";
import { getAuthContext } from "@/app/_server";
import { EMPTY_REEL_BOARD, getServerReelBoard } from "@/app/_features/academy";

export default async function AcademyReelsPage() {
  const auth = await getAuthContext();

  if (!auth) {
    return <ReelBoardTemplate initialBoard={EMPTY_REEL_BOARD} />;
  }

  const boardResult = await getServerReelBoard(auth.supabase, auth.userId);

  return (
    <ReelBoardTemplate initialBoard={boardResult.success ? boardResult.board : EMPTY_REEL_BOARD} />
  );
}
