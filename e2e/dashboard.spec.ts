import { test, expect } from "@playwright/test"

test.describe("ForgeDocs E2E", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1")).toContainText("ForgeDocs")
  })

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/")
    await page.click('text=Sign in')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test("should show dashboard after login", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.locator("h1")).toContainText("Dashboard")
  })
})
