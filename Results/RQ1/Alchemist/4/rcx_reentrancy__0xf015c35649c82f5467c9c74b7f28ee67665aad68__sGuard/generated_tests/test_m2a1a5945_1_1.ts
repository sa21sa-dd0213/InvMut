import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m2a1a5945", function () {
  it("should kill the mutant by checking that block.timestamp is used instead of block.prevrandao for time-based unlock", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Set MinSum to 0 to simplify test (optional, but helps avoid minimum balance issues)
    // Note: MinSum is 1 ether by default, so we need to deposit at least that

    // Deposit 1 ether with unlock time set far in the future (e.g., 1 hour from now)
    const futureTime = Math.floor(Date.now() / 1000) + 3600;
    const depositAmount = ethers.parseEther("1");

    await bank.connect(user).Put(futureTime, { value: depositAmount });

    // Wait until the unlock time has passed
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now attempt to collect 0.5 ether
    // On the original contract, this should succeed because block.timestamp > unlockTime
    // On the mutant, this should revert because block.prevrandao is not related to time
    const collectAmount = ethers.parseEther("0.5");

    // The mutant uses block.prevrandao which will likely be less than the unlock time
    // (since prevrandao is typically a small number or zero on test networks)
    // So the condition block.prevrandao > unlockTime will fail, causing revert
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});