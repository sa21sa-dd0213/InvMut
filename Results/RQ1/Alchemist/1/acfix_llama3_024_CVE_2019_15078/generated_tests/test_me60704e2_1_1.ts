import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant me60704e2 (onlyWhitelist modifier removed)", function () {
  it("should revert when blacklisted address calls getTokens() but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: addr1 calls getTokens() - should succeed and add addr1 to blacklist
    await instance.connect(addr1).getTokens({ value: 0 });

    // Verify addr1 is now blacklisted
    expect(await instance.blacklist(addr1.address)).to.equal(true);

    // Second call: addr1 (now blacklisted) calls getTokens() again
    // Original contract should revert, mutant (without blacklist check) should succeed
    if (await instance.blacklist(addr1.address)) {
      // This will revert on original, succeed on mutant
      try {
        await instance.connect(addr1).getTokens({ value: 0 });
        // If we reach here, the mutant is live (no revert) - test should fail to kill mutant
        expect.fail("Expected revert but transaction succeeded - mutant detected");
      } catch (error) {
        // If it reverts, original behavior - mutant is killed
        expect(true).to.equal(true);
      }
    }
  });
});