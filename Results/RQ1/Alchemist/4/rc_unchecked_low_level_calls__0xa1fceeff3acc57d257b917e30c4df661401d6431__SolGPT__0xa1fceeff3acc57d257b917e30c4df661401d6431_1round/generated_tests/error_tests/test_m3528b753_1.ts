import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m3528b753", function () {
  it("should revert when external transferFrom call fails (mutant silently ignores failure)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that will revert on transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Token");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Give owner some tokens and approve the AirDropContract to spend them
    await token.approve(owner.address, ethers.parseEther("100"));
    
    // Deploy the AirDropContract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airdrop = await AirDropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Prepare arrays: one valid transfer and one invalid (address with insufficient balance)
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("10"), ethers.parseEther("1000")]; // Second amount exceeds balance
    
    // Expect the transaction to revert because the second transferFrom will fail
    await expect(
      airdrop.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});