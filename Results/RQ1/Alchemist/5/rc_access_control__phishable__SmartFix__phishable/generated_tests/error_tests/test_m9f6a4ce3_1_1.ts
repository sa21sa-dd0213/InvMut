import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m9f6a4ce3 - unauthorized withdrawAll", function () {
  it("should revert when non-owner calls withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract so there is something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner tries to withdraw - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});