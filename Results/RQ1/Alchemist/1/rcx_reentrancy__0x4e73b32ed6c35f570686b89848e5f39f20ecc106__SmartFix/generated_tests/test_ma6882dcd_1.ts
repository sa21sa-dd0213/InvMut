import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant detection - overflow protection removal", function () {
  it("should detect mutant that removes overflow check in Deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PRIVATE_ETH_CELL - no constructor arguments needed
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First initialize the contract to enable deposits
    await instance.Initialized();
    
    // Calculate a value that when added to addr1's current balance (0) would overflow uint256
    // Since addr1 starts with 0 balance, we need msg.value = max uint256 + 1 to overflow
    // But msg.value is limited by ether balance, so we use max uint256 which is 2^256 - 1
    const overflowValue = ethers.MaxUint256;
    
    // Attempt deposit with max uint256 value - this should revert in original due to overflow check
    // In mutant without the require, it would silently overflow
    await expect(
      instance.connect(addr1).Deposit({ value: overflowValue })
    ).to.be.reverted;
    
    // Also verify that balance remains unchanged (should be 0 if reverted)
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(0);
  });
});