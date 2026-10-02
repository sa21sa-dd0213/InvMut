import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection - missing return true", function () {
  it("should revert when calling transfer after removing return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the AirDropContract
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Setup: mint tokens to owner and approve airDrop contract to transferFrom
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await airDrop.getAddress(), mintAmount);
    
    // Prepare valid transfer parameters
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("100")];
    
    // Call transfer - should revert in mutant because return true is missing
    // but in original it would succeed and return true
    await expect(
      airDrop.connect(owner).transfer(await token.getAddress(), recipients, amounts)
    ).to.be.reverted;
  });
});