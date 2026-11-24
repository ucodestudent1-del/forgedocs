import { randomBytes } from "crypto"
import { DOMParser } from "xmldom"

export interface SamlProviderConfig {
  id: string
  entityId: string
  ssoUrl: string
  x509Certificate: string
  nameIdFormat?: string
  attributeMapping?: Record<string, string>
}

export interface SamlAuthRequestOptions {
  provider: SamlProviderConfig
  relayState: string
  acsUrl: string
}

export interface SamlResponse {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  nameId: string
  sessionIndex?: string
}

/**
 * Generate a SAML AuthnRequest (SP-initiated login).
 * Returns the URL-encoded request and the relay state.
 */
export function generateSamlAuthnRequest(options: SamlAuthRequestOptions): {
  requestUrl: string
  relayState: string
} {
  const { provider, relayState, acsUrl } = options
  const requestId = "_" + randomBytes(20).toString("hex")
  const issueInstant = new Date().toISOString()

  const requestXml = `
<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${provider.ssoUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
  AssertionConsumerServiceURL="${acsUrl}">
  <saml:Issuer>${acsUrl.replace(/\/+$/, "")}</saml:Issuer>
  <samlp:NameIDPolicy
    Format="${provider.nameIdFormat ?? "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"}"
    AllowCreate="true"/>
</samlp:AuthnRequest>`.trim()

  const zlib = require("zlib")
  const raw = zlib.deflateRawSync(Buffer.from(requestXml, "utf8"))
  const encodedRequest = raw.toString("base64")

  const params = new URLSearchParams()
  params.set("SAMLRequest", encodedRequest)
  params.set("RelayState", relayState)

  const requestUrl = `${provider.ssoUrl}?${params.toString()}`

  return { requestUrl, relayState }
}

/**
 * Extract text content from the first matching descendant element.
 */
function getTextContent(node: any, localName: string): string | null {
  const matches: any[] = (node as any).getElementsByTagName ? (node as any).getElementsByTagName(localName) : []
  if (matches.length === 0) return null
  const textNodes: string[] = []
  const collect = (n: any) => {
    for (let i = 0; i < n.childNodes.length; i++) {
      const c = n.childNodes[i]
      if (c.nodeType === 3) textNodes.push(c.nodeValue || "")
      else collect(c)
    }
  }
  collect(matches[0])
  return textNodes.join("") || null
}

/**
 * Parse and validate a SAML Response (IdP-initiated or SP-initiated ACS).
 * Validates structure and extracts user attributes.
 */
export function parseSamlResponse(
  samlResponseBase64: string,
  provider: SamlProviderConfig,
  expectedRelayState?: string
): SamlResponse {
  const xmlStr = Buffer.from(samlResponseBase64, "base64").toString("utf8")
  const doc = new DOMParser().parseFromString(xmlStr)

  const assertions: any[] = Array.from(
    doc.getElementsByTagNameNS("urn:oasis:names:tc:SAML:2.0:assertion", "Assertion")
  )
  if (assertions.length === 0) {
    throw new Error("No SAML Assertion found in response")
  }

  const assertion = assertions[0]

  // Extract NameID
  const nameId = getTextContent(assertion, "NameID") || ""

  // Extract AttributeStatement values
  const attributeStatements = assertion.getElementsByTagNameNS("urn:oasis:names:tc:SAML:2.0:assertion", "AttributeStatement")
  const attributes: Record<string, string> = {}
  if (attributeStatements.length > 0) {
    const attrs = attributeStatements[0].getElementsByTagNameNS("urn:oasis:names:tc:SAML:2.0:assertion", "Attribute")
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i]
      const name = attr.getAttribute("Name")
      const values = attr.getElementsByTagNameNS("urn:oasis:names:tc:SAML:2.0:assertion", "AttributeValue")
      if (name && values.length > 0) {
        attributes[name] = (values[0] as any).textContent || ""
      }
    }
  }

  const mapping = provider.attributeMapping ?? { email: "email", firstName: "first_name", lastName: "last_name" }

  const email =
    attributes[mapping.email] ||
    attributes["email"] ||
    attributes["mail"] ||
    nameId ||
    ""

  const firstName = attributes[mapping.firstName] || attributes["first_name"] || attributes["givenName"]
  const lastName = attributes[mapping.lastName] || attributes["last_name"] || attributes["sn"]

  // Verify relay state if expected
  if (expectedRelayState) {
    const relayStates = doc.getElementsByTagNameNS("urn:oasis:names:tc:SAML:2.0:protocol", "RelayState")
    const relayState = relayStates.length > 0 ? (relayStates[0] as any).textContent : ""
    if (relayState !== expectedRelayState) {
      throw new Error("SAML RelayState mismatch")
    }
  }

  // Check conditions (NotBefore/NotOnOrAfter)
  const conditions = assertion.getElementsByTagNameNS("urn:oasis:names:tc:SAML:2.0:assertion", "Conditions")
  if (conditions.length > 0) {
    const cond = conditions[0]
    const notBefore = cond.getAttribute("NotBefore")
    const notOnOrAfter = cond.getAttribute("NotOnOrAfter")
    const now = new Date()
    if (notBefore && new Date(notBefore) > now) {
      throw new Error("SAML assertion not yet valid")
    }
    if (notOnOrAfter && new Date(notOnOrAfter) < now) {
      throw new Error("SAML assertion expired")
    }
  }

  return {
    userId: email,
    email,
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    nameId,
  }
}

export function generateRelayState(): string {
  return randomBytes(16).toString("hex")
}
