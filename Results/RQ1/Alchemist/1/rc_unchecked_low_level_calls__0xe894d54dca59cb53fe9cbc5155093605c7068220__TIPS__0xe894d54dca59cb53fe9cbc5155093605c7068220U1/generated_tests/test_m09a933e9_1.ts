import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airDrop mutant m09a933e9 test", function () {
  it("should revert when calling transfer with a valid token contract because sha256 produces incorrect selector", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a minimal ERC20-like contract that has transferFrom function
    const ERC20Mock = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Mock.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address
    const mintAmount = ethers.parseUnits("1000", 18);
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(owner.address, mintAmount);
    
    // Deploy airDrop
    const AirDrop = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDrop.deploy();
    await airDrop.waitForDeployment();
    
    const recipients = [to.address];
    const transferAmount = ethers.parseUnits("10", 18);
    const decimals = 18;
    
    // This should revert because sha256 produces a different 4-byte selector than keccak256
    // causing the low-level call to fail
    await expect(
      airDrop.transfer(from.address, await token.getAddress(), recipients, 10, decimals)
    ).to.be.reverted;
  });
});