import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - withdraw >= instead of <=", function () {
  it("should kill mutant mcfaf3545 by withdrawing less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 2 ether from addr1
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw only 1 ether (half the balance)
    const withdrawAmount = ethers.parseEther("1");
    
    // Original: succeeds because 1 <= 2
    // Mutant: reverts because 1 >= 2 is false
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});