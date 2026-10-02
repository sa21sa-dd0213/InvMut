import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - m09a933e9", function () {
  it("should detect mutation from keccak256 to sha256 by calling transfer and expecting revert", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20 token that has transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address
    await token.mint(from.address, ethers.parseEther("100"));

    // Deploy the airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Approve airDrop contract to spend tokens on behalf of 'from'
    await token.connect(from).approve(await airDrop.getAddress(), ethers.parseEther("10"));

    // Prepare call parameters
    const recipients = [to.address];
    const amount = ethers.parseEther("1");
    const decimals = 18;

    // Call transfer - should revert on mutant because sha256 produces wrong selector
    await expect(
      airDrop.connect(owner).transfer(from.address, await token.getAddress(), recipients, amount, decimals)
    ).to.be.reverted;
  });
});