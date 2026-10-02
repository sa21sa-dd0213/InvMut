import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m47882ecf - approve with zero allowance", function () {
  it("should succeed when approving a non-zero value for a spender with zero current allowance", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First approval: spender has zero allowance initially, should succeed
    const tx1 = await instance.connect(owner).approve(spender.address, ethers.parseEther("100"));
    await tx1.wait();

    // Verify allowance was set correctly
    const allowance = await instance.allowance(owner.address, spender.address);
    expect(allowance).to.equal(ethers.parseEther("100"));
  });
});