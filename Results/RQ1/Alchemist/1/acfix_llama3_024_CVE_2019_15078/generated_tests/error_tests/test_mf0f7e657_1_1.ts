import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - onlyWhitelist modifier", function () {
  it("should revert when blacklisted user calls getTokens() but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: addr1 gets tokens and becomes blacklisted
    await instance.connect(addr1).getTokens();

    // Now addr1 is blacklisted. In the original contract, calling getTokens() again should revert
    // In the mutant, it will pass because require(blacklist[msg.sender] >= false) always passes
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});