import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - kill mutant mbc226de7 (>= changed to <= in Collect)", function () {
  it("should revert when user with balance > MinSum tries to collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2"); // Balance > MinSum
    
    // User deposits 2 ether (balance becomes 2, > MinSum)
    const tx1 = await instance.connect(user).Put(0, { value: depositAmount });
    await tx1.wait();
    
    // Check balance is set correctly
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // User tries to collect 1 ether (balance >= _am and balance > MinSum)
    // Original: passes because 2 >= 1 and 2 >= 1
    // Mutant: reverts because 2 <= 1 is false
    await expect(
      instance.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});