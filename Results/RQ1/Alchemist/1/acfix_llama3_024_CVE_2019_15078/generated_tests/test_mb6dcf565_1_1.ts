import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mb6dcf565 - approve event emission", function () {
  it("should emit Approval event when approve is called with non-zero value for new spender", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const approveValue = ethers.parseEther("100");

    // Expect the Approval event to be emitted with correct parameters
    await expect(instance.connect(owner).approve(spender.address, approveValue))
      .to.emit(instance, "Approval")
      .withArgs(owner.address, spender.address, approveValue);
  });

  it("should emit Approval event when setting allowance to zero", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First set a non-zero allowance
    await instance.connect(owner).approve(spender.address, ethers.parseEther("100"));

    // Now set allowance to zero - should also emit Approval event
    await expect(instance.connect(owner).approve(spender.address, 0))
      .to.emit(instance, "Approval")
      .withArgs(owner.address, spender.address, 0);
  });
});