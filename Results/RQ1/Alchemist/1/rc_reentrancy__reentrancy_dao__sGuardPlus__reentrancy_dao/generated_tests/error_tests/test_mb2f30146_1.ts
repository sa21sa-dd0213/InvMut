import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test", function () {
  it("should kill mutant mb2f30146 by checking withdrawal matches deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Withdraw all
    const tx = await instance.connect(addr1).withdrawAll();
    const receipt = await tx.wait();

    // Calculate gas cost
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    // Final balance of addr1
    const finalBalance = await ethers.provider.getBalance(addr1.address);

    // In the original contract, addr1 gets back exactly 1 wei (minus gas)
    // In the mutant, addr1 gets back 0 wei (since credited 0 wei)
    // So the difference should be exactly depositAmount (1 wei) minus gas costs
    const balanceChange = finalBalance + gasCost - initialBalance;
    
    // If mutant is present, balanceChange will be 0 instead of 1 wei
    expect(balanceChange).to.equal(depositAmount);
  });
});