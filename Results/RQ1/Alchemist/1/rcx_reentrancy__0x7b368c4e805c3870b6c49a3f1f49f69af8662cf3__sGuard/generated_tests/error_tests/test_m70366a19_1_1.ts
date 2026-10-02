import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m70366a19 test", function () {
  it("should revert when collecting exact balance due to strict > instead of >=", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await W_WALLETFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1.0");
    const unlockTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour in the past
    
    // Deposit exactly 1 ether
    await wallet.connect(user).Put(unlockTime, { value: depositAmount });
    
    // Try to collect exactly 1 ether - should fail on mutant (strict >), pass on original (>=)
    await expect(
      wallet.connect(user).Collect(depositAmount)
    ).to.be.reverted;
    
    // Verify balance unchanged (collect failed)
    const holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});