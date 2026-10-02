import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mfd71fa3c test", function () {
  it("should kill mutant by withdrawing less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 10 ether from addr1
    const depositAmount = ethers.parseEther("10");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw 5 ether (less than full balance)
    const withdrawAmount = ethers.parseEther("5");
    
    // On original contract this succeeds, on mutant it reverts
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});