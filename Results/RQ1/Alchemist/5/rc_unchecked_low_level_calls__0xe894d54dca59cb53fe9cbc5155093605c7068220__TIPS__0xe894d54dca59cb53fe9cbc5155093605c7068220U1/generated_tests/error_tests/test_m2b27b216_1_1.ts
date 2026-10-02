import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m2b27b216 test", function () {
  it("should revert on successful transferFrom call due to mutant always reverting", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy the airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address and approve airDrop contract
    await token.mint(from.address, ethers.parseEther("100"));
    await token.connect(from).approve(airDrop.target, ethers.parseEther("100"));
    
    // Prepare test parameters
    const recipients = [to.address];
    const value = ethers.parseEther("1");
    const decimals = 18;
    
    // The call should succeed on original (no revert), but mutant will always revert
    // Since we expect revert on mutant, we use to.be.reverted
    await expect(
      airDrop.connect(owner).transfer(
        from.address,
        token.target,
        recipients,
        value,
        decimals
      )
    ).to.be.reverted;
  });
});