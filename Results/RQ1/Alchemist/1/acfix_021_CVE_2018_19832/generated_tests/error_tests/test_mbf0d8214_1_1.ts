import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - approve function (&& vs ||)", function () {
  it("should detect the mutant by testing zero-value approval after a non-zero allowance exists", async function () {
    const [owner, spender] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, approve a non-zero amount to the spender
    const nonZeroAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(spender.address, nonZeroAmount);

    // Verify the allowance was set correctly
    expect(await instance.allowance(owner.address, spender.address)).to.equal(nonZeroAmount);

    // Now attempt to approve a zero value - this should succeed in original but fail in mutant
    // In the original: _value == 0, so first condition false; allowed[owner][spender] != 0 is true
    // Original: false && true = false, so it does NOT return false, proceeds to set allowance to 0
    // Mutant: false || true = true, so it returns false (fails to set allowance)
    const tx = await instance.connect(owner).approve(spender.address, 0);
    await tx.wait();

    // In the original contract, allowance should now be 0
    // In the mutant, the allowance would still be nonZeroAmount because the function returned false
    const allowanceAfter = await instance.allowance(owner.address, spender.address);

    // If the mutant is present, allowanceAfter will be nonZeroAmount (the approve failed)
    // If original, allowanceAfter will be 0 (the approve succeeded)
    expect(allowanceAfter).to.equal(0);
  });
});