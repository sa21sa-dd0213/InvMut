import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m5edbf6e5", function () {
  it("should kill mutant that subtracts 1 wei from deposited amount", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deposit exactly 1 wei
    const depositAmount = 1n; // 1 wei
    const tx = await user.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    await tx.wait();
    
    // Check that the balance was recorded correctly
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Now try to withdraw the same 1 wei
    // This should succeed on the original (balance is 1) but fail on mutant (balance is 0)
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.not.be.reverted;
    
    // Verify the user received the funds
    const finalBalance = await ethers.provider.getBalance(user.address);
    expect(finalBalance).to.be.gt(0);
  });
});