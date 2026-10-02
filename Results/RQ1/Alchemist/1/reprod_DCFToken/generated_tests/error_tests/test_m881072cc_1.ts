import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m881072cc - distributeTokenPeriodic timing", function () {
  it("should revert when block.timestamp equals initTime (detect >= vs > mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Get the current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block!.timestamp;
    
    // Set the cfo address (needed for setDistributeAddress)
    await instance.setCaller(owner.address);
    
    // Set a distribute address so the function can proceed past the first check
    await instance.setDistributeAddress(addr1.address);
    
    // The initTime starts at 0. After first call to distributeTokenPeriodic, 
    // initTime becomes block.timestamp + 64800.
    // We need to call it once to set initTime to a known future value
    // But first, we need tokens in the contract to distribute
    // Transfer some tokens to the contract
    await instance.transfer(await instance.getAddress(), ethers.parseEther("10000"));
    
    // First call to set initTime
    await instance.distributeTokenPeriodic();
    
    // Get the new initTime value - it should be block.timestamp + 64800
    // We can't read initTime directly (it's private), but we can calculate
    // The next valid time is currentTime + 64800 (strictly greater than in original)
    
    // Mine blocks to advance time to exactly initTime (currentTime + 64800)
    await ethers.provider.send("evm_increaseTime", [64800]);
    await ethers.provider.send("evm_mine", []);
    
    // Now block.timestamp should equal initTime
    // Original contract requires >, so it should revert
    // Mutant requires >=, so it would pass
    // We expect revert because original uses strict greater-than
    await expect(
      instance.distributeTokenPeriodic()
    ).to.be.revertedWith("Not within the execution time range");
  });
});