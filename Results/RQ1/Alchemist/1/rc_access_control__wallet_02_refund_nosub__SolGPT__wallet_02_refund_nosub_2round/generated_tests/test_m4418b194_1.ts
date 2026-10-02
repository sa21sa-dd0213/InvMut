import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection test", function () {
  it("should detect deposit balance inflation bug by withdrawing exact deposited amount", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit exactly 1 ETH
    await instance.connect(owner).deposit({ value: depositAmount });
    
    // Try to withdraw exactly the deposited amount
    // On the original contract this would succeed
    // On the mutant, the recorded balance is depositAmount + 1 wei, 
    // so the contract balance is insufficient to send the full withdrawal
    await expect(
      instance.connect(owner).withdraw(depositAmount)
    ).to.be.reverted;
  });
});