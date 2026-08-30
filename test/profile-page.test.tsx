import { LanguageProvider, setLanguage } from "@stats-viz/shared/i18n";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ProfilePage } from "../src/profile/ProfilePage";

describe("personal learning page", () => {
	beforeEach(() => {
		localStorage.clear();
		setLanguage("zh");
	});

	it("connects all five learning spaces without inventing saved progress", () => {
		render(
			<LanguageProvider>
				<ProfilePage />
			</LanguageProvider>,
		);

		expect(
			screen.getByRole("heading", { name: "我的学习档案" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /从教材开始/ })).toHaveAttribute(
			"href",
			"/catalog",
		);

		const expectedLinks = [
			["教材", "/catalog"],
			["模拟实验", "/teaching-platform"],
			["组卷", "/st-qselector"],
			["R", "/r-learning?returnTo=%2Fprofile"],
			["Python", "/python-learning?returnTo=%2Fprofile"],
		] as const;
		const spaces = screen
			.getByRole("heading", {
				name: "五个板块，同一条学习路径",
			})
			.closest("section");
		expect(spaces).not.toBeNull();

		for (const [name, href] of expectedLinks) {
			expect(
				within(spaces as HTMLElement).getByRole("link", {
					name: new RegExp(`^${name}`),
				}),
			).toHaveAttribute("href", href);
		}
		expect(screen.getAllByText("尚未保存进度")).toHaveLength(1);
	});

	it("shows real saved code progress and resumes the last safe route", () => {
		localStorage.setItem(
			"statmind-learning-progress-v1",
			JSON.stringify({
				version: 1,
				completedTopics: ["descriptive-statistics"],
				completedActivities: ["sampling-lab"],
				completedRLessons: ["vectors-and-mean", "data-frame-filter"],
				completedPythonLessons: ["lists-and-mean"],
				lastVisitedRoute: "/r-learning?lessonId=data-frame-filter",
			}),
		);

		render(
			<LanguageProvider>
				<ProfilePage />
			</LanguageProvider>,
		);

		expect(
			screen.getByRole("link", { name: /继续 R 编程练习/ }),
		).toHaveAttribute("href", "/r-learning?lessonId=data-frame-filter");
		expect(screen.getByText("2 / 39 已完成")).toBeInTheDocument();
		expect(screen.getByText("1 / 43 已完成")).toBeInTheDocument();
	});
});
