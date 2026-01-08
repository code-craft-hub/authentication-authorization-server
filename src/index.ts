import { setupJobRecommendationApp } from "./app";

if (require.main === module) {
  const app = setupJobRecommendationApp();
  const PORT = process.env.PORT || 3400;

  app.listen(PORT, () => {
    console.log(`Job Recommendation Engine running on port ${PORT}`);
    console.log(`Algorithm: Multi-strategy hybrid matching v2.0`);
    console.log(
      `Features: FTS, trigram similarity, skill matching, recency boost`
    );
  });
}
