import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m3f8e0a63 test", function () {
  it("should revert when external call fails (original behavior), but mutant should not revert", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a fake token address that will cause transferFrom to fail
    // We deploy a simple contract that always returns false from transferFrom
    const failTokenFactory = await ethers.getContractFactory(
      "contract FailToken { function transferFrom(address, address, uint256) external returns (bool) { return false; } }"
    );
    const failToken = await failTokenFactory.deploy();
    await failToken.waitForDeployment();
    
    const fakeTokenAddress = await failToken.getAddress();
    const recipients = [owner.address];
    const amount = ethers.parseEther("1");
    
    // This should revert in the original contract because !_s is true
    // but should NOT revert in the mutant because condition is replaced with false
    await expect(
      instance.transfer(owner.address, fakeTokenAddress, recipients, amount)
    ).to.be.reverted;
  });
});