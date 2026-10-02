import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m1d3cd634 (approve condition)", function () {
  it("should prevent changing allowance when current allowance is non-zero", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First approval: set allowance to 100 tokens
    const initialAllowance = ethers.parseEther("100");
    const tx1 = await instance.connect(owner).approve(spender.address, initialAllowance);
    await tx1.wait();

    // Verify allowance was set
    let currentAllowance = await instance.allowance(owner.address, spender.address);
    expect(currentAllowance).to.equal(initialAllowance);

    // Second approval: attempt to change allowance to a different non-zero value
    const newAllowance = ethers.parseEther("200");
    const tx2 = await instance.connect(owner).approve(spender.address, newAllowance);
    await tx2.wait();

    // In original contract, this call should return false and NOT update allowance
    // In mutant (condition replaced with false), it WILL update allowance
    // So check that allowance remained unchanged (original behavior)
    currentAllowance = await instance.allowance(owner.address, spender.address);
    expect(currentAllowance).to.equal(initialAllowance);
  });
});