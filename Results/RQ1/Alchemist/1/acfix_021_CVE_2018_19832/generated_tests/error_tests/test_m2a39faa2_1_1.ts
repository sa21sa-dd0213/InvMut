import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m2a39faa2 test", function () {
  it("should detect removal of front-running protection in approve function", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First approval: set allowance to non-zero value (e.g., 100 tokens)
    const firstAllowance = ethers.parseEther("100");
    await instance.connect(owner).approve(spender.address, firstAllowance);

    // Verify first approval was set
    expect(await instance.allowance(owner.address, spender.address)).to.equal(firstAllowance);

    // Second approval: try to change allowance to another non-zero value (e.g., 200 tokens)
    // In the original contract, this should revert due to front-running protection
    // In the mutant (where protection is removed), this should succeed
    const secondAllowance = ethers.parseEther("200");

    // This transaction should revert on original but succeed on mutant
    // If it reverts, the test fails (meaning we're on the original or mutant with protection)
    // If it succeeds, the mutant is detected
    const tx = instance.connect(owner).approve(spender.address, secondAllowance);

    // We expect the transaction to succeed (mutant behavior)
    // If it reverts, the mutant is not present (original behavior)
    await expect(tx).to.not.be.reverted;

    // Verify the allowance was actually changed to the new value
    expect(await instance.allowance(owner.address, spender.address)).to.equal(secondAllowance);
  });
});