import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect the msg.value-1 mutant by verifying deposited amount equals withdrawn amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Track balance before deposit
    const balanceBeforeDeposit = await ethers.provider.getBalance(addr1.address);

    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1.0");
    const txDeposit = await instance.connect(addr1).deposit({ value: depositAmount });
    await txDeposit.wait();

    // Withdraw all
    const txWithdraw = await instance.connect(addr1).withdrawAll();
    await txWithdraw.wait();

    // Check that contract balance is 0 after withdraw (original contract behavior)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(ethers.parseEther("0.0"));
  });
});