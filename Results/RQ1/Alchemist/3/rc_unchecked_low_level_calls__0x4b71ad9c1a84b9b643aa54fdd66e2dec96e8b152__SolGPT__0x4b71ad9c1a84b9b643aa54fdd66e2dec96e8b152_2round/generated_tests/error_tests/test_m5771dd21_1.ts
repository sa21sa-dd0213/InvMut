import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m5771dd21 test", function () {
  it("should detect mutant that replaces keccak256 with sha256", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Mint tokens to the 'from' address
    await token.mint(from.address, ethers.parseEther("100"));
    
    // Approve the airPort contract to spend tokens on behalf of 'from'
    const airPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await airPortFactory.deploy();
    await airPort.waitForDeployment();
    
    await token.connect(from).approve(await airPort.getAddress(), ethers.parseEther("10"));
    
    // Call transfer - this should fail on mutant due to wrong selector
    const recipients = [recipient.address];
    const value = ethers.parseEther("1");
    
    // The original would succeed, mutant should revert
    await expect(
      airPort.transfer(from.address, await token.getAddress(), recipients, value)
    ).to.be.reverted;
  });
});