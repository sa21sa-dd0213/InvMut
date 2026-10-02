import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection - m54b331b0", function () {
  it("should revert when vs array is empty (length = 0) on original, but mutant accepts it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Approve AirDropContract to spend tokens from owner
    const amount = ethers.parseEther("10");
    await token.approve(await instance.getAddress(), amount);
    
    // Prepare arrays: tos has one address, vs is empty
    const tos = [addr1.address];
    const vs: number[] = [];
    
    // This should revert on the original contract because vs.length > 0 fails
    // The mutant (vs.length >= 0) will pass the require, so we expect revert
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});