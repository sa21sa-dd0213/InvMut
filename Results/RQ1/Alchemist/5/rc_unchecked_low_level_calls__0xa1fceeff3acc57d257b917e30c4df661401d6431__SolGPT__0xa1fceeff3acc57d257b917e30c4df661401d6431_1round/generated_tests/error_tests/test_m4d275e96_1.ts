import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant kill test - m4d275e96", function () {
  it("should revert when tos.length is less than vs.length (mutant would not revert)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to owner so transferFrom can work
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    
    // Approve the AirDropContract to spend tokens
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);
    
    // Setup: 2 recipients but 3 values (tos.length < vs.length)
    const recipients = [addr1.address, addr2.address];
    const values = [
      ethers.parseEther("10"),
      ethers.parseEther("20"),
      ethers.parseEther("30")  // extra value with no recipient
    ];
    
    // Original contract should revert because lengths don't match
    // Mutant would pass because it checks <= instead of ==
    await expect(
      instance.connect(owner).transfer(
        await token.getAddress(),
        recipients,
        values
      )
    ).to.be.reverted;
  });
});