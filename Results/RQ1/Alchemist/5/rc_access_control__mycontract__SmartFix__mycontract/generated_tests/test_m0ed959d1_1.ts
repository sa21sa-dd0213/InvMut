import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending to a non-zero address due to mutant (== instead of !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    // Original contract: sendTo should succeed with non-zero receiver
    // Mutant (== address(0)): sendTo should revert because receiver != address(0)
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});