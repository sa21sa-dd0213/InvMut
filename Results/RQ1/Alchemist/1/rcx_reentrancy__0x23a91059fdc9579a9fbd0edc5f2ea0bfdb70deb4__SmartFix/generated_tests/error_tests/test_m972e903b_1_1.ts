import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant test - m972e903b", function () {
  it("should revert when depositing 0 wei on the mutant (original passes)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy PrivateBank with the Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Attempt to deposit 0 wei (less than MinDeposit, but the require check happens before the MinDeposit check)
    // On the original, this passes because (balance + 0) >= balance is always true
    // On the mutant, this reverts because (balance + 0) > balance is false
    await expect(
      bank.connect(owner).Deposit({ value: 0 })
    ).to.be.reverted;
  });
});