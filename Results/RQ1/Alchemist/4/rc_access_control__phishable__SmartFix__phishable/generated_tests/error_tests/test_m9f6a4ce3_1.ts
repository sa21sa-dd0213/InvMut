import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m9f6a4ce3 test", function () {
  it("should revert when non-owner calls withdrawAll (mutant removes access control)", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Attempt to call withdrawAll from an unauthorized address (attacker)
    // The original contract would revert; the mutant (without require) would succeed
    await expect(
      instance.connect(attacker).withdrawAll(recipient.address)
    ).to.be.reverted;
  });
});