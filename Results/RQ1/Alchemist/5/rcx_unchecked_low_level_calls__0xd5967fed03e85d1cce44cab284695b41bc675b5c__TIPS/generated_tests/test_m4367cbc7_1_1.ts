import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when external call to caddress fails (mutant removed revert)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that will fail on transferFrom call
    const FailingContract = await ethers.getContractFactory("contract FailingReceiver { function transferFrom(address, address, uint256) external pure returns (bool) { return false; } }");
    const failingContract = await FailingContract.deploy();
    await failingContract.waitForDeployment();
    
    // Create array with one recipient address
    const tos = [addr2.address];
    const value = ethers.parseEther("1");
    
    // This call should revert because the external call returns false
    await expect(
      instance.transfer(owner.address, failingContract.target, tos, value)
    ).to.be.reverted;
  });
});