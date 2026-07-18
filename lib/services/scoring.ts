export function calculatePickPoints(input: {
  pickedFighterId: number;
  winnerFighterId: number | null;
  resultType: string | null;
  endingRound: number | null;
  scheduledRounds: number;
}): number {
  if (
    !input.winnerFighterId ||
    input.pickedFighterId !== input.winnerFighterId
  ) {
    return 0;
  }

  let points = 3;

  const wasFinish =
    input.resultType === "ko_tko" ||
    input.resultType === "submission";

  if (wasFinish && input.endingRound) {
    points += Math.max(
      input.scheduledRounds - input.endingRound + 1,
      0
    );
  }

  return points;
}