import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m99849d95 - return statement removal", function () {
  it("should detect removal of return true by expecting boolean return value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a minimal ERC20 token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy demo contract (no constructor arguments)
    const AirPortFactory = await ethers.getContractFactory("demo");
    const demo = await AirPortFactory.deploy();
    await demo.waitForDeployment();
    
    // Give the owner some tokens and approve demo to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(demo.target, ethers.parseEther("100"));
    
    // Prepare call parameters
    const recipients = [addr2.address];
    const value = ethers.parseEther("10");
    
    // Call transfer function and capture the return value
    const tx = await demo.transfer(
      addr1.address,
      token.target,
      recipients,
      value
    );
    const receipt = await tx.wait();
    
    // The function should return true on the original, but false on the mutant
    // Since ethers v6 doesn't directly expose return values from contract calls,
    // we use staticCall to get the return value
    const returnValue = await demo.transfer.staticCall(
      addr1.address,
      token.target,
      recipients,
      value
    );
    
    // Assert that the return value is true - this will fail on the mutant
    // which returns false (default bool) instead of true
    expect(returnValue).to.equal(true);
  });
});