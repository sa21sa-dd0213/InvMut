import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - md954df0d", function () {
  it("should detect mutant that changes > to < in withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Attempt to withdraw all
    const tx = await instance.connect(addr1).withdrawAll();
    const receipt = await tx.wait();

    // Get final balance of addr1
    const finalBalance = await ethers.provider.getBalance(addr1.address);

    // In the original contract, addr1 should receive the deposit minus gas
    // In the mutant, the withdrawal will not execute (oCredit < 0 is false),
    // so addr1's balance should remain unchanged (only gas spent)
    // We expect the mutant to fail because the balance did not increase
    const balanceChange = finalBalance - initialBalance;

    // The original would increase balance by ~1 ETH (minus gas)
    // The mutant keeps balance unchanged (only gas cost deducted)
    // We assert the balance change is less than 0.5 ETH (i.e., no withdrawal occurred)
    expect(balanceChange).to.be.lessThan(ethers.parseEther("0.5"));
  });
});