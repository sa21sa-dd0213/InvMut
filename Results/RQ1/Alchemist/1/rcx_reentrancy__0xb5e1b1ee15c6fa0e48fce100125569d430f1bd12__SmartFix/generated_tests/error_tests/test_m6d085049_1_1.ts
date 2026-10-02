import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant m6d085049 detection", function () {
  it("should revert on mutant when depositing exactly to reach uint256 max, but pass on original", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Calculate the amount needed to reach uint256 max - 1 wei (since MinDeposit = 1 ether)
    const maxUint = ethers.MaxUint256;
    const oneEther = ethers.parseEther("1");

    // First deposit to set balance close to max
    const initialDeposit = maxUint - oneEther - 1n; // leave room for one more deposit
    await bank.connect(addr1).deposit({ value: initialDeposit });

    // Now the balance is initialDeposit
    // To make balance + msg.value = maxUint, we need msg.value = maxUint - initialDeposit = oneEther + 1n
    // But we need exactly balance + msg.value = maxUint to trigger the +1 overflow
    // So deposit amount should be: maxUint - initialDeposit = oneEther + 1n
    const depositAmount = maxUint - initialDeposit; // = oneEther + 1n

    // This deposit should succeed on original but revert on mutant due to overflow
    // Since we're testing the mutant, expect revert
    await expect(
      bank.connect(addr1).deposit({ value: depositAmount })
    ).to.be.reverted;
  });
});