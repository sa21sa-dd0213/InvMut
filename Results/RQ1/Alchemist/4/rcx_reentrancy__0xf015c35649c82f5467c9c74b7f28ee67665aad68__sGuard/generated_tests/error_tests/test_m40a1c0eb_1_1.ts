import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m40a1c0eb test", function () {
  it("should revert when trying to collect with insufficient balance, before unlock time, or below minimum sum", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const bank = await Factory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Verify MinSum is 1 ether
    expect(await bank.MinSum()).to.equal(ethers.parseEther("1"));

    // addr1 tries to collect without any balance
    await expect(
      bank.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;

    // addr1 deposits 2 ether
    await bank.connect(addr1).Put(0, { value: ethers.parseEther("2") });

    // addr1 tries to collect before unlock time (unlockTime = block.timestamp from Put with 0)
    // The Collect function requires block.timestamp > acc.unlockTime, which won't be true in same block
    await expect(
      bank.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Wait for next block
    await ethers.provider.send("evm_mine", []);

    // addr1 tries to collect more than balance
    await expect(
      bank.connect(addr1).Collect(ethers.parseEther("3"))
    ).to.be.reverted;
  });
});