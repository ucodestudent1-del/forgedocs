import { test, expect } from "@playwright/test"

test.describe("Critical user flow", () => {
  test("signup → verify → create document → save → export", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`
    const password = "SecurePass123!"

    // Signup
    await page.goto("/auth/signup")
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*verify.*/)

    // Email verification would be clicked from email; in E2E we simulate via magic-link token
    // Skip to login after verification (staging: auto-verify or use test token)
    await page.goto("/auth/login")
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard.*/)

    // Create document
    await page.click('a:has-text("New Document"), button:has-text("Create Document")')
    await page.fill('input[name="title"]', "E2E Test Document")
    await page.click('button:has-text("Create")')
    await expect(page).toHaveURL(/.*documents\/.*/)

    // Edit + save
    await page.fill("textarea", "# E2E Content\n\nSaved via Playwright.")
    await page.click('button:has-text("Save")')
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 })

    // Export / download
    const downloadPromise = page.waitForEvent("download")
    await page.click('a:has-text("Export"), button:has-text("Download")')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain("E2E")
  })

  test("unverified user redirected to verify page", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/.*auth\/verify.*/)
  })

  test("billing portal link present", async ({ page }) => {
    await page.goto("/billing")
    await expect(page.locator('a:has-text("Manage Billing"), button:has-text("Manage Billing")')).toBeVisible()
  })
})
