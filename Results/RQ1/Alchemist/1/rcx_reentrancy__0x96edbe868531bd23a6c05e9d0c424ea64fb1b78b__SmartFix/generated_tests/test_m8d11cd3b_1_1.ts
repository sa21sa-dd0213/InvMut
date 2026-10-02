import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m8d11cd3b test", function () {
  it("should revert on overflow when depositing large amount (original behavior), but mutant allows overflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for PENNY_BY_PENNY)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract to enable Put functionality
    await instance.connect(owner).Initialized();
    
    // Set MinSum to 0 to avoid interference from Collect requirements
    await instance.connect(owner).SetMinSum(0);
    
    // Deploy a LogFile contract (required for Log reference)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set the LogFile address
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    
    // Calculate an amount that will cause overflow: 
    // We want acc.balance + msg.value to overflow uint256
    // Since acc.balance starts at 0, we need msg.value to be > type(uint256).max
    // But we can't send that much Ether. Instead, first deposit a large amount,
    // then deposit another amount that causes the sum to overflow.
    // Deposit maximum possible value that doesn't overflow yet
    const maxUint = ethers.MaxUint256;
    
    // First deposit to set balance to maxUint - 1
    const firstDeposit = maxUint - 1n;
    await instance.connect(addr1).Put(0, { value: firstDeposit });
    
    // Now try to deposit 1 wei - this should cause overflow (balance + msg.value > maxUint)
    // In the original contract, this should revert due to the require statement
    // In the mutant, the require is removed, so it will succeed and corrupt the balance
    await expect(
      instance.connect(addr1).Put(0, { value: 1n })
    ).to.be.reverted;
  });
});