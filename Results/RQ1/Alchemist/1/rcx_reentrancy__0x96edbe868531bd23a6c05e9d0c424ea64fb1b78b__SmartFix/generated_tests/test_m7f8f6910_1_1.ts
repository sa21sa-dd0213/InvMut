import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m7f8f6910 test", function () {
  it("should revert on Collect when balance >= MinSum and balance >= _am but block.timestamp <= unlockTime (original AND logic)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const pennyInstance = await PennyFactory.deploy();
    await pennyInstance.waitForDeployment();

    // Setup: initialize contract and set MinSum
    await pennyInstance.SetMinSum(ethers.parseEther("1"));
    await pennyInstance.SetLogFile(await logInstance.getAddress());
    await pennyInstance.Initialized();

    // User puts 2 ETH with a lock time of 1000 seconds from now
    const lockTime = 1000;
    const depositAmount = ethers.parseEther("2");
    await pennyInstance.connect(user).Put(lockTime, { value: depositAmount });

    // Verify unlockTime is set correctly
    const holder = await pennyInstance.Acc(user.address);
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    expect(holder.unlockTime).to.equal(currentTime + lockTime);

    // Try to collect 1.5 ETH while still locked (before unlockTime)
    const collectAmount = ethers.parseEther("1.5");

    // This should revert on original (AND logic) but would succeed on mutant (OR logic)
    await expect(
      pennyInstance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});