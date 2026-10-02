import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection test", function () {
  it("should revert when deployer calls withdrawAll because owner is contract itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // In the mutant, owner = address(this), so the deployer (owner) is NOT the owner
    // Calling withdrawAll from owner should revert
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});