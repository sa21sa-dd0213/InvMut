import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant detection test", function () {
  it("should kill mutant m3528b753 by triggering a failed external call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airDropInstance = await AirDropFactory.deploy();
    await airDropInstance.waitForDeployment();
    
    // Deploy a simple ERC20-like token that implements transferFrom
    // We need a token that will revert on transferFrom when not approved
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Owner approves the AirDropContract to transfer tokens on their behalf
    await token.approve(await airDropInstance.getAddress(), ethers.parseEther("100"));
    
    // Create recipients array with one valid recipient and one invalid (e.g., address(0))
    const recipients = [addr1.address, ethers.ZeroAddress];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("10")];
    
    // The original contract would revert because transferFrom to address(0) fails
    // The mutant would silently continue and return true
    await expect(
      airDropInstance.transfer(await token.getAddress(), recipients, amounts)
    ).to.be.reverted;
  });
});