import fs from "node:fs";
import path from "node:path";

describe("firestore account self-service rules", () => {
  const rules = fs.readFileSync(path.join(process.cwd(), "firestore.rules"), "utf8");

  it("allows self read/create/update for accounts and blocks broad fallback access", () => {
    expect(rules).toContain("match /accounts/{uid}");
    expect(rules).toContain("allow read: if isOwner(uid);");
    expect(rules).toContain("allow create: if isOwner(uid)");
    expect(rules).toContain("allow update: if isOwner(uid)");
    expect(rules).toContain("match /{document=**} {");
    expect(rules).toContain("allow read, write: if false;");
  });

  it("restricts account updates to allowed keys and keeps createdAt immutable", () => {
    expect(rules).toContain("request.resource.data.keys().hasOnly(accountAllowedKeys())");
    expect(rules).toContain("request.resource.data.diff(resource.data).affectedKeys().hasOnly(accountAllowedKeys())");
    expect(rules).toContain("request.resource.data.createdAt == resource.data.createdAt");
  });
});
