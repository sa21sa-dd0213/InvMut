import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Phishable mutant m151610e6 test", function () {
  it("should detect mutant by verifying owner is not the deployer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll can succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // In original, owner is deployer; in mutant, owner is contract itself
    // So calling withdrawAll from owner should revert in mutant
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});