import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m96b1dac9", function () {
  it("should revert when non-owner tries to withdraw", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Attacker tries to withdraw - should revert in original, succeed in mutant
    await expect(
      instance.connect(attacker).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});