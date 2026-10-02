import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - m23e7a17d", function () {
  it("should allow Collect after unlock time in original but fail in mutant (timestamp < unlockTime)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Set MinSum to 0 for easier testing (optional - MinSum is 1 ether by default)
    // We'll use 1 ether as MinSum is 1 ether, so deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1");
    const unlockTime = Math.floor(Date.now() / 1000) + 100; // 100 seconds in future

    // User deposits 1 ether with unlock time in the future
    await bank.connect(user).Put(unlockTime, { value: depositAmount });

    // Verify balance
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);

    // Wait for unlock time to pass
    await ethers.provider.send("evm_increaseTime", [150]); // Increase by 150 seconds
    await ethers.provider.send("evm_mine", []);

    // Now try to collect - should succeed in original (timestamp > unlockTime)
    // In mutant (timestamp < unlockTime) this should revert
    const collectAmount = ethers.parseEther("0.5");

    // In the original contract this would succeed
    // In the mutant this should revert because block.timestamp is NOT < unlockTime
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});