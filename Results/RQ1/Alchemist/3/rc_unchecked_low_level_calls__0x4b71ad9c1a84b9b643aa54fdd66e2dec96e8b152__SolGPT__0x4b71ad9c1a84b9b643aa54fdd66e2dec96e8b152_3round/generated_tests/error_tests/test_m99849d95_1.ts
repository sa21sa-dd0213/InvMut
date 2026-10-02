import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m99849d95 - return statement removal", function () {
  it("should detect removal of return true by expecting boolean return value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a minimal ERC20 token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy airPort contract (no constructor arguments)
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();
    
    // Give the owner some tokens and approve airPort to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(airPort.target, ethers.parseEther("100"));
    
    // Prepare call parameters
    const recipients = [addr2.address];
    const value = ethers.parseEther("10");
    
    // Call transfer function and capture the return value
    const tx = await airPort.transfer(
      addr1.address,
      token.target,
      recipients,
      value
    );
    const receipt = await tx.wait();
    
    // The function should return true on the original, but false on the mutant
    // Since ethers v6 doesn't directly expose return values from contract calls,
    // we use staticCall to get the return value
    const returnValue = await airPort.transfer.staticCall(
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