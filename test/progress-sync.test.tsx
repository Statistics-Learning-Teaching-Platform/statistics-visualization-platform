import { render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "../src/profile/ProfilePage";
import { resetPortalSessionCache } from "../src/auth/session";
import {
	loadLearningProgress,
	mergeLearningProgress,
	saveLearningProgress,
	type LearningProgress,
} from "../src/course/progressStore";
import {
	bootstrapProgressSync,
	resetProgressSyncForTests,
	syncLearningProgress,
} from "../src/course/progressSync";

const PROGRESS_KEY = "statmind-learning-progress-v1";

const serverProgress: LearningProgress = {
	version: 1,
	completedTopics: ["descriptive-statistics"],
	completedActivities: [],
	completedRLessons: ["vectors-and-mean"],
	completedPythonLessons: [],
	lastVisitedRoute: "/r-learning?lessonId=vectors-and-mean",
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function mockAuthenticatedFetch(handler: (url: string, init?: RequestInit) => Response) {
	return vi.spyOn(globalThis, "fetch").mockImplementation(
		async (input: RequestInfo | URL, init?: RequestInit) =>
			handler(String(input), init ?? {}),
	);
}

beforeEach(() => {
	localStorage.clear();
	document.cookie = "stat_csrf=test-csrf-token; path=/";
	resetPortalSessionCache();
	resetProgressSyncForTests();
});

afterEach(() => {
	vi.restoreAllMocks();
	resetProgressSyncForTests();
});

describe("learning progress sync", () => {
	it("merges completed sets and keeps the incoming route", () => {
		const local: LearningProgress = {
			version: 1,
			completedTopics: ["probability"],
			completedActivities: ["sampling-lab"],
			completedRLessons: ["data-frame-filter"],
			completedPythonLessons: ["lists-and-mean"],
			lastVisitedRoute: "/python-learning",
		};
		const merged = mergeLearningProgress(serverProgress, local);
		expect([...merged.completedTopics].sort()).toEqual([
			"descriptive-statistics",
			"probability",
		]);
		expect(merged.completedRLessons).toEqual(["vectors-and-mean", "data-frame-filter"]);
		expect(merged.lastVisitedRoute).toBe("/python-learning");
	});

	it("does not contact the server while anonymous", async () => {
		const fetchMock = mockAuthenticatedFetch(() => jsonResponse({ user: null }, 401));
		localStorage.setItem(
			PROGRESS_KEY,
			JSON.stringify({
				version: 1,
				completedTopics: ["descriptive-statistics"],
				completedActivities: [],
				completedRLessons: [],
				completedPythonLessons: [],
				lastVisitedRoute: "/teaching-platform",
			}),
		);

		await syncLearningProgress();

		const learningCalls = fetchMock.mock.calls.filter(([url]) =>
			String(url).includes("/api/learning/progress"),
		);
		expect(learningCalls).toEqual([]);
		expect(loadLearningProgress().completedTopics).toEqual(["descriptive-statistics"]);
	});

	it("unions server progress with local progress and pushes the difference", async () => {
		const local: LearningProgress = {
			version: 1,
			completedTopics: [],
			completedActivities: [],
			completedRLessons: ["data-frame-filter"],
			completedPythonLessons: [],
			lastVisitedRoute: "/r-learning",
		};
		localStorage.setItem(PROGRESS_KEY, JSON.stringify(local));

		const putBodies: unknown[] = [];
		const fetchMock = mockAuthenticatedFetch((url, init) => {
			if (url.includes("/api/auth/me")) {
				return jsonResponse({ user: { username: "student01", role: "student" } });
			}
			if (url.includes("/api/learning/progress") && init?.method === "PUT") {
				putBodies.push(JSON.parse(String(init.body)));
				return jsonResponse({ progress: null, revision: 2, merged: false });
			}
			return jsonResponse({ progress: serverProgress, revision: 1 });
		});

		await syncLearningProgress();

		const stored = loadLearningProgress();
		expect([...stored.completedRLessons].sort()).toEqual([
			"data-frame-filter",
			"vectors-and-mean",
		]);
		expect(stored.completedTopics).toEqual(["descriptive-statistics"]);
		await waitFor(() => expect(putBodies).toHaveLength(1));
		expect(putBodies[0]).toMatchObject({ revision: 1 });
		fetchMock.mockRestore();
	});

	it("uploads first-run local progress once the account exists", async () => {
		const putBodies: unknown[] = [];
		const fetchMock = mockAuthenticatedFetch((url, init) => {
			if (url.includes("/api/auth/me")) {
				return jsonResponse({ user: { username: "student01", role: "student" } });
			}
			if (init?.method === "PUT") {
				putBodies.push(JSON.parse(String(init.body)));
				return jsonResponse({ progress: null, revision: 1, merged: false });
			}
			return jsonResponse({ progress: null, revision: 0 });
		});
		saveLearningProgress({
			version: 1,
			completedTopics: ["descriptive-statistics"],
			completedActivities: [],
			completedRLessons: ["vectors-and-mean"],
			completedPythonLessons: [],
			lastVisitedRoute: "/r-learning",
		});

		await syncLearningProgress();

		await waitFor(() => expect(putBodies).toHaveLength(1));
		const body = putBodies[0] as { progress: LearningProgress };
		expect(body.progress.completedRLessons).toEqual(["vectors-and-mean"]);
		fetchMock.mockRestore();
	});

	it("fans localStorage saves out to the account store after bootstrap", async () => {
		const putBodies: unknown[] = [];
		mockAuthenticatedFetch((url, init) => {
			if (url.includes("/api/auth/me")) {
				return jsonResponse({ user: { username: "student01", role: "student" } });
			}
			if (url.includes("/api/learning/progress") && !init?.method) {
				return jsonResponse({ progress: null, revision: 0 });
			}
			if (init?.method === "PUT") {
				putBodies.push(JSON.parse(String(init.body)));
				return jsonResponse({ progress: null, revision: 5, merged: false });
			}
			return jsonResponse({ progress: null, revision: 0 });
		});
		bootstrapProgressSync();

		saveLearningProgress({
			version: 1,
			completedTopics: [],
			completedActivities: [],
			completedRLessons: ["vectors-and-mean"],
			completedPythonLessons: [],
			lastVisitedRoute: "/r-learning",
		});

		await waitFor(() => expect(putBodies.length).toBeGreaterThanOrEqual(1));
		const request = putBodies.at(-1) as {
			progress: LearningProgress;
			revision: number;
		};
		expect(request.progress.completedRLessons).toEqual(["vectors-and-mean"]);
	});

	it("shows account-synced evidence on the profile page", async () => {
		mockAuthenticatedFetch((url) => {
			if (url.includes("/api/auth/me")) {
				return jsonResponse({ user: { username: "student01", role: "student" } });
			}
			return jsonResponse({ progress: serverProgress, revision: 3 });
		});

		render(
			<LanguageProvider>
				<ProfilePage />
			</LanguageProvider>,
		);

		await waitFor(() => expect(screen.getByText("student01")).toBeInTheDocument());
		expect(screen.getByText("学习进度已与账号同步")).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByText("1 / 39 已完成")).toBeInTheDocument(),
		);
		expect(localStorage.getItem(PROGRESS_KEY)).toContain("vectors-and-mean");
	});
});
