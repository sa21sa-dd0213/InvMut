import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant mfa455904 test", function () {
  it("should detect the mutant by failing when collecting after unlock time", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const wallet = await Factory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const oneEther = ethers.parseEther("1.0");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // Put funds with unlock time in the future
    await wallet.connect(addr1).Put(unlockTime, { value: oneEther });
    
    // Verify balance was added
    let holder = await wallet.Acc(addr1.address);
    expect(holder.balance).to.equal(oneEther);
    
    // Fast forward time past the unlock time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect - should succeed on original but fail on mutant
    // On mutant (block.timestamp < acc.unlockTime) this will revert because
    // current time is now AFTER unlockTime, not before
    await expect(
      wallet.connect(addr1).Collect(oneEther)
    ).to.be.reverted;
  });
  
  it("should verify original contract behavior works correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("W_WALLET");
    const wallet = await Factory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const oneEther = ethers.parseEther("1.0");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600;
    
    await wallet.connect(addr1).Put(unlockTime, { value: oneEther });
    
    // Before unlock time - should NOT be able to collect on original
    await expect(
      wallet.connect(addr1).Collect(oneEther)
    ).to.be.reverted;
    
    // Fast forward past unlock time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    
    // After unlock time - should succeed on original
    const tx = await wallet.connect(addr1).Collect(oneEther);
    await tx.wait();
    
    // Verify balance was reduced
    holder = await wallet.Acc(addr1.address);
    expect(holder.balance).to.equal(0);
  });
});