import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - missing owner check", function () {
  it("should revert when non-owner calls withdrawAll (detects removed require(msg.sender == owner))", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract so there's balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attacker attempts to withdraw all funds - should revert on original
    // but succeed on mutant (killing it)
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});