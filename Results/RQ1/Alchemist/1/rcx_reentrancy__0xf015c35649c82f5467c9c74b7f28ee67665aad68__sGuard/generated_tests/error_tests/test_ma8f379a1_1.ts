import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant ma8f379a1 test", function () {
  it("should detect mutant by verifying balance update after successful Collect call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Fund addr1 with some ETH
    const depositAmount = ethers.parseEther("2");
    const collectAmount = ethers.parseEther("1");
    
    // addr1 deposits ETH with unlock time = current timestamp (immediately available)
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock!.timestamp;
    
    await bank.connect(addr1).Put(currentTimestamp, { value: depositAmount });
    
    // Verify balance before collect
    const balanceBefore = (await bank.Acc(addr1.address)).balance;
    expect(balanceBefore).to.equal(depositAmount);
    
    // addr1 calls Collect with valid amount
    const tx = await bank.connect(addr1).Collect(collectAmount);
    await tx.wait();
    
    // Verify balance decreased by collectAmount in original, but NOT in mutant
    const balanceAfter = (await bank.Acc(addr1.address)).balance;
    
    // In the original, balance should be depositAmount - collectAmount = 1 ETH
    // In the mutant (false always), balance remains depositAmount = 2 ETH
    expect(balanceAfter).to.equal(depositAmount - collectAmount);
  });
});