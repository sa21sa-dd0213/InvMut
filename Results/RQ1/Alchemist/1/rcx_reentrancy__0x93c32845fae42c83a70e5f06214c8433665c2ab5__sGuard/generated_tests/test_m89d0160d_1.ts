import { expect } from "chai";
import { ethers } } from "hardhat";

describe("X_WALLET mutant detection - Collect function", function () {
  it("should kill mutant by verifying balance deduction after successful Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const xwallet = await XWalletFactory.deploy(await logInstance.getAddress());
    await xwallet.waitForDeployment();
    
    // Setup: Send 2 ether to addr1 via Put to create balance
    const putAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    await xwallet.connect(addr1).Put(unlockTime, { value: putAmount });
    
    // Verify initial balance
    let holder = await xwallet.Acc(addr1.address);
    expect(holder.balance).to.equal(putAmount);
    
    // Fast forward time past unlockTime
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect 1 ether
    const collectAmount = ethers.parseEther("1");
    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    
    await xwallet.connect(addr1).Collect(collectAmount);
    
    // Check balance in contract - on original it should decrease, on mutant it stays the same
    holder = await xwallet.Acc(addr1.address);
    
    // The mutant will keep balance unchanged because _s is always false
    // Original would deduct: balanceBefore = 2 ether, after Collect = 1 ether
    expect(holder.balance).to.equal(ethers.parseEther("1"));
    
    // Also verify ETH was actually transferred to addr1
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});