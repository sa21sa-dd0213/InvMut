import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m3ddeffc4 - access control removed", function () {
  it("should revert when non-owner calls withdrawAll on original, but fails on mutant without require", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("1.0")
    });

    // Attacker tries to withdraw all funds - should revert due to access control
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});