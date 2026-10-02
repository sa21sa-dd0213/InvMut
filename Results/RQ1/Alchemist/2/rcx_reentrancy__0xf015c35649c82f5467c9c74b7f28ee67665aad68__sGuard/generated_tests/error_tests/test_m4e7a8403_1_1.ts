import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m4e7a8403", function () {
  it("should revert when Collect is called exactly at unlockTime (original > vs mutant >=)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // User puts 1 ether with unlockTime set to current block.timestamp
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock!.timestamp;

    await bank.connect(user).Put(currentTimestamp, { value: ethers.parseEther("1") });

    // Verify balance and MinSum condition (MinSum = 1 ether)
    expect(await bank.MinSum()).to.equal(ethers.parseEther("1"));

    // Try to Collect exactly at unlockTime (block.timestamp == unlockTime)
    // Original contract requires > so it should revert
    // Mutant uses >= so it would succeed - this test kills the mutant
    await expect(
      bank.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Mine a block to advance time past unlockTime
    await ethers.provider.send("evm_mine", []);

    // Now collection should succeed (strictly after unlockTime)
    await bank.connect(user).Collect(ethers.parseEther("1"));
    expect(await bank.connect(user).Acc(user.address)).to.not.be.undefined;
  });
});