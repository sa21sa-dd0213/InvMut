import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m4d275e96", function () {
  it("should revert when tos.length is less than vs.length (mutant allows, original reverts)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the AirDropContract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a simple ERC20-like contract to use as the token address
    // We'll use a minimal token contract for testing
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Approve the AirDropContract to spend tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Setup arrays: 2 addresses but 3 values (tos.length < vs.length)
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("10"), ethers.parseEther("20"), ethers.parseEther("30")];
    
    // The original contract requires tos.length == vs.length, so this should revert
    // The mutant allows tos.length <= vs.length, so it would not revert here
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});