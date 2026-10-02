import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant by verifying balance after deposit and withdrawal", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Get user's initial balance
    const userInitialBalance = await ethers.provider.getBalance(user.address);

    // Perform deposit
    const depositTx = await instance.connect(user).deposit({ value: depositAmount });
    await depositTx.wait();

    // Check contract balance after deposit
    const contractBalanceAfterDeposit = await ethers.provider.getBalance(instance.target);

    // Perform withdrawal
    const withdrawTx = await instance.connect(user).withdrawAll();
    await withdrawTx.wait();

    // Get user's final balance
    const userFinalBalance = await ethers.provider.getBalance(user.address);

    // Get contract balance after withdrawal
    const contractBalanceAfterWithdrawal = await ethers.provider.getBalance(instance.target);

    // In the original, contract balance should be 0 after full withdrawal
    // In the mutant, balance += msg.value + 1 causes 1 wei surplus, leaving non-zero balance
    expect(contractBalanceAfterWithdrawal).to.equal(0);

    // User should have received exactly the deposit amount back (minus gas)
    const userReceived = userFinalBalance - userInitialBalance;
    expect(userReceived).to.equal(depositAmount);
  });
});