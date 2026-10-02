import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test", function () {
  it("should return true when transfer succeeds, killing the mutant that removed return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like token to use as the caddress parameter
    // Since airPort doesn't have a constructor, we can deploy it directly
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();
    
    // We need a contract that implements transferFrom(address,address,uint256)
    // Deploy a minimal token contract for testing
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund addr1 with tokens and approve airPort to transfer
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(airPort.target, ethers.parseEther("100"));
    
    const recipients = [addr2.address];
    const value = ethers.parseEther("10");
    
    // Call transfer and expect it to return true
    const tx = await airPort.connect(addr1).transfer(
      addr1.address,
      token.target,
      recipients,
      value
    );
    const receipt = await tx.wait();
    
    // The return value should be true, but mutant returns false (default)
    // We can check the return value from the transaction
    expect(receipt).to.not.be.null;
    
    // Check the actual return value by calling the function statically
    const result = await airPort.transfer.staticCall(
      addr1.address,
      token.target,
      recipients,
      value
    );
    expect(result).to.equal(true);
  });
});