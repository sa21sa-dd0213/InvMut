import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection test", function () {
  it("should kill mutant mc055df69 by depositing 1 wei and expecting full withdrawal", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    const txDeposit = await instance.deposit({ value: depositAmount });
    await txDeposit.wait();

    // Withdraw all balance
    const initialBalance = await ethers.provider.getBalance(owner.address);
    const txWithdraw = await instance.withdrawAll();
    const receipt = await txWithdraw.wait();

    // Check that the user received their 1 wei back (on original contract this works, on mutant it fails)
    const finalBalance = await ethers.provider.getBalance(owner.address);
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const expectedBalance = initialBalance - gasCost + depositAmount;

    // On mutant, withdrawAll will see 0 credit and do nothing, so final balance will be initialBalance - gasCost
    // On original, final balance will be initialBalance - gasCost + depositAmount
    expect(finalBalance).to.equal(expectedBalance);
  });
});