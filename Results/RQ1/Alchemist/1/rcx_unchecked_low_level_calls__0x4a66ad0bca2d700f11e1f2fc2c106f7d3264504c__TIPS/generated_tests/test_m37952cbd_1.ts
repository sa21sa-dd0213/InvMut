import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6)", function () {
  it("should revert when external call fails in original, but mutant with false condition would not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract addresses from the deployed instance
    const from = await instance.from();
    const caddress = await instance.caddress();
    
    // Deploy a simple contract at caddress that will revert on transferFrom
    // We need to create a contract that will fail when called
    const FailFactory = await ethers.getContractFactory("contract FailContract { function transferFrom(address, address, uint256) external pure returns (bool) { return false; } }");
    const failContract = await FailFactory.deploy();
    await failContract.waitForDeployment();
    
    // We cannot change caddress, but we can test the revert behavior
    // The original contract reverts on failed call, mutant does not
    
    // Create arrays with one recipient and value
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")]; // 1 token
    
    // This should revert because caddress is a random address with no code
    // In original: !_s is true (call fails), so it reverts
    // In mutant: if(false) never triggers, so it returns true
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});