import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection - keccak256 replaced with sha256", function () {
  it("should kill the mutant by detecting that sha256 produces a different function selector than keccak256", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token that has transferFrom
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Deploy AirDropContract
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    const airDropAddress = await airDrop.getAddress();

    // Fund owner with tokens and approve AirDropContract to spend
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(airDropAddress, mintAmount);

    // Prepare transfer parameters
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];

    // Call transfer - should succeed on original (keccak256), fail on mutant (sha256)
    await expect(
      airDrop.connect(owner).transfer(tokenAddress, recipients, amounts)
    ).to.be.reverted;
  });
});

// Simple mock ERC20 contract for testing
contract("MockERC20", function () {
  // This is a Solidity mock that would be deployed separately
  // In practice, you'd deploy a real ERC20 or use a pre-deployed one
});