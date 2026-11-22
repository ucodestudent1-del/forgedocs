import { test, expect } from "@playwright/test"

test.describe("Visual regression tests", () => {
  test("homepage renders correctly", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveScreenshot("homepage.png", { fullPage: true })
  })

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/auth/login")
    await expect(page).toHaveScreenshot("login.png", { fullPage: true })
  })

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/auth/signup")
    await expect(page).toHaveScreenshot("signup.png", { fullPage: true })
  })

  test("pricing page renders correctly", async ({ page }) => {
    await page.goto("/pricing")
    await expect(page).toHaveScreenshot("pricing.png", { fullPage: true })
  })

  test("dashboard page renders correctly", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveScreenshot("dashboard.png", { fullPage: true })
  })

  test("billing page renders correctly", async ({ page }) => {
    await page.goto("/billing")
    await expect(page).toHaveScreenshot("billing.png", { fullPage: true })
  })

  test("editor page renders correctly", async ({ page }) => {
    await page.goto("/editor")
    await expect(page).toHaveScreenshot("editor.png", { fullPage: true })
  })

  test("mobile homepage renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/")
    await expect(page).toHaveScreenshot("mobile-homepage.png", { fullPage: true })
  })

  test("mobile dashboard renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/dashboard")
    await expect(page).toHaveScreenshot("mobile-dashboard.png", { fullPage: true })
  })
})
