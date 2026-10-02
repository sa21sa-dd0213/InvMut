import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m3ddeffc4 test", function () {
  it("should revert when withdrawAll is called by an unauthorized address", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether so the withdrawal is possible
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attacker tries to call withdrawAll - should revert on original, succeed on mutant
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});