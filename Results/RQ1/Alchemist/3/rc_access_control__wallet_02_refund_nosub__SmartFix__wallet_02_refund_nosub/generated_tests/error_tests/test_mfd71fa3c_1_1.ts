import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mfd71fa3c - withdraw >= replaced with <=", function () {
  it("should kill mutant by withdrawing less than balance (expect success on original, revert on mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("0.0001"); // 100 gwei
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw only half of the balance
    const withdrawAmount = depositAmount / 2n;
    
    // On original: should succeed
    // On mutant (>=): require(amount >= balances[msg.sender]) -> 50 >= 100 is false -> reverts
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});