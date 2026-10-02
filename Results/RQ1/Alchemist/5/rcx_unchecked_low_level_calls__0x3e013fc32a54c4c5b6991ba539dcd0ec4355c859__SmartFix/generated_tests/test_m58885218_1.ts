import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant m58885218 detection", function () {
  it("should revert when Owner calls withdraw (mutant uses != instead of ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdraw - should succeed on original, but revert on mutant
    // because mutant requires msg.sender != Owner
    await expect(
      instance.connect(owner).withdraw()
    ).to.be.reverted;
  });
});