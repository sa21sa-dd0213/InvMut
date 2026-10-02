import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant mc7e068f7 - CashOut == replacement", function () {
  it("should kill the mutant by withdrawing a partial amount (less than full balance)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy PrivateBank with Log address as constructor argument
    const Factory = await ethers.getContractFactory("PrivateBank");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Deposit 5 ether from user
    const depositAmount = ethers.parseEther("5");
    const depositTx = await instance.connect(user).Deposit({ value: depositAmount });
    await depositTx.wait();
    
    // Verify balance is 5 ether
    expect(await instance.balances(user.address)).to.equal(depositAmount);
    
    // Attempt to withdraw 2 ether (partial amount, not full balance)
    const withdrawAmount = ethers.parseEther("2");
    
    // In the original, this should succeed; in the mutant (==), it should revert
    await expect(
      instance.connect(user).CashOut(withdrawAmount)
    ).to.be.reverted;
    
    // Verify balance remains unchanged (mutant didn't allow partial withdrawal)
    expect(await instance.balances(user.address)).to.equal(depositAmount);
  });
});