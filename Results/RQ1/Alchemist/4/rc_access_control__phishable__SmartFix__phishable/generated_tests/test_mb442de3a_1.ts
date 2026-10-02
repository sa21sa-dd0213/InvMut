import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant mb442de3a detection", function () {
  it("should allow owner to withdrawAll and kill the mutant that changes == to !=", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to withdraw all funds - this will fail on the mutant
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.not.be.reverted;

    // Verify the contract balance is now zero
    expect(
      await ethers.provider.getBalance(await instance.getAddress())
    ).to.equal(0n);
  });
});