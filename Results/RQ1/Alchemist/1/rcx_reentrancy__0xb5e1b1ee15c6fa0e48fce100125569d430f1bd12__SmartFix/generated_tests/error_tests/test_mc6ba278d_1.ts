import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank - Kill mutant mc6ba278d", function () {
  it("should reject deposits below MinDeposit (1 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get initial balance of addr1
    const initialBalance = await bank.balances(addr1.address);
    
    // Attempt to deposit 0.5 ether (less than MinDeposit of 1 ether)
    const tx = await bank.connect(addr1).Deposit({
      value: ethers.parseEther("0.5")
    });
    await tx.wait();
    
    // Assert that balance did not change (mutant would incorrectly increase it)
    const finalBalance = await bank.balances(addr1.address);
    expect(finalBalance).to.equal(initialBalance);
  });
});