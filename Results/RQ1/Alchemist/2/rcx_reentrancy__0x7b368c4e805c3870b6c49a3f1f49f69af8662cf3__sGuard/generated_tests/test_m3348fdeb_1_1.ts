import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection test", function () {
  it("should detect mutant that changes >= to == in Collect function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deposit 2 ether into the wallet
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Attempt to withdraw 1 ether (less than full balance)
    const withdrawAmount = ethers.parseEther("1");
    
    // This should succeed on original (balance >= 1) but fail on mutant (balance != 1)
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted; // Mutant will revert because balance (2) != amount (1)
  });
});