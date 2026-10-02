import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should kill mutant mb593e608 by testing unlock time behavior with future _unlockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Set a future unlock time (current timestamp + 100 seconds)
    const latestBlock = await ethers.provider.getBlock("latest");
    const futureTime = latestBlock!.timestamp + 100;

    // Deposit 1 ether with future unlock time
    const depositAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).Put(futureTime, { value: depositAmount });
    await tx.wait();

    // Attempt to collect immediately (should revert because unlock time is in the future)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});