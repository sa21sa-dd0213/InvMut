import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant detection - m99849d95", function () {
  it("should return true on successful transfer, killing mutant that removes return", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like token contract to use as caddress
    const TokenFactory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the demo contract (no constructor arguments)
    const AirPortFactory = await ethers.getContractFactory("demo");
    const demo = await AirPortFactory.deploy();
    await demo.waitForDeployment();
    
    // Setup: approve demo to spend tokens from owner
    const approveAmount = ethers.parseEther("100");
    await token.approve(await demo.getAddress(), approveAmount);
    
    // Fund owner with tokens
    await token.mint(owner.address, approveAmount);
    
    // Call transfer with valid parameters
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");
    
    const tx = await demo.transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );
    
    const receipt = await tx.wait();
    
    // The original returns true, the mutant returns false (default)
    // We check the return value via the transaction response
    expect(tx).to.have.property("value");
    
    // Decode the return value from the transaction
    const result = await demo.transfer.staticCall(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );
    
    expect(result).to.equal(true);
  });
});