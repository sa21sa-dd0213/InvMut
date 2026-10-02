import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant test - m7c0cb89d", function () {
  it("should kill mutant by depositing exactly MinDeposit - 1 wei and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by PrivateBank constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy PrivateBank with the Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await log.getAddress());
    await privateBank.waitForDeployment();
    
    // Get the MinDeposit value
    const minDeposit = await privateBank.MinDeposit();
    
    // Calculate amount that is 1 wei less than MinDeposit
    const depositAmount = minDeposit - BigInt(1);
    
    // Attempt to deposit with amount = MinDeposit - 1 wei
    // Original contract should revert because msg.value < MinDeposit
    // Mutant would allow it because msg.value + 1 >= MinDeposit
    await expect(
      privateBank.connect(addr1).Deposit({ value: depositAmount })
    ).to.be.reverted;
  });
});