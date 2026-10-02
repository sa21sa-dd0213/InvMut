import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m5a31f299 (approve event removal)", function () {
  it("should emit Approval event when approve is called with new allowance", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First approve to set allowance to 0 (to clear any existing allowance)
    await instance.connect(owner).approve(spender.address, 0);
    
    // Now approve a non-zero value - this should emit the Approval event
    const approveAmount = ethers.parseEther("100");
    const tx = await instance.connect(owner).approve(spender.address, approveAmount);
    
    // Check that the Approval event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Approval")
      .withArgs(owner.address, spender.address, approveAmount);
  });
});