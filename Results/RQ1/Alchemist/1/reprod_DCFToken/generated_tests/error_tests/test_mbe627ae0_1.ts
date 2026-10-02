import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - distributeTokenPeriodic", function () {
  it("should revert on mutant when calling distributeTokenPeriodic after initTime has passed", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = owner.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block!.timestamp;

    // Wait for a short period to ensure we're past initTime
    // initTime is initially 0, so any time > 0 should pass the original check
    // The mutant requires nowTime < initTime which would fail since initTime is 0
    
    // First attempt should fail on mutant (nowTime > 0, but mutant requires nowTime < 0)
    // On original, it would succeed because nowTime > 0
    await expect(
      instance.distributeTokenPeriodic()
    ).to.be.revertedWith("Not within the execution time range");
  });
});