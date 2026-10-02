import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - approve return", function () {
  it("should revert or return false when approve is called without return value", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First approve to set a non-zero allowance
    const tx1 = await instance.connect(owner).approve(spender.address, 100);
    await tx1.wait();

    // Now call approve again with a different value
    // In the original contract, this returns true when allowance is already non-zero
    // In the mutant, the return statement is missing, so the transaction will execute but return false
    const tx2 = await instance.connect(owner).approve(spender.address, 200);
    await tx2.wait();

    // The mutant fails to return true, so the transaction receipt should indicate failure
    // We can detect this by checking that the function did not emit the Approval event
    // or by checking that the allowance was not updated (since the function returns early)
    const allowance = await instance.allowance(owner.address, spender.address);
    expect(allowance).to.equal(100); // Should still be 100 because the mutant's approve returns false without updating
  });
});