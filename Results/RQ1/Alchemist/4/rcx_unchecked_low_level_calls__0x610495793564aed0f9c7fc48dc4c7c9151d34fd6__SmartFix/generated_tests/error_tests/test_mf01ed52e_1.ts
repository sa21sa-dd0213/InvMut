import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - mf01ed52e", function () {
  it("should revert when non-owner calls withdrawAll after modifier removal", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ETH to the contract so there's balance to withdraw
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount,
    });

    // Attacker tries to call withdrawAll - should revert on original, pass on mutant
    await expect(
      instance.connect(attacker).withdrawAll()
    ).to.be.reverted;
  });
});