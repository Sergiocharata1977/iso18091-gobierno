export const ISO9001_NORM_POINTS = [];
export function getNormPointsStats() {
  return {
    total: 0,
    mandatory: 0,
    optional: 0,
    byChapter: [],
    byCategory: [],
    byPriority: { alta: 0, media: 0, baja: 0 },
  };
}
