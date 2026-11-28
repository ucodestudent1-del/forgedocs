import { test, expect } from "@playwright/test"

test.describe("Visual regression tests", () => {
  test("Landing page - full page screenshot", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("landing-page.png", {
      fullPage: true,
      animations: "disabled",
    })
  })

  test("Landing page - hero section", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const hero = page.locator("section").first()
    await expect(hero).toHaveScreenshot("hero-section.png", {
      animations: "disabled",
    })
  })

  test("Pricing page", async ({ page }) => {
    await page.goto("/pricing")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("pricing-page.png", {
      fullPage: true,
      animations: "disabled",
    })
  })

  test("Login page", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("login-page.png", {
      fullPage: true,
      animations: "disabled",
    })
  })

  test("Signup page", async ({ page }) => {
    await page.goto("/signup")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("signup-page.png", {
      fullPage: true,
      animations: "disabled",
    })
  })

  test("Features page", async ({ page }) => {
    await page.goto("/features")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("features-page.png", {
      fullPage: true,
      animations: "disabled",
    })
  })

  test("Dashboard page (unauthenticated - should redirect)", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
    await expect(page).toHaveScreenshot("dashboard-redirect.png", {
      fullPage: true,
      animations: "disabled",
    })
  })
})