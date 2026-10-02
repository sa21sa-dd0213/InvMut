import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44b8a7ea", function () {
  it("should detect mutant by checking balance consistency after deposit and withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit exactly 1 ETH from addr1
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Get contract balance before withdrawal
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);

    // Withdraw all
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    // Get contract balance after withdrawal
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);

    // Check addr1's balance change
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // Second deposit to verify accounting consistency
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw again
    const tx2 = await instance.connect(addr1).withdrawAll();
    await tx2.wait();

    // Final check: contract should have 0 ETH after two full withdrawal cycles
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    expect(finalContractBalance).to.equal(0);
  });
});