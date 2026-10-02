import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - overflow protection removed", function () {
  it("should revert when sending ether that causes balance overflow in Put, but mutant should succeed", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Get the current balance of the user
    const initialBalance = await instance.Acc(user.address);
    const initialUserBalance = initialBalance.balance;
    
    // Calculate a value that when added to initialBalance will overflow uint256
    // We need to send enough to make (balance + msg.value) wrap around
    // The overflow would happen if balance + msg.value > 2^256 - 1
    // So we need msg.value = 2^256 - initialBalance
    const MAX_UINT = ethers.MaxUint256;
    const overflowAmount = MAX_UINT - initialUserBalance + 1n;
    
    // In the original contract, this should revert due to the require check
    // In the mutant (which removes the require), this would succeed
    await expect(
      instance.connect(user).Put(0, { value: overflowAmount })
    ).to.be.reverted;  // This will pass on original, fail on mutant (mutant doesn't revert)
  });
});