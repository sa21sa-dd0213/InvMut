import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m4e7a8403", function () {
  it("should detect mutant that uses >= instead of > for unlockTime check", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Get current block timestamp
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTime = latestBlock!.timestamp;

    // Set unlock time to current time + 100 seconds
    const unlockTime = currentTime + 100;

    // addr1 puts 2 ether into the bank with unlock time in the future
    const putAmount = ethers.parseEther("2");
    await (await bank.connect(addr1).Put(unlockTime, { value: putAmount })).wait();

    // Verify balance was added
    const holderBefore = await bank.Acc(addr1.address);
    expect(holderBefore.balance).to.equal(putAmount);

    // Mine a block to advance time exactly to unlockTime
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime]);
    await ethers.provider.send("evm_mine", []);

    // Verify we are exactly at unlockTime
    const blockAfterMine = await ethers.provider.getBlock("latest");
    expect(blockAfterMine!.timestamp).to.equal(unlockTime);

    // Attempt to collect exactly at unlockTime - should fail on original (strict >) but pass on mutant (>=)
    const collectAmount = ethers.parseEther("1");

    // This call should revert because original requires block.timestamp > unlockTime (strict)
    await expect(
      bank.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;

    // Verify balance remained unchanged (no withdrawal happened)
    const holderAfter = await bank.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(putAmount);
  });
});