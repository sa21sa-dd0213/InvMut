import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m3ddeffc4", function () {
  it("should revert when withdrawAll is called by non-owner (mutant removes require check)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract so there's balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attempt to withdraw from non-owner address - should revert in original, succeed in mutant
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});