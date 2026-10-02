import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m2fcbabde - access control removal", function () {
  it("should revert when non-owner calls withdrawAll", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdrawAll from a non-owner address
    await expect(
      instance.connect(attacker).withdrawAll(recipient.address)
    ).to.be.reverted;
  });
});