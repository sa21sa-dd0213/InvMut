import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mcc648c58 test", function () {
  it("should detect mutant that adds extra 1 wei to balance on deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).addToBalance({ value: depositAmount });

    // Verify balance shows deposit + 1 (mutant behavior)
    const balanceAfterDeposit = await instance.getBalance(addr1.address);
    expect(balanceAfterDeposit).to.equal(depositAmount + 1n);

    // Withdraw all balance
    await instance.connect(addr1).withdrawBalance();

    // After withdrawal, user balance should be 0
    const finalBalance = await instance.getBalance(addr1.address);
    expect(finalBalance).to.equal(0);

    // Contract should have 0 balance in original, but mutant leaves 1 wei
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});