import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m5cbd6851 test", function () {
  it("should revert when external transferFrom call fails, but mutant does not revert", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy the airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a dummy token contract that will fail on transferFrom
    const DummyToken = await ethers.getContractFactory("contracts/DummyToken.sol:DummyToken");
    const dummyToken = await DummyToken.deploy();
    await dummyToken.waitForDeployment();
    
    // Setup: give from address some tokens (if needed by token logic)
    // The dummy token will always revert on transferFrom
    
    // Prepare call parameters
    const tos = [to.address];
    const value = 100;
    const decimals = 0;
    
    // Call transfer - in original contract this should revert
    // In mutant it will return true (silently ignoring failure)
    const tx = instance.transfer(
      from.address,
      dummyToken.target,
      tos,
      value,
      decimals
    );
    
    // Expect the transaction to revert (original behavior)
    // Mutant will pass this assertion incorrectly (doesn't revert)
    await expect(tx).to.be.reverted;
  });
});