import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant kill test - mb93d900e", function () {
  it("should allow Collect when balance > MinSum (original) but revert on mutant requiring exact equality", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await W_WALLETFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2"); // More than MinSum
    const collectAmount = ethers.parseEther("0.5");
    
    // User deposits 2 ether (greater than MinSum)
    await wallet.connect(user).Put(0, { value: depositAmount });
    
    // Advance time past unlockTime (block.timestamp)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine");
    
    // Try to collect - should succeed on original (balance >= MinSum)
    // but should revert on mutant (balance == MinSum fails since 2 != 1)
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});