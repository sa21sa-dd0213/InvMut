import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - m2ecff4ea", function () {
  it("should revert when _lockTime causes overflow in original, but not in mutant using block.prevrandao", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile contract
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFileFactory.deploy();
    await logInstance.waitForDeployment();

    // Set up the contract
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.SetMinSum(ethers.parseEther("0.1"));
    await instance.Initialized();

    // Calculate a _lockTime that will cause overflow when added to block.timestamp
    // block.timestamp is ~1.7e9, so we use a value close to type(uint256).max
    const maxUint256 = ethers.MaxUint256;
    const overflowLockTime = maxUint256 - BigInt(100); // Will overflow when added to timestamp

    // This should revert in original (using block.timestamp) due to overflow check
    // In mutant (using block.prevrandao), it may not revert because prevrandao is much smaller
    await expect(
      instance.connect(addr1).Put(overflowLockTime, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});