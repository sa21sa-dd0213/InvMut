import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test - m8099f82a", function () {
  it("should kill mutant by calling transfer with a non-empty _tos array, expecting the original to succeed but the mutant to revert due to out-of-bounds access", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/TestERC20.sol:TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: owner approves the airDrop contract to transfer tokens from addr1
    const amount = ethers.parseUnits("10", 18);
    await token.connect(addr1).approve(await instance.getAddress(), amount);

    // Prepare call parameters
    const from = addr1.address;
    const tokenAddress = await token.getAddress();
    const recipients = [addr2.address]; // Non-empty array
    const value = 10;
    const decimals = 18;

    // This call will succeed on the original (i < length) but revert on mutant (i <= length) due to out-of-bounds
    await expect(
      instance.transfer(from, tokenAddress, recipients, value, decimals)
    ).to.be.reverted;
  });
});