import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - mutant m3b9d6de6 test", function () {
  it("should kill mutant by withdrawing less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Deposit 2 ether from addr1
    const depositAmount = ethers.parseEther("2");
    await bankInstance.connect(addr1).Put(0, { value: depositAmount });
    
    // Attempt to withdraw 1 ether (less than full balance)
    const withdrawAmount = ethers.parseEther("1");
    
    // The mutant requires acc.balance == _am, so this should revert
    // The original would succeed since acc.balance >= _am
    await expect(
      bankInstance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});