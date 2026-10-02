import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc421ab5b test", function () {
  it("should return true when transfer is called with valid parameters", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple token contract address to use as caddress
    // Since the contract calls transferFrom on caddress, we need a contract that has this function
    // For testing purposes, we'll use a simple approach - just call with a valid address
    const tos = [addr1.address];
    const v = ethers.parseEther("1");
    
    // Call the transfer function and capture the return value
    const tx = await instance.transfer(owner.address, addr2.address, tos, v);
    const receipt = await tx.wait();
    
    // Get the return value from the transaction
    // Since ethers v6 doesn't directly expose return values, we call staticCall
    const result = await instance.transfer.staticCall(owner.address, addr2.address, tos, v);
    
    // The original returns true, the mutant returns false (default)
    expect(result).to.equal(true);
  });
});