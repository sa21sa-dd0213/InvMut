import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m77c3b4fa test", function () {
  it("should revert when non-owner calls withdrawAll after removing owner check", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt withdrawal from unauthorized address - should revert in original, but mutant allows it
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});