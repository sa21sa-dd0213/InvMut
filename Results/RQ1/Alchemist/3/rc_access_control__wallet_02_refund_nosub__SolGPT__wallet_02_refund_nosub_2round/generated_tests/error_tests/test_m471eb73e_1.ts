import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - withdraw condition changed from <= to ==", function () {
  it("should allow partial withdrawal on original, but fail on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ETH
    await instance.connect(addr1).deposit({ value: ethers.parseEther("1.0") });

    // Attempt to withdraw only 0.5 ETH (partial withdrawal)
    // This should succeed on the original (amount <= balance)
    // but revert on the mutant (amount == balance required)
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.not.be.reverted;
  });
});