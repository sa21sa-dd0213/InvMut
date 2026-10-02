import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - mb442de3a", function () {
  it("should revert when called by owner due to inverted access control", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ether to the contract so withdrawAll has a balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Owner calls withdrawAll - in the mutant the condition is msg.sender != owner
    // which means the owner will be rejected (require fails), so the call should revert
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});