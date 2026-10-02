import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant detection - sha256 vs keccak256", function () {
  it("should detect mutant that uses sha256 instead of keccak256 for function selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that has transferFrom function
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("TestToken", "TT", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy AirDropContract
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Owner approves AirDropContract to spend tokens
    const approveAmount = ethers.parseEther("100");
    await token.approve(await airDrop.getAddress(), approveAmount);
    
    // Prepare arrays for transfer
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];
    
    // This should succeed on original (keccak256) but fail on mutant (sha256)
    // because sha256 produces a different function selector for transferFrom
    await expect(
      airDrop.connect(owner).transfer(await token.getAddress(), recipients, amounts)
    ).to.not.be.reverted;
  });
});