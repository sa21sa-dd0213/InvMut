import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - deposit msg.value-1", function () {
  it("should detect that user receives less than deposited amount", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits exactly 1 ether
    await instance.connect(user).deposit({ value: depositAmount });

    // Get user balance before withdrawal
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    // User withdraws all credited amount
    const tx = await instance.connect(user).withdrawAll();
    const receipt = await tx.wait();

    // Get the actual ether received by user
    const userBalanceAfter = await ethers.provider.getBalance(user.address);

    // On original contract: user gets back exactly depositAmount
    // On mutant: user gets back depositAmount - 1 wei (because credit was msg.value-1)
    // So we expect the balance increase to be depositAmount, not depositAmount - 1
    const balanceIncrease = userBalanceAfter - userBalanceBefore;

    // Check that the transaction didn't revert and that the user's credit was correctly set to 0 after withdrawal
    const creditAfter = await instance.credit(user.address);
    expect(creditAfter).to.equal(0);

    // The critical check: on mutant, the contract's balance after withdrawal
    // will have 1 wei stuck because credit was under-reported
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);

    // If mutant is present, 1 wei remains stuck in contract
    // On original, contract balance is 0 after full withdrawal
    // So we assert contract balance is 0 (original behavior) - this will fail on mutant
    expect(contractBalanceAfter).to.equal(0);
  });
});