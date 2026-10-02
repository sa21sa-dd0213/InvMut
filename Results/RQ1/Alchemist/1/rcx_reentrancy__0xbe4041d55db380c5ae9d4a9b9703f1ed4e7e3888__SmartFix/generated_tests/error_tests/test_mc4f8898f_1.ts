import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - mc4f8898f", function () {
  it("should detect the mutant by showing that unlockTime is not updated when _lockTime is smaller than existing unlockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // Set MinSum to 0 so Collect can work with any balance
    await instance.connect(owner).SetMinSum(0);
    
    // Deploy a Log contract and set it
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());

    // First Put: set unlockTime to block.timestamp + 100 seconds
    const lockTime1 = 100;
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).Put(lockTime1, { value: depositAmount });

    // Get the unlockTime after first Put
    const accAfterFirstPut = await instance.Acc(addr1.address);
    const unlockTimeAfterFirst = accAfterFirstPut.unlockTime;

    // Second Put: with a smaller lockTime (10 seconds)
    const lockTime2 = 10;
    await instance.connect(addr1).Put(lockTime2, { value: ethers.parseEther("0.5") });

    // Get the unlockTime after second Put
    const accAfterSecondPut = await instance.Acc(addr1.address);
    const unlockTimeAfterSecond = accAfterSecondPut.unlockTime;

    // In the original: unlockTime should be updated to block.timestamp + 10 (smaller value)
    // In the mutant: unlockTime should remain at block.timestamp + 100 (not updated)
    // The difference is detectable because the mutant condition fails to update unlockTime
    
    // Wait until after the first unlockTime (block.timestamp + 100) but before the second would have been (block.timestamp + 10)
    // Since block.timestamp + 10 < block.timestamp + 100, we need to wait past the first unlockTime
    await ethers.provider.send("evm_increaseTime", [101]);
    await ethers.provider.send("evm_mine", []);

    // Try to Collect - in original it should succeed (unlockTime was updated to block.timestamp + 10 which is now past)
    // In mutant it should revert (unlockTime is still block.timestamp + 100 which hasn't passed yet)
    const collectAmount = ethers.parseEther("0.5");
    
    // This will revert in the mutant but succeed in the original
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});