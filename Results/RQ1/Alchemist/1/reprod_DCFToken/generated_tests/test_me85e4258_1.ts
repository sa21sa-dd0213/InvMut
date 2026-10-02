import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF - kill mutant me85e4258 (distributeTokenPeriodic time interval)", function () {
  let dcf: any;
  let owner: any;
  let addr1: any;
  let liquidityReceiveAddress: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a valid liquidity receive address
    liquidityReceiveAddress = owner.address;
    const DCF = await ethers.getContractFactory("DCF");
    dcf = await DCF.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();
    
    // Set the caller (cfo) to owner for testing
    await dcf.setCaller(owner.address);
  });

  it("should revert on second call to distributeTokenPeriodic due to multiplied initTime", async function () {
    // First call should succeed - sets initTime
    await dcf.distributeTokenPeriodic();
    
    // Get the current block timestamp to calculate when the next call would be allowed
    const block = await ethers.provider.getBlock("latest");
    const currentTime = block!.timestamp;
    
    // In the original: initTime = nowTime + 64800 (18 hours)
    // In the mutant: initTime = nowTime * 64800
    // After the first call, initTime is set. We need to wait for the original's 64800 seconds to pass.
    // But the mutant sets initTime to currentTime * 64800 which is astronomically large.
    
    // Fast forward 64800 seconds (18 hours) to simulate the original's waiting period
    await ethers.provider.send("evm_increaseTime", [64800]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to call distributeTokenPeriodic again
    // Original: should succeed because enough time has passed (initTime = nowTime + 64800)
    // Mutant: should revert because initTime = nowTime * 64800 is way in the future
    await expect(
      dcf.distributeTokenPeriodic()
    ).to.be.revertedWith("Not within the execution time range");
  });
});