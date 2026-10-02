import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m3b956258", function () {
  it("should revert when non-owner calls withdrawAll (mutant removes onlyOwner modifier)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there's something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attacker should NOT be able to call withdrawAll (original requires onlyOwner)
    await expect(
      instance.connect(attacker).withdrawAll()
    ).to.be.reverted;
  });
});