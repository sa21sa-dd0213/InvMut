import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - mc21d4de4", function () {
  it("should kill mutant by depositing more than MinSum and trying to collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deposit 2 ether (more than MinSum which is 1 ether)
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    await (await bank.connect(addr1).Put(unlockTime, { value: depositAmount })).wait();

    // Advance time past unlock time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    // Try to collect 1 ether - should succeed on original but fail on mutant
    const collectAmount = ethers.parseEther("1");
    await expect(
      bank.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});