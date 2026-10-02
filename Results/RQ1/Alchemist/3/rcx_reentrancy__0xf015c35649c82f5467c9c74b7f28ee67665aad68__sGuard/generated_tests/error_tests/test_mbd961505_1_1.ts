import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - mbd961505", function () {
  it("should kill the mutant by testing unlock time behavior with future _unlockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    // Set a future unlock time (current block timestamp + 1000 seconds)
    const futureUnlockTime = (await ethers.provider.getBlock("latest"))!.timestamp + 1000;

    // Deposit 2 ether with future unlock time
    const depositAmount = ethers.parseEther("2");
    await bankInstance.connect(addr1).Put(futureUnlockTime, { value: depositAmount });

    // Verify balance was credited
    const holderInfo = await bankInstance.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);

    // Verify unlock time in original contract would be the future time
    // In mutant, it would be set to current timestamp (wrong behavior)

    // Attempt to collect before the future unlock time (immediately)
    // Original contract should revert because block.timestamp < unlockTime
    // Mutant contract would allow it because unlockTime was set to current timestamp
    await expect(
      bankInstance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});