import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant m36fe12f1 test", function () {
  it("should succeed when tos.length > 0, but mutant fails because tos.length < 0 always false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to use for testing transferFrom
    // We need a token that the contract can call transferFrom on
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(instance.target, ethers.parseEther("100"));
    
    // Fund addr1 with some tokens via transferFrom
    // First, owner needs to transfer tokens to addr1 so transferFrom can work
    await token.transfer(addr1.address, ethers.parseEther("10"));
    
    // Now try to call transfer with one recipient (tos.length = 1)
    const tos = [addr2.address];
    const vs = [ethers.parseEther("1")];
    
    // On original: succeeds because 1 > 0 is true
    // On mutant: reverts because 1 < 0 is false
    await expect(
      instance.connect(owner).transfer(token.target, tos, vs)
    ).to.not.be.reverted;
  });
});