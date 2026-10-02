import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m64a38533 test", function () {
  it("should kill mutant by approving zero value when nonzero allowance exists", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set a nonzero allowance for spender
    await instance.connect(owner).approve(spender.address, ethers.parseEther("100"));
    
    // Verify allowance was set
    const allowanceBefore = await instance.allowance(owner.address, spender.address);
    expect(allowanceBefore).to.equal(ethers.parseEther("100"));

    // Now approve zero value - original contract should succeed (reset allowance to zero)
    // Mutant contract should revert because _value == 0 and allowance != 0
    await expect(
      instance.connect(owner).approve(spender.address, 0)
    ).to.not.be.reverted;

    // Verify allowance is now zero
    const allowanceAfter = await instance.allowance(owner.address, spender.address);
    expect(allowanceAfter).to.equal(0);
  });
});