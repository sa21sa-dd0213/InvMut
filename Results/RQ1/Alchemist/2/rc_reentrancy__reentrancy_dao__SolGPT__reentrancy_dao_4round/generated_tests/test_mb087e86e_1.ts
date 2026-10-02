import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant mb087e86e by depositing 1 wei and withdrawing all", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositTx = await instance.deposit({ value: 1 });
    await depositTx.wait();

    // Attempt to withdraw all - should succeed on original but fail on mutant
    await expect(instance.withdrawAll()).to.not.be.reverted;
    
    // Verify the contract balance is now 0
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});