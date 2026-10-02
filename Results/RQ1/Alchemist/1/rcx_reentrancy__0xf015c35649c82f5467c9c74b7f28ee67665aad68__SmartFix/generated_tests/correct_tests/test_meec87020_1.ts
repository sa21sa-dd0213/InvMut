import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant meec87020", function () {
  it("should kill the mutant by sending non-zero ether to Put and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Send a small non-zero amount of ether to the Put function via addr1
    // The original contract should accept this, the mutant should revert
    const depositAmount = ethers.parseEther("0.1");
    
    // This call should succeed on original but revert on mutant due to <= check
    await expect(
      bank.connect(addr1).Put(0, { value: depositAmount })
    ).to.not.be.reverted;
  });
});