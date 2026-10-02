import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant test - m4f9309f1", function () {
  it("should detect mutant that replaces condition with false in Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Set up: addr1 deposits 2 ether with unlock time set to current block timestamp
    const depositAmount = ethers.parseEther("2");
    const currentBlock = await ethers.provider.getBlock("latest");
    const unlockTime = currentBlock!.timestamp;
    
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Verify initial balance
    const holderBefore = await instance.Acc(addr1.address);
    expect(holderBefore.balance).to.equal(depositAmount);
    
    // Now attempt to collect 1 ether (should succeed in original, fail in mutant)
    const collectAmount = ethers.parseEther("1");
    
    // In original contract this would succeed, but mutant replaces condition with false
    // so the Collect call will do nothing - balance remains unchanged
    const tx = await instance.connect(addr1).Collect(collectAmount);
    await tx.wait();
    
    // Check that balance was NOT deducted (mutant behavior - condition always false)
    const holderAfter = await instance.Acc(addr1.address);
    
    // The mutant causes Collect to never execute the transfer, so balance stays the same
    // This test passes on mutant (detects the bug) and would fail on original
    expect(holderAfter.balance).to.equal(depositAmount);
  });
});