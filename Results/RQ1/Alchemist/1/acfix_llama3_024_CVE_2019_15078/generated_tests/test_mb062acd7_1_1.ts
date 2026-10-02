import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant mb062acd7", function () {
  it("should revert when trying to overwrite a non-zero allowance in original contract, but succeed in mutant", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First approval: set non-zero allowance
    const firstApproval = await instance.approve(spender.address, ethers.parseEther("100"));
    await firstApproval.wait();

    // Verify allowance is set
    expect(await instance.allowance(owner.address, spender.address)).to.equal(ethers.parseEther("100"));

    // Second approval: attempt to overwrite with different non-zero value
    // In original contract, this should return false (revert)
    // In mutant, this should succeed (no revert)
    const secondApproval = await instance.approve(spender.address, ethers.parseEther("50"));
    await secondApproval.wait();

    // If we reach here, the transaction didn't revert
    // Check the allowance after second approval
    const allowanceAfter = await instance.allowance(owner.address, spender.address);

    // In the mutant, the allowance should now be 50 (overwritten)
    // In the original, this test would fail because the approve would return false
    expect(allowanceAfter).to.equal(ethers.parseEther("50"));
  });
});