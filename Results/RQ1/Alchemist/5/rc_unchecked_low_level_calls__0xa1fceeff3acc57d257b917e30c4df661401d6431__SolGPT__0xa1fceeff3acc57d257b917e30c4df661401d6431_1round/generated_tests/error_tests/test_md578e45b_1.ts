import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection - md578e45b", function () {
  it("should kill mutant by verifying correct function selector computation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like mock that only responds to transferFrom selector
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20Factory.deploy();
    await mockToken.waitForDeployment();
    
    // Deploy the AirDropContract (mutant version with sha256)
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airdrop = await AirDropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Fund owner with tokens and approve airdrop contract
    const amount = ethers.parseEther("100");
    await mockToken.mint(owner.address, amount);
    await mockToken.connect(owner).approve(await airdrop.getAddress(), amount);
    
    // Prepare transfer parameters
    const recipients = [addr1.address];
    const values = [ethers.parseEther("10")];
    
    // Attempt to call transfer - should revert on mutant because sha256 produces wrong selector
    await expect(
      airdrop.connect(owner).transfer(
        await mockToken.getAddress(),
        recipients,
        values
      )
    ).to.be.reverted;
  });
});