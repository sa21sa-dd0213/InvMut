import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - loop condition change from < to >", function () {
  it("should execute transferFrom calls when tos length > 0, but mutant skips loop", async function () {
    // Deploy AirDropContract
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const airdrop = await Factory.deploy();
    await airdrop.waitForDeployment();

    // Deploy a simple ERC20-like contract to test transferFrom
    // We'll use a minimal token that tracks balances
    const TokenFactory = await ethers.getContractFactory("contracts/TestToken.sol:TestToken");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Owner mints tokens to themselves and approves airdrop contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(await airdrop.getAddress(), mintAmount);

    // Prepare arrays for airdrop
    const tos = [recipient.address];
    const vs = [ethers.parseEther("10")];

    // Get initial balance of recipient
    const initialBalance = await token.balanceOf(recipient.address);

    // Execute transfer - should call transferFrom on token contract
    await airdrop.connect(owner).transfer(await token.getAddress(), tos, vs);

    // Check recipient received tokens
    const finalBalance = await token.balanceOf(recipient.address);
    expect(finalBalance - initialBalance).to.equal(ethers.parseEther("10"));
  });
});