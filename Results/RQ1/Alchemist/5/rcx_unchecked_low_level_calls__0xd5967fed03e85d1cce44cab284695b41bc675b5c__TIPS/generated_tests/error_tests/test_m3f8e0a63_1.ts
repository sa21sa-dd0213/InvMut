import { expect } from "chai";
import { ethers } } from "hardhat";

describe("demo mutant m3f8e0a63 test", function () {
  it("should revert when external call fails, but mutant does not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that will revert on transferFrom
    const RevertingContract = await ethers.getContractFactory("RevertingContract");
    const revertingInstance = await RevertingContract.deploy();
    await revertingInstance.waitForDeployment();
    
    // Prepare test parameters: from, caddress (the reverting contract), to addresses array, value
    const from = owner.address;
    const caddress = revertingInstance.target;
    const tos = [addr1.address];
    const value = ethers.parseEther("1");
    
    // On the original contract, this call would revert because the external call fails
    // On the mutant (where if(false) replaces the revert check), it will return true silently
    const tx = await instance.transfer(from, caddress, tos, value);
    const receipt = await tx.wait();
    
    // The mutant should NOT revert, so we expect the transaction to succeed
    expect(receipt.status).to.equal(1);
  });
});

// Helper contract that reverts on transferFrom
contract RevertingContract {
  function transferFrom(address, address, uint256) external pure returns (bool) {
    revert("transferFrom always reverts");
  }
}