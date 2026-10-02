import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant test - me1a911de", function () {
  it("should revert when withdrawing more than balance (original behavior), but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // User addr1 has 0 balance initially
    // Try to withdraw 1 ether when balance is 0
    // Original contract should revert, mutant should allow it
    await expect(
      bank.connect(addr1).CashOut(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});