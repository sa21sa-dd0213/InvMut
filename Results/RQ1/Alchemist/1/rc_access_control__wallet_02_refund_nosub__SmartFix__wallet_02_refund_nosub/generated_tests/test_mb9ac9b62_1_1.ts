import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - mb9ac9b62", function () {
  it("should allow withdrawal of exact full balance (original) but mutant reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw exactly the full balance (1 ether)
    // In the original contract this succeeds; in the mutant it should revert
    await expect(
      instance.connect(addr1).withdraw(depositAmount)
    ).to.be.reverted;
  });
});