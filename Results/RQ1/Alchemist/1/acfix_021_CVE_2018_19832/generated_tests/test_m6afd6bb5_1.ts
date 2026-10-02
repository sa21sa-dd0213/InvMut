import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m6afd6bb5", function () {
  it("should revert when blacklisted user calls getTokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, addr1 gets tokens to become blacklisted (in original, this sets blacklist[addr1] = true)
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Now addr1 is blacklisted, try to call getTokens again
    await expect(
      instance.connect(addr1).getTokens({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});