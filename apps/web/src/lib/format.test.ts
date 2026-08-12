import { describe, expect, it } from "vitest";

import { truncateAddress } from "./format";

describe("truncateAddress", () => {
  it("keeps the 0x prefix and the last 4 characters of a real address", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";

    expect(truncateAddress(address)).toBe("0x1234…5678");
  });

  it("does not lose the checksum casing of the tail", () => {
    const address = "0xAbCdEf0123456789AbCdEf0123456789AbCdEfAB";

    expect(truncateAddress(address)).toBe("0xAbCd…EfAB");
  });

  it("repeats characters when the input is shorter than 10 chars", () => {
    // Documents current behaviour rather than endorsing it: head and tail
    // overlap, so "0x1234" renders as if it were a full address.
    expect(truncateAddress("0x1234")).toBe("0x1234…1234");
  });
});
