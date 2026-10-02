import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant md97f2108", function () {
  it("should fail when non-owner tries to withdraw after constructor sets owner to contract itself", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract - in the mutant, owner = address(this) instead of _owner
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ETH to the contract so there's balance to withdraw
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // In the original contract, owner.address would be the owner
    // In the mutant, owner is address(this), so calling from owner should revert
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});