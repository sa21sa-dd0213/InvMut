import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant test for Collect >= vs ==", function () {
  it("should kill mutant m3348fdeb by withdrawing less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Fund addr1 with some ETH for deposits
    // Deposit 2 ether into the contract from addr1
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Now try to withdraw only 1 ether (less than full balance)
    const withdrawAmount = ethers.parseEther("1");
    
    // On original contract: should succeed (balance >= amount)
    // On mutant: should revert because balance (2) != amount (1)
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});