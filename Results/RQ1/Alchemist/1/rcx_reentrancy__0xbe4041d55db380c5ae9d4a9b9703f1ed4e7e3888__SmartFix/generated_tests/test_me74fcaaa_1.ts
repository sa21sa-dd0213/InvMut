import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - me74fcaaa", function () {
  it("should revert when trying to Collect exactly at unlockTime (mutant bug: >= allows it)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();
    
    // Deploy Log contract (required for Collect to work)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Initialize the money box
    await moneyBox.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await moneyBox.connect(owner).SetLogFile(await log.getAddress());
    await moneyBox.connect(owner).Initialized();
    
    // addr1 puts 1 ETH with lock time of 100 seconds
    const lockTime = 100;
    await moneyBox.connect(addr1).Put(lockTime, { value: ethers.parseEther("1") });
    
    // Get the unlock time from storage
    const acc = await moneyBox.Acc(addr1.address);
    const unlockTime = acc.unlockTime;
    
    // Advance time to exactly the unlock time (not after)
    const currentTime = await ethers.provider.getBlock("latest").then(b => b!.timestamp);
    const timeToAdvance = Number(unlockTime) - currentTime;
    
    if (timeToAdvance > 0) {
      await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we are exactly at unlockTime
    const blockAfter = await ethers.provider.getBlock("latest");
    expect(Number(blockAfter!.timestamp)).to.equal(Number(unlockTime));
    
    // Attempt Collect - should revert in original (strict >) but might pass in mutant (>=)
    await expect(
      moneyBox.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});