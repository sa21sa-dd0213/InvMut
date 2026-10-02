import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m8099f82a by sending transfer with one recipient and expecting success (original) vs revert (mutant due to <= causing out-of-bounds)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy("Mock", "MCK", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airDrop contract to spend them
    const mintAmount = ethers.parseUnits("1000", 18);
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);

    // Setup: create an array with exactly one recipient
    const recipients = [addr1.address];
    const value = ethers.parseUnits("10", 18);
    const decimals = 18;

    // This call should succeed on original (i < length) but revert on mutant (i <= length)
    await expect(
      instance.connect(owner).transfer(owner.address, await token.getAddress(), recipients, value, decimals)
    ).to.not.be.reverted;
  });
});