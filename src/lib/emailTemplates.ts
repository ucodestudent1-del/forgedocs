import { getBaseTemplate, getButtonHtml, getCodeHtml } from "@/lib/email"

export function getWelcomeEmailHtml(userName: string, loginUrl: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Welcome to ForgeDocs, ${userName}!</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Your account has been created successfully. You're now ready to start managing documents, generating templates, and converting files.</p>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Here's what you can do next:</p>
    <ul style="margin: 0 0 24px; padding-left: 20px; color: #4b5563; font-size: 16px;">
      <li style="margin-bottom: 8px;">Create your first document from our professional templates</li>
      <li style="margin-bottom: 8px;">Convert files between 50+ formats</li>
      <li style="margin-bottom: 8px;">Collaborate with your team in real-time</li>
    </ul>
    ${getButtonHtml(loginUrl, "Get Started", "primary")}
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
  `
  return getBaseTemplate(content, "Welcome to ForgeDocs - Your account is ready")
}

export function getEmailVerificationHtml(userName: string, verificationUrl: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Verify your email address</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, please verify your email address to activate your ForgeDocs account.</p>
    ${getButtonHtml(verificationUrl, "Verify Email Address", "primary")}
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px;">This link expires in 24 hours. If you didn't request this, please ignore this email.</p>
  `
  return getBaseTemplate(content, "Verify your ForgeDocs account")
}

export function getPasswordResetHtml(userName: string, resetUrl: string, expiresInMinutes: number): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Reset your password</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, we received a request to reset your ForgeDocs password.</p>
    ${getButtonHtml(resetUrl, "Reset Password", "primary")}
    <p style="margin: 16px 0 0; color: #4b5563; font-size: 16px;">Or copy this link into your browser:</p>
    <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; word-break: break-all;">${resetUrl}</p>
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px;">This link expires in ${expiresInMinutes} minutes. If you didn't request this, please ignore this email.</p>
  `
  return getBaseTemplate(content, "Reset your ForgeDocs password")
}

export function getPasswordChangedHtml(userName: string, loginUrl: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Your password has been changed</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, your ForgeDocs password was successfully updated.</p>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">If you didn't make this change, please contact support immediately.</p>
    ${getButtonHtml(loginUrl, "Sign in to ForgeDocs", "primary")}
  `
  return getBaseTemplate(content, "Your ForgeDocs password was changed")
}

export function getBillingReceiptHtml(
  userName: string,
  planName: string,
  amount: string,
  billingPeriod: string,
  receiptUrl: string
): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Payment receipt</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, thank you for your payment!</p>
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan</td>
          <td style="padding: 8px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">${planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount</td>
          <td style="padding: 8px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">${amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Period</td>
          <td style="padding: 8px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">${billingPeriod}</td>
        </tr>
      </table>
    </div>
    ${getButtonHtml(receiptUrl, "View Receipt", "secondary")}
  `
  return getBaseTemplate(content, "Your ForgeDocs payment receipt")
}

export function getPaymentFailedHtml(userName: string, billingPortalUrl: string, retryDate: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Payment failed</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, we were unable to process your subscription payment.</p>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Please update your payment method to avoid service interruption. We'll retry on ${retryDate}.</p>
    ${getButtonHtml(billingPortalUrl, "Update Payment Method", "primary")}
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px;">Your subscription will remain active during the grace period.</p>
  `
  return getBaseTemplate(content, "Action required: Update payment method")
}

export function getTrialEndingHtml(userName: string, trialEndDate: string, billingPortalUrl: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Your trial ends soon</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, your ForgeDocs trial ends on ${trialEndDate}.</p>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Choose a plan to continue using all features without interruption.</p>
    ${getButtonHtml(billingPortalUrl, "Select a Plan", "primary")}
  `
  return getBaseTemplate(content, "Your ForgeDocs trial is ending")
}

export function getSubscriptionCanceledHtml(userName: string, endDate: string, billingPortalUrl: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Subscription canceled</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, your ForgeDocs subscription has been canceled.</p>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">You'll continue to have access until ${endDate}. After that, your account will revert to the Free plan.</p>
    ${getButtonHtml(billingPortalUrl, "Reactivate Subscription", "primary")}
  `
  return getBaseTemplate(content, "Your ForgeDocs subscription was canceled")
}

export function getSecurityAlertHtml(userName: string, activity: string, ip: string, location: string, time: string, securityUrl: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Security alert</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, we detected a new sign-in to your ForgeDocs account:</p>
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Activity</td><td style="padding: 8px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">${activity}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Location</td><td style="padding: 8px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">${location}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">IP Address</td><td style="padding: 8px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">${ip}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td><td style="padding: 8px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">${time}</td></tr>
      </table>
    </div>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">If this was you, no action needed. If not, please secure your account immediately.</p>
    ${getButtonHtml(securityUrl, "Review Account Security", "primary")}
  `
  return getBaseTemplate(content, "New sign-in to your ForgeDocs account")
}

export function getUsageLimitHtml(userName: string, metric: string, limit: number, current: number, billingPortalUrl: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px;">Usage limit reached</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Hi ${userName}, you've reached your ${metric} limit (${current}/${limit}).</p>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">Upgrade your plan to increase your limits and continue working without interruption.</p>
    ${getButtonHtml(billingPortalUrl, "Upgrade Plan", "primary")}
  `
  return getBaseTemplate(content, "ForgeDocs usage limit reached")
}