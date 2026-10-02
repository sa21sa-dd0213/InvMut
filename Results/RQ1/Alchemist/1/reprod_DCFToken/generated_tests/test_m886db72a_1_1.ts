import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - distributeTokenPeriodic with block.prevrandao", function () {
  it("should revert when distributeTokenPeriodic is called twice within 18 hours, but mutant may not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr1.address);
    await instance.waitForDeployment();

    // Set the caller (cfo) to owner so we can set distributeAddress
    await instance.setCaller(owner.address);

    // Set distribute address to a valid address
    await instance.setDistributeAddress(addr1.address);

    // First call to distributeTokenPeriodic should succeed (initTime is 0, so nowTime > 0)
    await instance.distributeTokenPeriodic();

    // Attempt second call immediately (within the same block/timestamp)
    // In the original contract, this should revert because nowTime (block.timestamp) 
    // is not > initTime (which was set to block.timestamp + 64800)
    // In the mutant using block.prevrandao, the second call might succeed unexpectedly
    await expect(
      instance.distributeTokenPeriodic()
    ).to.be.revertedWith("Not within the execution time range");
  });
});