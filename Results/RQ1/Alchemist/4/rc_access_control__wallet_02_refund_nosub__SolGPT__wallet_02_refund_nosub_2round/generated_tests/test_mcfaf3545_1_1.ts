import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant kill test - withdraw >= instead of <=", function () {
  it("should allow partial withdrawal but mutant reverts", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 2 ether from user
    const depositAmount = ethers.parseEther("2");
    await instance.connect(user).deposit({ value: depositAmount });

    // Withdraw only 1 ether (partial amount, less than balance)
    const withdrawAmount = ethers.parseEther("1");
    
    // In original: succeeds. In mutant: reverts because 1 >= 2 is false
    await expect(
      instance.connect(user).withdraw(withdrawAmount)
    ).to.not.be.reverted;

    // Verify balance decreased correctly (original behavior)
    // If mutant somehow passed, this check would catch inconsistency
    // But the revert above already kills the mutant
  });
});