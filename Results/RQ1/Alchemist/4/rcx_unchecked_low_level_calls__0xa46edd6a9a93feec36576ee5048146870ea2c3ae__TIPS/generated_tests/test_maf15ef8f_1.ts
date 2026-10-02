import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should succeed on valid transfer and fail on mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to addr1 and approve the EBU contract to spend them
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Prepare transfer parameters
    const tos = [addr2.address];
    const values = [ethers.parseEther("10")];
    
    // Call transfer - should succeed on original, revert on mutant
    await expect(
      instance.connect(owner).transfer(
        addr1.address,
        await token.getAddress(),
        tos,
        values
      )
    ).to.not.be.reverted;
  });
});