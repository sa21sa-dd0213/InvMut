import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - mda25665a", function () {
  it("should revert when trying to collect more than balance before unlock time (kills mutant that removes all checks)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set minimum sum to a small value so it doesn't interfere
    await instance.connect(owner).SetMinSum(1);

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Deposit 1 wei with a long lock time (1 hour in seconds)
    const lockTime = 3600;
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    await instance.connect(addr1).Put(lockTime, { value: depositAmount });

    // Attempt to collect more than deposited (e.g., 1 ether) while time is still locked
    const collectAmount = ethers.parseEther("1");
    
    // This should revert on original contract because:
    // 1. acc.balance (1 wei) < collectAmount (1 ether)
    // 2. block.timestamp < unlockTime (since lockTime is 3600 seconds)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});