import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - ma516bee5", function () {
  it("should revert when tos.length > vs.length on original but succeed on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the AirDropContract (no constructor arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy("Test", "TST");
    await token.waitForDeployment();
    
    // Mint tokens to owner and approve contract
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(instance.target, ethers.parseEther("100"));
    
    // Prepare arrays where tos.length > vs.length (3 recipients, 2 amounts)
    const tos = [addr1.address, addr2.address, owner.address];
    const vs = [ethers.parseEther("10"), ethers.parseEther("20")];
    
    // Call transfer with mismatched array lengths
    // Original contract requires ==, so this should revert
    // Mutant with >= will allow it and potentially cause unexpected behavior
    await expect(
      instance.transfer(token.target, tos, vs)
    ).to.be.reverted;
  });
});