import { relations } from "drizzle-orm/relations";
import { jobPosts, jobApplications, generatedContent, jobRecommendations, users, referralCodes, referrals, rewards, jobInteractions, recommendationFeedback } from "./schema";

export const jobApplicationsRelations = relations(jobApplications, ({one}) => ({
	jobPost: one(jobPosts, {
		fields: [jobApplications.jobId],
		references: [jobPosts.id]
	}),
	generatedContent_resumeId: one(generatedContent, {
		fields: [jobApplications.resumeId],
		references: [generatedContent.id],
		relationName: "jobApplications_resumeId_generatedContent_id"
	}),
	generatedContent_coverLetterId: one(generatedContent, {
		fields: [jobApplications.coverLetterId],
		references: [generatedContent.id],
		relationName: "jobApplications_coverLetterId_generatedContent_id"
	}),
}));

export const jobPostsRelations = relations(jobPosts, ({many}) => ({
	jobApplications: many(jobApplications),
	jobRecommendations: many(jobRecommendations),
	generatedContents: many(generatedContent),
	jobInteractions: many(jobInteractions),
	recommendationFeedbacks: many(recommendationFeedback),
}));

export const generatedContentRelations = relations(generatedContent, ({one, many}) => ({
	jobApplications_resumeId: many(jobApplications, {
		relationName: "jobApplications_resumeId_generatedContent_id"
	}),
	jobApplications_coverLetterId: many(jobApplications, {
		relationName: "jobApplications_coverLetterId_generatedContent_id"
	}),
	jobPost: one(jobPosts, {
		fields: [generatedContent.jobId],
		references: [jobPosts.id]
	}),
}));

export const jobRecommendationsRelations = relations(jobRecommendations, ({one}) => ({
	jobPost: one(jobPosts, {
		fields: [jobRecommendations.jobId],
		references: [jobPosts.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	user: one(users, {
		fields: [users.referredBy],
		references: [users.referralCode],
		relationName: "users_referredBy_users_referralCode"
	}),
	users: many(users, {
		relationName: "users_referredBy_users_referralCode"
	}),
	referralCodes: many(referralCodes),
	referrals_referrerId: many(referrals, {
		relationName: "referrals_referrerId_users_id"
	}),
	referrals_refereeId: many(referrals, {
		relationName: "referrals_refereeId_users_id"
	}),
	rewards: many(rewards),
}));

export const referralCodesRelations = relations(referralCodes, ({one}) => ({
	user: one(users, {
		fields: [referralCodes.userId],
		references: [users.id]
	}),
}));

export const referralsRelations = relations(referrals, ({one, many}) => ({
	user_referrerId: one(users, {
		fields: [referrals.referrerId],
		references: [users.id],
		relationName: "referrals_referrerId_users_id"
	}),
	user_refereeId: one(users, {
		fields: [referrals.refereeId],
		references: [users.id],
		relationName: "referrals_refereeId_users_id"
	}),
	rewards: many(rewards),
}));

export const rewardsRelations = relations(rewards, ({one}) => ({
	user: one(users, {
		fields: [rewards.userId],
		references: [users.id]
	}),
	referral: one(referrals, {
		fields: [rewards.referralId],
		references: [referrals.id]
	}),
}));

export const jobInteractionsRelations = relations(jobInteractions, ({one}) => ({
	jobPost: one(jobPosts, {
		fields: [jobInteractions.jobId],
		references: [jobPosts.id]
	}),
}));

export const recommendationFeedbackRelations = relations(recommendationFeedback, ({one}) => ({
	jobPost: one(jobPosts, {
		fields: [recommendationFeedback.jobId],
		references: [jobPosts.id]
	}),
}));