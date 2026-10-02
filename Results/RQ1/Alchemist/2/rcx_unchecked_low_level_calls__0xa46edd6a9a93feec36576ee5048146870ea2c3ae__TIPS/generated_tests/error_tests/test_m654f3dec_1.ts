import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m654f3dec", function () {
  it("should revert when transferFrom call succeeds because mutant always reverts", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address and approve the EBU contract to spend them
    const amount = ethers.parseEther("100");
    await token.mint(from.address, amount);
    await token.connect(from).approve(instance.target, amount);
    
    // Call transfer on EBU contract
    const tos = [to.address];
    const values = [amount];
    
    // The original contract would succeed, but the mutant always reverts
    await expect(
      instance.transfer(from.address, token.target, tos, values)
    ).to.be.reverted;
  });
});