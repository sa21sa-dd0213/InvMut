import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mfd71fa3c - withdraw >= instead of <=", function () {
  it("should revert when withdrawing less than full balance (mutant requires amount >= balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("0.0001");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw 50 wei (less than full balance)
    const withdrawAmount = ethers.parseEther("0.00005");
    
    // On the original contract this would succeed; on the mutant it reverts
    // because require(amount >= balances[msg.sender]) fails (50 < 100)
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});