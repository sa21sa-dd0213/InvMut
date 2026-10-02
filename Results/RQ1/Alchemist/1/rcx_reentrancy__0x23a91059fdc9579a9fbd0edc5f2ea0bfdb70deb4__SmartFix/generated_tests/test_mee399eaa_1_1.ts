import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant mee399eaa - Deposit with <= instead of >=", function () {
  it("should revert when depositing a positive amount because mutant uses <= instead of >=", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await log.getAddress());
    await privateBank.waitForDeployment();

    const depositAmount = ethers.parseEther("1");

    // Original: deposit succeeds; Mutant: require((balance + msg.value) <= balance) fails for positive msg.value
    await expect(
      privateBank.connect(addr1).Deposit({ value: depositAmount })
    ).to.be.reverted;
  });

  it("should succeed when depositing 0 ether (edge case where mutant might pass)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await log.getAddress());
    await privateBank.waitForDeployment();

    // Deposit 0 ether - mutant condition: (balance + 0) <= balance is true, so it passes
    await expect(
      privateBank.connect(addr1).Deposit({ value: 0 })
    ).to.not.be.reverted;
  });
});