import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant test for m857c1d2c", function () {
  it("should kill mutant by depositing 0 ether when balance > 0", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by Private_Bank constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // First deposit to give addr1 a positive balance (need > MinDeposit which is 1 ether)
    await bank.connect(addr1).Deposit({ value: ethers.parseEther("2") });

    // Now try to deposit 0 ether - this should succeed in original (balance stays same)
    // but fail in mutant because 0 * existingBalance = 0 < existingBalance
    await expect(
      bank.connect(addr1).Deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});