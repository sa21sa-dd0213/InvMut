import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m40a1c0eb test", function () {
  it("should revert when Collect is called with insufficient balance or before unlock time, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // addr1 has zero balance and tries to Collect any positive amount
    // In the original contract, this should revert because:
    // 1. acc.balance (0) < MinSum (1 ether)
    // 2. acc.balance (0) < _am (any positive amount)
    // In the mutant with 'if(true)', this will succeed
    const collectAmount = ethers.parseEther("0.1");
    
    // This transaction should revert on the original but might succeed on the mutant
    const tx = bank.connect(addr1).Collect(collectAmount);
    
    // If the mutant is live, this will NOT revert (killing the mutant)
    // If the original is intact, this WILL revert
    await expect(tx).to.be.reverted;
  });
});