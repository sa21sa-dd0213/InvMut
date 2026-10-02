import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - keccak256 replaced with sha256", function () {
  it("should revert when calling transfer with a valid ERC20 token that implements transferFrom", async function () {
    // Deploy a minimal ERC20-like contract that implements transferFrom
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple token contract with transferFrom for testing
    const TokenFactory = await ethers.getContractFactory("contracts/TestERC20.sol:TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the airPort contract (no constructor args)
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();
    
    // Mint some tokens to 'from' address and approve airPort to spend them
    const amount = ethers.parseEther("10");
    await token.mint(from.address, amount);
    await token.connect(from).approve(airPort.target, amount);
    
    // Prepare transfer parameters
    const recipients = [to.address];
    
    // The original uses keccak256 for the function selector, the mutant uses sha256
    // This will produce a different 4-byte selector, causing the call to fail
    await expect(
      airPort.connect(from).transfer(from.address, token.target, recipients, amount)
    ).to.be.reverted;
  });
});