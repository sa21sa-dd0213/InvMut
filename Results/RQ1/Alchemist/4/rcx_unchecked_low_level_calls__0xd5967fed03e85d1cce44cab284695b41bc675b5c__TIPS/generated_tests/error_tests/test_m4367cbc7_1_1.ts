import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m4367cbc7 test", function () {
  it("should revert when an external call fails in the loop (original behavior)", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();
    
    // Deploy demo contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that will revert on transferFrom call
    const RevertingContract = await ethers.getContractFactory(
      "contract Reverter { function transferFrom(address, address, uint256) external pure returns (bool) { revert('fail'); } }"
    );
    const reverter = await RevertingContract.deploy();
    await reverter.waitForDeployment();
    
    // Prepare test data: one recipient, value 100, and the reverter contract as caddress
    const tos = [to1.address];
    const value = ethers.parseEther("1");
    
    // This should revert in the original because the external call fails
    await expect(
      instance.connect(owner).transfer(from.address, reverter.target, tos, value)
    ).to.be.reverted;
  });
});