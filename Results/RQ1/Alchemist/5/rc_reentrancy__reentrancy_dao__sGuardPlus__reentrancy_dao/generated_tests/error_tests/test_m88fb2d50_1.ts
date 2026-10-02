import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant m88fb2d50 by proving withdrawal logic is broken when condition is always false", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    const txDeposit = await instance.connect(user).deposit({ value: depositAmount });
    await txDeposit.wait();

    // Record user's initial balance before withdrawal
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    // Call withdrawAll - in original this sends funds, in mutant condition is false so nothing happens
    const txWithdraw = await instance.connect(user).withdrawAll();
    await txWithdraw.wait();

    // Check user's ether balance - mutant will not send funds, so balance remains unchanged
    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    // In the original, balanceAfter would be > balanceBefore (after gas costs, but net positive from deposit)
    // In mutant, balanceAfter will be less than balanceBefore due to gas costs with no transfer
    // We can also check credit mapping to confirm it was not reset
    const userCredit = await instance.credit(user.address);
    
    // Assert that credit is still the deposit amount (mutant never set it to 0)
    expect(userCredit).to.equal(depositAmount);
    
    // Assert that user did NOT receive the ether (balance after is less due to gas, no transfer happened)
    expect(userBalanceAfter).to.be.lessThan(userBalanceBefore);
  });
});