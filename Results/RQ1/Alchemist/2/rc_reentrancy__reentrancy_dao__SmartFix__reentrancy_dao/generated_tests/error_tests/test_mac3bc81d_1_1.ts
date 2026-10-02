import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mac3bc81d", function () {
  it("should kill mutant by verifying withdrawal succeeds and credit is reset", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Record initial balance before deposit for gas calculation
    const initialUserBalance = await ethers.provider.getBalance(user.address);

    // User deposits 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });

    // Check initial credit
    const initialCredit = await instance.credit(user.address);
    expect(initialCredit).to.equal(depositAmount);

    // User withdraws all
    const tx = await instance.connect(user).withdrawAll();
    const receipt = await tx.wait();

    // Verify credit is reset to 0
    const finalCredit = await instance.credit(user.address);
    expect(finalCredit).to.equal(0);

    // Verify user received the ETH (balance increased by deposit amount)
    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    // Account for gas costs - user should have received the deposit amount
    expect(userBalanceAfter).to.be.closeTo(
      initialUserBalance + depositAmount,
      ethers.parseEther("0.01") // Allow small margin for gas
    );
  });
});