import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant that subtracts 1 from msg.value in deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits exactly 1 wei
    const depositAmount = 1n; // 1 wei
    const tx = await instance.connect(user).deposit({ value: depositAmount });
    await tx.wait();

    // Attempt to withdraw all - should succeed with correct credit
    const withdrawTx = await instance.connect(user).withdrawAll();
    await withdrawTx.wait();

    // Check the user's final balance - if mutant is present, the withdrawal
    // would have only sent 0 wei (since credit was 0), and the contract would
    // still hold the 1 wei, causing an inconsistent state.
    const contractBalance = await ethers.provider.getBalance(instance.target);
    
    // In original contract: deposit 1 wei -> credit = 1 -> withdrawAll sends 1 wei -> balance = 0
    // In mutant: deposit 1 wei -> credit = 0 -> withdrawAll sends 0 -> balance = 1 (stuck funds)
    // So if contract still has funds, mutant is detected
    expect(contractBalance).to.equal(0n);
  });
});