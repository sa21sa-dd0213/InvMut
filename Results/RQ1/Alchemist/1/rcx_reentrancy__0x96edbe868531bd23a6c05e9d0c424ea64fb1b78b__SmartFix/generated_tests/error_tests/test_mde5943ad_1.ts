import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY - kill mutant mde5943ad", function () {
  it("should revert when Put is called with non-zero _lockTime due to mutant bug", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call Initialized to set intitalized to true (required for Put to work)
    await (await instance.Initialized()).wait();

    // Set MinSum to 0 to avoid interference
    await (await instance.SetMinSum(0)).wait();

    // Deploy and set LogFile (required for Put to work)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();

    // Call Put with non-zero _lockTime - should succeed in original but revert in mutant
    // The mutant's condition block.timestamp + _lockTime <= block.timestamp
    // will fail for any positive _lockTime, causing revert
    const lockTime = 100;
    const value = ethers.parseEther("1");
    
    // In the original, this should succeed. In the mutant, it will revert.
    // We expect it to succeed (original behavior), so if it reverts, the mutant is detected
    const tx = instance.Put(lockTime, { value: value });
    await expect(tx).to.not.be.reverted;
  });
});