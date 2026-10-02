import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect the mutant that adds 1 wei to msg.value in deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const initialUserBalance = await ethers.provider.getBalance(addr1.address);

    // Deposit exactly 1 wei
    const depositAmount = 1n;
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Try to withdraw the full credit
    const withdrawTx = instance.connect(addr1).withdrawAll();

    // In the mutant, the credit is recorded as 2 wei (msg.value + 1)
    // but only 1 wei was actually sent, so the withdrawal should revert
    await expect(withdrawTx).to.be.reverted;
  });
});