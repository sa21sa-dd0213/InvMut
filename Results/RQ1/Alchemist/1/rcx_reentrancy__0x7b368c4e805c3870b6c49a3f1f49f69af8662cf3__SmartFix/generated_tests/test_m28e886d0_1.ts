import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending a large msg.value that would cause overflow in the mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Get the maximum uint256 value
    const maxUint = ethers.MaxUint256;
    
    // Try to call Put with maxUint value - this should revert in the mutant
    // because the mutant's require check is: (balance + msg.value + 1) >= balance
    // which is always true for any msg.value, but the actual balance addition
    // would overflow and revert in Solidity 0.8.x
    // The original would also revert due to overflow protection, but the mutant
    // changes the require check making it pass when it shouldn't
    await expect(
      instance.connect(addr1).Put(maxUint, { value: maxUint })
    ).to.be.reverted;
  });
});