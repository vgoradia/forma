import { describe, expect, it } from "vitest";
import {
  AMAZON_ASSOCIATE_DISCLOSURE,
  CONTACT_EMAIL,
  FOOTER_AFFILIATE_DISCLOSURE,
  GOVERNING_LAW,
  INLINE_AFFILIATE_DISCLOSURE,
  OPERATOR_NAME,
} from "./legal";

describe("legal copy", () => {
  it("keeps the Amazon Associates sentence exact", () => {
    expect(AMAZON_ASSOCIATE_DISCLOSURE).toBe(
      "As an Amazon Associate I earn from qualifying purchases."
    );
    expect(FOOTER_AFFILIATE_DISCLOSURE).toContain(AMAZON_ASSOCIATE_DISCLOSURE);
    expect(FOOTER_AFFILIATE_DISCLOSURE.startsWith("Forma may earn a commission")).toBe(true);
  });

  it("keeps the inline disclosure next to buy links", () => {
    expect(INLINE_AFFILIATE_DISCLOSURE).toBe(
      "We may earn a commission from these links. It doesn't change your price."
    );
  });

  it("names an operator, a governing law, and a contact address", () => {
    expect(OPERATOR_NAME).toBe("Veer Goradia");
    expect(GOVERNING_LAW.length).toBeGreaterThan(0);
    expect(CONTACT_EMAIL).toBe("contact@shopwithforma.com");
  });
});
