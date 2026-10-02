import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mf0f7e657 detection", function () {
  it("should detect the mutant by calling getTokens from a blacklisted address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, get some tokens for addr1 to ensure it's not blacklisted initially
    // and to have a valid distribution flow
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Now blacklist addr1
    // Note: There's no explicit blacklist function, but blacklist[investor] is set to true
    // after getTokens() when toGive > 0. addr1 is now blacklisted from the first call.

    // Attempt to call getTokens again from the blacklisted addr1
    // Original: should revert because blacklist[addr1] == false fails
    // Mutant: should succeed because blacklist[addr1] >= 0 is always true
    await expect(
      instance.connect(addr1).getTokens({ value: ethers.parseEther("1") })
    ).to.be.reverted;

    // If the above doesn't revert, the mutant is alive (blacklist check is bypassed)
  });
});