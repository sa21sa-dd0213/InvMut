import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m9f6a4ce3 test", function () {
  it("should revert when non-owner tries to call withdrawAll", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether to make the withdrawal meaningful
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attacker (non-owner) tries to withdraw all funds
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});