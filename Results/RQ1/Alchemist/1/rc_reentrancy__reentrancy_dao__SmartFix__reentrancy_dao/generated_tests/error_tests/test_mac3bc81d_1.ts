import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mac3bc81d", function () {
  it("should kill mutant by verifying withdrawal actually transfers funds", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    // User deposits 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });

    // User withdraws all funds
    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();

    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    const userCredit = await instance.credit(user.address);

    // Check that user's credit in contract is 0 after withdrawal
    expect(userCredit).to.equal(0);

    // Check that user's ETH balance increased (minus gas costs) by at least the deposit
    expect(userBalanceAfter - userBalanceBefore).to.be.greaterThanOrEqual(depositAmount - ethers.parseEther("0.01"));

    // Also verify contract balance is 0
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});