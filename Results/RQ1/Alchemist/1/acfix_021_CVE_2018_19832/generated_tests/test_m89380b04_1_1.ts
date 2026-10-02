import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m89380b04 (transferFrom allowance += instead of -=)", function () {
  it("should revert or detect that allowance is incorrectly increased after transferFrom", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();

    // Deploy contract - no constructor arguments needed
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Owner approves spender for 1000 tokens
    const approveAmount = ethers.parseEther("1000");
    const transferAmount = ethers.parseEther("300");

    // First, owner needs to have tokens - call NETM() to set initial balance
    await instance.connect(owner).NETM();

    // Approve spender
    await instance.connect(owner).approve(spender.address, approveAmount);

    // Check initial allowance
    const initialAllowance = await instance.allowance(owner.address, spender.address);
    expect(initialAllowance).to.equal(approveAmount);

    // Spender executes transferFrom for 300 tokens
    await instance.connect(spender).transferFrom(owner.address, recipient.address, transferAmount);

    // Check allowance after transfer - in original it should be 700 (1000 - 300)
    // In mutant it would be 1300 (1000 + 300) - this should fail the test
    const remainingAllowance = await instance.allowance(owner.address, spender.address);
    expect(remainingAllowance).to.equal(approveAmount - transferAmount);

    // Additional verification: try another transfer that should fail if allowance was correctly reduced
    // If mutant increased allowance, spender could transfer more than original allowance
    await expect(
      instance.connect(spender).transferFrom(owner.address, recipient.address, approveAmount)
    ).to.be.reverted;
  });
});