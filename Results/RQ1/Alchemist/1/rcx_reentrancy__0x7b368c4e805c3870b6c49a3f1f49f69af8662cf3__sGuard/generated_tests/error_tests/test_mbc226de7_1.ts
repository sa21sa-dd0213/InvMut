import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant test - mbc226de7", function () {
  it("should revert when trying to collect with balance < MinSum in original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Deposit 0.5 ether (less than MinSum which is 1 ether)
    const depositAmount = ethers.parseEther("0.5");
    await wallet.connect(addr1).Put(0, { value: depositAmount });
    
    // Try to collect the deposited amount
    // Original: should revert because 0.5 < 1 (MinSum)
    // Mutant: would allow because 0.5 <= 1 (MinSum) is true
    const collectTx = wallet.connect(addr1).Collect(depositAmount);
    
    // In the original, this should revert due to balance < MinSum
    // In the mutant, this would succeed - we expect revert to kill the mutant
    await expect(collectTx).to.be.reverted;
  });
});