import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant ma516bee5 test", function () {
  it("should kill mutant by passing tos.length > vs.length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the AirDropContract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a token contract to use as contract_address for transferFrom calls
    // Deploy a simple ERC20-like token for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Fund owner with tokens and approve the AirDropContract to transferFrom
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.approve(instance.target, ethers.parseEther("1000"));
    
    // Prepare arrays where tos.length > vs.length
    const tos = [addr1.address, addr2.address, addr1.address]; // 3 recipients
    const vs = [ethers.parseEther("10"), ethers.parseEther("20")]; // only 2 values
    
    // The mutant changes == to >=, so require(tos.length >= vs.length) will pass
    // but the loop will try to access vs[2] which doesn't exist -> revert
    // Original contract would revert at the equality check
    await expect(
      instance.connect(owner).transfer(token.target, tos, vs)
    ).to.be.reverted;
  });
});