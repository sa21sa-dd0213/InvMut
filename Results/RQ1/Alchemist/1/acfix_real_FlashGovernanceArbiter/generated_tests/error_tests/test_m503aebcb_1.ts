import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m503aebcb test", function () {
  it("should detect mutant where > is replaced with >= in epoch check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy FlashGovernanceArbiter with a mock DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(owner.address);
    await arbiter.waitForDeployment();
    
    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000000"));
    await token.waitForDeployment();
    
    // Configure flash governance
    const amount = ethers.parseEther("100");
    const unlockTime = 3600; // 1 hour
    await arbiter.connect(owner).configureFlashGovernance(
      await token.getAddress(),
      amount,
      unlockTime,
      false
    );
    
    // Configure security parameters with epochSize = 100 seconds
    const epochSize = 100;
    await arbiter.connect(owner).configureSecurityParameters(10, epochSize, 50);
    
    // Set governed addresses
    await arbiter.connect(owner).setGoverned([addr1.address], [true]);
    
    // Transfer tokens to addr1 for the test
    await token.transfer(addr1.address, ethers.parseEther("1000"));
    await token.connect(addr1).approve(await arbiter.getAddress(), ethers.parseEther("1000"));
    
    // First flash governance action to set lastFlashGovernanceAct
    await arbiter.connect(addr1).assertGovernanceApproved(addr1.address, addr2.address, false);
    
    // Record the block timestamp after first action
    const blockAfterFirst = await ethers.provider.getBlock("latest");
    const firstActionTime = blockAfterFirst!.timestamp;
    
    // Advance time to exactly epochSize seconds after first action
    await ethers.provider.send("evm_setNextBlockTimestamp", [firstActionTime + epochSize]);
    
    // This call should revert on the original (strict > required) 
    // but would pass on the mutant (>= allows it)
    await expect(
      arbiter.connect(addr1).assertGovernanceApproved(addr1.address, addr2.address, false)
    ).to.be.revertedWith("LIMBO: flash governance disabled for rest of epoch");
  });
});